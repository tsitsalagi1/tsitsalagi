Tsitsalagi verified author removal/update request setup

Upload/replace these GitHub root files:
- remove-request.html
- script.js
- styles.css
- submit-issue.html
- submit-listing.html
- _worker.js

Do NOT replace:
- config.js
- wrangler.jsonc
- .assetsignore

Apps Script:
1. Open Tsitsalagi Public Data.
2. Extensions > Apps Script.
3. Replace the Apps Script code with GOOGLE_APPS_SCRIPT_REMOVAL_UPDATE.gs.
4. Save.
5. Deploy > Manage deployments > Edit > New version > Deploy.
6. Approve permissions when asked. This version uses MailApp to email removal/update codes.

Sheet columns:
Submit a Listings and Submit a Issue should have:
K Private author email
L Removal code
M Removal status
N Removal requested at

Approved Listings and Approved Issues should NOT include private author email or removal code.

Test:
1. Submit a new listing or issue with a private email.
2. Confirm the row gets a Removal code in column L.
3. Confirm the author email receives the code.
4. Open the listing or issue detail page and click Author removal / mark sold or Author update / mark resolved.
5. Submit the private email + code.
6. Confirm the Removal Requests tab receives the request and M/N update on the source row.
