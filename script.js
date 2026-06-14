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

function contactLink(contact) {
  const raw = String(contact || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  let href = '';
  let label = raw;

  if (lower.startsWith('email:')) {
    const email = raw.slice(raw.indexOf(':') + 1).trim();
    href = `mailto:${email}`;
    label = 'Email';
  } else if (lower.startsWith('text:') || lower.startsWith('phone:')) {
    const phone = raw.slice(raw.indexOf(':') + 1).trim();
    href = `tel:${phone.replace(/[^+\d]/g, '')}`;
    label = lower.startsWith('text:') ? 'Text / call' : 'Call';
  } else if (lower.startsWith('link:')) {
    href = raw.slice(raw.indexOf(':') + 1).trim();
    label = 'Open link';
  } else if (lower.includes('@') && !lower.includes(' ')) {
    href = `mailto:${raw}`;
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

function shareButton(label, title, text, url) {
  return `<button class="share-button small-share" type="button"
    data-share-button
    data-share-title="${escapeHtml(title)}"
    data-share-text="${escapeHtml(text)}"
    data-share-url="${escapeHtml(url)}">${escapeHtml(label)}</button>`;
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
  const items = state.listings
    .filter(isApproved)
    .filter((item) => filters.category === 'all' || item.Category === filters.category)
    .filter((item) => filters.area === 'all' || item.Area === filters.area)
    .filter((item) => matchesSearch(item, filters.search, ['Title', 'Category', 'Area', 'Price', 'Description', 'Tags']));

  count.textContent = `${items.length} listing${items.length === 1 ? '' : 's'} shown`;

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">No listings match those filters. Clear filters or check back later.</div>`;
    return;
  }

  grid.innerHTML = items.map((item) => {
    const id = itemId('listing', item.Title, item.Area);
    const url = pageUrl(`#${id}`);
    return `
    <article class="listing-card" id="${escapeHtml(id)}">
      <div class="card-top">
        <span class="tag">${escapeHtml(item.Category || 'Listing')}</span>
        <span class="price">${escapeHtml(item.Price || 'See details')}</span>
      </div>
      <h3>${escapeHtml(item.Title)}</h3>
      <div class="meta-list">
        ${item.Area ? `<span class="pill">${escapeHtml(item.Area)}</span>` : ''}
        ${item.Posted ? `<span class="pill">Posted ${escapeHtml(item.Posted)}</span>` : ''}
        ${item.Expires ? `<span class="pill">Expires ${escapeHtml(item.Expires)}</span>` : ''}
      </div>
      <p class="card-description">${escapeHtml(item.Description)}</p>
      <div class="card-contact">
        <span>Contact the poster directly. Meet safely.</span>
        <div class="card-actions">
          ${contactLink(item.Contact)}
          ${shareButton('Share listing', item.Title || 'Tsitsalagi listing', `Listing on Tsitsalagi${item.Area ? ` in ${item.Area}` : ''}.`, url)}
        </div>
      </div>
    </article>
  `;
  }).join('');
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
  const items = state.issues
    .filter(isApproved)
    .filter((item) => filters.category === 'all' || item.Category === filters.category)
    .filter((item) => filters.status === 'all' || item.Status === filters.status)
    .filter((item) => matchesSearch(item, filters.search, ['Title', 'Category', 'Status', 'Area', 'Question', 'Ask']));

  count.textContent = `${items.length} issue${items.length === 1 ? '' : 's'} shown`;

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">No issues match those filters. Clear filters or check back later.</div>`;
    return;
  }

  grid.innerHTML = items.map((item) => {
    const id = itemId('issue', item.Title, item.Area);
    const url = pageUrl(`#${id}`);
    return `
    <article class="issue-card" id="${escapeHtml(id)}">
      <div class="card-top">
        <span class="tag clay">${escapeHtml(item.Category || 'Issue')}</span>
        <span class="pill ${statusClass(item.Status)}">${escapeHtml(item.Status || 'Open')}</span>
      </div>
      <h3>${escapeHtml(item.Title)}</h3>
      <div class="meta-list">
        ${item.Area ? `<span class="pill">${escapeHtml(item.Area)}</span>` : ''}
        ${item.LastUpdated ? `<span class="pill">Updated ${escapeHtml(item.LastUpdated)}</span>` : ''}
      </div>
      <p class="question"><strong>Citizen question:</strong> ${escapeHtml(item.Question)}</p>
      <p class="ask"><strong>Public ask:</strong> ${escapeHtml(item.Ask)}</p>
      <footer>
        ${item.Source ? `<a href="${escapeHtml(item.Source)}" target="_blank" rel="noopener">Source / related link</a>` : '<span>No source link yet</span>'}
        ${shareButton('Share issue', item.Title || 'Tsitsalagi public issue', `Public issue on Tsitsalagi${item.Area ? ` about ${item.Area}` : ''}.`, url)}
      </footer>
    </article>
  `;
  }).join('');
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

  if (config.listingFormUrl) {
    listingLink.href = config.listingFormUrl;
    if (listingNote) listingNote.textContent = 'Submissions are reviewed before appearing publicly.';
  } else {
    listingLink.href = 'admin-setup.html';
  }

  if (config.issueFormUrl) {
    issueLink.href = config.issueFormUrl;
    if (issueNote) issueNote.textContent = 'Submissions are reviewed before appearing publicly.';
  } else {
    issueLink.href = 'admin-setup.html';
  }

  if (config.contactEmail) {
    contactLinkEl.href = `mailto:${config.contactEmail}`;
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
}

init();
