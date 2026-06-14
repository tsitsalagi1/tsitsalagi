// Tsitsalagi photo upload + sheet submission Worker for Cloudflare Pages/Workers.
// Required Cloudflare settings:
// 1. R2 binding named PHOTOS_BUCKET
// 2. Environment variable SHEETS_WEBHOOK_URL = your Google Apps Script Web App URL
// 3. Secret/environment variable SHEETS_TOKEN = same token used in Apps Script

const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/submit-issue') {
      return handleSubmit(request, env, 'issue');
    }

    if (request.method === 'POST' && url.pathname === '/api/submit-listing') {
      return handleSubmit(request, env, 'listing');
    }

    if (request.method === 'GET' && url.pathname.startsWith('/photos/')) {
      return handlePhoto(request, env, url);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Tsitsalagi Worker is running, but static assets are not configured.', { status: 404 });
  }
};

async function handleSubmit(request, env, type) {
  if (!env.PHOTOS_BUCKET) {
    return json({ ok: false, error: 'R2 bucket binding PHOTOS_BUCKET is not configured.' }, 500);
  }
  if (!env.SHEETS_WEBHOOK_URL || !env.SHEETS_TOKEN) {
    return json({ ok: false, error: 'Google Sheets webhook settings are not configured.' }, 500);
  }

  const formData = await request.formData();
  const fields = type === 'issue' ? readIssueFields(formData) : readListingFields(formData);
  const validationError = validateFields(type, fields, formData);
  if (validationError) return json({ ok: false, error: validationError }, 400);

  let photoUrl = '';
  const photo = formData.get('photo');
  if (photo && typeof photo === 'object' && photo.size > 0) {
    const photoError = validatePhoto(photo);
    if (photoError) return json({ ok: false, error: photoError }, 400);
    const upload = await savePhoto(request, env, type, photo);
    photoUrl = upload.photoUrl;
  }

  const payload = {
    token: env.SHEETS_TOKEN,
    type,
    createdAt: new Date().toISOString(),
    photoUrl,
    fields
  };

  const sheetResponse = await fetch(env.SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  const sheetText = await sheetResponse.text();
  if (!sheetResponse.ok || !sheetText.includes('"ok":true')) {
    console.log('Sheets webhook response:', sheetResponse.status, sheetText);
    return json({ ok: false, error: 'Photo saved, but the sheet submission failed. Check Apps Script deployment and token.' }, 502);
  }

  return json({ ok: true, type, photoUrl });
}

function readIssueFields(formData) {
  return {
    issueTitle: clean(formData.get('issueTitle')),
    category: clean(formData.get('category')),
    area: clean(formData.get('area')),
    severity: clean(formData.get('severity')),
    description: clean(formData.get('description')),
    contact: clean(formData.get('contact')),
    tags: clean(formData.get('tags'))
  };
}

function readListingFields(formData) {
  return {
    listingTitle: clean(formData.get('listingTitle')),
    category: clean(formData.get('category')),
    area: clean(formData.get('area')),
    price: clean(formData.get('price')),
    description: clean(formData.get('description')),
    contact: clean(formData.get('contact')),
    tags: clean(formData.get('tags'))
  };
}

function validateFields(type, fields, formData) {
  if (type === 'issue') {
    if (!fields.issueTitle || !fields.category || !fields.area || !fields.severity || !fields.description || !fields.contact) {
      return 'Missing required issue fields.';
    }
  } else {
    if (!fields.listingTitle || !fields.category || !fields.area || !fields.price || !fields.description || !fields.contact) {
      return 'Missing required listing fields.';
    }
  }
  if (!formData.get('agreement')) return 'Agreement is required.';
  return '';
}

function validatePhoto(photo) {
  if (!ALLOWED_IMAGE_TYPES.has(photo.type)) return 'Only JPG, PNG, WebP, or GIF images are allowed.';
  if (photo.size > MAX_UPLOAD_BYTES) return 'Image is too large. Maximum size is 7 MB.';
  return '';
}

async function savePhoto(request, env, type, photo) {
  const extension = extensionFor(photo.type, photo.name || 'photo');
  const now = new Date();
  const datePath = now.toISOString().slice(0, 10);
  const key = `${type}/${datePath}/${crypto.randomUUID()}.${extension}`;

  await env.PHOTOS_BUCKET.put(key, await photo.arrayBuffer(), {
    httpMetadata: {
      contentType: photo.type,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      originalName: safeMetadata(photo.name || 'photo'),
      uploadType: type,
      uploadedAt: now.toISOString()
    }
  });

  const origin = new URL(request.url).origin;
  return { key, photoUrl: `${origin}/photos/${encodeURIComponent(key).replaceAll('%2F', '/')}` };
}

async function handlePhoto(request, env, url) {
  if (!env.PHOTOS_BUCKET) return new Response('Photo bucket not configured.', { status: 500 });

  const key = decodeURIComponent(url.pathname.replace(/^\/photos\//, ''));
  if (!key || key.includes('..')) return new Response('Not found', { status: 404 });

  const object = await env.PHOTOS_BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', headers.get('cache-control') || 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
}

function clean(value) {
  return String(value || '').trim().slice(0, 4000);
}

function safeMetadata(value) {
  return String(value || '').replace(/[\r\n]/g, ' ').slice(0, 120);
}

function extensionFor(type, filename) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  const match = String(filename).toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match ? match[1] : 'jpg';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json;charset=utf-8' }
  });
}

