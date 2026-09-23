#!/usr/bin/env python3
"""Lint static pages and check local links before publishing."""
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
errors = []

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = set()
        self.h1 = 0
        self.title = False
        self.description = False
        self.language = False
        self.stack = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.language = bool(a.get("lang"))
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self.title = True
        if tag == "meta" and a.get("name") == "description":
            self.description = bool(a.get("content"))
        if "id" in a:
            if a["id"] in self.ids:
                errors.append(f"Duplicate id: {a['id']}")
            self.ids.add(a["id"])
        if tag == "img" and "alt" not in a:
            errors.append("Image without alt text")
        if tag == "script" and a.get("src") not in {"language.js", "../language.js"}:
            errors.append("Unexpected script: only the local language preference helper is allowed")
        for key in ("href", "src"):
            if key in a:
                self.links.append(a[key])
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack and self.stack[-1] == tag:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.stack or self.stack.pop() != tag:
            errors.append(f"Mismatched closing tag: {tag}")

pages = {}
for path in DOCS.rglob("*.html"):
    page = Page()
    text = path.read_text()
    page.feed(text)
    pages[path.resolve()] = page
    if page.stack or page.h1 != 1 or not all((page.title, page.description, page.language)):
        errors.append(f"Invalid structure/metadata: {path.name}")
    if not text.lower().startswith("<!doctype html>"):
        errors.append(f"Missing doctype: {path.name}")

for path, page in pages.items():
    for link in page.links:
        u = urlsplit(link)
        if u.scheme in {"https", "mailto"}:
            continue
        if u.scheme or u.netloc:
            errors.append(f"Unsupported URL: {link}")
            continue
        target = (path.parent / unquote(u.path)).resolve() if u.path else path
        if target.is_dir():
            target /= "index.html"
        if not target.is_relative_to(DOCS.resolve()) or not target.is_file():
            errors.append(f"Broken local link in {path.name}: {link}")
        elif u.fragment and target in pages and u.fragment not in pages[target].ids:
            errors.append(f"Broken anchor in {path.name}: {link}")

for path in ROOT.rglob("*"):
    if not path.is_file() or any(part in {".git", "node_modules", ".preview"} for part in path.parts):
        continue
    if path.suffix in {".html", ".css", ".md", ".py", ".js", ".cjs"} or path.name == ".gitignore":
        text = path.read_text()
        if not text.endswith("\n") or any(line.rstrip() != line for line in text.splitlines()):
            errors.append(f"Whitespace lint: {path.relative_to(ROOT)}")
        if re.search(r"AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[0-9A-Za-z]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", text):
            errors.append(f"Possible credential: {path.relative_to(ROOT)}")

for path in DOCS.glob("*.css"):
    css = path.read_text()
    if css.count("{") != css.count("}"):
        errors.append(f"Unbalanced CSS braces: {path.name}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"PASS: {len(pages)} pages; HTML structure, local links, metadata, whitespace, and credential-pattern checks.")
