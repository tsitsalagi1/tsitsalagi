# Tsitsalagi Community Board

A free static website for **Tsitsalagi.com** that works as a Cherokee community listings board and citizen issue hub.

It is designed to be hosted free on Cloudflare Pages / Workers and updated from Google Sheets.

## Files

- `index.html` — public website
- `styles.css` — design
- `script.js` — loads/filter listings, issues, resources
- `config.js` — change Google Sheet CSV links, form links, and contact email
- `admin-setup.html` — setup guide for Google Forms + Sheets
- `data/listings.csv` — starter local listing data
- `data/issues.csv` — starter local issue data
- `data/resources.csv` — starter local resources

## How updates work

The site reads CSV data. Right now it reads local CSV files in the `data/` folder. Later you can replace those with published Google Sheets CSV links in `config.js`.

Example:

```js
window.TSITSALAGI_CONFIG = {
  listingsCsvUrl: "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv",
  issuesCsvUrl: "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv",
  resourcesCsvUrl: "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv",
  listingFormUrl: "https://forms.gle/...",
  issueFormUrl: "https://forms.gle/...",
  contactEmail: "contact@tsitsalagi.com",
  showUnapproved: false
};
```

## Google Sheet column formats

### Listings

```csv
Approved,Title,Category,Area,Price,Description,Contact,Posted,Expires,Tags
```

Contact examples:

- `email: name@example.com`
- `text: 555-555-0101`
- `phone: 555-555-0101`
- `link: https://example.com`

### Issues

```csv
Approved,Title,Category,Status,Area,Question,Ask,Source,LastUpdated
```

Good status examples:

- `Open`
- `Researching`
- `Waiting on response`
- `Resolved`

### Resources

```csv
Approved,Title,Category,Description,Link
```

## Moderation rule

Do not publish raw Google Form responses. Use a private response sheet, then copy approved rows to an approved public sheet or approved tab. Publish only approved data.

## Prohibited items

Do not allow: firearms, ammunition, weapons, explosives, alcohol, tobacco, nicotine, cannabis, THC, CBD, drugs, adult content, counterfeit goods, stolen items, hazardous materials, fake IDs, private documents, or anything illegal.

## Updating on GitHub from a phone

1. Open the GitHub repository.
2. Use desktop site if the upload button is hidden.
3. Upload these files and folders.
4. Commit to `main`.
5. Cloudflare should redeploy automatically.

## Next step

After uploading this version, create two Google Forms:

1. Submit a Listing
2. Submit a Public Issue

Then create approved Google Sheets and paste the published CSV links into `config.js`.


## Branding updates included

This build applies both logo options:

1. The new logo is used on the public site itself (header and footer branding).
2. The new logo is also used for browser/app/share branding (favicon, Apple touch icon, web manifest, and social preview metadata).


## Favicon-only header update

This build stops using the full logo in the mobile header. It uses a small favicon-style icon beside plain text for a cleaner mobile layout. The favicon files are included in the root folder.


## Next usefulness upgrade

This build adds user-focused improvements:

- How to use Tsitsalagi section
- Latest listings and latest issues section
- Featured resources strip
- Listing safety warning
- Report / correction links on listing, issue, and resource cards
- Privacy-first public warning not to send private documents
