#!/usr/bin/env python3

import argparse
import concurrent.futures
import gzip
import io
import ipaddress
import json
import shutil
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

USER_AGENT = "Mozilla/5.0 (compatible; SEO-GEO-Agentic-Auditor/1.0)"
MAX_PAGE_BYTES = 10 * 1024 * 1024
MAX_SITEMAP_BYTES = 50 * 1024 * 1024
MAX_SITEMAP_URLS = 50_000
MAX_REDIRECTS = 5
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts = []
        self.in_title = False
        self.h1_parts = []
        self.current_h1 = None
        self.meta = defaultdict(list)
        self.canonicals = []
        self.links = []
        self.json_ld_parts = []
        self.current_json_ld = None
        self.body_text = []
        self.in_body = False
        self.skip_depth = 0
        self.lang = ""

    def handle_starttag(self, tag, attrs):
        attributes = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        if tag == "title":
            self.in_title = True
        elif tag == "html":
            self.lang = attributes.get("lang", "")
        elif tag == "body":
            self.in_body = True
        elif tag in {"script", "style", "noscript", "template"} and self.in_body:
            self.skip_depth += 1
        if tag == "meta":
            key = attributes.get("name") or attributes.get("property")
            if key:
                self.meta[key.lower()].append(attributes.get("content", "").strip())
        elif tag == "link" and "canonical" in attributes.get("rel", "").lower().split():
            self.canonicals.append(attributes.get("href", "").strip())
        elif tag == "a" and attributes.get("href"):
            self.links.append(attributes["href"].strip())
        elif tag == "h1":
            self.current_h1 = []
        elif tag == "script" and attributes.get("type", "").lower() == "application/ld+json":
            self.current_json_ld = []

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "title":
            self.in_title = False
        elif tag == "body":
            self.in_body = False
        elif tag in {"script", "style", "noscript", "template"} and self.in_body and self.skip_depth:
            self.skip_depth -= 1
        if tag == "h1" and self.current_h1 is not None:
            self.h1_parts.append(" ".join(self.current_h1).strip())
            self.current_h1 = None
        elif tag == "script" and self.current_json_ld is not None:
            self.json_ld_parts.append("".join(self.current_json_ld).strip())
            self.current_json_ld = None

    def handle_data(self, data):
        text = " ".join(data.split())
        if not text:
            return
        if self.in_title:
            self.title_parts.append(text)
        if self.current_h1 is not None:
            self.current_h1.append(text)
        if self.current_json_ld is not None:
            self.current_json_ld.append(data)
        elif self.in_body and self.skip_depth == 0:
            self.body_text.append(text)


def parse_args():
    parser = argparse.ArgumentParser(description="Audit initial HTML for every URL in a sitemap or sitemap index.")
    parser.add_argument("--sitemap", required=True, help="Absolute sitemap URL or local XML file")
    parser.add_argument("--out", required=True, help="Output JSON report")
    parser.add_argument("--html", help="Optional self-contained HTML report")
    parser.add_argument("--handoff", help="Optional technical Markdown handoff")
    parser.add_argument("--lang", choices=["pt-BR", "en"], default="pt-BR", help="HTML and Markdown report language (default: pt-BR)")
    parser.add_argument("--limit", type=int, default=0, help="Optional maximum number of page URLs")
    parser.add_argument("--workers", type=int, default=8, help="Concurrent fetches (default: 8)")
    parser.add_argument("--timeout", type=int, default=20, help="Request timeout seconds (default: 20)")
    parser.add_argument("--retries", type=int, default=2, help="Retries for transient HTTP failures (default: 2)")
    parser.add_argument("--allow-private-network", action="store_true", help="Allow localhost/private targets for controlled local tests")
    return parser.parse_args()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_remote_url(location, allow_private=False):
    parsed = urllib.parse.urlsplit(location)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError(f"Unsupported URL protocol: {parsed.scheme}")
    if parsed.username or parsed.password:
        raise ValueError("URLs containing credentials are not allowed")
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValueError("URL hostname is required")
    if allow_private:
        return
    if hostname == "localhost" or hostname.endswith((".localhost", ".local", ".internal")):
        raise ValueError(f"Private or local hostname is blocked: {hostname}")
    addresses = {item[4][0] for item in socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)}
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError(f"Private, reserved or unresolved destination is blocked: {hostname}")


def fetch_bytes(location, timeout, max_bytes=MAX_PAGE_BYTES, allow_private=False, retries=2):
    if not location.startswith(("http://", "https://")):
        data = Path(location).read_bytes()
        return data[: max_bytes + 1], Path(location).resolve().as_uri(), 200, {}

    opener = urllib.request.build_opener(NoRedirect, urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    current = location
    for redirect_count in range(MAX_REDIRECTS + 1):
        validate_remote_url(current, allow_private)
        request = urllib.request.Request(current, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8"})
        response = None
        for attempt in range(retries + 1):
            try:
                response = opener.open(request, timeout=timeout)
                break
            except urllib.error.HTTPError as error:
                response = error
                if error.code not in RETRYABLE_STATUS or attempt == retries:
                    break
            except urllib.error.URLError:
                if attempt == retries:
                    raise
            time.sleep(0.25 * (2 ** attempt))

        status = getattr(response, "status", None) or response.getcode()
        headers = dict(response.headers.items())
        if status in {301, 302, 303, 307, 308}:
            location_header = response.headers.get("Location")
            if not location_header:
                return b"", current, status, headers
            if redirect_count == MAX_REDIRECTS:
                raise RuntimeError(f"Redirect limit exceeded: {location}")
            current = urllib.parse.urljoin(current, location_header)
            continue
        return response.read(max_bytes + 1), current, status, headers
    raise RuntimeError(f"Unable to fetch: {location}")


def decode_sitemap(data, final_url, headers):
    content_encoding = headers.get("Content-Encoding", headers.get("content-encoding", "")).lower()
    if content_encoding == "gzip" or final_url.lower().endswith(".gz") or data.startswith(b"\x1f\x8b"):
        with gzip.GzipFile(fileobj=io.BytesIO(data)) as compressed:
            data = compressed.read(MAX_SITEMAP_BYTES + 1)
    if len(data) > MAX_SITEMAP_BYTES:
        raise RuntimeError(f"Sitemap exceeds the 50 MB uncompressed limit: {final_url}")
    return data


def sitemap_entries(location, timeout, allow_private=False, retries=2, seen=None):
    seen = seen or set()
    if location in seen:
        return []
    seen.add(location)
    data, final_url, status, headers = fetch_bytes(location, timeout, MAX_SITEMAP_BYTES, allow_private, retries)
    if status != 200:
        raise RuntimeError(f"Sitemap returned HTTP {status}: {location}")
    data = decode_sitemap(data, final_url, headers)
    root = ET.fromstring(data)
    tag = root.tag.rsplit("}", 1)[-1]
    if tag == "sitemapindex":
        entries = []
        for element in root:
            if element.tag.rsplit("}", 1)[-1] != "sitemap":
                continue
            loc = next((child.text.strip() for child in element if child.tag.rsplit("}", 1)[-1] == "loc" and child.text), None)
            if loc:
                entries.extend(sitemap_entries(urllib.parse.urljoin(final_url, loc), timeout, allow_private, retries, seen))
        return entries
    if tag != "urlset":
        raise RuntimeError(f"Unsupported sitemap root element: {tag}")
    entries = []
    for element in root:
        if element.tag.rsplit("}", 1)[-1] != "url":
            continue
        loc = None
        lastmod = None
        for child in element:
            name = child.tag.rsplit("}", 1)[-1]
            if name == "loc" and child.text:
                loc = child.text.strip()
            elif name == "lastmod" and child.text:
                lastmod = child.text.strip()
        if loc:
            entries.append({"url": urllib.parse.urljoin(final_url, loc), "lastmod": lastmod})
    if len(entries) > MAX_SITEMAP_URLS:
        raise RuntimeError(f"Sitemap exceeds the 50,000 URL limit: {final_url}")
    if not entries:
        raise RuntimeError(f"Sitemap contains no URLs: {final_url}")
    return entries


def sitemap_urls(location, timeout, allow_private=False, retries=2, seen=None):
    return [entry["url"] for entry in sitemap_entries(location, timeout, allow_private, retries, seen)]


def audit_url(url, timeout, allow_private=False, retries=2):
    result = {"url": url, "status": None, "finalUrl": None, "issues": []}
    try:
        data, final_url, status, headers = fetch_bytes(url, timeout, MAX_PAGE_BYTES, allow_private, retries)
        if len(data) > MAX_PAGE_BYTES:
            result["issues"].append("html-over-10mb")
            data = data[:MAX_PAGE_BYTES]
        encoding = "utf-8"
        content_type = headers.get("Content-Type", headers.get("content-type", ""))
        normalized_content_type = content_type.lower().split(";", 1)[0].strip()
        is_html = not normalized_content_type or normalized_content_type in {"text/html", "application/xhtml+xml"}
        result.update({"status": status, "finalUrl": final_url, "contentType": normalized_content_type})
        if status != 200:
            result["issues"].append(f"http-{status}")
        if final_url != url:
            result["issues"].append("redirected-sitemap-url")
        if not is_html:
            result["issues"].append("non-html-sitemap-url")
            return result
        if "charset=" in content_type.lower():
            encoding = content_type.lower().split("charset=", 1)[1].split(";", 1)[0].strip()
        html = data.decode(encoding, errors="replace")
        parser = PageParser()
        parser.feed(html)
        title = " ".join(parser.title_parts).strip()
        description = first(parser.meta.get("description"))
        robots = " ".join(parser.meta.get("robots", [])) + " " + headers.get("X-Robots-Tag", headers.get("x-robots-tag", ""))
        h1 = [value for value in parser.h1_parts if value]
        json_ld_errors = []
        json_ld_types = []
        json_ld_nodes = []
        json_ld_semantic_issues = []
        for index, block in enumerate(parser.json_ld_parts):
            try:
                parsed = json.loads(block)
                values = flatten_schema(parsed)
                json_ld_nodes.extend(values)
                for value in values:
                    if isinstance(value, dict) and value.get("@type"):
                        value_types = value["@type"] if isinstance(value["@type"], list) else [value["@type"]]
                        json_ld_types.extend(value_types)
            except Exception as error:
                json_ld_errors.append({"index": index, "error": str(error)})

        content_unit_count = count_content_units(" ".join(parser.body_text), parser.lang)
        result.update({
            "status": status,
            "finalUrl": final_url,
            "title": title,
            "description": description,
            "robots": robots.strip(),
            "canonical": parser.canonicals,
            "h1": h1,
            "wordCount": content_unit_count,
            "contentUnitCount": content_unit_count,
            "language": parser.lang,
            "linkCount": len(parser.links),
            "ogTitle": first(parser.meta.get("og:title")),
            "ogDescription": first(parser.meta.get("og:description")),
            "ogImage": first(parser.meta.get("og:image")),
            "twitterImage": first(parser.meta.get("twitter:image")),
            "jsonLdTypes": sorted(set(json_ld_types)),
            "jsonLdErrors": json_ld_errors,
            "jsonLdSemanticIssues": json_ld_semantic_issues,
        })
        robots_tokens = {token.strip() for token in robots.lower().replace(",", " ").split()}
        if "noindex" in robots_tokens or "none" in robots_tokens:
            result["issues"].append("noindex-in-sitemap")
        if not title:
            result["issues"].append("missing-title")
        if not description:
            result["issues"].append("missing-description")
        if len(parser.canonicals) != 1:
            result["issues"].append(f"canonical-count-{len(parser.canonicals)}")
        elif normalize_url(parser.canonicals[0]) != normalize_url(url):
            result["issues"].append("canonical-mismatch")
        if len(h1) == 0:
            result["issues"].append("missing-h1")
        elif len(h1) > 1:
            result["issues"].append("multiple-h1")
        if not first(parser.meta.get("og:image")):
            result["issues"].append("missing-og-image")
        if not first(parser.meta.get("twitter:image")):
            result["issues"].append("missing-twitter-image")
        if json_ld_errors:
            result["issues"].append("invalid-json-ld")
        if parser.canonicals:
            for node in json_ld_nodes:
                node_types = node.get("@type", []) if isinstance(node, dict) else []
                node_types = node_types if isinstance(node_types, list) else [node_types]
                if any(value in {"WebPage", "Article", "BlogPosting", "NewsArticle", "Product"} for value in node_types):
                    main_entity = node.get("mainEntityOfPage")
                    reference = node.get("url") or (main_entity.get("@id") if isinstance(main_entity, dict) else main_entity) or node.get("@id")
                    if reference and normalize_url(str(reference).split("#", 1)[0]) != normalize_url(parser.canonicals[0]):
                        json_ld_semantic_issues.append("schema-page-url-mismatch")
                if "Product" in node_types:
                    offers = node.get("offers", [])
                    offers = offers if isinstance(offers, list) else [offers] if isinstance(offers, dict) else []
                    for offer in offers:
                        price = offer.get("price")
                        if price is not None:
                            try:
                                if float(price) < 0:
                                    raise ValueError()
                            except (TypeError, ValueError):
                                json_ld_semantic_issues.append("schema-invalid-price")
                            if not valid_currency(offer.get("priceCurrency")):
                                json_ld_semantic_issues.append("schema-invalid-currency")
        result["jsonLdSemanticIssues"] = sorted(set(json_ld_semantic_issues))
        result["issues"].extend(result["jsonLdSemanticIssues"])
        if count_content_units(" ".join(parser.body_text), parser.lang) < 80:
            result["issues"].append("thin-initial-html-heuristic")
    except urllib.error.HTTPError as error:
        result.update({"status": error.code, "finalUrl": error.geturl(), "issues": [f"http-{error.code}"]})
    except Exception as error:
        result["issues"].append(f"fetch-error:{type(error).__name__}:{error}")
    return result


def normalize_url(value):
    try:
        parsed = urllib.parse.urlsplit(value)
        return urllib.parse.urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path or "/", parsed.query, ""))
    except Exception:
        return value


def flatten_schema(value):
    if isinstance(value, list):
        return [node for item in value for node in flatten_schema(item)]
    if not isinstance(value, dict):
        return []
    graph = value.get("@graph", [])
    return [value] + ([node for item in graph for node in flatten_schema(item)] if isinstance(graph, list) else [])


def valid_currency(value):
    return isinstance(value, str) and len(value) == 3 and value.isalpha() and value.upper() == value


def count_content_units(text, language=""):
    normalized = " ".join(str(text or "").split())
    if not normalized:
        return 0
    language = (language or "").lower()
    if language.startswith(("zh", "ja", "ko", "th")):
        letters = sum(1 for character in normalized if character.isalnum() and not character.isascii())
        ascii_words = len([part for part in normalized.split() if any(character.isascii() and character.isalnum() for character in part)])
        return letters + ascii_words
    return len(normalized.split())


def first(values):
    return values[0] if values else ""


def duplicate_groups(results, key):
    groups = defaultdict(list)
    for result in results:
        value = result.get(key)
        if value:
            groups[value].append(result["url"])
    return {value: urls for value, urls in groups.items() if len(urls) > 1}


def main():
    args = parse_args()
    try:
        entries = []
        seen_urls = set()
        for entry in sitemap_entries(args.sitemap, args.timeout, args.allow_private_network, args.retries):
            if entry["url"] in seen_urls:
                continue
            seen_urls.add(entry["url"])
            entries.append(entry)
    except Exception as error:
        report = {
            "reportVersion": 2,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sitemap": args.sitemap,
            "urlCount": 0,
            "failingUrlCount": 0,
            "issueCounts": {"sitemap-unavailable": 1},
            "sitemapIssues": [{"code": "sitemap-unavailable", "message": f"{type(error).__name__}: {error}"}],
            "duplicateTitles": {},
            "duplicateDescriptions": {},
            "results": [],
        }
        output = Path(args.out).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        render_optional_outputs(args, output)
        print(f"Sitemap audit failed safely: {type(error).__name__}: {error}")
        print(f"Report: {output}")
        return 1
    if args.limit:
        entries = entries[:args.limit]
    urls = [entry["url"] for entry in entries]
    lastmod_by_url = {entry["url"]: entry["lastmod"] for entry in entries}
    workers = min(32, max(1, args.workers))
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(lambda url: audit_url(url, args.timeout, args.allow_private_network, args.retries), urls))
    for result in results:
        result["lastmod"] = lastmod_by_url.get(result["url"])
    issue_counts = Counter(issue.split(":", 1)[0] for result in results for issue in result["issues"])

    # Build stamping detection: identical lastmod across most of the sitemap
    # usually means the value is regenerated on every build, which destroys its
    # value as a freshness signal.
    lastmods = [entry["lastmod"] for entry in entries if entry["lastmod"]]
    site_issues = []
    if len(lastmods) >= 20:
        top_value, top_count = Counter(lastmods).most_common(1)[0]
        if top_count / len(lastmods) > 0.8:
            site_issues.append({
                "code": "lastmod-uniform",
                "detail": f"{top_count} of {len(lastmods)} lastmod values are identical ({top_value}); this pattern suggests build-time stamping instead of real modification dates.",
            })
    report = {
        "reportVersion": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sitemap": args.sitemap,
        "urlCount": len(urls),
        "failingUrlCount": sum(1 for result in results if result["issues"]),
        "issueCounts": dict(issue_counts.most_common()),
        "lastmodCoverage": {"withLastmod": len(lastmods), "total": len(entries)},
        "siteIssues": site_issues,
        "duplicateTitles": duplicate_groups(results, "title"),
        "duplicateDescriptions": duplicate_groups(results, "description"),
        "results": results,
    }
    output = Path(args.out).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Audited {len(urls)} sitemap URLs; {report['failingUrlCount']} have findings.")
    for site_issue in site_issues:
        print(f"[SITE] {site_issue['code']}: {site_issue['detail']}")
    print(f"Report: {output}")
    render_optional_outputs(args, output)
    return 1 if any(any(is_release_blocking_issue(issue) for issue in result["issues"]) for result in results) else 0


def is_release_blocking_issue(issue):
    code = issue.split(":", 1)[0]
    return code.startswith("http-") or code.startswith("canonical-count-") or code in {
        "fetch-error",
        "redirected-sitemap-url",
        "non-html-sitemap-url",
        "noindex-in-sitemap",
        "canonical-mismatch",
        "missing-title",
        "missing-description",
        "missing-h1",
        "invalid-json-ld",
        "schema-page-url-mismatch",
        "schema-invalid-price",
        "schema-invalid-currency",
    }


def render_optional_outputs(args, output):
    if args.html:
        node = shutil.which("node")
        if not node:
            raise RuntimeError("Node.js is required to render the HTML report")
        renderer = Path(__file__).with_name("render-html-report.mjs")
        subprocess.run(
            [node, str(renderer), "--report", str(output), "--output", str(Path(args.html).resolve()), "--lang", args.lang],
            check=True,
        )
    if args.handoff:
        node = shutil.which("node")
        if not node:
            raise RuntimeError("Node.js is required to generate the Markdown handoff")
        generator = Path(__file__).with_name("generate-technical-handoff.mjs")
        subprocess.run(
            [node, str(generator), "--report", str(output), "--output", str(Path(args.handoff).resolve()), "--lang", args.lang],
            check=True,
        )


if __name__ == "__main__":
    sys.exit(main())
