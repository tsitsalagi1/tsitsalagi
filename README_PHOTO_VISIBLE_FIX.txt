Tsitsalagi photo upload visible-field fix

What this fixes:
- Adds a visible photo/image upload field to submit-issue.html
- Adds a visible photo upload field to submit-listing.html
- Keeps Cloudflare R2 upload support through _worker.js
- Sends Photo URL into the Google Sheet through your Apps Script webhook

Upload/replace these files in the ROOT of your GitHub repo:
- submit-issue.html
- submit-listing.html
- script.js
- styles.css
- _worker.js

Do NOT upload GOOGLE_APPS_SCRIPT.gs to GitHub. That stays in Google Apps Script.

After Cloudflare deploys, test these URLs:
https://tsitsalagi.com/submit-issue.html?fresh=photo-visible-1
https://tsitsalagi.com/submit-listing.html?fresh=photo-visible-1

Where the photo field should appear:
- On issue form: after Tags / keywords and before the agreement checkbox.
- On listing form: after Tags / keywords and before the agreement checkbox.

If you still do not see it, GitHub/Cloudflare is still serving old files. Make sure you replaced submit-issue.html and submit-listing.html, then wait for Cloudflare deployment and open the ?fresh= link.
