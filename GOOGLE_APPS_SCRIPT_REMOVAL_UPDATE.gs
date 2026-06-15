// Tsitsalagi Google Sheets webhook for photo uploads + verified author removal/update requests.
// Replace your current Apps Script code with this entire file, save, and deploy a new Web App version.
// Script property required: TSITSALAGI_SUBMIT_TOKEN = same value as Cloudflare SHEETS_TOKEN.
// Optional script property: TSITSALAGI_ADMIN_EMAIL = where removal request notices should go. Defaults to tsitsalagi.com@gmail.com.

function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expectedToken = PropertiesService.getScriptProperties().getProperty('TSITSALAGI_SUBMIT_TOKEN');

    if (!expectedToken || payload.token !== expectedToken) {
      return json_({ ok: false, error: 'Unauthorized or missing token.' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return json_({ ok: false, error: 'No active spreadsheet. Bind this script to the Tsitsalagi Public Data sheet.' });

    if (payload.action === 'removal-request') {
      return handleRemovalRequest_(ss, payload);
    }

    if (payload.type === 'issue') {
      appendIssue_(ss, payload);
    } else if (payload.type === 'listing') {
      appendListing_(ss, payload);
    } else {
      return json_({ ok: false, error: 'Unknown submission type.' });
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function appendIssue_(ss, payload) {
  var sheet = getOrCreateSheet_(ss, 'Submit a Issue');
  ensureHeaders_(sheet, ['Timestamp', 'Issue title', 'Issue category', 'Area / town / county', 'Severity / urgency', 'Issue description', 'Public contact method', 'Tags / keywords', 'Photo URL', 'Approved', 'Private author email', 'Removal code', 'Removal status', 'Removal requested at']);
  var f = payload.fields || {};
  var code = makeRemovalCode_();
  sheet.appendRow([
    new Date(), f.issueTitle || '', f.category || '', f.area || '', f.severity || '', f.description || '', f.contact || '', f.tags || '', payload.photoUrl || '', '', normalizeEmail_(f.privateEmail), code, '', ''
  ]);
  sendAuthorCodeEmail_(normalizeEmail_(f.privateEmail), 'issue', f.issueTitle || '', code);
}

function appendListing_(ss, payload) {
  var sheet = getOrCreateSheet_(ss, 'Submit a Listings');
  ensureHeaders_(sheet, ['Timestamp', 'Listing title', 'Listing category', 'Area / town / county', 'Price', 'Listing description', 'Public contact method', 'Tags / keywords', 'Photo URL', 'Approved', 'Private author email', 'Removal code', 'Removal status', 'Removal requested at']);
  var f = payload.fields || {};
  var code = makeRemovalCode_();
  sheet.appendRow([
    new Date(), f.listingTitle || '', f.category || '', f.area || '', f.price || '', f.description || '', f.contact || '', f.tags || '', payload.photoUrl || '', '', normalizeEmail_(f.privateEmail), code, '', ''
  ]);
  sendAuthorCodeEmail_(normalizeEmail_(f.privateEmail), 'listing', f.listingTitle || '', code);
}

function handleRemovalRequest_(ss, payload) {
  var type = String(payload.type || '').toLowerCase();
  if (type !== 'listing' && type !== 'issue') return json_({ ok: false, error: 'Unknown removal request type.' });

  var sheetName = type === 'listing' ? 'Submit a Listings' : 'Submit a Issue';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return json_({ ok: false, error: 'Submission sheet not found.' });

  var privateEmail = normalizeEmail_(payload.privateEmail);
  var code = normalizeCode_(payload.removalCode);
  if (!privateEmail || !code) return json_({ ok: false, error: 'Private author email and removal code are required.' });

  ensureHeaders_(sheet, type === 'listing'
    ? ['Timestamp', 'Listing title', 'Listing category', 'Area / town / county', 'Price', 'Listing description', 'Public contact method', 'Tags / keywords', 'Photo URL', 'Approved', 'Private author email', 'Removal code', 'Removal status', 'Removal requested at']
    : ['Timestamp', 'Issue title', 'Issue category', 'Area / town / county', 'Severity / urgency', 'Issue description', 'Public contact method', 'Tags / keywords', 'Photo URL', 'Approved', 'Private author email', 'Removal code', 'Removal status', 'Removal requested at']);

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return json_({ ok: false, error: 'No matching post found.' });
  var headers = headerMap_(data[0]);
  var emailCol = headers['private author email'];
  var codeCol = headers['removal code'];
  var statusCol = headers['removal status'];
  var requestedCol = headers['removal requested at'];
  var titleCol = headers[type === 'listing' ? 'listing title' : 'issue title'];
  var approvedCol = headers['approved'];

  if (emailCol == null || codeCol == null) return json_({ ok: false, error: 'Private author email or removal code column missing.' });

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    var rowEmail = normalizeEmail_(data[i][emailCol]);
    var rowCode = normalizeCode_(data[i][codeCol]);
    if (rowEmail === privateEmail && rowCode === code) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex < 0) {
    return json_({ ok: false, error: 'Private email and removal code do not match an author record.' });
  }

  var title = String(payload.title || sheet.getRange(rowIndex, titleCol + 1).getValue() || '').trim();
  var now = new Date();
  var reason = String(payload.reason || '').trim();
  var message = String(payload.message || '').trim();
  var itemUrl = String(payload.itemUrl || '').trim();
  var approved = approvedCol == null ? '' : String(sheet.getRange(rowIndex, approvedCol + 1).getValue() || '').trim();

  if (statusCol != null) sheet.getRange(rowIndex, statusCol + 1).setValue('Verified request: ' + reason);
  if (requestedCol != null) sheet.getRange(rowIndex, requestedCol + 1).setValue(now);

  var requests = getOrCreateSheet_(ss, 'Removal Requests');
  ensureHeaders_(requests, ['Timestamp', 'Type', 'Title', 'Source sheet', 'Source row', 'Author email', 'Reason', 'Message', 'Public URL', 'Approved value at request', 'Verified', 'Admin action', 'Notes']);
  requests.appendRow([now, type, title, sheetName, rowIndex, privateEmail, reason, message, itemUrl, approved, 'Yes', '', '']);

  notifyAdmin_(type, title, privateEmail, reason, message, itemUrl, rowIndex, sheetName);
  return json_({ ok: true });
}

function sendAuthorCodeEmail_(email, type, title, code) {
  if (!email) return;
  var label = type === 'listing' ? 'listing' : 'issue';
  var subject = 'Your Tsitsalagi.com ' + label + ' removal/update code';
  var link = 'https://tsitsalagi.com/remove-request.html?type=' + encodeURIComponent(type) + '&title=' + encodeURIComponent(title || '');
  var body = [
    'Hello,', '',
    'Thank you for submitting to Tsitsalagi.com Community Board.', '',
    'Keep this email. You will need this private code if your ' + label + ' needs to be removed, marked sold, marked resolved, or corrected later.', '',
    'Title: ' + (title || '(not provided)'),
    'Removal/update code: ' + code, '',
    'Request removal or update here:',
    link, '',
    'This code is private. Do not post it publicly or share it with anyone who should not control your post.', '',
    'Tsitsalagi.com Community Board'
  ].join('\n');
  MailApp.sendEmail({ to: email, subject: subject, body: body });
}

function notifyAdmin_(type, title, email, reason, message, itemUrl, rowIndex, sheetName) {
  var admin = PropertiesService.getScriptProperties().getProperty('TSITSALAGI_ADMIN_EMAIL') || 'tsitsalagi.com@gmail.com';
  var subject = 'Verified removal/update request: ' + (title || type);
  var body = [
    'A verified author removal/update request was received.', '',
    'Type: ' + type,
    'Title: ' + (title || ''),
    'Author email: ' + email,
    'Reason: ' + reason,
    'Source sheet: ' + sheetName,
    'Source row: ' + rowIndex,
    'Public URL: ' + (itemUrl || ''), '',
    'Message:',
    message || '(none)', '',
    'Review the Removal Requests tab before changing Approved/Public status.'
  ].join('\n');
  MailApp.sendEmail({ to: admin, subject: subject, body: body });
}

function makeRemovalCode_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCode_(value) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function headerMap_(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[String(headers[i] || '').trim().toLowerCase()] = i;
  }
  return map;
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, headers) {
  for (var i = 0; i < headers.length; i++) {
    var cell = sheet.getRange(1, i + 1);
    if (!cell.getValue()) cell.setValue(headers[i]);
  }
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
