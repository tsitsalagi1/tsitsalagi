Tsitsalagi resource pages upgrade

Upload/replace these files in the root of your GitHub repo:

index.html
listings.html
issues.html
listing.html
issue.html
resources.html
resource.html
script.js
styles.css

What this adds:
- /resources.html = all approved resources with search/filter
- /resource.html?id=... = one full resource page
- Homepage shows resource preview cards and links to full resource pages
- Navigation points to the full Resources page instead of only the homepage section

Do not replace your working submit forms, worker, config, wrangler.jsonc, .assetsignore, or Cloudflare settings.

After Cloudflare deploys, test:
https://tsitsalagi.com/?fresh=resources1
https://tsitsalagi.com/resources.html?fresh=resources1

Then click a resource title or Read full resource.
