#!/usr/bin/env python3

import argparse
import concurrent.futures
import json
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

USER_AGENT = "Mozilla/5.0 (compatible; SEO-GEO-Agentic-Auditor/1.0)"
MAX_BODY_BYTES = 5 * 1024 * 1024


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

    def handle_starttag(self, tag, attrs):
        attributes = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        if tag == "title":
            self.in_title = True
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
    return parser.parse_args()


def fetch_bytes(location, timeout):
    if location.startswith(("http://", "https://")):
        request = urllib.request.Request(location, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8"})
        with urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context()) as response:
            return response.read(MAX_BODY_BYTES + 1), response.geturl(), response.status, dict(response.headers.items())
    data = Path(location).read_bytes()
    return data, Path(location).resolve().as_uri(), 200, {}


def sitemap_urls(location, timeout, seen=None):
    seen = seen or set()
    if location in seen:
        return []
    seen.add(location)
    data, final_url, status, _ = fetch_bytes(location, timeout)
    if status != 200:
        raise RuntimeError(f"Sitemap returned HTTP {status}: {location}")
    root = ET.fromstring(data)
    tag = root.tag.rsplit("}", 1)[-1]
    locations = [element.text.strip() for element in root.iter() if element.tag.rsplit("}", 1)[-1] == "loc" and element.text]
    if tag == "sitemapindex":
        urls = []
        for child in locations:
            urls.extend(sitemap_urls(urllib.parse.urljoin(final_url, child), timeout, seen))
        return urls
    if tag != "urlset":
        raise RuntimeError(f"Unsupported sitemap root element: {tag}")
    return [urllib.parse.urljoin(final_url, value) for value in locations]


def audit_url(url, timeout):
    result = {"url": url, "status": None, "finalUrl": None, "issues": []}
    try:
        data, final_url, status, headers = fetch_bytes(url, timeout)
        if len(data) > MAX_BODY_BYTES:
            result["issues"].append("html-over-5mb")
            data = data[:MAX_BODY_BYTES]
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
        for index, block in enumerate(parser.json_ld_parts):
            try:
                parsed = json.loads(block)
                values = parsed if isinstance(parsed, list) else parsed.get("@graph", [parsed]) if isinstance(parsed, dict) else []
                for value in values:
                    if isinstance(value, dict) and value.get("@type"):
                        value_types = value["@type"] if isinstance(value["@type"], list) else [value["@type"]]
                        json_ld_types.extend(value_types)
            except Exception as error:
                json_ld_errors.append({"index": index, "error": str(error)})

        result.update({
            "status": status,
            "finalUrl": final_url,
            "title": title,
            "description": description,
            "robots": robots.strip(),
            "canonical": parser.canonicals,
            "h1": h1,
            "wordCount": len(" ".join(parser.body_text).split()),
            "linkCount": len(parser.links),
            "ogTitle": first(parser.meta.get("og:title")),
            "ogDescription": first(parser.meta.get("og:description")),
            "ogImage": first(parser.meta.get("og:image")),
            "twitterImage": first(parser.meta.get("twitter:image")),
            "jsonLdTypes": sorted(set(json_ld_types)),
            "jsonLdErrors": json_ld_errors,
        })
        if "noindex" in robots.lower():
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
        if len(" ".join(parser.body_text).split()) < 80:
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
    urls = list(dict.fromkeys(sitemap_urls(args.sitemap, args.timeout)))
    if args.limit:
        urls = urls[:args.limit]
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        results = list(executor.map(lambda url: audit_url(url, args.timeout), urls))
    issue_counts = Counter(issue.split(":", 1)[0] for result in results for issue in result["issues"])
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sitemap": args.sitemap,
        "urlCount": len(urls),
        "failingUrlCount": sum(1 for result in results if result["issues"]),
        "issueCounts": dict(issue_counts.most_common()),
        "duplicateTitles": duplicate_groups(results, "title"),
        "duplicateDescriptions": duplicate_groups(results, "description"),
        "results": results,
    }
    output = Path(args.out).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Audited {len(urls)} sitemap URLs; {report['failingUrlCount']} have findings.")
    print(f"Report: {output}")
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
    return 1 if any(result.get("status") != 200 or "noindex-in-sitemap" in result["issues"] for result in results) else 0


if __name__ == "__main__":
    sys.exit(main())
