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
- **Employers** (`tbl9bxGlAKtQfnPhY`) - Employer companies
- **Job Requisitions** - Employer job openings
- **Job Submissions** - Driver submissions to jobs
- **Fit Profiles** - Auto-generated candidate/job fit scores

## Video Recording Feature

Driver Story Video flow:
1. Driver visits `/record/{uuid}`
2. Records 7 video answers in browser (with live Deepgram transcription)
3. Clips uploaded to Cloudflare Stream via TUS (resumable uploads for mobile reliability)
4. Railway render service assembles final video with Remotion
5. Video URL saved to Airtable `video_url` field
6. Stream clips automatically deleted after render to minimize costs

To re-render a video:
```bash
curl -X POST "https://driver-story-render-production.up.railway.app/render" \
  -H "Content-Type: application/json" \
  -d '{"uuid": "THE-UUID-HERE"}'
```
Or call `/api/videos/assemble` with `{"uuid": "..."}`

## Deployments

Both services **auto-deploy from git pushes to main**:
- **Vercel** - Frontend + API (`src/`, `api/`)
- **Railway** - Video render service (`render-service/`)

## External Services

- **Airtable** - Database
- **Cloudflare R2** - Final video storage + public assets
- **Cloudflare Stream** - TUS resumable uploads for video clips (temp storage, deleted after render)
- **Railway + Remotion** - Video assembly (render-service)
- **OpenAI GPT-4** - Document parsing, AI content generation
- **Deepgram** - Speech-to-text transcription for video clips
- **Vercel** - Frontend hosting + serverless API
- **Resend** - Email delivery for employer portal magic links
- **CareerOneStop** - DOL-sponsored API for O*NET occupation data (FitKit integration)

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

# Employer Portal Auth
JWT_SECRET
RESEND_API_KEY
EMAIL_FROM
APP_URL
CAREER_AGENT_EMAIL

# Airtable (optional table IDs)
AIRTABLE_EMPLOYERS_TABLE_ID
AIRTABLE_FIT_PROFILES_TABLE_ID

# CareerOneStop API (for FitKit O*NET integration)
CAREERONESTOP_USER_ID
CAREERONESTOP_TOKEN

# Cloudflare Stream (for TUS resumable video uploads)
CF_ACCOUNT_ID
CF_STREAM_API_TOKEN
CF_STREAM_CUSTOMER_CODE
VITE_CF_STREAM_CUSTOMER_CODE  # Same as CF_STREAM_CUSTOMER_CODE (for frontend)
```

## Commands

```bash
vercel dev           # Start local dev server (USE THIS - runs frontend + API)
npm run dev          # Frontend only (no API routes - don't use for full testing)
npm run build        # Build for production
node scripts/add-airtable-fields.mjs  # Add missing Airtable fields
```

## Mobile Testing

Use ngrok to test on real devices with HTTPS (required for camera/mic):
```bash
vercel dev           # Terminal 1 - starts on port 3000
ngrok http 3000      # Terminal 2 - creates public HTTPS URL
```

## Employer Portal

External-facing portal for employer partners at `/employer/*`.

**Features:**
- Magic link authentication (email to main_contact_email)
- Add/manage job requisitions
- Driver fit feed (candidates scoring 70+ on their jobs)
- Request interviews → creates submission, emails career agent
- Update submission statuses and provide feedback

**Key Files:**
- `src/employer/` - React components
- `api/employer/` - Employer-scoped API endpoints
- `api/auth/` - Magic link authentication
- `api/fit-profiles/` - Fit profile generation
- `src/lib/employer-api.js` - Frontend API client
