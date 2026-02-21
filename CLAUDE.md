# Driver Talent Portfolio

## Project Structure

- `src/` - React frontend (Vite)
- `api/` - Vercel serverless functions
- `scripts/` - Utility scripts
- `src/remotion/` - Video composition for Remotion Lambda

## Airtable

**IMPORTANT:** See `AIRTABLE_SCHEMA.md` for complete field definitions.

When modifying Airtable fields:
1. Add/modify field in Airtable web UI
2. Update `AIRTABLE_SCHEMA.md`
3. Update `VALID_FIELDS` arrays in:
   - `api/parse-documents.js`
   - `api/candidates/[uuid].js`

Tables:
- **Candidates** (`tbl25tP2Nc17lx5Am`) - Driver profiles
- **Free Agents** (`tblwlT6LxNn7Auq1G`) - Source data (read-only)
- **Job Requisitions** - Employer job openings
- **Job Submissions** - Driver submissions to jobs

## Video Recording Feature

Driver Story Video flow:
1. Driver visits `/record/{uuid}`
2. Records 6 video answers in browser
3. Clips uploaded to Cloudflare R2
4. Remotion Lambda assembles final video
5. Video URL saved to Airtable `video_url` field

## External Services

- **Airtable** - Database
- **Cloudflare R2** - Video clip storage
- **AWS Lambda + Remotion** - Video assembly
- **OpenAI GPT-4** - Document parsing, AI content generation
- **Deepgram** - Speech-to-text transcription for video clips
- **Vercel** - Hosting

## Environment Variables

Required in `.env` and Vercel:
```
AIRTABLE_API_KEY
AIRTABLE_BASE_ID
AIRTABLE_CANDIDATES_TABLE_ID
AIRTABLE_FREE_AGENTS_TABLE_ID
OPENAI_API_KEY
DEEPGRAM_API_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
REMOTION_FUNCTION_NAME
REMOTION_SERVE_URL
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
node scripts/add-airtable-fields.mjs  # Add missing Airtable fields
```
