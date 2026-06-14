TSITSALAGI — Submit Listing custom form update

Upload these files to the ROOT of your GitHub repo:

1. submit-listing.html
2. config.js
3. script.js

This update changes the homepage "Open listing form" button to:

/submit-listing.html

The custom listing form submits into your Google Form using these mapped entry IDs:

Listing title: entry.1230016632
Listing category: entry.1110620413
Area / town / county: entry.571113392
Price / cost: entry.1127442236
Listing description: entry.1751129888
Public contact method: entry.1678035951
Tags / keywords: entry.408853371
Agreement: entry.1735219399

After submission, the visitor redirects back to:

https://tsitsalagi.com/#listings

Test after Cloudflare deploys:

https://tsitsalagi.com/submit-listing.html?fresh=1

Submit a test listing, then check your Google Form response sheet.
