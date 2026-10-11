"""Import a user-supplied archive; never fetch content or execute archived scripts."""
import json,re,sys,hashlib
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup,Comment
root=Path(__file__).resolve().parents[2]
source=Path(sys.argv[1]).resolve()
manifest=json.loads((source/'migration_manifest.json').read_text())
slugs={a['slug'] for a in manifest}
assets={i['source_url']:i['local_file'] for a in manifest for i in a['images'] if i.get('local_file')}
for a in manifest: assets[a['cover_image_url']]=a['cover_image_local_file']
asset_jobs={}; missing=[]
anchors={}
for entry in manifest:
 parsed=BeautifulSoup(entry['content_html'],'html.parser')
 headings=parsed.find_all('h2') or parsed.find_all('h3')
 anchors[entry['slug']]={h.get('id'):f'section-{i+1}' for i,h in enumerate(headings) if h.get('id')}
def local_image(url):
 path=assets.get(url)
 if not path and 'assets/images/' in url:path='assets/images/'+url.split('assets/images/')[-1]
 if not path or not (source/path).is_file():return None
 key=Path(path).stem
 asset_jobs[key]={'input':str(source/path),'output':str(root/'public/images/blog/imported'/f'{key}.webp')}
 return '/images/blog/imported/'+key+'.webp'
order=[];featured=[]
for f in sorted((source/'listings').glob('*.html')):
 soup=BeautifulSoup(f.read_text(),'html.parser');items=[]
 for a in soup.select('a[href]'):
  slug=a['href'].split('/')[-1].removesuffix('.html')
  if slug in slugs and slug not in items:items.append(slug)
 if not featured:featured=items[:4];items=items[4:]
 order.extend(items)
order=list(dict.fromkeys(order))
posts=[];covers={};counts={}
allowed={'p','div','span','section','aside','h2','h3','h4','h5','h6','ul','ol','li','strong','b','em','i','u','s','a','img','figure','figcaption','blockquote','pre','code','br','hr','table','thead','tbody','tfoot','tr','th','td','details','summary','sup','sub','iframe'}
for a in manifest:
 slug=a['slug'];full=BeautifulSoup((source/a['file']).read_text(),'html.parser');soup=BeautifulSoup(a['content_html'],'html.parser')
 for tag in soup.select('script,style,object,embed,form,input,button,.summarize,.toc-inline'):tag.decompose()
 for frame in soup.find_all('iframe'):
  match=re.fullmatch(r'https://(?:www\.)?youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{11})',frame.get('src',''))
  if not match:frame.decompose()
  else:frame.attrs={'src':'https://www.youtube-nocookie.com/embed/'+match.group(1),'title':'Video: '+a['title']}
 for comment in soup.find_all(string=lambda t:isinstance(t,Comment)):comment.extract()
 main=soup.find('main') or soup
 first_image=main.find('img')
 if first_image and first_image.get('src')==a['cover_image_url']:first_image.decompose()
 headings=[]
 for i,h in enumerate(main.find_all('h2') or main.find_all('h3')):
  old=h.get('id');new=f'section-{i+1}'
  if old:
   for anchor in main.select('a[href]'):
    if anchor.get('href')=='#'+old:anchor['href']='#'+new
  h['id']=new; headings.append({'heading':h.get_text(' ',strip=True),'paragraphs':[]})
 for tag in list(main.find_all(True)):
  if tag.name not in allowed:tag.unwrap();continue
  for attr in list(tag.attrs):
   if attr not in {'href','src','alt','title','id','class','colspan','rowspan','scope','open'}:del tag[attr]
  if tag.has_attr('class'):tag['class']=[c for c in tag['class'] if not c.startswith('svelte-')]
  if tag.name=='a':
   href=tag.get('href','');match=re.search(r'(?:https://(?:www\.)?linktodm\.com)?/blogs/([^?#/]+)',href)
   archived=re.search(r'(?:\.\./articles/|^)([^/]+)\.html(?:#.*)?$',href)
   target=match.group(1) if match else archived.group(1) if archived else None
   if target in slugs:
    fragment=href.split('#',1)[1] if '#' in href else ''
    tag['href']='/blog/'+target+('#'+anchors[target].get(fragment,fragment) if fragment else '')
   elif href.rstrip('/') in {'https://linktodm.com/blogs','/blogs'}:tag['href']='/blog'
   elif not re.match(r'^(https?://|mailto:|/|#)',href):tag.unwrap();continue
   if tag.get('href','').startswith('http'):tag['rel']='noopener noreferrer'
  if tag.name=='iframe':
   tag['loading']='lazy';tag['allow']='encrypted-media; fullscreen; picture-in-picture';tag['allowfullscreen']='';tag['referrerpolicy']='strict-origin-when-cross-origin'
  if tag.name=='img':
   src=local_image(tag.get('src',''))
   if not src:
    missing.append({'slug':slug,'source':tag.get('src','')});tag.decompose();continue
   tag['src']=src;tag['loading']='lazy';tag['decoding']='async';tag['alt']=tag.get('alt') or a['title']
 content=''.join(str(x) for x in main.contents)
 (root/'lib/content/imported-blog'/f'{slug}.html').write_text(content)
 text=main.get_text(' ',strip=True);words=len(text.split());counts[slug]=words
 subtitle=full.select_one('.blog-subtitle');description=subtitle.get_text(' ',strip=True) if subtitle else text
 description=(description[:157].rsplit(' ',1)[0]+'…') if len(description)>160 else description
 if len(description)<81:description=(description+' Explore this detailed Instagram automation and DM marketing guide.')[:160]
 date_match=re.search(r'([A-Z][a-z]+ \d{1,2}, \d{4})',a['published_date']);date='2026-10-01'
 if date_match:
  for fmt in ['%b %d, %Y','%B %d, %Y']:
   try:date=datetime.strptime(date_match[1],fmt).strftime('%Y-%m-%d');break
   except ValueError:pass
 cover=local_image(a['cover_image_url'])
 if not cover:raise ValueError('Missing cover '+slug)
 covers[slug]={'src':cover,'alt':a['title']+' — article cover','width':1200,'height':675}
 intro=main.find('p');posts.append({'slug':slug,'title':a['title'],'subtitle':subtitle.get_text(' ',strip=True) if subtitle else description,'description':description,'publishedAt':date,'updatedAt':date,'readingTime':f'{max(1,round(words/220))} min read','category':'Instagram Marketing','keywords':['Instagram automation','Instagram DM marketing',a['title'][:80]],'visual':'workflow','visualAlt':covers[slug]['alt'],'visualCaption':'Article imagery supplied with the original blog archive.','intro':intro.get_text(' ',strip=True) if intro and len(intro.get_text(' ',strip=True))>=20 else description,'sections':headings,'wordCount':words,'contentLocale':'en','importedArchive':True,'author':a['author']})
posts.sort(key=lambda a:order.index(a['slug']) if a['slug'] in order else 999)
(root/'lib/content/imported-blog/index.json').write_text(json.dumps(posts,ensure_ascii=False,indent=2)+'\n')
(root/'lib/content/imported-blog/covers.json').write_text(json.dumps(covers,ensure_ascii=False,indent=2)+'\n')
(root/'lib/content/imported-blog/slugs.json').write_text(json.dumps([a['slug'] for a in posts],indent=2)+'\n')
(root/'lib/content/imported-blog/featured.json').write_text(json.dumps(featured,indent=2)+'\n')
Path('/tmp/blog-asset-jobs.json').write_text(json.dumps(list(asset_jobs.values())))
report={'articles':len(posts),'images':len(asset_jobs),'missing_inline_images':missing,'source_order_count':len(order),'min_word_count':min(counts.values()),'preserved_source_authors':True,'product_claims':'Original vendor references retained; AP3K credentials and capabilities are not inferred from the source.'}
(root/'docs/research/linktodm-blog-20261001/import-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
