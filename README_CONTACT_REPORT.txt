Tsitsalagi Contact / Report long-term fix

Upload these files to the root of your GitHub repo:

1. contact-report.html
2. script.js

Optional but recommended, also upload these if you want the correction/takedown links on the submit forms to use the new contact page:

3. submit-issue.html
4. submit-listing.html

What this changes:
- The main Contact / Report link no longer depends only on mailto.
- Report / correct buttons open /contact-report.html with a prefilled subject and message.
- The contact page gives users three options: Open Gmail, copy email/message, or open the default email app.

Test after Cloudflare redeploys:
https://tsitsalagi.com/contact-report.html?fresh=contact1

Then click a Report / correct button on a listing or issue.
