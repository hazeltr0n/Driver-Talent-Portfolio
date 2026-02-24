# HubSpot Audit Summary

Generated: 2026-02-23

---

## Overview

| Object Type | Total Properties | Custom Properties |
|-------------|-----------------|-------------------|
| Companies   | 319             | 46                |
| Deals       | 455             | 40                |
| Contacts    | 405             | 20+               |

---

## Career Agent Portal (CAP) Integration

### What CAP Imports from HubSpot

When a Career Agent adds an employer from HubSpot to CAP, the following fields are pulled:

**Company Fields:**
| HubSpot Property | CAP/Airtable Field | Required |
|------------------|-------------------|----------|
| `id` | `hubspot_company_id` | Yes |
| `hs_parent_company_id` | `hubspot_parent_company_id` | No |
| `name` | `name` | Yes |
| `domain` | `domain` | No |
| `phone` | `phone` | No |
| `city` | `city` | No |
| `state` | `state` | No |
| `zip` | `zip` | No |
| `lifecyclestage` | `lifecycle_stage` | No |
| `employer_enrichment_tier` | `employer_enrichment_tier` | No |

**Contact Fields (First Associated Contact):**
| HubSpot Property | CAP/Airtable Field |
|------------------|-------------------|
| `firstname` + `lastname` | `main_contact_name` |
| `email` | `main_contact_email` |
| `phone` | `main_contact_phone` |
| `mobilephone` | `main_contact_mobile` |
| `jobtitle` | (displayed but not stored) |

### HubSpot Search Filters

CAP only shows companies that match ALL of these criteria:
- `lifecyclestage` IN `['customer', 'opportunity']`
- `hubspot_team_id` = `58551370` (Employer Partnerships team)

**This means:** Companies must be assigned to the Employer Partnerships team AND be either a "Customer" or "Opportunity" lifecycle stage to appear in CAP's employer search.

---

## Deal Pipelines (7 Pipelines)

### 1. Employer Partnerships Pipeline (Primary for CAP)
| Stage | Probability |
|-------|-------------|
| Scheduled Call | 20% |
| Pilot Scoping | 40% |
| Sending Candidates | 60% |
| First Hire | 80% |
| Multiple Hires | 90% |
| Won | 100% (Closed) |
| Lost | 0% (Closed) |

### 2. Retain Workforce
| Stage | Probability |
|-------|-------------|
| Scheduled Call | 10% |
| Discovery | 20% |
| Proposal | 50% |
| Contract | 60% |
| Requisition | 90% |
| Won | 100% (Closed) |
| Lost | 0% (Closed) |

### 3. Government Partnerships
| Stage | Probability |
|-------|-------------|
| Qualified Prospect | 10% |
| Onboarding | 50% |
| Pre-Launch | 20% |
| Launched | 90% |
| Active | 100% (Closed) |
| In-Active | 50% |
| Deactivated | 0% (Closed) |

### 4. Development Pipeline
| Stage | Probability |
|-------|-------------|
| Future Deals | 1% |
| Renewals (Holding Area) | 50% |
| Eligible Prospect | 1% |
| Temporarily Dormant | 1% |
| In Discussion | 25% |
| Made Ask | 50% |
| Committed - 2025/2026/2027/2028 | 100% (Closed) |
| Won - 2019 to 2026 | 100% (Closed) |
| Lost | 0% (Closed) |

### 5. Pre-Adverse Response Tracker
| Stage | Probability |
|-------|-------------|
| Pre-Adverse Notice Received | 20% |
| Awaiting Documents | 40% |
| Questionaire | 60% |
| Approval | 80% |
| Letter Sent | 90% |
| Hired | 100% (Closed) |
| Not Hired | 0% (Closed) |

### 6. Trucking School Partnership
| Stage | Probability |
|-------|-------------|
| Prospect | 20% |
| Introduction Call | 40% |
| MOU Discussion | 60% |
| MOU Signatures | 80% |
| Systems Set Up | 90% |
| Partnership | 100% (Closed) |
| Not a Partner | 0% (Closed) |

### 7. (Test) Waitlist GP Regions Pipeline
Standard sales pipeline stages.

---

## Company Lifecycle Stages

| Stage ID | Label | Notes |
|----------|-------|-------|
| subscriber | Subscriber | Standard |
| lead | Lead | Standard |
| marketingqualifiedlead | Marketing Qualified Lead | Standard |
| salesqualifiedlead | Sales Qualified Lead | Standard |
| opportunity | Opportunity | **CAP imports these** |
| customer | Customer | **CAP imports these** |
| evangelist | Evangelist | Standard |
| other | Other | Closed |
| 1038871854 | FA Employer | Custom |
| 1047999580 | FreeWorld Employer Partner | Custom |
| 1048078477 | Qualified Employer | Custom |
| 1053155424 | Free Agent | Custom |

---

## Custom Company Properties (FreeWorld-Specific)

### Employer/Fleet Properties
| Property Name | Label | Type |
|---------------|-------|------|
| `dot_number` | DOT Number | number |
| `fleet_size` | Fleet Size | enumeration |
| `fleet_size__exact_` | Fleet Size (Exact) | number |
| `fleet_type` | Fleet Type | enumeration |
| `free_agents_hired` | # Free Agents Hired | number |
| `market` | Market | enumeration |
| `requires_drug_test` | Requires Drug Test | enumeration |
| `safer_link` | Safer Link | string |
| `company_career_site` | Company Career Site | string |
| `employer_enrichment_tier` | Employer Enrichment Tier | enumeration |

### Location Properties
| Property Name | Label | Type |
|---------------|-------|------|
| `yard_address` | Yard Address | string |
| `yard_city` | Yard City | string |
| `yard_state` | Yard State | enumeration |
| `yard_zip_code` | Yard Zip Code | string |
| `office_address` | Office Address | string |
| `office_city` | Office City | string |
| `office_state` | Office State | enumeration |
| `office_zip_code` | Office Zip Code | string |

### Partnership Properties
| Property Name | Label | Type |
|---------------|-------|------|
| `mou_status` | MOU Status | enumeration |
| `partnership_model` | Partnership Model | enumeration |
| `program_launch_date` | Program Launch Date | date |

### Trucking School Properties
| Property Name | Label | Type |
|---------------|-------|------|
| `etpl_registered` | ETPL Registered | enumeration |
| `instructor_to_student_ratio` | Instructor to Student Ratio | enumeration |
| `truck_to_student_ratio` | Truck to Student Ratio | enumeration |
| `manual_training` | Manual Training | enumeration |
| `training_course_hours` | Training Course Hours | number |
| `training_schedule` | Training Schedule | string |
| `training_timeline` | Training Timeline | enumeration |
| `tuition_price` | Tuition Price | number |
| `minimum_hours_of_btw_training` | Minimum Hours of BTW Training | string |
| `n3rd_party_testing` | 3rd Party Testing | enumeration |

### Government/Workforce Properties
| Property Name | Label | Type |
|---------------|-------|------|
| `workforce_board_name` | Workforce Board Name | string |
| `wp_main_point_of_contact` | WP Main Point of Contact | string |
| `types_of_funding_streams` | Types of Funding Streams | enumeration |
| `set_annual_goals` | Set Annual Goals | number |
| `county_region` | County/Region | string |
| `define_service_area` | Define Service Area | string |

---

## Custom Contact Properties

| Property Name | Label | Type |
|---------------|-------|------|
| `fa_alumni` | FA Alumni | enumeration |
| `lead_source` | Lead Source | enumeration |
| `send_updates` | Send Quarterly Updates | enumeration |
| `partnership_model` | Partnership Model | enumeration |
| `office_locations` | Office Locations | string |

---

## Custom Deal Properties

| Property Name | Label | Type |
|---------------|-------|------|
| `mou` | MOU | string |
| `milestone` | Milestone | enumeration |
| `partnership_model` | Partnership Model | enumeration |
| `expected_launch_date` | Expected Launch Date | date |
| `service_area_of_deal` | Service Area of Deal | string |
| `state` | Deal State | string |
| `urban_or_rural` | Urban or Rural | enumeration |
| `types_of_funding_streams` | Types of Funding Streams | enumeration |
| `projected___of_wfas_to_be_served` | Annual Projected # of funded wFAs | number |
| `wfas_served_so_far_this_year` | wFAs Served so far this year | number |
| `likelihood` | Likelihood | enumeration |
| `renewal` | Renewal | enumeration |
| `disqualification_reason` | Disqualification Reason | enumeration |
| `type_of_loss` | Type of Loss | enumeration |

---

## Sample Company Data Analysis

From a sample of 20 companies, property population rates:

| Property | Populated | Empty |
|----------|-----------|-------|
| `name` | 20/20 (100%) | 0 |
| `domain` | 20/20 (100%) | 0 |
| `lifecyclestage` | 20/20 (100%) | 0 |
| `fleet_size` | 1/20 (5%) | 19 |
| `fleet_type` | 1/20 (5%) | 19 |
| `dot_number` | 1/20 (5%) | 19 |
| `free_agents_hired` | 1/20 (5%) | 19 |
| `yard_state` | 0/20 (0%) | 20 |
| `market` | 0/20 (0%) | 20 |

**Key Insight:** Custom FreeWorld-specific properties (fleet_size, dot_number, etc.) are largely unpopulated. Only `Melton Truck Lines - Corporate` had these fields filled out.

---

## Recommendations for CAP/HubSpot Integration

### For Career Agents Adding Employers

1. **Before importing to CAP:**
   - Ensure company is assigned to Employer Partnerships team (ID: 58551370)
   - Set lifecycle stage to "Opportunity" or "Customer"
   - Add at least one contact with email (this becomes `main_contact_email` for magic links)

2. **Critical HubSpot Fields to Fill:**
   - `name` - Company name (required)
   - Contact `email` - Required for Employer Portal magic links
   - `lifecyclestage` - Must be "opportunity" or "customer"
   - `hubspot_team_id` - Must be Employer Partnerships team

3. **Nice-to-Have Fields:**
   - `domain` - Used for display and deduplication
   - `city`, `state`, `zip` - Location context
   - `phone` - Company phone
   - `employer_enrichment_tier` - Enrichment status
   - Contact `jobtitle` - Helpful context

### For Future Enhancements

Consider syncing these FreeWorld-specific properties to CAP:
- `fleet_size` - For job matching
- `fleet_type` - For-hire vs private
- `dot_number` - FMCSA lookups
- `free_agents_hired` - Track placement history
- `yard_address/city/state/zip` - For commute calculations

---

## Files Generated

1. `hubspot_company_properties.json` - All 319 company properties
2. `hubspot_deal_properties.json` - All 455 deal properties
3. `hubspot_deal_pipelines.json` - All 7 deal pipelines with stages
4. `hubspot_contact_properties.json` - All 405 contact properties
5. `hubspot_sample_companies.json` - Sample of 20 companies (basic)
6. `hubspot_sample_companies_detailed.json` - Sample with custom properties
7. `hubspot_company_pipelines.json` - Company lifecycle stages
