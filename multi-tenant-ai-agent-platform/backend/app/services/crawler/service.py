import asyncio
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup
from urllib import robotparser


async def crawl(start_url, max_pages=25, max_depth=2, delay=.25):
    """Crawl same-host HTML pages, honoring robots.txt and explicit/declared sitemaps."""
    start = str(start_url)
    parsed = urlparse(start)
    domain = parsed.netloc.lower()
    origin = f"{parsed.scheme}://{parsed.netloc}"
    rp = robotparser.RobotFileParser()
    rp.set_url(f"{origin}/robots.txt")
    try:
        rp.read()
    except Exception:
        pass

    headers = {"User-Agent": "MultiTenantAIAgentPlatformBot/1.0"}
    pages, seen = [], set()
    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=headers) as client:
        async def sitemap_urls(sitemap_url):
            if urlparse(sitemap_url).netloc.lower() != domain:
                return []
            try:
                response = await client.get(sitemap_url)
                response.raise_for_status()
                root = ET.fromstring(response.content)
                found = []
                for element in root.iter():
                    if element.tag.rsplit("}", 1)[-1] == "loc" and element.text:
                        candidate = element.text.strip()
                        if urlparse(candidate).netloc.lower() == domain:
                            found.append(candidate)
                return found
            except Exception:
                return []

        # Support a sitemap URL directly, or discover sitemap declarations in robots.txt.
        seeds = []
        if parsed.path.lower().endswith(".xml") or "sitemap" in parsed.path.lower():
            seeds = await sitemap_urls(start)
        else:
            try:
                declared = rp.site_maps() or []
            except Exception:
                declared = []
            for sitemap in declared[:10]:
                seeds.extend(await sitemap_urls(sitemap))
            seeds.append(start)

        queue = [(url, 0) for url in dict.fromkeys(seeds)]
        while queue and len(pages) < max(1, min(int(max_pages), 500)):
            url, depth = queue.pop(0)
            u = urlparse(url)
            if url in seen or depth > max_depth or u.netloc.lower() != domain:
                continue
            if u.scheme not in {"http", "https"}:
                continue
            seen.add(url)
            try:
                if not rp.can_fetch(headers["User-Agent"], url):
                    continue
                response = await client.get(url)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").lower()
                if "html" not in content_type and not url.endswith("/"):
                    continue
                soup = BeautifulSoup(response.text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer", "noscript"]):
                    tag.decompose()
                title = soup.title.get_text(" ", strip=True) if soup.title else url
                content = " ".join(soup.get_text(" ", strip=True).split())
                if content:
                    pages.append((url, title, content))
                if depth < max_depth:
                    for anchor in soup.find_all("a", href=True):
                        nxt = urljoin(url, anchor["href"]).split("#")[0]
                        nu = urlparse(nxt)
                        if nu.scheme in {"http", "https"} and nu.netloc.lower() == domain and nxt not in seen:
                            queue.append((nxt, depth + 1))
                await asyncio.sleep(max(0, delay))
            except Exception:
                continue
    return pages
