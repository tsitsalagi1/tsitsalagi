Tsitsalagi.com custom submission form restore

Use this package if /submit-issue.html or /submit-listing.html reverted to Google Forms.

Upload/replace in GitHub root:
- submit-issue.html
- submit-listing.html
- remove-request.html
- script.js
- _worker.js

Do NOT replace:
- config.js
- wrangler.jsonc
- .assetsignore

Apps Script:
- Open GOOGLE_APPS_SCRIPT_REMOVAL_UPDATE.gs
- Replace the current Apps Script code with it only if you have not already updated Apps Script for author removal/update codes.
- Save and deploy a new Web App version.

After Cloudflare redeploys, test:
- https://tsitsalagi.com/submit-issue.html?fresh=customrestore1
- https://tsitsalagi.com/submit-listing.html?fresh=customrestore1

The custom pages should show:
- Private email for post management
- Photo upload
- Submit button
They should NOT open a Google Form.
