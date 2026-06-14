Tsitsalagi Submit Issue Form - Google Form Ready

Upload these files to the ROOT of your GitHub repo:

1. submit-issue.html
2. config.js
3. script.js

What this update does:
- Adds the custom Tsitsalagi-styled Submit an Issue page.
- Makes the homepage Open Issue Form button point to /submit-issue.html.
- Submits the custom form into your existing Google Form using the entry IDs from your pre-filled link.
- Redirects the visitor back to https://tsitsalagi.com/#issues after submission.

Google Form field mapping used:
- Issue title: entry.1264954800
- Issue category: entry.448298041
- Area / town / county: entry.1391773237
- Severity / urgency: entry.40337481
- Issue description: entry.819802142
- Public contact method: entry.1471154427
- Tags / keywords: entry.1930413836
- Agreement to rules: entry.531598003

After uploading:
1. Wait for Cloudflare to deploy.
2. Open https://tsitsalagi.com/submit-issue.html?fresh=1
3. Submit a test issue.
4. Confirm it appears in your Google Form response sheet.
5. Approve it in the sheet if you want it public on Tsitsalagi.
