# Airtable Schema

**Base ID:** `appjZUryTUrvwToXE`

**IMPORTANT:** This document reflects the actual Airtable schema. Keep it in sync when adding/modifying fields.

---

## Candidates (`tbl25tP2Nc17lx5Am`)

Driver profiles created from Free Agents or manual entry.

| Field | Type | Options |
|-------|------|---------|
| `uuid` | singleLineText | |
| `fullName` | singleLineText | |
| `email` | email | |
| `phone` | phoneNumber | |
| `city` | singleLineText | |
| `state` | singleLineText | |
| `zipcode` | singleLineText | |
| `shift_preference` | singleSelect | Days, Nights, No Preference |
| `willing_overtime` | singleSelect | Yes, Sometimes, No |
| `max_commute_miles` | singleSelect | 25 miles, 50 miles, 75 miles, 100+ miles |
| `cdl_class` | singleSelect | A, B |
| `years_experience` | number | |
| `endorsements` | singleLineText | |
| `home_time_preference` | singleSelect | Daily, Weekly, OTR, Flexible |
| `min_weekly_pay` | number | |
| `target_weekly_pay` | number | |
| `willing_touch_freight` | singleSelect | Very Light (No-Touch Freight), Light (Pallet Jack), Medium (Dolly/Liftgate), Heavy (Very Physical Work) |
| `mvr_status` | singleSelect | Clear, Has Violations |
| `mvr_violations_3yr` | number | |
| `mvr_accidents_3yr` | number | |
| `mvr_suspensions_3yr` | number | |
| `mvr_last_pull` | singleLineText | |
| `mvr_summary` | multilineText | Override auto-generated summary |
| `medical_card_status` | singleSelect | Valid, Expired, Pending |
| `clearinghouse_status` | singleSelect | Clear, Not Clear |
| `psp_crashes_5yr` | number | |
| `psp_inspections_3yr` | number | |
| `psp_driver_oos` | number | |
| `placement_status` | singleSelect | Working and Looking, Unemployed and Looking, Inactive - Lost Contact, Inactive - Happy with Job, Active - Placed with Client |
| `career_agent` | singleCollaborator | |
| `source` | singleSelect | Synced, Manual |
| `synced_record_id` | singleLineText | |
| `free_agent_link` | multipleRecordLinks | Links to Free Agents table |
| `notes` | multilineText | |
| `employment_history` | multilineText | JSON array |
| `equipment_experience` | multilineText | JSON array |
| `training_school` | singleLineText | |
| `training_location` | singleLineText | |
| `training_graduated` | singleLineText | |
| `training_hours` | number | |
| `ai_recruiter_notes` | multilineText | |
| `ai_narrative` | multilineText | |
| `ai_pull_quote` | multilineText | |
| `portfolio_slug` | singleLineText | |
| `portfolio_published` | checkbox | |
| `story_who_are_you` | multilineText | |
| `story_what_is_your_why` | multilineText | |
| `story_freeworld_journey` | multilineText | |
| `story_why_trucking` | multilineText | |
| `story_looking_for` | multilineText | |
| `story_what_others_say` | multilineText | |
| `video_status` | singleLineText | pending, recording, ready_for_assembly, processing, complete |
| `video_url` | url | |
| `video_clips` | multilineText | JSON object |

---

## Free Agents - Linked (`tblwlT6LxNn7Auq1G`)

Source table synced from external system. Many fields available.

| Field | Type | Notes |
|-------|------|-------|
| `uuid` | singleLineText | Primary key |
| `fullName` | singleLineText | |
| `email` | email | |
| `phone` | phoneNumber | |
| `city` | singleLineText | |
| `state` | singleLineText | |
| `zipcode` | number | |
| `cdl_class` | singleSelect | A, B |
| `years_experience` | number | |
| `endorsements` | singleLineText | |
| `home_time_preference` | singleSelect | Daily, Weekly, OTR, Flexible |
| `min_weekly_pay` | number | |
| `target_weekly_pay` | number | |
| `willing_touch_freight` | singleSelect | Very Light (No-Touch Freight), Light (Pallet Jack), Medium (Dolly/Liftgate), Heavy (Very Physical Work) |
| `mvr_status` | singleSelect | Clear, Has Violations |
| `mvr_violations_3yr` | number | |
| `mvr_accidents_3yr` | number | |
| `clearinghouse_status` | singleSelect | Not Prohibited, Prohibited |
| `psp_crashes_5yr` | number | |
| `psp_inspections_3yr` | number | |
| `psp_driver_oos` | number | |
| `placement_status` | singleSelect | Working and Looking, Unemployed and Looking, Inactive - Lost Contact, Inactive - Happy with Job, Active - Placed with Client |
| `career_agent` | singleCollaborator | |
| `employment_history` | multilineText | JSON |
| `equipment_experience` | multilineText | JSON |
| `training_hours` | number | |
| `Trucking School Name` | singleLineText | |
| `CDL Month` | multilineText | |
| `story_*` | multilineText | Story response fields |
| `ai_*` | multilineText | AI-generated content |
| `portfolio_slug` | singleLineText | |
| `portfolio_published` | checkbox | |
| `video_url` | url | |

---

## Employers (`tbl9bxGlAKtQfnPhY`)

Employer companies synced from HubSpot.

| Field | Type | Options |
|-------|------|---------|
| `hubspot_company_id` | singleLineText | HubSpot record ID |
| `hubspot_parent_company_id` | singleLineText | HubSpot parent company ID for multi-location companies |
| `name` | singleLineText | Company name |
| `domain` | url | Website |
| `phone` | phoneNumber | |
| `zip` | singleLineText | |
| `city` | singleLineText | |
| `state` | singleLineText | |
| `lifecycle_stage` | singleSelect | customer, opportunity, lead |
| `employer_enrichment_tier` | singleSelect | Level 1-6 |
| `main_contact_name` | singleLineText | |
| `main_contact_email` | email | |
| `main_contact_phone` | phoneNumber | |
| `main_contact_mobile` | phoneNumber | |
| `created_at` | date | |
| `auth_token_hash` | singleLineText | Hashed magic link token for employer portal auth |
| `auth_token_expires` | dateTime | Token expiration time |
| `last_login` | dateTime | Track employer portal engagement |

---

## Fit Profiles (`tblFitProfiles`)

Auto-generated fit scores between candidates and jobs.

| Field | Type | Options |
|-------|------|---------|
| `candidate_link` | multipleRecordLinks | Links to Candidates |
| `requisition_link` | multipleRecordLinks | Links to Job Requisitions |
| `employer_link` | multipleRecordLinks | Links to Employers |
| `candidate_uuid` | singleLineText | Quick lookup |
| `requisition_id` | singleLineText | Quick lookup |
| `fit_score` | number | 0-100 score |
| `fit_dimensions` | multilineText | JSON array |
| `fit_recommendation` | multilineText | AI-generated |
| `generated_at` | dateTime | When calculated |
| `status` | singleSelect | Active, Archived, Converted |

---

## Job Requisitions (`tblnLDyGMPLOGROnn`)

Employer job openings.

| Field | Type | Options |
|-------|------|---------|
| `employer` | singleLineText | (deprecated, use employer_link) |
| `employer_link` | multipleRecordLinks | Links to Employers table |
| `location` | singleLineText | |
| `title` | singleLineText | |
| `route_type` | singleSelect | Local, Regional, OTR |
| `cdl_class` | singleSelect | A, B |
| `min_experience_years` | number | |
| `pay_min` | number | |
| `pay_max` | number | |
| `equipment_types` | singleLineText | |
| `home_time` | singleSelect | Home Daily, Home Weekly, Home Bi-weekly, Out 2-3 weeks |
| `max_mvr_violations` | number | |
| `max_accidents` | number | |
| `notes` | multilineText | |
| `status` | singleSelect | Active, Filled, Closed, On Hold |
| `created_at` | dateTime | |
| `yard_zip` | singleLineText | |
| `touch_freight` | singleSelect | Very Light, Light, Medium, Heavy |
| `endorsements_required` | singleLineText | |
| `raw_description` | multilineText | |
| `positions_available` | number | |
| `received_date` | date | |
| `filled_date` | date | |
| `career_agent` | singleCollaborator | |
| `Job Submissions` | multipleRecordLinks | |

---

## Job Submissions (`tblRy25nM6WGZBq0J`)

Driver submissions to jobs.

| Field | Type | Options |
|-------|------|---------|
| `candidate_name` | singleLineText | |
| `candidate_uuid` | singleLineText | |
| `requisition_id` | singleLineText | |
| `employer` | singleLineText | |
| `job_title` | singleLineText | |
| `submitted_date` | date | |
| `status` | singleSelect | Submitted, Interviewing, Offer Extended, Hired, Rejected, Withdrawn |
| `hire_date` | date | |
| `rejection_reason` | singleSelect | No Response, Failed Background, Client Rejected, Driver Declined, Position Filled, Other |
| `notes` | multilineText | |
| `fit_score` | number | |
| `fit_dimensions` | multilineText | JSON |
| `fit_recommendation` | multilineText | |
| `career_agent` | singleCollaborator | |
| `requisition` | multipleRecordLinks | (legacy, links to Requisitions) |
| `candidate` | multipleRecordLinks | (legacy, links to Free Agents) |
| `requisition_link` | multipleRecordLinks | Links to Job Requisitions table |
| `candidate_link` | multipleRecordLinks | Links to Candidates table |
| `employer_link` | multipleRecordLinks | Links to Employers table |
| `interview_notes` | multilineText | Employer interview feedback |
| `rejection_explanation` | multilineText | Detailed rejection reason |
| `requested_by` | singleSelect | Career Agent, Employer |
| `employer_requested_at` | dateTime | When employer requested |

---

## Field Value Notes

**Standardized values across tables:**
- `clearinghouse_status`: "Not Prohibited", "Prohibited"
- `placement_status`: "Working and Looking", "Unemployed and Looking", "Inactive - Lost Contact", "Inactive - Happy with Job", "Active - Placed with Client"
- `home_time_preference`: "Daily", "Weekly", "OTR", "Flexible"

---

## Modifying Fields

1. Add/modify field in Airtable web UI
2. Update this document
3. Update `VALID_FIELDS` in:
   - `api/parse-documents.js`
   - `api/candidates/[uuid].js`
4. Update component code if needed

Script to add missing fields:
```bash
node scripts/add-airtable-fields.mjs
```

Script to fetch current schema:
```bash
node scripts/fetch-airtable-schema.mjs
```
