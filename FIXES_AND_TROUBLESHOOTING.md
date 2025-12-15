# Fixes Applied and Troubleshooting Guide

## Recent Fixes (Just Applied)

### Fix 1: Gemini API Model Change
**Problem:** Getting 429 error with `gemini-2.0-flash-exp` - quota exceeded

**Solution:** Changed to stable free tier model
- **Old Model:** `gemini-2.0-flash-exp` (experimental, limited quota)
- **New Model:** `gemini-1.5-flash` (stable, better free tier support)
- **File Changed:** `app/api/query-data/route.ts` line 78

**What to do:**
1. Restart your dev server (Ctrl+C, then `npm run dev`)
2. Try the AI assistant again
3. If you still get quota errors, wait 1-2 minutes and try again

### Fix 2: Empty Visualization Charts
**Problem:** Charts showing axes but no data bars/lines

**Solutions Applied:**
1. **Auto-detect numeric columns** - Now automatically finds numeric data for Y-axis
2. **Convert string numbers to actual numbers** - CSV data comes as strings, now properly converted
3. **Better data processing** - All chart types now use processed data
4. **Debug info added** - Shows X-axis, Y-axis, and data point count below each chart

**File Changed:** `components/dashboard/ChartDisplay.tsx`

**What to do:**
1. Refresh your browser (F5)
2. Charts should now display data correctly
3. Check the debug text below each chart to see which columns are being used

---

## Alternative Gemini Models (If Still Having Issues)

### Option 1: Gemini 1.5 Flash (Currently Using)
```typescript
model: 'gemini-1.5-flash'
```
- ✅ Best for free tier
- ✅ Fast responses
- ✅ Good for data analysis
- Rate Limits: 15 RPM, 1 million TPM

### Option 2: Gemini 1.5 Pro (More Powerful)
```typescript
model: 'gemini-1.5-pro'
```
- Higher quality responses
- Better analysis
- Rate Limits: 2 RPM, 32k TPM (lower limits)

### Option 3: Gemini 2.0 Flash Experimental (If Available)
```typescript
model: 'gemini-2.0-flash-exp'
```
- Latest model
- May have quota restrictions
- Check if available in your region

### How to Change the Model:
1. Open `app/api/query-data/route.ts`
2. Find line 78: `const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });`
3. Replace `'gemini-1.5-flash'` with your preferred model
4. Save and restart dev server

---

## Common Issues and Solutions

### Issue 1: "Failed to fetch" or API errors
**Symptoms:** Upload works but AI queries fail

**Solutions:**
1. Check `.env.local` file exists and has correct values
2. Restart dev server after changing environment variables
3. Verify Gemini API key is correct at [Google AI Studio](https://aistudio.google.com/apikey)
4. Check browser console (F12) for detailed error messages

### Issue 2: Charts still showing empty
**Symptoms:** Axes visible but no bars/lines

**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Check debug text below charts shows correct column names
3. Verify your data has numeric columns
4. Open browser console (F12) and check for JavaScript errors

**Debug Steps:**
```javascript
// Add this temporarily to see your data
console.log('Chart data:', data);
console.log('Processed data:', processedData);
```

### Issue 3: "Dataset not found or access denied"
**Symptoms:** Upload succeeds but can't view data

**Solutions:**
1. Make sure you're logged in
2. Check Supabase Row Level Security policies are enabled
3. Verify the SQL schema was run correctly in Supabase
4. Check Supabase dashboard → Authentication → Users (you should see your user)

### Issue 4: Upload fails for CSV files
**Symptoms:** "Failed to parse file" error

**Solutions:**
1. Ensure CSV has headers in first row
2. Check file size (max 50MB)
3. Verify no special characters in column names
4. Try saving CSV as UTF-8 encoding
5. Remove any formulas if from Excel

**Good CSV Format:**
```csv
Product,Sales,Region
Widget A,1500,East
Widget B,2300,West
```

**Bad CSV Format:**
```csv
1500,East,Widget A  ← No headers
Product,Sales,Region
,1500,  ← Empty values
```

### Issue 5: AI responses are slow or timing out
**Symptoms:** Waiting more than 30 seconds for response

**Solutions:**
1. Reduce dataset size (use first 100 rows)
2. Simplify your question
3. Check Gemini API rate limits at [AI Studio Usage](https://aistudio.google.com/app/apikey)
4. Wait a minute between requests (free tier limits)

### Issue 6: Supabase connection errors
**Symptoms:** "Failed to create upload record" or database errors

**Solutions:**
1. Verify Supabase URL and keys in `.env.local`
2. Check Supabase project is active (not paused)
3. Verify SQL schema was applied:
   - Go to Supabase → SQL Editor
   - Run: `SELECT * FROM data_uploads LIMIT 1;`
   - Should return empty result, not an error
4. Check Supabase service status at [status.supabase.com](https://status.supabase.com)

---

## Testing Checklist

After applying fixes, test these in order:

- [ ] Dev server starts without errors: `npm run dev`
- [ ] Can access homepage: http://localhost:3000
- [ ] Can create account and login
- [ ] Can upload sample CSV file
- [ ] Data table shows correctly
- [ ] All 4 chart types display with data (not empty)
- [ ] Debug text below charts shows correct columns
- [ ] AI assistant responds (no 429 error)
- [ ] AI suggestions make sense for your data

---

## Checking Your Gemini API Status

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click on your API key
3. Check "Usage" tab to see:
   - Requests per minute used
   - Tokens per minute used
   - Any quota limits

If you see quota exceeded:
- Wait 1-2 minutes
- Try a different model (see options above)
- Consider upgrading to paid tier for higher limits

---

## Verifying Fixes Applied

### Check 1: Gemini Model Changed
```bash
# Open the file
code app/api/query-data/route.ts

# Line 78 should show:
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

### Check 2: Chart Data Processing Added
```bash
# Open the file
code components/dashboard/ChartDisplay.tsx

# Should see around line 60-71:
const processedData = data.map(item => {
  const processed: any = { ...item };
  keys.forEach(key => {
    const value = item[key];
    if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
      processed[key] = Number(value);
    }
  });
  return processed;
});
```

### Check 3: Debug Info Shows
After uploading data and viewing charts, you should see below each chart:
```
X-Axis: Date | Y-Axis: Sales | Data points: 10
```

---

## Performance Tips

### For Large Datasets (>1000 rows)
1. **Limit data for visualization:**
   - Modify dashboard to show only first 100 rows in charts
   - Full data still stored in database

2. **Aggregate data before charting:**
   - Group by date/category
   - Show summaries instead of raw data

3. **Use appropriate chart types:**
   - Line charts: Best for time series (up to 500 points)
   - Bar charts: Best for categories (up to 20 categories)
   - Pie charts: Best for small categories (up to 10 slices)

### For Faster AI Responses
1. **Ask specific questions:**
   - Good: "What are total sales for East region?"
   - Bad: "Tell me everything about this data"

2. **Use shorter datasets for AI:**
   - AI only gets first 5 rows as sample
   - Ensure first 5 rows are representative

---

## Getting More Help

1. **Browser Console:** Press F12 → Console tab to see detailed errors
2. **Network Tab:** F12 → Network tab to see API request/response details
3. **Supabase Logs:** Supabase Dashboard → Logs → API to see database errors
4. **Gemini Usage:** [AI Studio Usage Page](https://aistudio.google.com/app/apikey) to check quotas

---

## Quick Reference: Environment Variables

Make sure your `.env.local` has all these:

```env
# Supabase (Get from: Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Gemini API (Get from: Google AI Studio)
GEMINI_API_KEY=AIzaSy...

# App URL (Use this for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** After changing `.env.local`, always restart the dev server!

---

## Status: All Issues Should Be Fixed Now

✅ Gemini API model changed to stable version
✅ Chart data processing improved
✅ Numeric detection added
✅ Debug information displayed
✅ Better error handling

**Next Steps:**
1. Restart your dev server
2. Refresh your browser
3. Try uploading the sample-data.csv file
4. Charts should now display correctly
5. AI assistant should work without quota errors
