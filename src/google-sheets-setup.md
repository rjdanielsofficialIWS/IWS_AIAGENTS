# Google Sheets Integration Setup

This guide will help you set up Google Sheets integration for the contact form.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "AI Agents Leads" or similar
4. Add the following headers in row 1:
   - A1: Name
   - B1: Email
   - C1: Phone
   - D1: Business
   - E1: Services
   - F1: AI Requirements
   - G1: Timestamp

## Step 2: Create Google Apps Script

1. In your Google Sheet, go to `Extensions > Apps Script`
2. Replace the default code with the following:

```javascript
function doPost(e) {
  try {
    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Parse the JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Append the data to the sheet
    sheet.appendRow([
      data.name,
      data.email,
      data.phone,
      data.business,
      data.services,
      data.aiRequirements,
      data.timestamp
    ]);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput("Web app is working!")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## Step 3: Deploy the Apps Script

1. Click on "Deploy" > "New deployment"
2. Choose type: "Web app"
3. Description: "AI Agents Form Handler"
4. Execute as: "Me"
5. Who has access: "Anyone"
6. Click "Deploy"
7. Copy the Web app URL that appears

## Step 4: Update Your Website Code

1. Open `src/App.tsx`
2. Find the line: `const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';`
3. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your Web app URL

## Step 5: Test the Integration

1. Submit a test form on your website
2. Check your Google Sheet to see if the data appears
3. If there are issues, check the Apps Script logs in the Google Apps Script editor

## Security Notes

- The Apps Script is set to "Anyone" access to allow form submissions
- Consider adding additional validation or rate limiting if needed
- For production use, you may want to implement additional security measures

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure the Apps Script is deployed as a web app with "Anyone" access
2. **Data Not Appearing**: Check the Apps Script execution log for errors
3. **Form Not Submitting**: Open browser developer tools to check for JavaScript errors

### Testing the Apps Script:

You can test your deployed web app by visiting the URL directly - it should show "Web app is working!"

### Updating the Script:

If you make changes to the Apps Script:
1. Save the changes
2. Click "Deploy" > "Manage deployments"
3. Click the edit icon next to your deployment
4. Create a "New version"
5. Click "Deploy"

The URL will remain the same, but the changes will take effect.