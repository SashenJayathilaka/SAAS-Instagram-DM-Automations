#!/usr/bin/env python3
"""Read-only production SEO checks; standard library only, no credentials.

This is a diagnostic crawl, not a Google indexation or ranking measurement.
It respects robots.txt, stays on ap3k.com and caps concurrent requests at four.
"""
import argparse
import collections
import concurrent.futures
import datetime
import html.parser
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET

BASE = 'https://ap3k.com'
AGENT = 'AP3KSEOReleaseAudit/1.0'


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, response.url, dict(response.headers), response.read(4_000_000).decode('utf-8', 'replace')
    except urllib.error.HTTPError as error:
        return error.code, error.url, dict(error.headers), error.read(1_000_000).decode('utf-8', 'replace')
    except Exception as error:
        return 0, url, {}, str(error)


class Page(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = []
        self.h1s = []
        self.meta = {}
        self.canonicals = []
        self.alternates = {}
        self.links = set()
        self.images = []
        self.schemas = []
        self.lang = None
        self.text = []
        self.in_title = False
        self.in_h1 = False
        self.in_script = False
        self.in_style = False
        self.in_schema = False
        self.schema_buffer = []

    def handle_starttag(self, tag, attributes):
        a = dict(attributes)
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'title': self.in_title = True
        if tag == 'h1': self.in_h1 = True; self.h1s.append('')
        if tag == 'style': self.in_style = True
        if tag == 'meta': self.meta[a.get('name', a.get('property', '')).lower()] = a.get('content', '')
        if tag == 'link':
            if a.get('rel') == 'canonical': self.canonicals.append(a.get('href', ''))
            if a.get('rel') == 'alternate' and a.get('hreflang'): self.alternates[a['hreflang']] = a.get('href', '')
        if tag == 'a' and a.get('href'): self.links.add(a['href'])
        if tag == 'img': self.images.append({'src': a.get('src'), 'alt': a.get('alt'), 'loading': a.get('loading')})
        if tag == 'script':
            self.in_script = True
            self.in_schema = a.get('type') == 'application/ld+json'
            self.schema_buffer = []

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'h1': self.in_h1 = False
        if tag == 'style': self.in_style = False
        if tag == 'script':
            if self.in_schema:
                try: self.schemas.append(json.loads(''.join(self.schema_buffer)))
                except ValueError: self.schemas.append({'parse_error': True})
            self.in_script = self.in_schema = False

    def handle_data(self, data):
        if self.in_title: self.title.append(data)
        if self.in_h1 and self.h1s: self.h1s[-1] += data
        if self.in_schema: self.schema_buffer.append(data)
        if not self.in_script and not self.in_style: self.text.append(data)


def clean_url(value, base=BASE):
    parsed = urllib.parse.urlsplit(urllib.parse.urljoin(base, value))
    if parsed.scheme not in ('http', 'https') or parsed.netloc != 'ap3k.com': return None
    if parsed.query: return None
    return urllib.parse.urlunsplit(('https', parsed.netloc, parsed.path or '/', '', ''))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='seo-artifacts/crawl.json')
    parser.add_argument('--max-pages', type=int, default=1000)
    args = parser.parse_args()
    maximum = max(1, min(args.max_pages, 1000))
    status, _, headers, robots = fetch(BASE + '/robots.txt')
    if status != 200:
        raise SystemExit('robots.txt was not available; crawl stopped rather than assuming permission')
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(robots.splitlines())
    sitemap_urls = [line.split(':', 1)[1].strip() for line in robots.splitlines() if line.lower().startswith('sitemap:')]
    sitemap_urls = sitemap_urls or [BASE + '/sitemap.xml']
    locations, lastmods, sitemap_checks = [], {}, []
    seen_sitemaps = set()
    while sitemap_urls and len(seen_sitemaps) < 25:
        url = sitemap_urls.pop(0)
        if url in seen_sitemaps or not clean_url(url): continue
        seen_sitemaps.add(url)
        code, final, _, xml = fetch(url)
        sitemap_checks.append({'url': url, 'status': code, 'final': final})
        if code != 200: continue
        try: root = ET.fromstring(xml)
        except ET.ParseError: continue
        for entry in root:
            values = {child.tag.rsplit('}', 1)[-1]: child.text for child in entry}
            loc = values.get('loc')
            if not loc or not clean_url(loc): continue
            if entry.tag.endswith('sitemap'): sitemap_urls.append(loc)
            else:
                locations.append(loc)
                if values.get('lastmod'): lastmods[loc] = values['lastmod']
    locations = list(dict.fromkeys(locations))
    seeds = list(dict.fromkeys([BASE + '/'] + locations))
    todo = [url for url in seeds if rp.can_fetch(AGENT, url)][:maximum]
    rows, all_links = [], set()

    def inspect(url):
        time.sleep(1)
        code, final, response_headers, body = fetch(url)
        page = Page()
        if code == 200: page.feed(body)
        title = ' '.join(''.join(page.title).split())
        issues = []
        if code != 200: issues.append('http_' + str(code))
        if final != url: issues.append('redirected')
        if code == 200:
            if not title: issues.append('missing_title')
            if not page.meta.get('description'): issues.append('missing_description')
            if len(page.h1s) != 1: issues.append('h1_count_' + str(len(page.h1s)))
            if len(page.canonicals) != 1: issues.append('canonical_count_' + str(len(page.canonicals)))
            elif page.canonicals[0].rstrip('/') != url.rstrip('/'): issues.append('non_self_canonical')
            directives = page.meta.get('robots', '') + ' ' + next((v for k, v in response_headers.items() if k.lower() == 'x-robots-tag'), '')
            if 'noindex' in directives.lower(): issues.append('sitemap_noindex')
            if any(schema.get('parse_error') for schema in page.schemas if isinstance(schema, dict)): issues.append('invalid_json_ld')
            if any(image['alt'] is None for image in page.images): issues.append('missing_image_alt')
            if not page.lang: issues.append('missing_html_lang')
        links = sorted({link for raw in page.links if (link := clean_url(raw, url))})
        return {'url': url, 'status': code, 'final': final, 'title': title, 'description': page.meta.get('description'), 'h1': page.h1s, 'canonical': page.canonicals, 'lang': page.lang, 'alternates': page.alternates, 'word_count': len(' '.join(page.text).split()), 'images': len(page.images), 'schema_blocks': len(page.schemas), 'links': links, 'issues': issues}

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for row in pool.map(inspect, todo):
            rows.append(row)
            all_links.update(row['links'])
    by_url = {clean_url(row['url']): row for row in rows}
    titles = collections.defaultdict(list)
    descriptions = collections.defaultdict(list)
    for row in rows:
        if row['title']: titles[row['title']].append(row['url'])
        if row['description']: descriptions[row['description']].append(row['url'])
    duplicate_titles = {key: value for key, value in titles.items() if len(value) > 1}
    duplicate_descriptions = {key: value for key, value in descriptions.items() if len(value) > 1}
    hreflang_issues = []
    for row in rows:
        for language, target in row['alternates'].items():
            target_row = by_url.get(clean_url(target))
            if target_row and clean_url(row['url']) not in {clean_url(value) for value in target_row['alternates'].values()}:
                hreflang_issues.append({'source': row['url'], 'language': language, 'target': target, 'issue': 'missing_return_link'})
    issue_counts = collections.Counter(issue for row in rows for issue in row['issues'])
    errors = [row for row in rows if row['issues']]
    summary = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'sitemap_urls': len(locations), 'pages_crawled': len(rows), 'crawl_is_capped': len(seeds) > maximum, 'status_counts': dict(collections.Counter(row['status'] for row in rows)), 'issue_counts': dict(issue_counts), 'duplicate_title_groups': len(duplicate_titles), 'duplicate_description_groups': len(duplicate_descriptions), 'hreflang_return_issues': len(hreflang_issues), 'sitemap_urls_without_incoming_links_in_sample': [u for u in locations if u not in all_links][:60]}
    output = {'summary': summary, 'robots': robots, 'sitemaps': sitemap_checks, 'lastmods': lastmods, 'duplicate_titles': duplicate_titles, 'duplicate_descriptions': duplicate_descriptions, 'hreflang_issues': hreflang_issues, 'pages': rows}
    destination = pathlib.Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'summary': summary, 'duplicate_titles': duplicate_titles, 'duplicate_descriptions': duplicate_descriptions, 'hreflang_issues': hreflang_issues[:30], 'problem_pages': errors[:50]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
