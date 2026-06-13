// Tsitsalagi configuration
// Replace the local CSV files with published Google Sheets CSV links when ready.
// Daily listings/issues can then be updated from Google Sheets without editing code.

window.TSITSALAGI_CONFIG = {
  listingsCsvUrl: "data/listings.csv",
  issuesCsvUrl: "data/issues.csv",
  resourcesCsvUrl: "data/resources.csv",

  // Replace these with your Google Form URLs.
  listingFormUrl: "",
  issueFormUrl: "",

  // Replace with a public project email, not a private personal email if you can avoid it.
  contactEmail: "dynamictech.nwa@gmail.com",

  // Change to true if you want cards to show unapproved rows from local demo data.
  // Keep false for public use.
  showUnapproved: false
};
