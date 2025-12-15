# AI-Powered Data Analysis Platform - Setup Instructions

## Complete Step-by-Step Guide

This guide will walk you through setting up the entire AI-powered data analysis platform from scratch.

---

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- A Google Gemini API key (free tier available)
- A code editor (VS Code recommended)

---

## Step 1: Get Your API Keys

### 1.1 Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key - you'll need this later
4. **Important:** For free tier, use **Gemini 2.0 Flash Experimental** model (best rate limits for free tier)

### 1.2 Set Up Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Project Name:** `data-analysis-platform`
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free
4. Click "Create new project" (wait 2-3 minutes for setup)

---

## Step 2: Configure Supabase Database

### 2.1 Run Database Schema

1. In your Supabase dashboard, click on **SQL Editor** (left sidebar)
2. Click "New Query"
3. Open the file `supabase-schema.sql` from your project
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click "Run" or press Ctrl+Enter
7. You should see "Success. No rows returned" - this is correct!

### 2.2 Enable Email Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** provider is enabled (it should be by default)
3. Scroll down to **Email Templates**
4. Optional: Customize the confirmation email template

### 2.3 Get Supabase API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - click "Reveal" button)

---

## Step 3: Configure Environment Variables

1. In your project folder `data-analysis-platform`, create a file called `.env.local`
2. Copy the contents from `.env.local.example`
3. Fill in your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Never commit `.env.local` to Git! It's already in `.gitignore`.

---

## Step 4: Install Dependencies and Run

1. Open your terminal in the `data-analysis-platform` folder
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to: **http://localhost:3000**

You should see the landing page!

---

## Step 5: Test the Application

### 5.1 Create an Account

1. Click "Get Started Free" or "Sign Up"
2. Enter your email and password (min 6 characters)
3. Click "Sign up"
4. Check your email for confirmation link (if email confirmation is enabled)
   - If using Supabase free tier in development, you might need to disable email confirmation:
     - Go to **Authentication** → **Settings** in Supabase
     - Disable "Enable email confirmations"
5. After signup, you'll be redirected to login
6. Sign in with your credentials

### 5.2 Upload a Test File

1. After logging in, you'll see the Dashboard
2. On the "Upload Data" tab, drag and drop a CSV/Excel/JSON file
   - **Don't have test data?** Create a simple CSV file:
     ```csv
     Product,Sales,Region
     Widget A,1500,East
     Widget B,2300,West
     Widget C,1800,East
     Widget D,2700,West
     Widget E,2100,North
     ```
   - Save this as `test-data.csv`
3. Upload the file
4. You should see "Upload Successful!" with row/column count

### 5.3 View Data

1. Click on the **Data Table** tab
2. You should see your data displayed in a table format

### 5.4 View Visualizations

1. Click on the **Visualizations** tab
2. You should see 4 different chart types:
   - Bar Chart
   - Line Chart
   - Area Chart
   - Pie Chart

### 5.5 Test AI Assistant

1. Click on the **AI Assistant** tab
2. Try asking questions like:
   - "What are the total sales?"
   - "Which region has the highest sales?"
   - "Show me the top 3 products by sales"
   - "Summarize this data"
3. The AI will analyze your data and provide answers!

---

## Step 6: Troubleshooting

### Problem: "Failed to fetch" or API errors

**Solution:**
- Check that `.env.local` file exists and has correct values
- Restart the dev server (Ctrl+C, then `npm run dev`)
- Check browser console for errors (F12 → Console tab)

### Problem: "Dataset not found or access denied"

**Solution:**
- Make sure you're logged in
- Check that Row Level Security policies are enabled in Supabase
- Verify the SQL schema was run correctly

### Problem: Gemini API returns errors

**Solution:**
- Verify your Gemini API key is correct
- Check you haven't exceeded free tier rate limits
- Make sure you're using `gemini-2.0-flash-exp` model (see code in `app/api/query-data/route.ts`)

### Problem: File upload fails

**Solution:**
- Check file size (max 50MB)
- Verify file format (CSV, XLSX, XLS, JSON, TSV only)
- Check browser console for detailed error messages

### Problem: Charts not displaying

**Solution:**
- Check that data was uploaded successfully
- Verify Recharts is installed: `npm list recharts`
- Check browser console for errors

---

## Step 7: Understanding the Architecture

### File Structure

```
data-analysis-platform/
├── app/
│   ├── api/
│   │   ├── upload/route.ts       # File upload API
│   │   └── query-data/route.ts   # AI query API
│   ├── dashboard/page.tsx         # Main dashboard page
│   ├── login/page.tsx             # Login page
│   ├── signup/page.tsx            # Signup page
│   └── page.tsx                   # Landing page
├── components/
│   ├── dashboard/
│   │   ├── ChatAssistant.tsx     # AI chat component
│   │   ├── ChartDisplay.tsx      # Chart rendering
│   │   └── DataTable.tsx         # Data table display
│   └── ui/
│       └── FileUpload.tsx         # File upload component
├── lib/
│   └── supabase.ts                # Supabase client config
├── types/
│   └── index.ts                   # TypeScript types
├── utils/
│   └── dataParser.ts              # File parsing logic
├── .env.local                     # Environment variables (YOU CREATE THIS)
├── .env.local.example             # Environment template
└── supabase-schema.sql            # Database schema
```

### How It Works

1. **Authentication:** Users sign up/login via Supabase Auth
2. **File Upload:** Files are parsed on the server, data stored in Supabase
3. **Visualization:** Recharts renders interactive charts from the data
4. **AI Analysis:** Gemini API analyzes data and answers natural language questions
5. **Security:** Row Level Security ensures users only see their own data

---

## Step 8: Deploying to Production (Optional)

### Deploy to Vercel

1. Push your code to GitHub (create a new repository)
2. Go to [Vercel](https://vercel.com) and sign up/login
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables in Vercel:
   - Go to Settings → Environment Variables
   - Add all variables from `.env.local`
   - Change `NEXT_PUBLIC_APP_URL` to your Vercel URL
6. Click "Deploy"
7. Update Supabase redirect URLs:
   - Go to Authentication → URL Configuration
   - Add your Vercel URL to "Site URL" and "Redirect URLs"

---

## Step 9: Choosing the Right Gemini Model

For **free tier**, here are your options:

### Recommended: Gemini 2.0 Flash Experimental
- **Model ID:** `gemini-2.0-flash-exp`
- **Best for:** Free tier users
- **Rate Limits:** Higher than other free models
- **Speed:** Very fast
- **Use case:** Perfect for this app

### Alternative: Gemini 1.5 Flash
- **Model ID:** `gemini-1.5-flash`
- **Rate Limits:** Moderate on free tier
- **Speed:** Fast

### Alternative: Gemini 1.5 Pro (if you need more power)
- **Model ID:** `gemini-1.5-pro`
- **Rate Limits:** Lower on free tier (15 RPM, 1500 RPD)
- **Speed:** Slower but more capable

The app currently uses `gemini-2.0-flash-exp` which is optimal for free tier usage.

---

## Step 10: Tips for Best Results

### For Uploading Data:
- Use clear column names (e.g., "Sales" instead of "col1")
- Keep data clean (remove extra spaces, special characters)
- First row should be headers
- Supported formats: CSV, TSV, Excel (.xlsx, .xls), JSON

### For AI Questions:
- Be specific: "What are total sales by region?" instead of "Tell me about sales"
- Ask one thing at a time
- Refer to actual column names in your data
- Examples:
  - "Show me the top 5 products"
  - "What's the average value in the Sales column?"
  - "Compare East vs West regions"

### For Better Performance:
- Keep datasets under 10,000 rows for best performance
- Close unused tabs to free up browser memory
- Use Chrome or Edge for best chart rendering

---

## Support and Next Steps

### Need Help?
- Check browser console (F12) for error messages
- Verify all environment variables are set correctly
- Make sure Supabase database schema is applied
- Test Gemini API key at [Google AI Studio](https://makersuite.google.com/)

### Extending the App:
- Add more chart types (heatmaps, scatter plots)
- Implement dashboard saving
- Add data export features
- Create shareable reports
- Add more advanced AI features

---

## Summary Checklist

- [ ] Node.js 18+ installed
- [ ] Supabase project created
- [ ] Database schema applied in Supabase
- [ ] Gemini API key obtained
- [ ] `.env.local` file created with all keys
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm run dev`)
- [ ] Account created and able to login
- [ ] Test file uploaded successfully
- [ ] Charts displaying correctly
- [ ] AI assistant responding to questions

**Congratulations!** Your AI-powered data analysis platform is ready to use!
