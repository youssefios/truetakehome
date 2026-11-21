"""Build the True Take-Home site.

  python3 build.py                      live site into dist/ (no adverts yet)
  python3 build.py --preview            single page with advert placeholders (index.html here)
  python3 build.py --url https://truetakehome.co.uk/ --adsense ca-pub-123 --slots 111,222,333

Site details live in site.json. Command line options override it for one run.
"""
import re, json, html, os, sys, shutil

here = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(here, 'src', p), encoding='utf-8').read()

S = json.load(open(os.path.join(here, 'site.json'), encoding='utf-8'))
args = sys.argv[1:]
preview = '--preview' in args
for k in ('url', 'adsense', 'slots', 'out', 'host'):
    if '--' + k in args: S[k] = args[args.index('--' + k) + 1]
url = S.get('url', '').strip()
if url and not url.endswith('/'): url += '/'
ads_id = S.get('adsense', '').strip()
slots = [x.strip() for x in str(S.get('slots', '')).split(',') if x.strip()]
ads_on = bool(ads_id) or preview
out_dir = os.path.join(here, S.get('out', 'dist'))

TITLE = 'Take-Home Pay Calculator UK 2026/27 | True Take-Home'
DESC = 'Free UK take-home pay calculator for 2026/27. Salary in, take-home out. Add a student loan, pension, first job or side business only if it applies.'
ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='18' fill='%23FF5533'/%3E%3Ctext x='32' y='45' font-family='Arial,sans-serif' font-size='38' font-weight='700' text-anchor='middle' fill='white'%3E%C2%A3%3C/text%3E%3C/svg%3E"
GFONTS = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
'''
LOCALFONTS = '''<link rel="preload" href="fonts/figtree.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin>
'''
FONTFACE = '''@font-face{font-family:"Bricolage Grotesque";font-style:normal;font-display:swap;font-weight:200 800;src:url(fonts/bricolage.woff2) format("woff2")}
@font-face{font-family:"Figtree";font-style:normal;font-display:swap;font-weight:300 900;src:url(fonts/figtree.woff2) format("woff2")}
'''
css = rd('style.css')
legal = '%s is a trading name of %s, registered in England and Wales, company number %s.' % (S['operator'], S['company'], S['company_no'])


def head(title, desc, page, ld=None, index=True):
    h = ['<!DOCTYPE html>', '<html lang="en-GB">', '<head>', '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<title>%s</title>' % title, '<meta name="description" content="%s">' % desc,
         '<meta name="theme-color" content="#0E1A3A">']
    if not index or S.get('noindex'): h.append('<meta name="robots" content="noindex">')
    if url:
        h += ['<link rel="canonical" href="%s%s">' % (url, page), '<meta property="og:url" content="%s%s">' % (url, page),
              '<meta property="og:image" content="%sog-image.png">' % url, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
              '<meta name="twitter:card" content="summary_large_image">']
    h += ['<meta property="og:title" content="True Take-Home: what will you really take home?">',
          '<meta property="og:description" content="Salary in, take-home out. Switch on student loan, pension, a first job or a side business only if they apply.">',
          '<meta property="og:type" content="website">', '<meta property="og:site_name" content="True Take-Home">', '<meta property="og:locale" content="en_GB">']
    if ads_id:
        h.append('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=%s" crossorigin="anonymous"></script>' % ads_id)
    if preview:
        h.append('<link rel="icon" href="%s">' % ICON)
        h.append(GFONTS.strip())
    else:
        h += ['<link rel="icon" href="favicon.svg" type="image/svg+xml">', '<link rel="apple-touch-icon" href="apple-touch-icon.png">', LOCALFONTS.strip()]
    if ld: h.append('<script type="application/ld+json">%s</script>' % ld)
    h.append('<style>\n' + ('' if preview else FONTFACE) + css + '</style>\n</head>')
    return '\n'.join(h) + '\n'


def footer_links():
    return ('<p class="links"><a href="./">Calculator</a><a href="about.html">About and contact</a><a href="privacy.html">Privacy and cookies</a></p>'
            '<p class="legal">%s Registered office: %s. &copy; 2026 %s.</p>' % (legal, S['office'], S['company']))


# ---------- calculator page
body = rd('body.html')
faq = []
for m in re.finditer(r'<details class="q"><summary>(.*?)</summary>\s*<p>(.*?)</p>', body, re.S):
    text = html.unescape(re.sub(r'<[^>]+>', '', m.group(2))).strip()
    faq.append({'@type': 'Question', 'name': html.unescape(m.group(1)).strip(), 'acceptedAnswer': {'@type': 'Answer', 'text': text}})
app_ld = {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': 'True Take-Home Calculator', 'applicationCategory': 'FinanceApplication',
          'operatingSystem': 'Any', 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'GBP'},
          'publisher': {'@type': 'Organization', 'name': S['company']}}
if url: app_ld['url'] = url
ld = json.dumps([{'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': faq}, app_ld], ensure_ascii=False)

if ads_on:
    cookies = ('The numbers you type stay in your browser. This site is paid for by adverts from Google AdSense, which uses cookies. You can change your choice in the consent message at any time. '
               '<a href="privacy.html">Privacy and cookies</a>')
else:
    cookies = 'The numbers you type stay in your browser and are never sent to us. This site sets no cookies and has no tracking. <a href="privacy.html">Privacy and cookies</a>'
body = body.replace('{{ABOUT}}', 'True Take-Home is a free UK pay calculator from %s. Contact: <a href="mailto:%s">%s</a>.' % (S['operator'], S['email'], S['email']))
body = body.replace('{{COOKIES}}', cookies).replace('{{CHECKED}}', S['checked']).replace('{{FOOTLINKS}}', footer_links())
assert '{{' not in body, 'unfilled token'

placeholder = re.compile(r'[ \t]*<div class="ad( ad-a)?" aria-hidden="true">.*?</div></div>\n')
if not preview:
    units = iter(slots)
    def unit(m):
        if not (ads_id and slots): return ''
        s = next(units, None)
        if not s: return ''
        if m.group(1):
            return '      <div class="ad ad-a live"><ins class="adsbygoogle" style="display:block;width:100%%" data-ad-client="%s" data-ad-slot="%s" data-ad-format="auto" data-full-width-responsive="false"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>\n' % (ads_id, s)
        return '  <div class="ad live"><ins class="adsbygoogle" style="display:block;width:100%%" data-ad-client="%s" data-ad-slot="%s" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>\n' % (ads_id, s)
    body = placeholder.sub(unit, body)
    body = re.sub(r'[ \t]*<!-- AD SLOT.*?-->\n', '', body, flags=re.S)

page = head(TITLE, DESC, '', ld) + '<body>\n' + body + '\n<script id="engine">\n' + rd('engine.js') + '</script>\n\n<script>\n' + rd('app.js') + '</script>\n</body>\n</html>\n'


# ---------- text pages
def text_page(name, title, desc, inner):
    top = ('<div class="wrap">\n  <header class="top">\n    <a class="brand" href="./"><i>£</i><span style="white-space:nowrap">True Take-Home</span></a>\n'
           '    <a class="back" href="./">Calculator</a>\n  </header>\n  <main class="page">\n')
    foot = '  </main>\n  <footer>%s</footer>\n</div>\n' % footer_links()
    return head(title, desc, name) + '<body>\n' + top + inner + foot + '</body>\n</html>\n'


mail = '<a href="mailto:%s">%s</a>' % (S['email'], S['email'])
if ads_on:
    ads_txt = '''<h2>Adverts and cookies</h2>
<p>The site is free because it shows adverts from Google AdSense. Google and its advertising partners use cookies and similar technology to show and measure adverts, and to personalise them if you agree.</p>
<p>The first time you visit you are asked for your choice. You can agree, refuse, or pick what you allow, and you can change your mind at any time from the privacy link the message leaves on the page. Refusing does not stop the calculator working. You may still see adverts, but they will not be based on you.</p>
<p>Google explains <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">how it uses information from sites that use its services</a>. You can also manage advert personalisation at <a href="https://adssettings.google.com" rel="noopener">Google Ads Settings</a>.</p>
<p>We do not set any cookies of our own.</p>'''
    short = 'The numbers you type never leave your device. The only cookies on this site come from the adverts, and you choose whether to allow them.'
else:
    ads_txt = '''<h2>Cookies and adverts</h2>
<p>This site sets no cookies. It has no adverts, no analytics and no tracking.</p>
<p>The plan is to pay for the site with adverts later on. This page will be updated before any advert appears, and you will be asked for your choice first.</p>'''
    short = 'The numbers you type never leave your device. No account, no cookies, no tracking.'
fonts_txt = '' if not preview else '<p>The fonts are loaded from Google Fonts, so Google receives your IP address when the page opens.</p>'
privacy = '''    <h1>Privacy and cookies</h1>
    <p class="lead">Last updated %(date)s.</p>
    <div class="card"><p><strong>The short version.</strong> %(short)s</p></div>
    <h2>Who we are</h2>
    <p>True Take-Home is published by %(op)s. %(legal)s Registered office: %(office)s.</p>
    <h2>What you type</h2>
    <p>Your salary and every other figure you enter are worked out inside your own browser. They are not sent to us or to anyone else, and we cannot see them.</p>
    <p>So you do not have to start from scratch on your next visit, your entries are saved in your browser's storage on your device. Press Start again to clear them, or clear your browser's site data.</p>
    %(ads)s
    <h2>Hosting</h2>
    <p>The site is hosted by %(host)s. Like any web host, it records technical details of each request, such as IP address and browser type, to keep the service running and secure. We do not receive those records.</p>%(fonts)s
    <h2>Your rights</h2>
    <p>UK data protection law gives you the right to ask what personal data an organisation holds about you and to have it corrected or deleted. We hold none from this site, but you are welcome to ask: %(mail)s. You can also complain to the Information Commissioner's Office at <a href="https://ico.org.uk" rel="noopener">ico.org.uk</a>.</p>
    <h2>Changes</h2>
    <p>If this page changes, the date at the top changes with it.</p>
    <h2>Contact</h2>
    <p>%(mail)s</p>
''' % {'date': S['checked'], 'short': short, 'op': S['operator'], 'legal': legal, 'office': S['office'], 'ads': ads_txt, 'host': S.get('host', 'GitHub Pages'), 'fonts': fonts_txt, 'mail': mail}

about = '''    <h1>About True Take-Home</h1>
    <p class="lead">A free UK pay calculator that starts simple and goes as deep as you need.</p>
    <h2>What it does</h2>
    <p>Type your salary and it shows what lands in your bank after Income Tax and National Insurance. If you have a student loan, a pension, a first job that started part way through the year, a side business or a room at home you work from, switch that on and the answer updates.</p>
    <p>It also compares two salaries, an apprenticeship against university, and a sole trader against a limited company.</p>
    <h2>Where the numbers come from</h2>
    <p>Every rate and threshold is taken from GOV.UK and HMRC guidance for the tax year shown, for England, Wales, Northern Ireland and Scotland. The rates were last checked on %(date)s.</p>
    <p>Each line of the result opens up to show how it was worked out, band by band, so you can check it against your payslip. The <a href="./#guides">guides</a> list what the calculator assumes and what it leaves out.</p>
    <h2>What it is not</h2>
    <p>The figures are estimates for general guidance. They are not financial or tax advice, and they cannot allow for everything on your tax code. For a decision that matters, check with HMRC or an accountant. True Take-Home is not affiliated with HMRC or GOV.UK.</p>
    <h2>Who runs it</h2>
    <p>True Take-Home is published by %(op)s. %(legal)s Registered office: %(office)s.</p>
    <h2>Contact</h2>
    <p>Spotted a figure that looks wrong, or want something added? Email %(mail)s.</p>
''' % {'date': S['checked'], 'op': S['operator'], 'legal': legal, 'office': S['office'], 'mail': mail}

notfound = '''    <h1>That page is not here</h1>
    <p class="lead">The link may be old or mistyped.</p>
    <p style="margin-top:18px"><a class="back" href="/">Open the calculator</a></p>
'''

pages = {
    'index.html': page,
    'privacy.html': text_page('privacy.html', 'Privacy and cookies | True Take-Home', 'How True Take-Home handles your data: the numbers you type stay in your browser.', privacy),
    'about.html': text_page('about.html', 'About and contact | True Take-Home', 'What True Take-Home is, where its tax figures come from, who runs it and how to get in touch.', about),
}

if preview:
    for name, txt in pages.items(): open(os.path.join(here, name), 'w', encoding='utf-8').write(txt)
else:
    os.makedirs(os.path.join(out_dir, 'fonts'), exist_ok=True)
    pages['404.html'] = text_page('404.html', 'Page not found | True Take-Home', 'Page not found.', notfound).replace('<meta name="theme-color"', '<meta name="robots" content="noindex">\n<meta name="theme-color"')
    for a, b in (('href="fonts/', 'href="/fonts/'), ('url(fonts/', 'url(/fonts/'), ('href="favicon.svg', 'href="/favicon.svg'), ('href="apple-touch-icon.png', 'href="/apple-touch-icon.png'), ('href="./"', 'href="/"'), ('href="about.html', 'href="/about.html'), ('href="privacy.html', 'href="/privacy.html')):
        pages['404.html'] = pages['404.html'].replace(a, b)
    for name, txt in pages.items(): open(os.path.join(out_dir, name), 'w', encoding='utf-8').write(txt)
    for f in ('favicon.svg', 'apple-touch-icon.png', 'og-image.png'):
        shutil.copy(os.path.join(here, 'assets', f), os.path.join(out_dir, f))
    for f in ('figtree.woff2', 'bricolage.woff2', 'OFL.txt'):
        shutil.copy(os.path.join(here, 'assets', 'fonts', f), os.path.join(out_dir, 'fonts', f))
    if url:
        sm = ''.join('  <url><loc>%s%s</loc></url>\n' % (url, p) for p in ('', 'about.html', 'privacy.html'))
        open(os.path.join(out_dir, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sm + '</urlset>\n')
        open(os.path.join(out_dir, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n' % url)
    if ads_id:
        open(os.path.join(out_dir, 'ads.txt'), 'w').write('google.com, %s, DIRECT, f08c47fec0942fa0\n' % ads_id.replace('ca-', ''))

alltxt = ''.join(pages.values())
print('%s build: index %d bytes, %d pages, %d FAQ entries, adverts %s, em dashes %d, en dashes %d, placeholders left %d' % (
    'preview' if preview else 'live', len(page), len(pages), len(faq), 'on' if ads_on else 'off', alltxt.count('—'), alltxt.count('–'), len(re.findall(r'\[your |XXXX|YOUR-DOMAIN|SLOT_ID', alltxt)) if not preview else 0))
