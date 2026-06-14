TSITSALAGI STRONG PHOTO UPLOAD SETUP

This package moves new issue/listing submissions away from Google Form-only posting and into the stronger long-term setup:

Website form -> Cloudflare Worker -> Cloudflare R2 photo bucket -> Google Sheet review row -> Approved = yes -> public website.

FILES TO UPLOAD TO GITHUB ROOT
- submit-issue.html
- submit-listing.html
- script.js
- styles.css
- _worker.js

DO NOT upload GOOGLE_APPS_SCRIPT.gs to GitHub unless you want it public. Paste it into Google Apps Script instead.

CLOUDFLARE SETUP
1. In Cloudflare, create an R2 bucket named:
   tsitsalagi-uploads

2. In your Cloudflare Pages/Worker project, add an R2 binding:
   Variable/binding name: PHOTOS_BUCKET
   Bucket: tsitsalagi-uploads

3. In your Cloudflare project environment variables/secrets, add:
   SHEETS_WEBHOOK_URL = your Google Apps Script Web App URL
   SHEETS_TOKEN = a long private secret you choose

Example token idea:
   tsitsalagi_private_upload_token_2026_change_this

GOOGLE SHEETS / APPS SCRIPT SETUP
1. Open Tsitsalagi Public Data Google Sheet.
2. Click Extensions -> Apps Script.
3. Paste the contents of GOOGLE_APPS_SCRIPT.gs.
4. In Apps Script, set Script Property:
   Name: TSITSALAGI_SUBMIT_TOKEN
   Value: same value as Cloudflare SHEETS_TOKEN
5. Deploy -> New deployment -> Web app.
6. Execute as: Me
7. Who has access: Anyone
8. Copy the Web App URL into Cloudflare as SHEETS_WEBHOOK_URL.

GOOGLE SHEET FORMULAS
Open SHEET_FORMULAS.txt and update your Approved Listings and Approved Issues tabs.

TESTING
1. Wait for Cloudflare to deploy.
2. Open:
   https://tsitsalagi.com/submit-issue.html?fresh=photo1
   https://tsitsalagi.com/submit-listing.html?fresh=photo1
3. Submit a test with a small photo.
4. Check the Submit a Issue / Submit a Listings tabs.
5. Change Approved to yes.
6. Check the public website.

IMPORTANT SAFETY SETTINGS
- Current photo max size: 7 MB.
- Allowed image types: JPG, PNG, WebP, GIF.
- Photos are served from your own site under /photos/...
- Review photos before approving. Do not approve IDs, private documents, CDIB cards, driver licenses, private medical/legal documents, or photos of children/private people without permission.
