import gzip
import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[2] / "scripts" / "audit-sitemap.py"
SPEC = importlib.util.spec_from_file_location("audit_sitemap", MODULE_PATH)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class SitemapAuditTests(unittest.TestCase):
    def test_reads_plain_and_gzip_sitemaps(self):
        xml = b'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/page</loc></url></urlset>'
        with tempfile.TemporaryDirectory() as directory:
            plain = Path(directory) / "sitemap.xml"
            compressed = Path(directory) / "sitemap.xml.gz"
            plain.write_bytes(xml)
            compressed.write_bytes(gzip.compress(xml))
            self.assertEqual(AUDIT.sitemap_urls(str(plain), 2), ["https://example.com/page"])
            self.assertEqual(AUDIT.sitemap_urls(str(compressed), 2), ["https://example.com/page"])

    def test_empty_sitemap_fails_instead_of_reporting_success(self):
        with tempfile.TemporaryDirectory() as directory:
            empty = Path(directory) / "sitemap.xml"
            empty.write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "contains no URLs"):
                AUDIT.sitemap_urls(str(empty), 2)

    def test_valid_sitemap_larger_than_five_megabytes_is_supported(self):
        padding = " " * (6 * 1024 * 1024)
        xml = f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{padding}<url><loc>https://example.com/large</loc></url></urlset>'
        with tempfile.TemporaryDirectory() as directory:
            sitemap = Path(directory) / "large.xml"
            sitemap.write_text(xml, encoding="utf-8")
            self.assertEqual(AUDIT.sitemap_urls(str(sitemap), 2), ["https://example.com/large"])

    def test_counts_non_space_delimited_content(self):
        self.assertGreater(AUDIT.count_content_units("電子商務搜尋最佳化", "zh-TW"), 5)
        self.assertEqual(AUDIT.count_content_units("three clear words", "en"), 3)

    def test_sitemap_page_audit_detects_common_schema_semantic_errors(self):
        html = '''<!doctype html><html lang="en"><head><title>Product</title><meta name="description" content="Description"><link rel="canonical" href="https://example.com/product"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Product","url":"https://example.com/other","offers":{"@type":"Offer","price":"bad","priceCurrency":"US"}}</script></head><body><h1>Product</h1><p>''' + ("useful content " * 90) + '''</p></body></html>'''
        with tempfile.TemporaryDirectory() as directory:
            page = Path(directory) / "page.html"
            page.write_text(html, encoding="utf-8")
            result = AUDIT.audit_url(str(page), 2)
            self.assertIn("schema-page-url-mismatch", result["issues"])
            self.assertIn("schema-invalid-price", result["issues"])
            self.assertIn("schema-invalid-currency", result["issues"])

    def test_noindex_is_reported_once_and_robots_none_is_equivalent(self):
        for directive in ("noindex,follow", "none"):
            with self.subTest(directive=directive), tempfile.TemporaryDirectory() as directory:
                page = Path(directory) / "page.html"
                page.write_text(
                    f'''<!doctype html><html lang="en"><head><title>Private page</title><meta name="description" content="Private page description"><meta name="robots" content="{directive}"></head><body><h1>Private page</h1></body></html>''',
                    encoding="utf-8",
                )
                result = AUDIT.audit_url(str(page), 2)
                self.assertEqual(result["issues"].count("noindex-in-sitemap"), 1)


if __name__ == "__main__":
    unittest.main()
