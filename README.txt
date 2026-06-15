Upload config.js to the root of GitHub.

This fixes the homepage buttons so:
- Open listing form -> /submit-listing.html
- Open issue form -> /submit-issue.html

Reason: the old config.js still pointed listingFormUrl and issueFormUrl to Google Forms, and script.js uses those config values when wiring the homepage buttons.
