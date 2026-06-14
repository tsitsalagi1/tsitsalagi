Tsitsalagi all-pages upgrade

Upload/replace these files in the root of your GitHub repo:

index.html
listings.html
issues.html
listing.html
issue.html
script.js
styles.css

What this adds:
- /listings.html = all approved listings with search/filter
- /issues.html = all approved issues with search/filter
- /listing.html?id=... = full page for one listing
- /issue.html?id=... = full page for one issue
- Homepage shows shorter preview cards and links to full pages

Do not replace your working submit forms, worker, config, or Cloudflare files unless you intentionally want to change those later.

After Cloudflare deploys, test:
https://tsitsalagi.com/?fresh=detail1
https://tsitsalagi.com/listings.html?fresh=detail1
https://tsitsalagi.com/issues.html?fresh=detail1

Then click any listing or issue title / Read full link.
