# AI-Powered Data Analysis Platform

A modern web application that empowers users to upload data files (CSV, Excel, JSON, TSV), visualize insights through interactive charts, and ask natural language questions using Google's Gemini AI.

## Features

- **Easy File Upload:** Drag-and-drop interface supporting CSV, Excel (.xlsx, .xls), JSON, and TSV files
- **Automatic Data Parsing:** Intelligent type detection and data cleaning
- **Interactive Visualizations:** Line charts, bar charts, pie charts, area charts, and scatter plots
- **AI Assistant:** Ask questions about your data in natural language powered by Google Gemini
- **Secure Authentication:** User authentication and data isolation using Supabase
- **Real-time Analysis:** Instant insights and visualizations

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Charts:** Recharts
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI:** Google Gemini API (gemini-2.0-flash-exp)
- **File Parsing:** PapaParse (CSV), SheetJS (Excel)

## Quick Start

### Prerequisites

- Node.js 18 or higher
- A Supabase account (free tier works)
- A Google Gemini API key (free tier available)

### Installation

1. **Clone or navigate to the project:**
   ```bash
   cd data-analysis-platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your API keys:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     GEMINI_API_KEY=your-gemini-api-key
     NEXT_PUBLIC_APP_URL=http://localhost:3000
     ```

4. **Set up Supabase database:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the contents of `supabase-schema.sql`

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   - Navigate to [http://localhost:3000](http://localhost:3000)

## Detailed Setup Instructions

For complete step-by-step setup instructions, including how to:
- Get your Gemini API key
- Set up Supabase project
- Configure the database
- Deploy to production

**See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)**

## Usage

### 1. Create an Account
- Click "Get Started Free" or navigate to `/signup`
- Enter your email and password
- Verify your email (if confirmation is enabled)

### 2. Upload Data
- Log in to your dashboard
- Drag and drop or click to upload a data file
- Supported formats: CSV, TSV, Excel (.xlsx, .xls), JSON
- Maximum file size: 50MB

### 3. View Your Data
- **Data Table:** View your uploaded data in table format
- **Visualizations:** See automatic charts generated from your data
- **AI Assistant:** Ask questions about your data in natural language

### Example AI Questions
- "What are the total sales?"
- "Show me the top 5 products by revenue"
- "Which region has the highest performance?"
- "Compare Q1 vs Q2 data"
- "Summarize this dataset"

## Project Structure

```
data-analysis-platform/
├── app/
│   ├── api/
│   │   ├── upload/          # File upload endpoint
│   │   └── query-data/      # AI query endpoint
│   ├── dashboard/           # Main dashboard page
│   ├── login/               # Login page
│   ├── signup/              # Signup page
│   └── page.tsx             # Landing page
├── components/
│   ├── dashboard/
│   │   ├── ChatAssistant.tsx    # AI chat interface
│   │   ├── ChartDisplay.tsx     # Chart rendering
│   │   └── DataTable.tsx        # Data table display
│   └── ui/
│       └── FileUpload.tsx       # File upload component
├── lib/
│   └── supabase.ts              # Supabase client
├── types/
│   └── index.ts                 # TypeScript definitions
├── utils/
│   └── dataParser.ts            # File parsing utilities
├── .env.local.example           # Environment variables template
├── supabase-schema.sql          # Database schema
└── SETUP_INSTRUCTIONS.md        # Detailed setup guide
```

## API Routes

### POST `/api/upload`
Upload and parse data files

**Request:**
- `FormData` with `file` and `userId`

**Response:**
```json
{
  "success": true,
  "uploadId": "uuid",
  "datasetId": "uuid",
  "preview": {
    "columns": ["col1", "col2"],
    "types": ["number", "text"],
    "rowCount": 100,
    "columnCount": 2,
    "sampleRows": [...]
  }
}
```

### POST `/api/query-data`
Query data using natural language

**Request:**
```json
{
  "query": "What are the top 5 products?",
  "datasetId": "uuid",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "answer": "Based on the data...",
  "insight": "Key insight...",
  "chartType": "bar",
  "chartConfig": {
    "type": "bar",
    "xKey": "product",
    "yKey": "sales"
  }
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |

## Gemini Model Configuration

The app uses **Gemini 2.0 Flash Experimental** (`gemini-2.0-flash-exp`) which offers:
- Best rate limits for free tier
- Fast response times
- Good accuracy for data analysis tasks

You can change the model in `app/api/query-data/route.ts`:
```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
```

### Available Free Tier Models:
- `gemini-2.0-flash-exp` - Recommended (highest rate limits)
- `gemini-1.5-flash` - Alternative fast model
- `gemini-1.5-pro` - More capable but lower rate limits

## Security Features

- **Row Level Security (RLS):** Users can only access their own data
- **Server-side API calls:** Gemini API key never exposed to client
- **Authentication:** Secure email/password authentication via Supabase
- **File validation:** Type and size validation before processing
- **Environment variables:** Sensitive keys stored securely

## Troubleshooting

### Common Issues

**Problem:** API errors or "Failed to fetch"
- Check `.env.local` file exists and has correct values
- Restart dev server after changing environment variables

**Problem:** Charts not displaying
- Verify data was uploaded successfully
- Check browser console for errors
- Ensure Recharts is installed

**Problem:** Gemini API errors
- Verify API key is correct
- Check rate limits (free tier: 15 RPM, 1500 RPD for some models)
- Ensure you're using a supported model

**Problem:** Upload fails
- Check file size (max 50MB)
- Verify file format (CSV, XLSX, XLS, JSON, TSV)
- Check console for detailed error messages

For more troubleshooting help, see [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md).

## Development

### Run development server:
```bash
npm run dev
```

### Build for production:
```bash
npm run build
```

### Start production server:
```bash
npm start
```

### Lint code:
```bash
npm run lint
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed deployment instructions.

## Future Enhancements

- [ ] Dashboard saving and sharing
- [ ] More chart types (heatmaps, network graphs)
- [ ] Data export functionality
- [ ] Advanced filters and transformations
- [ ] Collaborative features
- [ ] Custom data connectors (Google Sheets, APIs)
- [ ] Scheduled reports

## License

MIT

## Support

For issues or questions:
1. Check [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)
2. Review browser console for errors
3. Verify all environment variables are set
4. Check Supabase dashboard for database errors

---

Built with Next.js, Supabase, and Google Gemini AI
