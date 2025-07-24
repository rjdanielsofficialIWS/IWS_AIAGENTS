# IWS AI Agents Website

A modern React application for Infinite Wealth Solutions' AI Agents service.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory and add your OpenAI API key:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Getting an OpenAI API Key

1. Go to [OpenAI's website](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to the API section
4. Create a new API key
5. Copy the key and add it to your `.env` file

### 3. Netlify Deployment Setup

When deploying to Netlify, you need to add the environment variable:

1. Go to your Netlify dashboard
2. Select your site
3. Go to Site settings > Environment variables
4. Add a new variable:
   - Key: `VITE_OPENAI_API_KEY`
   - Value: Your OpenAI API key

### 4. Local Development

```bash
npm install
npm run dev
```

## Features

- Multi-step form for collecting business requirements
- AI-powered prompt enhancement using OpenAI's API
- Responsive design with Tailwind CSS
- Form submission to Make.com webhook and Google Sheets
- Modern gradient design with animations

## Important Notes

- The "Enhance with AI" feature requires a valid OpenAI API key
- Without the API key, users can still submit forms, but the enhancement feature will show an error
- Make sure to keep your API key secure and never commit it to version control