#!/usr/bin/env python3
"""Generate complete static language editions; no translation service at runtime."""
import html
import json
import os
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LANGUAGES = {"en": "English", "ru": "Русский", "zh-Hans": "简体中文", "ko": "한국어", "ja": "日本語", "es": "Español", "de": "Deutsch", "it": "Italiano", "fr": "Français"}


def directory(language):
    return DOCS if language == "en" else DOCS / ("zh" if language == "zh-Hans" else language)


def public_url(language, page):
    prefix = "" if language == "en" else ("zh" if language == "zh-Hans" else language) + "/"
    return "https://naro.tools/" + prefix + ("" if page == "index.html" else page.removesuffix(".html"))


def with_asset_fallback(page):
    page = re.sub(r'\n<script data-asset-fallback>[\s\S]*?</script>', '', page)
    script = (ROOT / "scripts/asset-fallback.js").read_text().strip()
    return page.replace('<meta charset="utf-8" />', '<meta charset="utf-8" />\n<script data-asset-fallback>' + script + '</script>', 1)


class Render(HTMLParser):
    def __init__(self, language, page, catalog, english):
        super().__init__(convert_charrefs=True)
        self.language, self.page, self.catalog, self.english = language, page, catalog, english
        self.output = []
        self.in_header = False

    def translate(self, value):
        key = " ".join(value.split())
        if key in self.english:
            if key not in self.catalog or not self.catalog[key]:
                raise ValueError(f"Missing {self.language} translation: {key}")
            return self.catalog[key]
        return value

    def handle_decl(self, declaration):
        self.output.append("<!" + declaration + ">")

    def handle_comment(self, value):
        self.output.append("<!--" + value + "-->")

    def handle_starttag(self, tag, attrs):
        original = self.get_starttag_text()
        values = dict(attrs)
        def attribute(key, value):
            nonlocal original
            original = re.sub(r"(\b" + re.escape(key) + r'\s*=\s*)"[^"]*"', lambda m: m[1] + '"' + html.escape(value, quote=True) + '"', original, count=1)
        if tag == "html":
            attribute("lang", self.language)
        if tag == "header" and "nav" in values.get("class", "").split():
            self.in_header = True
        for key in ("alt", "aria-label", "title"):
            if values.get(key): attribute(key, self.translate(values[key]))
        if tag == "meta" and (values.get("name") == "description" or values.get("property") in ("og:title", "og:description")):
            attribute("content", self.translate(values["content"]))
        if tag == "meta" and values.get("property") == "og:url":
            attribute("content", public_url(self.language, self.page))
        if tag == "link" and values.get("rel") == "canonical":
            attribute("href", public_url(self.language, self.page))
        for key in ("src", "href"):
            value = values.get(key, "")
            if value.startswith("assets/") or value.endswith((".css", ".js")):
                if value == "assets/naro-window.png":
                    value = f"assets/naro-window-{self.language}.png"
                attribute(key, os.path.relpath(DOCS / value, directory(self.language)))
        self.output.append(original)

    handle_startendtag = handle_starttag

    def handle_endtag(self, tag):
        if tag == "head":
            script = os.path.relpath(DOCS / "language.js", directory(self.language))
            self.output.append(f'<script src="{script}"></script>\n')
            analytics = os.path.relpath(DOCS / "analytics.js", directory(self.language))
            self.output.append(f'<script defer src="{analytics}"></script>\n')
            for code in LANGUAGES:
                self.output.append(f'<link rel="alternate" hreflang="{code}" href="{public_url(code, self.page)}" />\n')
            self.output.append(f'<link rel="alternate" hreflang="x-default" href="{public_url("en", self.page)}" />\n')
        if tag == "header" and self.in_header:
            label = html.escape(self.translate("Choose language") + ": " + LANGUAGES[self.language], quote=True)
            globe = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>'
            self.output.append(f'<details class="languages"><summary aria-label="{label}" title="{label}">{globe}</summary><nav aria-label="' + html.escape(self.translate("Language"), quote=True) + '">')
            for code, name in LANGUAGES.items():
                href = os.path.relpath(directory(code) / self.page, directory(self.language))
                current = ' aria-current="true"' if code == self.language else ''
                self.output.append(f'<a href="{href}" lang="{code}" hreflang="{code}"{current}>{name}</a>')
            self.output.append('</nav></details>')
            self.in_header = False
        self.output.append("</" + tag + ">")

    def handle_data(self, value):
        if not value.strip():
            self.output.append(value)
            return
        leading = value[:len(value) - len(value.lstrip())]
        trailing = value[len(value.rstrip()):]
        arrow = '<svg class="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"/></svg>'
        translated = html.escape(self.translate(value.strip()), quote=False).replace("↗", arrow)
        self.output.append(leading + translated + trailing)


def main():
    english = json.loads((ROOT / "locales/en.json").read_text())
    for language in LANGUAGES:
        catalog = json.loads((ROOT / f"locales/{language}.json").read_text())
        if set(catalog) != set(english):
            raise ValueError(f"Catalog keys differ: {language}")
        directory(language).mkdir(exist_ok=True)
        for template in sorted((ROOT / "templates").glob("*.html")):
            renderer = Render(language, template.name, catalog, english)
            renderer.feed(template.read_text())
            (directory(language) / template.name).write_text(with_asset_fallback("".join(renderer.output)))
    stats = DOCS / "stats.html"
    stats.write_text(with_asset_fallback(stats.read_text()))
    urls = [public_url(code, page.name) for code in LANGUAGES for page in (ROOT / "templates").glob("*.html")]
    (DOCS / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"<url><loc>{url}</loc></url>\n" for url in urls) + "</urlset>\n")
    (DOCS / "robots.txt").write_text("User-agent: *\nAllow: /\nSitemap: https://naro.tools/sitemap.xml\n")
    print("Generated 36 pages in 9 languages")


if __name__ == "__main__":
    main()
