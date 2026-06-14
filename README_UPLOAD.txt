TSITSALAGI FORM LOGO / ICON FIX

Upload the files in this ZIP to the ROOT of your GitHub repository.

Important files to replace:
- submit-issue.html
- submit-listing.html

Included asset files are also provided in case GitHub/Cloudflare still has an older icon:
- favicon.png
- favicon.ico
- favicon-192.png
- favicon-512.png
- apple-touch-icon.png
- site.webmanifest
- logo.png

What changed:
- The submit issue page now uses /favicon.png in the header brand mark.
- The submit listing page now uses /favicon.png in the header brand mark.
- Both pages include the root favicon/apple-touch-icon/manifest links.
- Google Form submission mappings were preserved.

After upload:
1. Wait for Cloudflare to deploy.
2. Open these with a fresh cache-busting URL:
   https://tsitsalagi.com/submit-issue.html?fresh=logo1
   https://tsitsalagi.com/submit-listing.html?fresh=logo1
3. Use Ctrl+F5 or an incognito window if the old icon still appears.
