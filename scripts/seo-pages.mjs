/**
 * Pure HTML and XML rendering for WinAPI Atlas' static SEO pages.
 * No framework and no runtime dependencies.
 */

import {
  SITE_NAME,
  apiLastmod,
  apiMetaDescription,
  apiPageTitle,
  canonicalApiUrl,
  canonicalCategoryUrl,
  categoryLastmod,
  categoryMetaDescription,
  categoryPageTitle,
  normalizeSiteUrl,
  rootCanonicalUrl
} from '../js/seo.js'

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

function pageHead({ title, description, canonical, type, siteUrl, jsonLd }) {
  const image = `${normalizeSiteUrl(siteUrl)}/screenshots/desktop-dark.png`
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta name="color-scheme" content="dark light">
  <meta name="theme-color" content="#0b0f14">

  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${escapeHtml(type)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:alt" content="WinAPI Atlas catalog showing Windows API categories in a dark theme">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/static.css">
  <script type="application/ld+json">${jsonForScript(jsonLd)}</script>
</head>`
}

function siteHeader() {
  return `<header class="site-header">
    <a class="brand" href="/"><span>WinAPI</span> Atlas</a>
    <nav class="site-nav" aria-label="Site">
      <a href="/">Interactive catalog</a>
    </nav>
  </header>`
}

function siteFooter(siteUrl) {
  return `<footer class="site-footer">
    <p>${SITE_NAME} is an independent, expanded Windows API reference for defensive analysis and detection engineering.</p>
    <p>API names and official documentation belong to Microsoft. <a href="${escapeHtml(normalizeSiteUrl(siteUrl))}/">Open the interactive atlas</a>.</p>
  </footer>`
}

function breadcrumbs(items) {
  const entries = items.map((item) => item.href
    ? `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`
    : `<li aria-current="page">${escapeHtml(item.label)}</li>`)
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${entries.join('')}</ol></nav>`
}

function categoryLabel(api, categoryById) {
  return api.categories.map((id) => {
    const category = categoryById.get(id)
    return category
      ? `<a href="/category/${encodeURIComponent(category.id)}">${escapeHtml(category.title)}</a>`
      : escapeHtml(id)
  }).join(', ')
}

function mitreLinks(api) {
  if (!api.mitre?.length) return 'Not mapped'
  return api.mitre.map((tech) => {
    const url = `https://attack.mitre.org/techniques/${escapeHtml(tech.id).replace('.', '/')}/`
    return `<a href="${url}" rel="noopener noreferrer">${escapeHtml(tech.id)} ${escapeHtml(tech.name)}</a>`
  }).join('<br>')
}

function sourceList(api) {
  const items = []
  if (api.docs) {
    const kind = api.docs_kind === 'direct' ? 'direct documentation' : 'related documentation'
    items.push(`<li><a href="${escapeHtml(api.docs)}" rel="noopener noreferrer">Microsoft Learn documentation</a> <span class="muted">(${escapeHtml(kind)})</span></li>`)
  }
  for (const source of api.sources || []) {
    items.push(`<li><a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`)
  }
  if (!items.length) items.push('<li>No documentation or review sources recorded.</li>')
  return `<ul class="source-list">${items.join('')}</ul>`
}

function detectionList(api) {
  const detection = api.detection || {}
  const sysmon = Array.isArray(detection.sysmon_events) && detection.sysmon_events.length
    ? detection.sysmon_events.map((id) => `Sysmon Event ${escapeHtml(id)}`).join(', ')
    : 'No Sysmon event mapped'
  const etw = Array.isArray(detection.etw_providers) && detection.etw_providers.length
    ? detection.etw_providers.map(escapeHtml).join(', ')
    : 'No ETW provider mapped'
  return `<ul class="detection-list">
    <li><strong>Sysmon:</strong> ${sysmon}</li>
    <li><strong>ETW:</strong> ${etw}</li>
    ${detection.notes ? `<li><strong>Notes:</strong> ${escapeHtml(detection.notes)}</li>` : ''}
  </ul>`
}

export function buildApiPage(api, {
  siteUrl,
  generatedAt,
  categories,
  byName
}) {
  const canonical = canonicalApiUrl(siteUrl, api.name)
  const title = apiPageTitle(api)
  const description = apiMetaDescription(api)
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const related = (api.related || [])
    .map((name) => byName.get(name))
    .filter(Boolean)
    .map((item) => `<li><a href="/api/${encodeURIComponent(item.name)}">${escapeHtml(item.name)}</a> — ${escapeHtml(item.library)}</li>`)
    .join('')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: api.name,
    termCode: api.name,
    description,
    url: canonical,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: SITE_NAME,
      url: rootCanonicalUrl(siteUrl)
    }
  }
  const firstCategory = categoryById.get(api.categories[0])

  return `${pageHead({ title, description, canonical, type: 'article', siteUrl, jsonLd })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${siteHeader()}
  <main id="main" class="page">
    ${breadcrumbs([
      { label: 'Catalog', href: '/' },
      ...(firstCategory ? [{ label: firstCategory.title, href: `/category/${encodeURIComponent(firstCategory.id)}` }] : []),
      { label: api.name }
    ])}
    <p class="kicker">Windows API reference</p>
    <h1>${escapeHtml(api.name)}</h1>
    <p class="lede">${escapeHtml(api.description)}</p>

    <dl class="fact-grid">
      <div class="fact"><dt>Library</dt><dd>${escapeHtml(api.library)}</dd></div>
      <div class="fact"><dt>Category</dt><dd>${categoryLabel(api, categoryById)}</dd></div>
      <div class="fact"><dt>Suspicion</dt><dd>${escapeHtml(api.suspicion)}</dd></div>
      <div class="fact"><dt>MITRE ATT&amp;CK</dt><dd>${mitreLinks(api)}</dd></div>
    </dl>

    <section class="section" aria-labelledby="detection">
      <h2 id="detection">Detection summary</h2>
      <p>${escapeHtml(api.detection?.summary || 'No detection summary recorded.')}</p>
      ${detectionList(api)}
    </section>

    <section class="section" aria-labelledby="sources">
      <h2 id="sources">Sources and documentation</h2>
      ${sourceList(api)}
      <p class="note">${api.reviewed_at
        ? `Last reviewed: <time datetime="${escapeHtml(api.reviewed_at)}">${escapeHtml(api.reviewed_at)}</time>.`
        : 'Not yet human-reviewed.'} Page metadata generated <time datetime="${escapeHtml(generatedAt)}">${escapeHtml(generatedAt)}</time>.</p>
    </section>

    <section class="section" aria-labelledby="legitimate-use">
      <h2 id="legitimate-use">Legitimate use</h2>
      <p>${escapeHtml(api.legit_use || 'No legitimate-use note recorded.')}</p>
    </section>

    ${related ? `<section class="section" aria-labelledby="related"><h2 id="related">Related APIs</h2><ul class="source-list">${related}</ul></section>` : ''}

    <a class="cta" href="/#${encodeURIComponent(api.name)}">Open ${escapeHtml(api.name)} in the interactive atlas</a>
  </main>
  ${siteFooter(siteUrl)}
</body>
</html>
`
}

export function buildCategoryPage(category, apis, {
  siteUrl,
  generatedAt,
  categories
}) {
  const canonical = canonicalCategoryUrl(siteUrl, category.id)
  const title = categoryPageTitle(category)
  const description = categoryMetaDescription(category, apis.length)
  const lastmod = categoryLastmod(apis, generatedAt)
  const sorted = [...apis].sort((a, b) => a.name.localeCompare(b.name))
  const items = sorted.map((api) => `<li>
      <a href="/api/${encodeURIComponent(api.name)}">${escapeHtml(api.name)}</a>
      <div class="api-meta">${escapeHtml(api.library)} · ${escapeHtml(api.suspicion)} suspicion${api.mitre?.length ? ` · ${escapeHtml(api.mitre.map((tech) => tech.id).join(', '))}` : ''}</div>
      <p>${escapeHtml(api.description)}</p>
    </li>`).join('')
  const otherCategories = categories
    .filter((item) => item.id !== category.id)
    .map((item) => `<li><a href="/category/${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a></li>`)
    .join('')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonical,
    dateModified: lastmod,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: rootCanonicalUrl(siteUrl)
    }
  }

  return `${pageHead({ title, description, canonical, type: 'website', siteUrl, jsonLd })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${siteHeader()}
  <main id="main" class="page">
    ${breadcrumbs([{ label: 'Catalog', href: '/' }, { label: category.title }])}
    <p class="kicker">Windows API category</p>
    <h1>${escapeHtml(category.title)}</h1>
    <p class="lede">${escapeHtml(category.explanation)}</p>
    <p class="category-summary">${escapeHtml(category.description)} This category contains ${apis.length} API${apis.length === 1 ? '' : 's'}.</p>

    <a class="cta" href="/#?cat=${encodeURIComponent(category.id)}">Open ${escapeHtml(category.title)} in the interactive atlas</a>

    <section class="section" aria-labelledby="apis">
      <h2 id="apis">${escapeHtml(category.title)} APIs</h2>
      <p class="muted">Last reviewed or generated: <time datetime="${escapeHtml(lastmod)}">${escapeHtml(lastmod)}</time>.</p>
      <ul class="api-list">${items}</ul>
    </section>

    <section class="section" aria-labelledby="other-categories">
      <h2 id="other-categories">Other categories</h2>
      <ul class="pill-list">${otherCategories}</ul>
    </section>
  </main>
  ${siteFooter(siteUrl)}
</body>
</html>
`
}

export function buildSitemap({ apis, categories, siteUrl, generatedAt }) {
  const urls = [
    {
      loc: rootCanonicalUrl(siteUrl),
      lastmod: generatedAt,
      changefreq: 'weekly',
      priority: '1.0'
    },
    ...categories.map((category) => {
      const categoryApis = apis.filter((api) => api.categories.includes(category.id))
      return {
        loc: canonicalCategoryUrl(siteUrl, category.id),
        lastmod: categoryLastmod(categoryApis, generatedAt),
        changefreq: 'monthly',
        priority: '0.8'
      }
    }),
    ...apis.map((api) => ({
      loc: canonicalApiUrl(siteUrl, api.name),
      lastmod: apiLastmod(api, generatedAt),
      changefreq: 'monthly',
      priority: '0.7'
    }))
  ]

  const entries = urls.map((url) => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
    <lastmod>${escapeHtml(url.lastmod)}</lastmod>
    <changefreq>${escapeHtml(url.changefreq)}</changefreq>
    <priority>${escapeHtml(url.priority)}</priority>
  </url>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`
}

export function buildRobots(siteUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${normalizeSiteUrl(siteUrl)}/sitemap.xml
`
}
