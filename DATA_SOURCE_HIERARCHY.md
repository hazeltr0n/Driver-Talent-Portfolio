# Data Source Hierarchy

This document defines which data source takes priority for each field when multiple sources contain the same information.

## Data Sources

### 1. Free Agents Table (via lookup fields)
Source data synced from FreeWorld's admin portal. Contains intake data for FreeWorld program participants.

**Linked via:** `Free Agents - Linked` field in Candidates table

**Lookup fields available:**
- `Trucking School Name (from Free Agents - Linked)` - School name
- `CDL Month (from Free Agents - Linked)` - Graduation month (YYYY-MM)
- `gotCDLADate (from Free Agents - Linked)` - Exact CDL date
- `phoneFromApplication (from Free Agents - Linked)` - Phone from intake (unreliable)
- `Age (from Free Agents - Linked)` - Current age
- `cbsa (from Free Agents - Linked)` - Metro area
- `placementStatus (from Free Agents - Linked)` - Current placement status
- `gotJobDate (from Free Agents - Linked)` - Job placement date
- `releasedFromCustodyDate (from Free Agents - Linked)` - Release date
- `hasSexOffense (from Free Agents - Linked)` - Sex offense flag
- `Admin Portal Record (from Free Agents - Linked)` - Link to admin portal

### 2. Parsed Documents (api/parse-documents.js)

**Tenstreet PDF** - Driver's carrier application:
- `phone` - Primary phone (authoritative)
- `cdl_class`, `endorsements`, `years_experience`
- `employment_history`, `equipment_experience`
- `training_school`, `training_location`, `training_graduated`, `training_hours`
- `home_time_preference`, `min_weekly_pay`, `willing_touch_freight`

**MVR PDF** - Official DMV motor vehicle record:
- `mvr_status`, `mvr_violations_3yr`, `mvr_accidents_3yr`, `mvr_suspensions_3yr`
- `mvr_last_pull`, `medical_card_status`

**PSP PDF** - FMCSA Pre-Employment Screening:
- `psp_crashes_5yr`, `psp_inspections_3yr`, `psp_driver_oos`

**Clearinghouse PDF** - Drug & Alcohol Clearinghouse:
- `clearinghouse_status`

### 3. DriverStoryForm (/form/:uuid)
Driver self-reports current preferences. Form fields:
- `zipcode`
- `home_time_preference`
- `shift_preference`
- `willing_overtime`
- `max_commute_miles`
- `min_weekly_pay`
- `target_weekly_pay`
- `willing_touch_freight`

### 4. Video Recording (/record/:uuid)
Driver records story videos. Generates:
- `story_*` fields (transcriptions)
- `video_clips`, `video_url`, `video_status`
- `ai_narrative`, `ai_pull_quote` (generated after video)

---

## Current Data Flow

```
1. Search Free Agents → Select driver
   └─ Creates Candidate with: fullName, email, city, state, cdl_class, years_experience
   └─ Sets: Free Agents - Linked, synced_record_id, source='Synced'
   └─ Lookup fields auto-populate from linked record

2. Parse Documents (admin uploads PDFs)
   └─ Tenstreet: phone, CDL, experience, employment, equipment, training, preferences
   └─ MVR: mvr_*, medical_card_status
   └─ PSP: psp_*
   └─ Clearinghouse: clearinghouse_status
   └─ Generates: ai_recruiter_notes, portfolio_slug

3. Driver completes DriverStoryForm (/form/:uuid)
   └─ Overwrites: zipcode, preferences (home_time, pay, touch_freight, etc.)

4. Driver records video (/record/:uuid)
   └─ Writes: story_* transcriptions, video_clips
   └─ Triggers: ai_narrative, ai_pull_quote generation
```

---

## Field-by-Field Priority

### Contact & Location
| Field | Priority | Rationale |
|-------|----------|-----------|
| `phone` | Tenstreet | Most current, driver-provided on application |
| `email` | Free Agents (initial) | Set on candidate creation |
| `city` | Free Agents (initial) | Set on candidate creation |
| `state` | Free Agents (initial) | Set on candidate creation |
| `zipcode` | DriverStoryForm > Free Agents | Driver enters current zip in form |

### CDL & Experience
| Field | Priority | Rationale |
|-------|----------|-----------|
| `cdl_class` | MVR > Tenstreet > Free Agents | MVR is official DMV record |
| `endorsements` | MVR > Tenstreet > Free Agents | MVR is official DMV record |
| `years_experience` | Tenstreet > Free Agents | Tenstreet has detailed work history |
| `equipment_experience` | Tenstreet | Extracted from employment history |
| `employment_history` | Tenstreet | Verified employer records |

### Training
| Field | Priority | Rationale |
|-------|----------|-----------|
| `training_school` | Lookup > Tenstreet | FreeWorld knows our grads' schools accurately |
| `training_graduated` | Lookup (`CDL Month`) > Tenstreet | FreeWorld tracks graduation dates |
| `training_hours` | Tenstreet > Free Agents | Tenstreet may have more detail |
| `training_location` | Tenstreet | Not in Free Agents |

**Implementation:** For FreeWorld grads (source='Synced'), use lookup fields `Trucking School Name (from Free Agents - Linked)` and `CDL Month (from Free Agents - Linked)`. For external drivers, use Tenstreet parsed data.

### Preferences
| Field | Priority | Rationale |
|-------|----------|-----------|
| `home_time_preference` | DriverStoryForm > Tenstreet | Driver's current preference |
| `shift_preference` | DriverStoryForm | Only source |
| `willing_overtime` | DriverStoryForm | Only source |
| `max_commute_miles` | DriverStoryForm | Only source |
| `min_weekly_pay` | DriverStoryForm > Tenstreet | Driver's current expectation |
| `target_weekly_pay` | DriverStoryForm | Driver's current target |
| `willing_touch_freight` | DriverStoryForm > Tenstreet | Driver's current preference |

### Safety & Compliance (Documents Authoritative)
| Field | Priority | Rationale |
|-------|----------|-----------|
| `mvr_status` | MVR | Official DMV record |
| `mvr_violations_3yr` | MVR | Official DMV record |
| `mvr_accidents_3yr` | MVR | Official DMV record |
| `mvr_suspensions_3yr` | MVR | Official DMV record |
| `mvr_last_pull` | MVR | Report date from document |
| `medical_card_status` | MVR | From medical certificate section |
| `clearinghouse_status` | Clearinghouse | Official DOT record |
| `psp_crashes_5yr` | PSP | Official FMCSA record |
| `psp_inspections_3yr` | PSP | Official FMCSA record |
| `psp_driver_oos` | PSP | Official FMCSA record |

### Story & Video
| Field | Priority | Rationale |
|-------|----------|-----------|
| `story_*` fields | Video Recording | Driver's own words (transcription) |
| `video_*` fields | Video Recording | System generated |
| `ai_narrative` | Generated post-video | Based on story transcriptions |
| `ai_pull_quote` | Generated post-video | Based on story transcriptions |
| `ai_recruiter_notes` | Generated in parse-documents | Based on all available data |

---

## Lookup Fields vs Direct Fields

The Candidates table has two ways to access Free Agents data:

1. **Lookup fields** (read-only, auto-populated):
   - `Trucking School Name (from Free Agents - Linked)`
   - `CDL Month (from Free Agents - Linked)`
   - etc.

2. **Direct fields** (editable, set by parsing):
   - `training_school`
   - `training_graduated`
   - etc.

**Current approach:** Use lookup fields for display/reference, but also copy to direct fields when needed for fit scoring or portfolio display.

---

## Implementation Notes

### Smart Merge in Parse Documents

The `parse-documents.js` should check source before overwriting certain fields:

```javascript
// Training: For FreeWorld grads, prefer lookup data
const isFromFreeAgents = record.fields.source === 'Synced';
const hasSchoolFromLookup = record.fields['Trucking School Name (from Free Agents - Linked)']?.length > 0;

if (!isFromFreeAgents || !hasSchoolFromLookup) {
  updates.training_school = data.training_school;
  updates.training_graduated = data.training_graduated;
}

// Preferences: Don't overwrite if driver already filled form
if (!record.fields.home_time_preference) {
  updates.home_time_preference = data.home_time_preference;
}
```

### Mapping Lookup to Direct Fields

For fit scoring, you may need to copy lookup values to direct fields:

```javascript
// Copy training from lookup if not already set
if (!candidate.training_school && candidate['Trucking School Name (from Free Agents - Linked)']?.[0]) {
  updates.training_school = candidate['Trucking School Name (from Free Agents - Linked)'][0];
}
```
