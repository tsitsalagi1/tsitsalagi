Tsitsalagi Submit Issue Form - GitHub Upload Notes
=================================================

Files included:
- submit-issue.html

Where to upload:
- Upload submit-issue.html to the root of your GitHub repository.
- Then update your website button/link from the old Google Form URL to:
  /submit-issue.html

Important:
This file is styled and ready, but the direct Google Form submission will not work until the Google Form entry IDs are added.

How to get Google Form entry IDs:
1. Open the Submit an Issue Google Form.
2. Click the three dots menu.
3. Choose "Get pre-filled link".
4. Fill every question with obvious fake values, like:
   TITLE_TEST
   CATEGORY_TEST
   AREA_TEST
   QUESTION_TEST
   PUBLIC_ASK_TEST
   SOURCE_LINK_TEST
   DETAILS_TEST
   CONTACT_TEST
   URGENCY_TEST
   CONFIRM_TEST
5. Click "Get link" and copy it.
6. In the copied link, look for values like:
   entry.123456789=TITLE_TEST
7. Match each entry number to the correct field.
8. Open submit-issue.html and replace the values under GOOGLE_FORM_FIELDS.

Example:
issueTitle: 'entry.REPLACE_ISSUE_TITLE'
becomes:
issueTitle: 'entry.123456789'

Redirect:
After submission, the form redirects to:
https://tsitsalagi.com/#issues

You can change that near the bottom of submit-issue.html:
const RETURN_TO_WEBSITE = 'https://tsitsalagi.com/#issues';

File uploads:
Google Form file uploads cannot be submitted through a custom static HTML form.
Use a source/evidence link field instead, or keep the original Google Form for upload-only submissions.
