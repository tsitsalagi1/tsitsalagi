const config = window.TSITSALAGI_CONFIG || {};
const approvedValue = (value) => String(value || '').trim().toLowerCase();
const isApproved = (row) => config.showUnapproved || ['yes', 'true', 'approved', '1', 'y'].includes(approvedValue(row.Approved));

const state = {
  listings: [],
  issues: [],
  resources: [],
  listingFilters: { search: '', category: 'all', area: 'all' },
  issueFilters: { search: '', category: 'all', status: 'all' },
  resourceFilters: { search: '', category: 'all' }
};

const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('#nav-links');
if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);

  if (!rows.length) return [];
  const headers = rows.shift().map((header) => header.trim().replace(/^\uFEFF/, ''));
  return rows.map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (values[index] || '').trim();
    });
    return item;
  });
}

async function loadCsv(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return parseCsv(await response.text());
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function fillSelect(selectId, values, label) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="all">All ${label}</option>`;
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

function matchesSearch(item, query, keys) {
  if (!query) return true;
  const haystack = keys.map((key) => item[key] || '').join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function adminContactEmail() {
  return config.contactEmail || 'tsitsalagi.com@gmail.com';
}

function gmailComposeUrl(email, subject = '', body = '') {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email || adminContactEmail()
  });
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function contactReportUrl(options = {}) {
  const params = new URLSearchParams();
  const email = options.email || adminContactEmail();
  params.set('to', email);
  params.set('subject', options.subject || 'Tsitsalagi Contact / Report');
  if (options.body) params.set('body', options.body);
  if (options.type) params.set('type', options.type);
  if (options.title) params.set('title', options.title);
  if (options.url) params.set('url', options.url);
  return `/contact-report.html?${params.toString()}`;
}

function contactLink(contact) {
  const raw = String(contact || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  let href = '';
  let label = raw;

  if (lower.startsWith('email:')) {
    const email = raw.slice(raw.indexOf(':') + 1).trim();
    href = gmailComposeUrl(email, 'Tsitsalagi listing contact');
    label = 'Email';
  } else if (lower.startsWith('text:') || lower.startsWith('phone:')) {
    const phone = raw.slice(raw.indexOf(':') + 1).trim();
    href = `tel:${phone.replace(/[^+\d]/g, '')}`;
    label = lower.startsWith('text:') ? 'Text / call' : 'Call';
  } else if (lower.startsWith('link:')) {
    href = raw.slice(raw.indexOf(':') + 1).trim();
    label = 'Open link';
  } else if (lower.includes('@') && !lower.includes(' ')) {
    href = gmailComposeUrl(raw, 'Tsitsalagi listing contact');
    label = 'Email';
  } else if (lower.startsWith('http')) {
    href = raw;
    label = 'Open link';
  }

  if (!href) return `<span>${escapeHtml(raw)}</span>`;
  return `<a class="contact-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}


function slugify(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'item';
}

function itemId(prefix, ...parts) {
  return `${prefix}-${slugify(parts.filter(Boolean).join('-'))}`;
}

function pageUrl(anchor = '') {
  return `${window.location.origin}${window.location.pathname}${anchor}`;
}


function isHomePage() {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path === '' || path === '/index.html';
}

function boardPageUrl(type) {
  return type === 'issue' ? '/issues.html' : '/listings.html';
}

function detailPageUrl(type, item) {
  const id = itemId(type, item.Title, item.Area);
  return `/${type}.html?id=${encodeURIComponent(id)}`;
}

function displayDate(item, keys) {
  for (const key of keys) {
    if (item[key]) return item[key];
  }
  return '';
}

function sortNewest(items, keys) {
  return items
    .map((item, index) => ({ item, index, date: itemDate(item, keys) }))
    .sort((a, b) => (b.date - a.date) || (b.index - a.index))
    .map((entry) => entry.item);
}

function previewText(value, max = 240) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function findItemForDetail(type, items) {
  const params = new URLSearchParams(window.location.search);
  const wanted = params.get('id') || window.location.hash.replace(/^#/, '');
  if (!wanted) return null;
  return items.filter(isApproved).find((item) => itemId(type, item.Title, item.Area) === wanted) || null;
}

function shareButton(label, title, text, url) {
  return `<button class="share-button small-share" type="button"
    data-share-button
    data-share-title="${escapeHtml(title)}"
    data-share-text="${escapeHtml(text)}"
    data-share-url="${escapeHtml(url)}">${escapeHtml(label)}</button>`;
}

function reportMessage(type, title) {
  return [
    'Hello Tsitsalagi,',
    '',
    `I would like to report or request a correction for a public ${type || 'post'}.`,
    title ? `Title: ${title}` : '',
    '',
    'What needs to be changed, corrected, or reviewed:',
    '',
    '',
    'My preferred contact method, if a reply is needed:',
    '',
    '',
    'Thank you.'
  ].filter(Boolean).join('\n');
}

function reportLink(type, title, url) {
  const subject = `Report or correction request: ${title || type || 'Tsitsalagi'}`;
  const body = reportMessage(type, title);
  const href = contactReportUrl({ type, title, subject, body });
  return `<a class="report-link" href="${escapeHtml(href)}">Report / correct</a>`;
}

function parseDateValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function itemDate(item, keys) {
  for (const key of keys) {
    const value = parseDateValue(item[key]);
    if (value) return value;
  }
  return 0;
}

function recentItems(items, keys, count = 3) {
  return items
    .filter(isApproved)
    .map((item, index) => ({ item, index, date: itemDate(item, keys) }))
    .sort((a, b) => (b.date - a.date) || (b.index - a.index))
    .slice(0, count)
    .map((entry) => entry.item);
}

function renderLatest() {
  const listingBox = document.getElementById('latest-listings');
  const issueBox = document.getElementById('latest-issues');

  document.querySelectorAll('[data-listings-link]').forEach((link) => { link.href = '/listings.html'; });
  document.querySelectorAll('[data-issues-link]').forEach((link) => { link.href = '/issues.html'; });

  if (listingBox) {
    const listings = recentItems(state.listings, ['Posted', 'Updated', 'LastUpdated'], 3);
    listingBox.innerHTML = listings.length ? listings.map((item) => {
      const detailUrl = detailPageUrl('listing', item);
      return `<a class="latest-item" href="${escapeHtml(detailUrl)}">
        <span>${escapeHtml(item.Category || 'Listing')}</span>
        <strong>${escapeHtml(item.Title)}</strong>
        <small>${escapeHtml([item.Area, item.Price].filter(Boolean).join(' • ') || 'View listing')}</small>
      </a>`;
    }).join('') : '<div class="empty-state small-empty">No approved listings yet.</div>';
  }

  if (issueBox) {
    const issues = recentItems(state.issues, ['LastUpdated', 'Updated', 'Posted'], 3);
    issueBox.innerHTML = issues.length ? issues.map((item) => {
      const detailUrl = detailPageUrl('issue', item);
      return `<a class="latest-item" href="${escapeHtml(detailUrl)}">
        <span>${escapeHtml(item.Status || 'Issue')}</span>
        <strong>${escapeHtml(item.Title)}</strong>
        <small>${escapeHtml([item.Area, item.Category].filter(Boolean).join(' • ') || 'View issue')}</small>
      </a>`;
    }).join('') : '<div class="empty-state small-empty">No approved issues yet.</div>';
  }
}

function renderFeaturedResources() {
  const box = document.getElementById('featured-resources');
  if (!box) return;
  const items = state.resources.filter(isApproved).slice(0, 4);
  if (!items.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `
    <div class="featured-head">
      <strong>Featured resources</strong>
      <span>Start with official links and high-use services.</span>
    </div>
    <div class="featured-grid">
      ${items.map((item) => `<a class="featured-link" href="${escapeHtml(item.Link || item.URL || '#resources')}" target="_blank" rel="noopener">
        <span>${escapeHtml(item.Category || 'Resource')}</span>
        <strong>${escapeHtml(item.Title)}</strong>
      </a>`).join('')}
    </div>
  `;
}

async function copyShareText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
  return copied;
}

async function handleShare(button) {
  const title = button.dataset.shareTitle || document.title;
  const text = button.dataset.shareText || '';
  const url = button.dataset.shareUrl || window.location.href;
  const originalText = button.textContent;
  const copyText = [title, text, url].filter(Boolean).join('\n');

  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await copyShareText(copyText);
      button.textContent = 'Link copied';
      setTimeout(() => { button.textContent = originalText; }, 1800);
    }
  } catch (error) {
    if (error && error.name === 'AbortError') return;
    try {
      await copyShareText(copyText);
      button.textContent = 'Link copied';
      setTimeout(() => { button.textContent = originalText; }, 1800);
    } catch (copyError) {
      button.textContent = 'Copy failed';
      setTimeout(() => { button.textContent = originalText; }, 1800);
    }
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-share-button]');
  if (!button) return;
  event.preventDefault();
  handleShare(button);
});


function renderListings() {
  const grid = document.getElementById('listing-grid');
  const count = document.getElementById('listing-count');
  if (!grid) return;

  const filters = state.listingFilters;
  let items = state.listings
    .filter(isApproved)
    .filter((item) => filters.category === 'all' || item.Category === filters.category)
    .filter((item) => filters.area === 'all' || item.Area === filters.area)
    .filter((item) => matchesSearch(item, filters.search, ['Title', 'Category', 'Area', 'Price', 'Description', 'Tags']));

  items = sortNewest(items, ['Posted', 'Updated', 'LastUpdated']);
  const total = items.length;
  const homePreview = isHomePage();
  const visibleItems = homePreview ? items.slice(0, 6) : items;

  if (count) {
    count.textContent = homePreview
      ? `Showing ${visibleItems.length} newest of ${total} approved listing${total === 1 ? '' : 's'}`
      : `${items.length} listing${items.length === 1 ? '' : 's'} shown`;
  }

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">No listings match those filters. Clear filters or check back later.</div>`;
    return;
  }

  grid.innerHTML = visibleItems.map((item) => {
    const id = itemId('listing', item.Title, item.Area);
    const detailUrl = detailPageUrl('listing', item);
    return `
    <article class="listing-card" id="${escapeHtml(id)}">
      <div class="card-top">
        <span class="tag">${escapeHtml(item.Category || 'Listing')}</span>
        <span class="price">${escapeHtml(item.Price || 'See details')}</span>
      </div>
      <h3><a class="card-title-link" href="${escapeHtml(detailUrl)}">${escapeHtml(item.Title)}</a></h3>
      ${photoHtml(item, 'listing')}
      <div class="meta-list">
        ${item.Area ? `<span class="pill">${escapeHtml(item.Area)}</span>` : ''}
        ${item.Posted ? `<span class="pill">Posted ${escapeHtml(item.Posted)}</span>` : ''}
        ${item.Expires ? `<span class="pill">Expires ${escapeHtml(item.Expires)}</span>` : ''}
      </div>
      <p class="card-description">${escapeHtml(previewText(item.Description, 210))}</p>
      <div class="card-contact">
        <span>Contact the poster directly. Meet safely.</span>
        <div class="card-actions">
          <a class="contact-link" href="${escapeHtml(detailUrl)}">Read full listing</a>
          ${contactLink(item.Contact)}
          ${shareButton('Share listing', item.Title || 'Tsitsalagi listing', `Listing on Tsitsalagi${item.Area ? ` in ${item.Area}` : ''}.`, `${window.location.origin}${detailUrl}`)}
          ${reportLink('listing', item.Title, detailUrl)}
        </div>
      </div>
    </article>
  `;
  }).join('') + (homePreview && total > visibleItems.length ? `<div class="view-all-card"><a class="button primary" href="/listings.html">View all ${total} listings</a></div>` : '');
}

function itemPhotoUrl(item) {
  const preferredKeys = [
    'Photo URL', 'PhotoURL', 'Photo Url', 'Photo',
    'Image URL', 'ImageURL', 'Image Url', 'Image',
    'Picture URL', 'PictureURL', 'Attachment URL', 'Upload URL'
  ];

  for (const key of preferredKeys) {
    const value = String(item[key] || '').trim();
    if (isLikelyPhotoUrl(value)) return value;
  }

  // Safety fallback: if the Google Sheet header is still named something like
  // "Agreement to rules" but the cell contains an uploaded photo URL, detect it anyway.
  for (const value of Object.values(item)) {
    const raw = String(value || '').trim();
    if (isLikelyPhotoUrl(raw)) return raw;
  }

  return '';
}

function isLikelyPhotoUrl(value) {
  if (!value) return false;
  const lower = String(value).trim().toLowerCase();
  if (!lower.startsWith('http')) return false;
  return lower.includes('/photos/')
    || lower.includes('r2.dev')
    || lower.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?|#|$)/);
}

function photoHtml(item, type) {
  const url = itemPhotoUrl(item);
  if (!url) return '';
  const title = item.Title || type || 'Tsitsalagi photo';
  return `<a class="card-photo" href="${escapeHtml(url)}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(title)} photo">
    <img src="${escapeHtml(url)}" alt="${escapeHtml(title)} photo" loading="lazy" />
  </a>`;
}

function statusClass(status) {
  const s = normalize(status);
  if (s.includes('wait')) return 'status-waiting';
  if (s.includes('research')) return 'status-researching';
  if (s.includes('resolved') || s.includes('closed')) return 'status-resolved';
  return 'status-open';
}

function renderIssues() {
  const grid = document.getElementById('issue-grid');
  const count = document.getElementById('issue-count');
  if (!grid) return;

  const filters = state.issueFilters;
  let items = state.issues
    .filter(isApproved)
    .filter((item) => filters.category === 'all' || item.Category === filters.category)
    .filter((item) => filters.status === 'all' || item.Status === filters.status)
    .filter((item) => matchesSearch(item, filters.search, ['Title', 'Category', 'Status', 'Area', 'Question', 'Ask']));

  items = sortNewest(items, ['LastUpdated', 'Updated', 'Posted']);
  const total = items.length;
  const homePreview = isHomePage();
  const visibleItems = homePreview ? items.slice(0, 6) : items;

  if (count) {
    count.textContent = homePreview
      ? `Showing ${visibleItems.length} newest of ${total} approved issue${total === 1 ? '' : 's'}`
      : `${items.length} issue${items.length === 1 ? '' : 's'} shown`;
  }

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">No issues match those filters. Clear filters or check back later.</div>`;
    return;
  }

  grid.innerHTML = visibleItems.map((item) => {
    const id = itemId('issue', item.Title, item.Area);
    const detailUrl = detailPageUrl('issue', item);
    const question = item.Question || item.Description || '';
    const ask = item.Ask || '';
    return `
    <article class="issue-card" id="${escapeHtml(id)}">
      <div class="card-top">
        <span class="tag clay">${escapeHtml(item.Category || 'Issue')}</span>
        <span class="pill ${statusClass(item.Status)}">${escapeHtml(item.Status || 'Open')}</span>
      </div>
      <h3><a class="card-title-link" href="${escapeHtml(detailUrl)}">${escapeHtml(item.Title)}</a></h3>
      ${photoHtml(item, 'issue')}
      <div class="meta-list">
        ${item.Area ? `<span class="pill">${escapeHtml(item.Area)}</span>` : ''}
        ${item.LastUpdated ? `<span class="pill">Updated ${escapeHtml(item.LastUpdated)}</span>` : ''}
      </div>
      ${question ? `<p class="question"><strong>Citizen question:</strong> ${escapeHtml(previewText(question, 220))}</p>` : ''}
      ${ask ? `<p class="ask"><strong>Public ask:</strong> ${escapeHtml(previewText(ask, 180))}</p>` : ''}
      <footer>
        <a class="contact-link" href="${escapeHtml(detailUrl)}">Read full issue</a>
        ${item.Source ? `<a href="${escapeHtml(item.Source)}" target="_blank" rel="noopener">Source / related link</a>` : '<span>No source link yet</span>'}
        ${shareButton('Share issue', item.Title || 'Tsitsalagi public issue', `Public issue on Tsitsalagi${item.Area ? ` about ${item.Area}` : ''}.`, `${window.location.origin}${detailUrl}`)}
        ${reportLink('issue', item.Title, detailUrl)}
      </footer>
    </article>
  `;
  }).join('') + (homePreview && total > visibleItems.length ? `<div class="view-all-card"><a class="button primary" href="/issues.html">View all ${total} issues</a></div>` : '');
}

function renderDetailPages() {
  renderListingDetail();
  renderIssueDetail();
}

function renderListingDetail() {
  const box = document.getElementById('listing-detail');
  if (!box) return;
  const item = findItemForDetail('listing', state.listings);
  if (!item) {
    box.innerHTML = `<div class="empty-state detail-empty"><h2>Listing not found</h2><p>This listing may have been removed, not approved yet, or the link may be old.</p><a class="button primary" href="/listings.html">Back to all listings</a></div>`;
    return;
  }

  document.title = `${item.Title || 'Listing'} | Tsitsalagi`;
  const detailUrl = `${window.location.origin}${detailPageUrl('listing', item)}`;
  box.innerHTML = `
    <article class="detail-card listing-detail-card">
      <div class="detail-kicker">
        <span class="tag">${escapeHtml(item.Category || 'Listing')}</span>
        <span class="price">${escapeHtml(item.Price || 'See details')}</span>
      </div>
      <h1>${escapeHtml(item.Title)}</h1>
      ${photoHtml(item, 'listing')}
      <div class="meta-list detail-meta">
        ${item.Area ? `<span class="pill">${escapeHtml(item.Area)}</span>` : ''}
        ${item.Posted ? `<span class="pill">Posted ${escapeHtml(item.Posted)}</span>` : ''}
        ${item.Expires ? `<span class="pill">Expires ${escapeHtml(item.Expires)}</span>` : ''}
        ${item.Tags ? `<span class="pill">${escapeHtml(item.Tags)}</span>` : ''}
      </div>
      <section class="detail-section">
        <h2>Listing details</h2>
        <p>${nl2br(item.Description || 'No description provided.')}</p>
      </section>
      <section class="detail-section">
        <h2>Contact</h2>
        <p>Use the public contact method provided by the poster. Meet safely and verify details before paying or sharing information.</p>
        <div class="card-actions detail-actions">
          ${contactLink(item.Contact) || `<span>${escapeHtml(item.Contact || 'No contact method listed')}</span>`}
          ${shareButton('Share listing', item.Title || 'Tsitsalagi listing', `Listing on Tsitsalagi${item.Area ? ` in ${item.Area}` : ''}.`, detailUrl)}
          ${reportLink('listing', item.Title, detailUrl)}
        </div>
      </section>
      <div class="detail-nav">
        <a class="button ghost" href="/listings.html">Back to all listings</a>
        <a class="button secondary" href="/submit-listing.html">Submit a listing</a>
      </div>
    </article>`;
}

function renderIssueDetail() {
  const box = document.getElementById('issue-detail');
  if (!box) return;
  const item = findItemForDetail('issue', state.issues);
  if (!item) {
    box.innerHTML = `<div class="empty-state detail-empty"><h2>Issue not found</h2><p>This issue may have been removed, not approved yet, or the link may be old.</p><a class="button primary" href="/issues.html">Back to all issues</a></div>`;
    return;
  }

  document.title = `${item.Title || 'Issue'} | Tsitsalagi`;
  const detailUrl = `${window.location.origin}${detailPageUrl('issue', item)}`;
  const question = item.Question || item.Description || '';
  const ask = item.Ask || '';
  box.innerHTML = `
    <article class="detail-card issue-detail-card">
      <div class="detail-kicker">
        <span class="tag clay">${escapeHtml(item.Category || 'Issue')}</span>
        <span class="pill ${statusClass(item.Status)}">${escapeHtml(item.Status || 'Open')}</span>
      </div>
      <h1>${escapeHtml(item.Title)}</h1>
      ${photoHtml(item, 'issue')}
      <div class="meta-list detail-meta">
        ${item.Area ? `<span class="pill">${escapeHtml(item.Area)}</span>` : ''}
        ${item.LastUpdated ? `<span class="pill">Updated ${escapeHtml(item.LastUpdated)}</span>` : ''}
        ${item.Tags ? `<span class="pill">${escapeHtml(item.Tags)}</span>` : ''}
      </div>
      <section class="detail-section">
        <h2>Issue description</h2>
        <p>${nl2br(question || 'No description provided.')}</p>
      </section>
      ${ask ? `<section class="detail-section"><h2>Public ask</h2><p>${nl2br(ask)}</p></section>` : ''}
      ${item.Source ? `<section class="detail-section"><h2>Source or related link</h2><p><a href="${escapeHtml(item.Source)}" target="_blank" rel="noopener">Open source / related link</a></p></section>` : ''}
      <section class="detail-section">
        <h2>Share or report</h2>
        <div class="card-actions detail-actions">
          ${shareButton('Share issue', item.Title || 'Tsitsalagi public issue', `Public issue on Tsitsalagi${item.Area ? ` about ${item.Area}` : ''}.`, detailUrl)}
          ${reportLink('issue', item.Title, detailUrl)}
        </div>
      </section>
      <div class="detail-nav">
        <a class="button ghost" href="/issues.html">Back to all issues</a>
        <a class="button secondary" href="/submit-issue.html">Submit an issue</a>
      </div>
    </article>`;
}

function renderResources() {
  const grid = document.getElementById('resource-grid');
  if (!grid) return;

  const filters = state.resourceFilters;
  const items = state.resources
    .filter(isApproved)
    .filter((item) => filters.category === 'all' || item.Category === filters.category)
    .filter((item) => matchesSearch(item, filters.search, ['Title', 'Category', 'Description']));

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">No resources match those filters.</div>`;
    return;
  }

  grid.innerHTML = items.map((item) => {
    const id = itemId('resource', item.Title, item.Category);
    const url = pageUrl(`#${id}`);
    return `
    <article class="resource-card" id="${escapeHtml(id)}">
      <span class="tag gold">${escapeHtml(item.Category || 'Resource')}</span>
      <h3>${escapeHtml(item.Title)}</h3>
      <p>${escapeHtml(item.Description)}</p>
      <div class="card-actions resource-actions">
        ${(item.Link || item.URL) ? `<a href="${escapeHtml(item.Link || item.URL)}" target="_blank" rel="noopener">Open resource</a>` : ''}
        ${shareButton('Share resource', item.Title || 'Tsitsalagi resource', 'Useful resource listed on Tsitsalagi.', url)}
        ${reportLink('resource', item.Title, url)}
      </div>
    </article>
  `;
  }).join('');
}

function setupFilters() {
  fillSelect('listing-category', uniqueValues(state.listings.filter(isApproved), 'Category'), 'categories');
  fillSelect('listing-area', uniqueValues(state.listings.filter(isApproved), 'Area'), 'areas');
  fillSelect('issue-category', uniqueValues(state.issues.filter(isApproved), 'Category'), 'categories');
  fillSelect('issue-status', uniqueValues(state.issues.filter(isApproved), 'Status'), 'statuses');
  fillSelect('resource-category', uniqueValues(state.resources.filter(isApproved), 'Category'), 'categories');

  const listingSearch = document.getElementById('listing-search');
  const listingCategory = document.getElementById('listing-category');
  const listingArea = document.getElementById('listing-area');
  const issueSearch = document.getElementById('issue-search');
  const issueCategory = document.getElementById('issue-category');
  const issueStatus = document.getElementById('issue-status');
  const resourceSearch = document.getElementById('resource-search');
  const resourceCategory = document.getElementById('resource-category');

  listingSearch?.addEventListener('input', (event) => { state.listingFilters.search = event.target.value; renderListings(); });
  listingCategory?.addEventListener('change', (event) => { state.listingFilters.category = event.target.value; renderListings(); });
  listingArea?.addEventListener('change', (event) => { state.listingFilters.area = event.target.value; renderListings(); });
  document.getElementById('clear-listing-filters')?.addEventListener('click', () => {
    state.listingFilters = { search: '', category: 'all', area: 'all' };
    if (listingSearch) listingSearch.value = '';
    if (listingCategory) listingCategory.value = 'all';
    if (listingArea) listingArea.value = 'all';
    renderListings();
  });

  issueSearch?.addEventListener('input', (event) => { state.issueFilters.search = event.target.value; renderIssues(); });
  issueCategory?.addEventListener('change', (event) => { state.issueFilters.category = event.target.value; renderIssues(); });
  issueStatus?.addEventListener('change', (event) => { state.issueFilters.status = event.target.value; renderIssues(); });
  document.getElementById('clear-issue-filters')?.addEventListener('click', () => {
    state.issueFilters = { search: '', category: 'all', status: 'all' };
    if (issueSearch) issueSearch.value = '';
    if (issueCategory) issueCategory.value = 'all';
    if (issueStatus) issueStatus.value = 'all';
    renderIssues();
  });

  resourceSearch?.addEventListener('input', (event) => { state.resourceFilters.search = event.target.value; renderResources(); });
  resourceCategory?.addEventListener('change', (event) => { state.resourceFilters.category = event.target.value; renderResources(); });
}

function setupLinks() {
  const listingLink = document.getElementById('listing-form-link');
  const issueLink = document.getElementById('issue-form-link');
  const contactLinkEl = document.getElementById('contact-link');
  const listingNote = document.getElementById('listing-form-note');
  const issueNote = document.getElementById('issue-form-note');

  if (listingLink) {
    if (config.listingFormUrl) {
      listingLink.href = config.listingFormUrl;
      if (listingNote) listingNote.textContent = 'Submissions are reviewed before appearing publicly.';
    } else {
      listingLink.href = '/submit-listing.html';
      if (listingNote) listingNote.textContent = 'Submissions are reviewed before appearing publicly.';
    }
  }

  if (issueLink) {
    if (config.issueFormUrl) {
      issueLink.href = config.issueFormUrl;
      if (issueNote) issueNote.textContent = 'Submissions are reviewed before appearing publicly.';
    } else {
      issueLink.href = '/submit-issue.html';
      if (issueNote) issueNote.textContent = 'Submissions are reviewed before appearing publicly.';
    }
  }

  if (contactLinkEl) {
    contactLinkEl.href = contactReportUrl({
      subject: 'Tsitsalagi Contact / Report',
      body: 'Message for Tsitsalagi:\n\n'
    });
    contactLinkEl.target = '_self';
    contactLinkEl.removeAttribute('rel');
  }
}

async function init() {
  setupLinks();
  const listingGrid = document.getElementById('listing-grid');
  const issueGrid = document.getElementById('issue-grid');
  const resourceGrid = document.getElementById('resource-grid');

  try {
    state.listings = await loadCsv(config.listingsCsvUrl || 'data/listings.csv');
  } catch (error) {
    console.error('Listings CSV failed:', error);
    state.listings = [];
    if (listingGrid) listingGrid.innerHTML = `<div class="empty-state">Could not load listings. Open the Approved Listings CSV link from config.js and confirm it shows public CSV text.</div>`;
  }

  try {
    state.issues = await loadCsv(config.issuesCsvUrl || 'data/issues.csv');
  } catch (error) {
    console.error('Issues CSV failed:', error);
    state.issues = [];
    if (issueGrid) issueGrid.innerHTML = `<div class="empty-state">Could not load issues. Open the Approved Issues CSV link from config.js and confirm it shows public CSV text.</div>`;
  }

  try {
    state.resources = await loadCsv(config.resourcesCsvUrl || 'data/resources.csv');
  } catch (error) {
    console.error('Resources CSV failed:', error);
    state.resources = [];
    if (resourceGrid) resourceGrid.innerHTML = `<div class="empty-state">Could not load resources. Upload data/resources.csv or publish a Resources CSV link.</div>`;
  }

  setupFilters();

  if (state.listings.length) renderListings();
  if (state.issues.length) renderIssues();
  if (state.resources.length) renderResources();
  renderLatest();
  renderFeaturedResources();
  renderDetailPages();
}

init();
