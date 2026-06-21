var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _worker.js
var MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
var ALLOWED_IMAGE_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        worker: "tsitsalagi",
        hasPhotosBucket: !!env.PHOTOS_BUCKET,
        hasSheetsWebhookUrl: !!env.SHEETS_WEBHOOK_URL,
        hasSheetsToken: !!env.SHEETS_TOKEN,
        time: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    if (request.method === "POST" && url.pathname === "/api/submit-issue") {
      return safeHandleSubmit(request, env, "issue");
    }
    if (request.method === "POST" && url.pathname === "/api/submit-listing") {
      return safeHandleSubmit(request, env, "listing");
    }
    if (request.method === "POST" && url.pathname === "/api/removal-request") {
      return safeHandleRemovalRequest(request, env);
    }
    if (request.method === "GET" && url.pathname.startsWith("/photos/")) {
      return handlePhoto(request, env, url);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Tsitsalagi Worker is running, but static assets are not configured.", { status: 404 });
  }
};
async function safeHandleSubmit(request, env, type) {
  try {
    return await handleSubmit(request, env, type);
  } catch (err) {
    const message = readableError(err);
    console.log("Tsitsalagi submit error:", message, err && err.stack ? err.stack : "");
    return json({ ok: false, error: message }, 500);
  }
}
__name(safeHandleSubmit, "safeHandleSubmit");
async function safeHandleRemovalRequest(request, env) {
  try {
    return await handleRemovalRequest(request, env);
  } catch (err) {
    const message = readableError(err);
    console.log("Tsitsalagi removal request error:", message, err && err.stack ? err.stack : "");
    return json({ ok: false, error: message }, 500);
  }
}
__name(safeHandleRemovalRequest, "safeHandleRemovalRequest");
async function handleSubmit(request, env, type) {
  if (!env.PHOTOS_BUCKET) return json({ ok: false, error: "Cloudflare R2 binding missing: PHOTOS_BUCKET." }, 500);
  if (!env.SHEETS_WEBHOOK_URL) return json({ ok: false, error: "Runtime variable missing: SHEETS_WEBHOOK_URL." }, 500);
  if (!env.SHEETS_TOKEN) return json({ ok: false, error: "Runtime secret missing: SHEETS_TOKEN." }, 500);
  const formData = await request.formData();
  const fields = type === "issue" ? readIssueFields(formData) : readListingFields(formData);
  const validationError = validateFields(type, fields, formData);
  if (validationError) return json({ ok: false, error: validationError }, 400);
  let photoUrl = "";
  const photo = formData.get("photo");
  if (photo && typeof photo === "object" && photo.size > 0) {
    const upload = await savePhoto(request, env, type, photo);
    photoUrl = upload.photoUrl;
  }
  const payload = {
    token: env.SHEETS_TOKEN,
    action: "submit",
    type,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    photoUrl,
    fields
  };
  const sheetResult = await postToSheets(env, payload);
  if (!sheetResult.ok) return json(sheetResult, 502);
  return json({ ok: true, type, photoUrl });
}
__name(handleSubmit, "handleSubmit");
async function handleRemovalRequest(request, env) {
  if (!env.SHEETS_WEBHOOK_URL) return json({ ok: false, error: "Runtime variable missing: SHEETS_WEBHOOK_URL." }, 500);
  if (!env.SHEETS_TOKEN) return json({ ok: false, error: "Runtime secret missing: SHEETS_TOKEN." }, 500);
  const contentType = request.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) {
    data = await request.json();
  } else {
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) data[key] = clean(value);
  }
  const type = clean(data.type).toLowerCase();
  const privateEmail = clean(data.privateEmail || data.authorEmail).toLowerCase();
  const removalCode = clean(data.removalCode || data.code).replace(/\s+/g, "").toUpperCase();
  const reason = clean(data.reason);
  if (!["listing", "issue"].includes(type)) return json({ ok: false, error: "Choose listing or issue." }, 400);
  if (!isEmail(privateEmail)) return json({ ok: false, error: "Enter the private author email used when the post was submitted." }, 400);
  if (!removalCode || removalCode.length < 6) return json({ ok: false, error: "Enter the removal/update code from the author email." }, 400);
  if (!reason) return json({ ok: false, error: "Choose a removal or update reason." }, 400);
  const payload = {
    token: env.SHEETS_TOKEN,
    action: "removal-request",
    type,
    requestedAt: (/* @__PURE__ */ new Date()).toISOString(),
    title: clean(data.title),
    privateEmail,
    removalCode,
    reason,
    message: clean(data.message),
    itemUrl: clean(data.itemUrl || data.url)
  };
  const sheetResult = await postToSheets(env, payload);
  if (!sheetResult.ok) {
    const isAuth = /not match|not found|private email|code/i.test(sheetResult.error || "");
    return json({ ok: false, error: isAuth ? "That private email and removal code did not match an author record. Please check the code email or contact Tsitsalagi.com Community Board." : sheetResult.error }, isAuth ? 403 : 502);
  }
  return json({ ok: true });
}
__name(handleRemovalRequest, "handleRemovalRequest");
async function postToSheets(env, payload) {
  let sheetResponse;
  let sheetText = "";
  try {
    sheetResponse = await fetch(env.SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    sheetText = await sheetResponse.text();
  } catch (err) {
    return { ok: false, error: "Could not reach Google Apps Script webhook: " + readableError(err) };
  }
  if (!sheetResponse.ok) {
    return { ok: false, error: `Google Apps Script returned HTTP ${sheetResponse.status}: ${trimForDisplay(sheetText)}` };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(sheetText);
  } catch (err) {
    parsed = null;
  }
  if (!parsed || parsed.ok !== true) {
    return { ok: false, error: parsed && parsed.error ? parsed.error : `Google Apps Script did not confirm success. Response: ${trimForDisplay(sheetText)}` };
  }
  return { ok: true, data: parsed };
}
__name(postToSheets, "postToSheets");
function readIssueFields(formData) {
  return {
    issueTitle: clean(formData.get("issueTitle")),
    category: clean(formData.get("category")),
    area: clean(formData.get("area")),
    severity: clean(formData.get("severity")),
    description: clean(formData.get("description")),
    sourceLink: clean(formData.get("sourceLink")),
    contact: clean(formData.get("contact")),
    privateEmail: clean(formData.get("privateEmail")).toLowerCase(),
    tags: clean(formData.get("tags"))
  };
}
__name(readIssueFields, "readIssueFields");
function readListingFields(formData) {
  return {
    listingTitle: clean(formData.get("listingTitle")),
    category: clean(formData.get("category")),
    area: clean(formData.get("area")),
    price: clean(formData.get("price")),
    description: clean(formData.get("description")),
    contact: clean(formData.get("contact")),
    privateEmail: clean(formData.get("privateEmail")).toLowerCase(),
    tags: clean(formData.get("tags"))
  };
}
__name(readListingFields, "readListingFields");
function validateFields(type, fields, formData) {
  if (type === "issue") {
    if (!fields.issueTitle || !fields.category || !fields.area || !fields.severity || !fields.description || !fields.contact) return "Missing required issue fields.";
  } else {
    if (!fields.listingTitle || !fields.category || !fields.area || !fields.price || !fields.description || !fields.contact) return "Missing required listing fields.";
  }
  if (!isEmail(fields.privateEmail)) return "Private author email is required so the author can later request removal or updates.";
  if (!formData.get("agreement")) return "Agreement is required.";
  return "";
}
__name(validateFields, "validateFields");
async function savePhoto(request, env, type, photo) {
  if (!ALLOWED_IMAGE_TYPES.has(photo.type)) throw new Error("Only JPG, PNG, WebP, or GIF images are allowed. Detected type: " + (photo.type || "unknown"));
  if (photo.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large. Maximum size is 7 MB.");
  const extension = extensionFor(photo.type, photo.name || "photo");
  const now = /* @__PURE__ */ new Date();
  const datePath = now.toISOString().slice(0, 10);
  const key = `${type}/${datePath}/${crypto.randomUUID()}.${extension}`;
  await env.PHOTOS_BUCKET.put(key, await photo.arrayBuffer(), {
    httpMetadata: { contentType: photo.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { originalName: safeMetadata(photo.name || "photo"), uploadType: type, uploadedAt: now.toISOString() }
  });
  const origin = new URL(request.url).origin;
  return { key, photoUrl: `${origin}/photos/${encodeURIComponent(key).replaceAll("%2F", "/")}` };
}
__name(savePhoto, "savePhoto");
async function handlePhoto(request, env, url) {
  if (!env.PHOTOS_BUCKET) return new Response("Photo bucket not configured.", { status: 500 });
  const key = decodeURIComponent(url.pathname.replace(/^\/photos\//, ""));
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });
  const object = await env.PHOTOS_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", headers.get("cache-control") || "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
__name(handlePhoto, "handlePhoto");
function clean(value) {
  return String(value || "").trim().slice(0, 4e3);
}
__name(clean, "clean");
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}
__name(isEmail, "isEmail");
function safeMetadata(value) {
  return String(value || "").replace(/[\r\n]/g, " ").slice(0, 120);
}
__name(safeMetadata, "safeMetadata");
function trimForDisplay(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 700);
}
__name(trimForDisplay, "trimForDisplay");
function readableError(err) {
  return String(err && err.message ? err.message : err || "Unknown error");
}
__name(readableError, "readableError");
function extensionFor(type, filename) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  const match = String(filename).toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match ? match[1] : "jpg";
}
__name(extensionFor, "extensionFor");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json;charset=utf-8" } });
}
__name(json, "json");
export {
  worker_default as default
};
//# sourceMappingURL=_worker.js.map
