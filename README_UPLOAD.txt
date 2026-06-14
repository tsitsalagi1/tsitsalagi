TSITSALAGI SUBMIT ISSUE FORM PATCH

Upload these files to the ROOT of your GitHub repo:

1. submit-issue.html
   - New custom Submit an Issue page styled to match Tsitsalagi.

2. config.js
   - Changes the homepage "Open issue form" button from the Google Form link to:
     /submit-issue.html
   - Keeps your listing form, CSV links, resources, and contact email.

3. script.js
   - Small link-handling fix so the local issue form opens in the same tab instead of a new tab.
   - External Google Forms still open safely in a new tab.

IMPORTANT ABOUT SUBMISSIONS

The custom issue form is visually ready, but Google Forms requires hidden entry IDs before a custom HTML form can post directly into your existing Google Form and then redirect back to Tsitsalagi.

Until those entry IDs are added, the custom page will safely fall back by sending users to your original Google Issue Form so submissions are not lost.

To finish direct submit + redirect:
1. Open your Google Issue Form.
2. Three dots > Get pre-filled link.
3. Put obvious fake text in each field, like TITLE_TEST, CATEGORY_TEST, AREA_TEST.
4. Copy the pre-filled link.
5. Send that pre-filled link to ChatGPT.
6. ChatGPT can replace the entry.REPLACE_* placeholders in submit-issue.html.

After that, the form can submit directly and redirect users back to:
https://tsitsalagi.com/#issues

Do not upload IDs, CDIB cards, birthdates, private records, passwords, or private documents through this public form workflow.
