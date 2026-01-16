# Dynamic Demo Pages System - User Guide

## Overview

This system allows you to create dynamic demo pages for Vapi AI Widget Agents that are stored in Supabase. Each record in the database automatically creates a corresponding webpage accessible via a unique URL slug.

## Features

- Database-driven demo pages
- Real-time updates without code deployment
- Custom URL slugs for each demo
- Full control over AI assistant behavior
- Active/Inactive status management
- Easy-to-use dashboard interface

## How It Works

### Database Structure

The system uses a `demo_pages` table with the following structure:

- `slug` - URL identifier (e.g., "demo", "john", "business")
- `assistant_id` - Vapi AI assistant ID from your Vapi dashboard
- `system_prompt` - Instructions that define the AI's behavior
- `first_message` - Initial greeting message shown to users
- `is_active` - Whether the page is publicly accessible
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### URL Structure

Each demo page is accessible at:
```
infinitewealthsolutionsai.com/{slug}
```

Examples:
- `infinitewealthsolutionsai.com/demo` - Default demo page
- `infinitewealthsolutionsai.com/john` - Custom demo for John
- `infinitewealthsolutionsai.com/business-demo` - Business demo variant

### Default Behavior

- If you visit `/demo` or no slug is specified, the system displays the record with slug "demo"
- The default demo page is pre-configured and ready to use

## Managing Demo Pages

### Accessing the Dashboard

1. Log in to your account
2. Navigate to the "Demo Pages" section in the dashboard sidebar
3. You'll see a list of all your demo pages

### Creating a New Demo Page

1. Click "Create Demo Page"
2. Fill in the form:
   - **Slug**: The URL path (e.g., "demo", "john", "sales-demo")
   - **Assistant ID**: Your Vapi AI assistant ID from the Vapi dashboard
   - **System Prompt**: Define how the AI should behave (optional)
   - **First Message**: The initial greeting (required)
   - **Active**: Check to make the page publicly accessible
3. Click "Create Demo Page"

### Editing a Demo Page

1. Click the edit icon (pencil) next to any demo page
2. Modify any fields except the slug (slugs cannot be changed)
3. Click "Update Demo Page"
4. Changes are immediately live on the website

### Activating/Deactivating Pages

- Click the eye icon to toggle a page between active and inactive
- Inactive pages return a "not found" error when accessed
- Use this to temporarily disable demos without deleting them

### Deleting a Demo Page

1. Click the trash icon next to the demo page
2. Confirm the deletion
3. The page will be permanently removed from the database

### Viewing Demo Pages

- Click the external link icon to open the demo page in a new tab
- Each page displays the configured Vapi AI Widget
- The widget uses the assistant_id, system_prompt, and first_message from the database

## Configuration Details

### Getting Your Assistant ID

1. Log in to your Vapi dashboard at https://dashboard.vapi.ai
2. Navigate to "Assistants"
3. Click on the assistant you want to use
4. Copy the Assistant ID from the URL or details page

### Writing System Prompts

System prompts define how your AI assistant behaves. Examples:

- "You are a helpful sales assistant for [Company Name]. Help users learn about our products and schedule demos."
- "You are a customer support agent. Answer questions politely and professionally."
- "You are a friendly receptionist who helps schedule appointments."

### Crafting First Messages

The first message is what users see when the widget loads. Keep it friendly and action-oriented:

- "Hey! How can I help you today?"
- "Welcome to [Company Name]! What brings you here?"
- "Hi there! Need help with anything?"

## Best Practices

1. **Use descriptive slugs**: Make URLs memorable (e.g., "free-consultation", "book-demo")
2. **Test before activating**: Create pages as inactive, test them, then activate
3. **Keep system prompts focused**: Clear instructions lead to better AI responses
4. **Update regularly**: Refine messages based on user interactions
5. **Use meaningful assistant IDs**: Create separate Vapi assistants for different use cases

## URL Routing

The system uses intelligent routing:

- `/` - Home page
- `/demos` - Multi-widget showcase page (old static demo)
- `/demo` - Dynamic demo page (fetches "demo" record from database)
- `/{any-slug}` - Dynamic demo page (fetches record with matching slug)
- `/login`, `/register`, `/dashboard`, etc. - System pages (not affected by slug routing)

## Security

- All demo pages use Row Level Security (RLS)
- Public can only view active demo pages
- Only authenticated users can create/edit/delete pages
- Database changes require authentication

## Troubleshooting

### Page Not Found

- Verify the slug exists in the database
- Check that `is_active` is set to `true`
- Ensure there are no typos in the URL

### Widget Not Loading

- Verify the assistant_id is correct
- Check your Vapi dashboard to ensure the assistant exists
- Check browser console for JavaScript errors

### Changes Not Appearing

- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Wait a few seconds for database changes to propagate

## Technical Details

### Real-time Updates

Changes to the database are reflected immediately because:
- The system fetches data on each page load
- No caching is implemented (can be added for performance)
- Direct database queries ensure fresh data

### Performance Considerations

- Database queries are minimal (single record fetch per page load)
- Supabase RLS ensures secure access
- Widget scripts are loaded from CDN for fast delivery

## Examples

### Example 1: Sales Demo

```
Slug: sales-demo
Assistant ID: abc123-def456-ghi789
System Prompt: You are a sales assistant for Infinite Wealth Solutions. Help potential customers understand our AI agent services and book consultation calls.
First Message: Welcome! Interested in AI solutions for your business? Let's chat!
Active: Yes
```

URL: `infinitewealthsolutionsai.com/sales-demo`

### Example 2: Support Demo

```
Slug: support
Assistant ID: xyz789-uvw456-rst123
System Prompt: You are a customer support agent. Answer questions about our services, pricing, and technical features.
First Message: Hi! Need help with something? I'm here to assist!
Active: Yes
```

URL: `infinitewealthsolutionsai.com/support`

## Additional Resources

- [Vapi Documentation](https://docs.vapi.ai)
- [Supabase Documentation](https://supabase.io/docs)
- [React Router Documentation](https://reactrouter.com)

## Support

For technical support or questions about the system, contact your development team or refer to the internal documentation.
