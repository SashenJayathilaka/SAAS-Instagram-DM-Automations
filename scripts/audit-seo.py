"""Read-only production SEO audit. Run: python scripts/audit-seo.py [origin]
Checks every sitemap URL without JavaScript or authenticated cookies.
"""
import concurrent.futures
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit
from html.parser import HTMLParser

ORIGIN = (sys.argv[1] if len(sys.argv) > 1 else 'https://ap3k.com').rstrip('/')
SITEMAP_URLS = set()
LANGUAGE_SETS = ({'en', 'x-default'}, {'en', 'fr', 'es', 'de', 'pt', 'x-default'})

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = []
        self.alternates = {}
        self.h1 = 0
        self.title = ''
        self.in_title = False
        self.description = ''
        self.noindex = False
        self.lang = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self.in_title = True
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical.append(a.get('href'))
        if tag == 'link' and a.get('hreflang'): self.alternates[a['hreflang']] = a.get('href')
        if tag == 'meta' and a.get('name') == 'description': self.description = a.get('content', '')
        if tag == 'meta' and a.get('name') in ('robots', 'googlebot'): self.noindex |= 'noindex' in a.get('content', '')
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title += data

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'AP3K-SEO-Audit/1.0', 'Accept-Language': 'en'})
    return urllib.request.urlopen(request, timeout=45)

def normalize_alternates(alternates):
    # An empty origin path and '/' identify the same resource. Preserve all
    # other path/query differences so real alternate mismatches still fail.
    return {language: urlsplit(url)._replace(path=urlsplit(url).path or '/').geturl()
            for language, url in alternates.items()}

def check(entry):
    url, expected_alternates = entry
    errors = []
    try:
        with fetch(url) as response:
            page = Page()
            page.feed(response.read().decode())
            if response.url.rstrip('/') != url.rstrip('/'): errors.append('Sitemap URL redirects')
            if 'noindex' in response.headers.get('X-Robots-Tag', ''): errors.append('HTTP noindex')
        if page.canonical != [url] and [x.rstrip('/') for x in page.canonical] != [url.rstrip('/')]: errors.append('Canonical mismatch')
        if page.h1 != 1: errors.append(f'Expected one H1, got {page.h1}')
        if not page.title or not page.description: errors.append('Missing title or description')
        if page.noindex: errors.append('Meta noindex')
        path = urlsplit(url).path.split('/')
        locale = path[1] if len(path) > 1 and path[1] in ('fr','es','de','pt') else 'en'
        if page.lang != locale: errors.append('HTML language mismatch')
        if expected_alternates and normalize_alternates(page.alternates) != normalize_alternates(expected_alternates): errors.append('HTML/sitemap language alternates disagree')
        if set(page.alternates) not in LANGUAGE_SETS: errors.append('Unsupported HTML language set')
        if any(target.rstrip('/') not in SITEMAP_URLS for target in page.alternates.values()): errors.append('HTML alternate target missing from sitemap')
        if page.alternates.get(locale, '').rstrip('/') != url.rstrip('/'): errors.append('Missing self language alternate')
        return {'url': url, 'title': page.title, 'errors': errors}
    except Exception as exc:
        return {'url': url, 'errors': [str(exc)]}

if __name__ == '__main__':
    with fetch(ORIGIN + '/sitemap.xml') as response: root = ET.fromstring(response.read())
    entries = [(node.findtext('{*}loc'), {
        link.get('hreflang'): link.get('href') for link in node.findall('{http://www.w3.org/1999/xhtml}link')
    }) for node in root.findall('{*}url')]
    urls = [url for url, _ in entries]
    if not urls or len(set(urls)) != len(urls): raise ValueError('Empty sitemap or duplicate URLs')
    SITEMAP_URLS = {url.rstrip('/') for url in urls}
    for url, alternates in entries:
        # Hreflang may be supplied exclusively in HTML. Validate it on every page.
        if alternates and set(alternates) not in LANGUAGE_SETS:
            raise ValueError(f'Unsupported sitemap language set: {url}')
        if any(target not in urls for target in alternates.values()):
            raise ValueError(f'Sitemap alternate target missing: {url}')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results = list(pool.map(check, entries))
    failures = [row for row in results if row['errors']]
    print(json.dumps({'checked': len(results), 'failures': failures}, ensure_ascii=False, indent=2))
    sys.exit(bool(failures))
