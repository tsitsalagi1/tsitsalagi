Tsitsalagi photo display fix

Upload these files to the root of your GitHub repo:

script.js
styles.css

Then update your Google Sheet public tabs using the formulas in:

SHEET_PHOTO_PUBLIC_FORMULAS.txt

Why this is needed:
The upload is working. The photo URL is being saved in the Tsitsalagi Public Data sheet.
But the public website only displays what is in the public Approved Listings and Approved Issues CSV tabs.
Those tabs need a Photo URL column.

After upload and sheet formula changes, wait for Cloudflare redeploy and test:
https://tsitsalagi.com/?fresh=photo-display-1

