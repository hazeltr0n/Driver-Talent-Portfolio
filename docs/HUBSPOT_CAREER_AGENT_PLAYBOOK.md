<div align="center">

![FreeWorld Logo](https://freeworld.org/fw-logo.svg)

# HUBSPOT PLAYBOOK
## For Career Agents

**Version 1.1 • February 2026**

</div>

---

## YOUR JOB IN HUBSPOT

**HubSpot** is where the employer relationship lives. This is where you find, track, and manage every carrier and employer you work with.

**CAP (Career Agent Portal)** is where placements live. HubSpot feeds CAP.

If the employer isn't in HubSpot with the right info, you can't track the relationship or move candidates into CAP.

---

## 1. Understanding Company Lifecycle Stages

Every company in HubSpot has a lifecycle stage. This tells you and the team where that employer is in our relationship. You need to know these cold.

### Standard Lifecycle Stages

| Stage | What It Means | What You Do |
|-------|---------------|-------------|
| **Lead** | We know they exist. No real engagement yet. | Research them. Are they hiring? Do they hire justice-impacted? Add to your call list. |
| **Marketing Qualified Lead** | Engaged with our content or inbound interest. | Qualify them. Book a discovery call. |
| **Sales Qualified Lead** | Qualified and ready for outreach. | Active outreach. Goal: book discovery meeting. |
| **Opportunity** | They're interested. Discussing a pilot or partnership. | Build out full employer profile. Start matching candidates. **Eligible for CAP.** |
| **Customer** | Signed. Active partnership. Sending them candidates. | **Eligible for CAP.** Manage the relationship. Secure requisitions. Track satisfaction. |
| **Evangelist** | Champion customer who refers others. | Maintain relationship. Ask for referrals. |

### FreeWorld Custom Lifecycle Stages

| Stage | What It Means |
|-------|---------------|
| **FA Employer** | Company where Free Agents are currently employed |
| **FreeWorld Employer Partner** | Formal FreeWorld partner |
| **Qualified Employer** | Qualified but not yet active |
| **Free Agent** | Used for Free Agent contact records (not companies) |

### KEY RULE: CAP Eligibility

> **Companies at "Customer" OR "Opportunity" status can be added to CAP for placement tracking.**
>
> Additionally, the company **MUST be assigned to the Employer Partnerships team** in HubSpot.
>
> If either condition is missing, the employer will NOT appear in CAP's HubSpot search.

---

## 2. Employer Partnerships Pipeline

When working deals in HubSpot, you'll use the **Employer Partnerships Pipeline**. This tracks progression from first call to active partnership.

| Stage | Probability | What It Means |
|-------|-------------|---------------|
| **Scheduled Call** | 20% | Initial outreach scheduled |
| **Pilot Scoping** | 40% | Discussing pilot parameters and terms |
| **Sending Candidates** | 60% | Actively submitting drivers |
| **First Hire** | 80% | One placement made |
| **Multiple Hires** | 90% | Multiple placements, relationship proven |
| **Won** | 100% | Active, ongoing partner |
| **Lost** | 0% | Partnership didn't work out |

---

## 3. Company Views You'll Use Daily

Set up these saved views in HubSpot so you're not swimming through every company in the system. These are your daily workspaces.

### View 1: My Leads
**Filter:** Lifecycle Stage = Lead AND Company Owner = [You]

This is your prospecting list. Companies you've identified but haven't contacted yet. Work through this when you need new employers to target.

### View 2: My Active Pipeline
**Filter:** Lifecycle Stage = Sales Qualified Lead OR Opportunity AND Company Owner = [You] AND Last Activity Date within last 30 days

Companies you're actively working. These need follow-ups. If something has been here for 30+ days with no response, either escalate your approach or move on.

### View 3: My Opportunities
**Filter:** Lifecycle Stage = Opportunity AND Company Owner = [You]

Your warm pipeline. These employers are engaged. This is where you focus energy on getting them to Customer.

### View 4: My Customers
**Filter:** Lifecycle Stage = Customer AND Company Owner = [You]

Your active partners. These are the employers you're placing Free Agents with. Check this daily for open reqs, retention check-ins, and relationship health.

### View 5: All Free Agent Employers
**Filter:** Lifecycle Stage = FA Employer

**YOUR #1 PROSPECTING SOURCE.** These companies already hire people from our population. Start here before cold outreach to strangers.

### View 6: CAP-Ready Employers
**Filter:** Lifecycle Stage IN (Customer, Opportunity) AND Team = Employer Partnerships

Companies that are eligible for CAP import. Use this to verify an employer is set up correctly before trying to add them in CAP.

---

## 4. Creating a New Company

### 4a. Before You Create

Search HubSpot first. The company may already exist. Search by name, domain, and common variations. If you find it, claim ownership or update the record — don't create a duplicate.

### 4b. Naming Convention (MANDATORY)

Follow the FreeWorld naming convention exactly. This keeps the CRM clean and searchable.

| Company Type | Format | Example |
|--------------|--------|---------|
| National / Single Location | Company Name - Corporate | Sysco - Corporate |
| Branch of National Company | Company Name - ST - City | Sysco - TX - Dallas |
| Multiple Locations Same City | Company Name - ST - City - Street | Sysco - TX - Dallas - Elm |
| Conglomerate with Brands | Conglomerate - Brand - ST - City | Sysco - Sygma - TX - Dallas |
| 3PL Servicing an Account | 3PL - Account - ST - City | Ryder - CVS Health - TX - Dallas |

### 4c. Required Company Properties

When you create a company, the following fields MUST be filled out before you move it past Lead stage.

| Property | Type | Why It Matters |
|----------|------|----------------|
| **Company Name** | Text (use naming convention) | Searchability and deduplication |
| **Lifecycle Stage** | Dropdown | Determines where it shows up and whether it's eligible for CAP |
| **Company Owner** | Dropdown (you) | So we know who owns the relationship |
| **Team** | Dropdown | **MUST be "Employer Partnerships" for CAP eligibility** |
| **Industry / Vertical** | Dropdown: OTR, Local, Dedicated, Tanker, Flatbed, Ready Mix, Intermodal, Other | Matching candidates to the right type of work |
| **Hires Justice-Impacted?** | Yes / No / Unknown | Non-negotiable. If No, we probably don't work with them. |
| **Service Area(s)** | Multi-select or text: states/regions they operate in | Geographic matching for candidates |
| **Primary Contact** | Associated contact | Who do we talk to about hiring |
| **Phone** | Phone number | For cold calls and check-ins |
| **Website / Domain** | URL | For research and deduplication |
| **Source** | Dropdown: FA Employer, Cold Outreach, Referral, Inbound, Event, David Intro | Track where our leads come from — PMF signal |

### 4d. Additional Properties (Fill As You Learn)

These aren't required at creation but should be filled in as the relationship develops. By the time a company reaches Customer, all of these should be populated.

| Property | Type | When to Fill |
|----------|------|--------------|
| **DOT Number** | Number | Discovery — for FMCSA lookups |
| **Fleet Size** | Enumeration | Discovery or earlier if publicly available |
| **Fleet Size (Exact)** | Number | Discovery |
| **Fleet Type** | Enumeration: For-Hire, Private, etc. | Discovery |
| **Equipment Types** | Multi-select: Dry Van, Reefer, Flatbed, Tanker, etc. | Discovery |
| **Pay Range (weekly)** | Text or number range | Discovery |
| **Home Time Policy** | Text: Daily, Weekly, Bi-weekly, 3 weeks out | Discovery |
| **Touch Freight Required?** | Yes / No | Discovery |
| **Background Check Lookback** | Number: years they look back on criminal history | Discovery — CRITICAL for our population |
| **DUI Policy** | Text: 3yr, 5yr, 7yr, never | Discovery |
| **Parole/Probation Policy** | Text: Will hire on supervision, won't, case by case | Discovery |
| **MVR Tolerance** | Text: Clean only, 1-2 minor, flexible | Discovery |
| **Minimum Experience Required** | Text: None, 6mo, 1yr, 2yr | Discovery |
| **Requires Drug Test** | Yes / No | Discovery |
| **Hiring Urgency** | Dropdown: Urgent, Active, Passive | Ongoing |
| **Notes / Culture Fit** | Long text | Ongoing — what makes a driver succeed or fail here |
| **Employer Enrichment Tier** | Enumeration | Set by enrichment process |
| **Yard Address/City/State/Zip** | Text | For commute calculations |
| **Company Career Site** | URL | For job postings |
| **SAFER Link** | URL | For FMCSA verification |

### WHY THIS DATA MATTERS

> **Background Check Lookback, DUI Policy, Parole/Probation Policy, and MVR Tolerance** are what make your matching possible.
>
> Without these fields filled in, you're guessing which candidates to send where. With them, you KNOW.
>
> This is the employer side of the matching engine. The assessment is the candidate side. Both need to be populated.

---

## 5. Adding Contacts

Every company needs at least one contact. This is the human being you're talking to at the employer.

### 5a. Required Contact Properties

| Property | Notes |
|----------|-------|
| **First Name / Last Name** | Required |
| **Email** | **CRITICAL — Required for CAP Employer Portal magic links** |
| **Phone (direct)** | Mobile preferred — the number you actually reach them at |
| **Job Title** | Recruiter, Safety Director, Fleet Manager, HR, Owner, etc. |
| **Associated Company** | MUST be linked to the company record |
| **Contact Owner** | You |

For larger companies, you may have multiple contacts. Add them all and note their roles. The recruiter who takes submittals is different from the safety director who approves hires.

### 5b. Why Contact Email Matters for CAP

When you import an employer to CAP, the **first associated contact's email** becomes the `main_contact_email`. This email is used for:

- **Employer Portal access** — Employers log in via magic link sent to this email
- **Interview request notifications** — When we submit drivers
- **Placement communications**

> **If the contact has no email, the employer cannot access the Employer Portal.**

---

## 6. Making Companies CAP-Ready

Before you try to import an employer to CAP, verify this checklist in HubSpot:

### CAP Import Checklist

- [ ] **Lifecycle Stage** is "Customer" or "Opportunity"
- [ ] **Team** is "Employer Partnerships"
- [ ] **At least one Contact** is associated with the company
- [ ] **Contact has Email** address populated
- [ ] **Company Name** follows naming convention
- [ ] **Domain** is filled in (helps with deduplication)

### What CAP Pulls from HubSpot

When you import an employer in CAP, these fields are automatically populated:

**Company Fields:**
| HubSpot Property | CAP Field |
|------------------|-----------|
| Company ID | hubspot_company_id |
| Parent Company ID | hubspot_parent_company_id |
| Name | name |
| Domain | domain |
| Phone | phone |
| City | city |
| State | state |
| Zip | zip |
| Lifecycle Stage | lifecycle_stage |
| Employer Enrichment Tier | employer_enrichment_tier |

**Contact Fields (First Associated Contact):**
| HubSpot Property | CAP Field |
|------------------|-----------|
| First Name + Last Name | main_contact_name |
| Email | main_contact_email |
| Phone | main_contact_phone |
| Mobile Phone | main_contact_mobile |

---

## 7. Lead Sourcing: Where to Find Employers

### PRIORITY ORDER

1. **Free Agent Employers** — companies where our graduates already work. They ALREADY hire our people.
2. **David's network** — TransForce contacts and industry relationships.
3. **Employers from OppTek/retention calls** — companies FAs mention during check-ins.
4. **Job board mining** — who's actively posting CDL jobs in our service areas.
5. **Cold outreach** — carriers identified through research, industry lists, events.

### 7a. Working the FA Employer List

This is your warmest lead source. These companies have already hired justice-impacted CDL drivers. Your opening line is:

> "You already have some of our graduates driving for you. We'd like to make that a formal partnership so we can send you more drivers who are pre-screened and matched to your operation."

When you make retention calls, ALWAYS ask:
> "How's it going at [Company]? Are they hiring? Who's the recruiter there?"

Every retention call is employer intelligence.

### 7b. Cold Outreach Workflow

1. Identify target: check that they're hiring CDL drivers and operate in our service areas
2. Research: fleet size, equipment type, reviews on Indeed/Glassdoor, any second-chance hiring signals
3. Create the company in HubSpot at Lead stage with all required properties
4. Add primary contact (with email!)
5. First touch: call or email. Log in HubSpot.
6. If no response after 3 touches over 2 weeks, deprioritize and move to next
7. If they engage, move to Sales Qualified Lead stage and book discovery with James/David

---

## 8. Your Daily HubSpot Workflow

### Morning (15 min)
- Check your task queue in HubSpot — what follow-ups are due today?
- Review My Customers view — any open reqs that need candidates?
- Review My Active Pipeline view — anyone due for a follow-up?

### Midday
- Make outreach calls / send emails. Log everything.
- If you have candidate matches ready, prepare submittals (in CAP)
- Employer check-in calls with active customers — log notes

### End of Day (10 min)
- Update any company properties that changed from today's conversations
- Set follow-up tasks for anything that needs action tomorrow or this week
- Move companies between lifecycle stages if status changed

---

## 9. Recurring Tasks

| Task | Frequency | Purpose |
|------|-----------|---------|
| Check in with active customers | Weekly | Secure new reqs, get feedback on placed drivers, relationship health |
| Review open reqs vs available candidates | 2x/week | Make sure nothing is sitting idle |
| Work Sales Pipeline | Daily | Move leads forward or out |
| Review FA Employer list for new targets | Weekly | Retention data surfaces new leads constantly |
| Update employer profiles with new intel | Ongoing | Every conversation teaches you something about the employer |
| Log retention call intel | After every call | If a FA mentions their employer, log it on the company record |
| Pipeline review with James/David | Weekly | Align on priorities, get coaching, unblock stuck deals |

---

## 10. Meeting Links & Discovery Calls

Set up a HubSpot meeting link so employers can book directly with you (and/or with James/David for discovery calls).

### 10a. Your Personal Meeting Link
- Go to Sales > Meetings in HubSpot
- Create a meeting link connected to your calendar
- Set availability to your working hours
- Use this link in cold outreach emails: "I'd love to set up a quick 15-minute call to learn about your hiring needs. Here's my calendar: [link]"

### 10b. Discovery Meeting (with James/David)

When an employer is interested enough for a real conversation about partnership, book a discovery meeting that includes James and/or David. This is where we learn enough about the employer to build their full profile and determine if they're a fit for our model.

After discovery, you're responsible for filling in all the "Additional Properties" from Section 4d.

---

## 11. Cold Call & Email Templates

### 11a. Cold Call Script

**OPENING**

> "Hi [Name], this is [Your Name] with FreeWorld. We provide pre-screened, CDL-certified drivers to carriers in [their area]. I know you're busy so I'll be quick — are you currently hiring drivers?"

**If yes:**
> "Great. We do things a little differently — every driver we send has been through a behavioral assessment and is personally matched to your operation. Would you be open to a 15-minute call with our team lead to see if there's a fit?"

**If no:**
> "No problem. Mind if I check back in a month? The market moves fast and I'd rather have us connected for when you do need drivers."

**If they push back:**
> "Totally understand. We work with carriers like [name one if you can] and our drivers come pre-screened with behavioral data that predicts retention and safety. Happy to send you a one-pager if that's easier."

### 11b. Cold Email Template

**SUBJECT:** Pre-screened CDL drivers for [Company Name]

> Hi [First Name],
>
> I'm reaching out from FreeWorld. We place CDL drivers who have been through a behavioral assessment and are matched specifically to your type of operation.
>
> Unlike job boards, we don't send you a pile of resumes. We send you candidates we know — assessed, coached, and ready to start.
>
> Would you be open to a quick call to see if there's a fit?
>
> [Meeting Link]
>
> [Your Name]
> Career Agent, FreeWorld
> [Phone]

### 11c. Follow-Up Email (3-5 days after first touch)

**SUBJECT:** RE: Pre-screened CDL drivers for [Company Name]

> Hi [First Name],
>
> Wanted to follow up on my note last week. We're seeing strong results with carriers who use our behaviorally-assessed driver pipeline — lower turnover, better safety records, and drivers who actually show up to orientation.
>
> Happy to share some data if you're interested. Here's my calendar: [Meeting Link]
>
> [Your Name]

---

## 12. How HubSpot Connects to CAP

HubSpot is the employer relationship system. CAP is the placement tracking system. Here's how they connect:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HUBSPOT                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │    Lead     │ → │    SQL      │ → │ Opportunity │ → │  Customer   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                              │                    │         │
│                                              │  CAP Eligible      │         │
│                                              ▼                    ▼         │
└──────────────────────────────────────────────┼────────────────────┼─────────┘
                                               │                    │
                        ┌──────────────────────┴────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                CAP                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Employer   │ → │ Requisition │ → │ Submission  │ → │   Placed    │  │
│  │  (Import)   │    │   (Job)     │    │  (Match)    │    │   (Hired)   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       EMPLOYER PORTAL                                │   │
│  │  - Magic link login (uses main_contact_email)                       │   │
│  │  - View driver feed (candidates scoring 70+)                        │   │
│  │  - Request interviews                                                │   │
│  │  - Track submission status                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Flow:

1. You build the employer relationship in HubSpot through outreach, discovery, and onboarding.
2. When an employer reaches **Customer or Opportunity status** AND is assigned to **Employer Partnerships team**, they become CAP-eligible.
3. You import the employer to CAP.
4. When they give you a job order, you create the requisition in CAP.
5. You match candidates to the req in CAP and track submittals/placements there.
6. Employers can self-serve via the **Employer Portal** to browse candidates and request interviews.
7. Placement outcomes and employer satisfaction get logged back on the HubSpot company record.

### THE RULE

| If it's about... | Use... |
|------------------|--------|
| The RELATIONSHIP with the employer | HubSpot |
| A specific PLACEMENT of a Free Agent | CAP |

**Both systems need to be current. If one is stale, the whole model breaks.**

---

## 13. Troubleshooting

### Employer not showing in CAP's HubSpot search?

1. **Check lifecycle stage** — Must be "Customer" or "Opportunity"
2. **Check team assignment** — Must be "Employer Partnerships" (Team ID: 58551370)
3. **Wait a few minutes** — HubSpot changes may take time to propagate
4. **Try different search terms** — Search is fuzzy but may miss some variations

### Employer Portal magic link not working for employer?

1. **Verify the employer exists in CAP** (not just HubSpot)
2. **Check `main_contact_email`** matches the email they're using to log in
3. **Magic links expire after 15 minutes** — they may need a new one

### Duplicate company in HubSpot?

1. Search thoroughly before creating (name, domain, variations)
2. If found, merge duplicates (HubSpot > Actions > Merge)
3. Update the surviving record with all relevant data

---

## 14. Related Playbooks & Resources

These playbooks cover other parts of the Career Agent role. Read them all.

| Playbook | What It Covers |
|----------|----------------|
| Naming Conventions | How to name companies in HubSpot |
| CDL Driver Screening Call | How to qualify and screen a candidate before matching |
| CDL Interview Coaching | How to coach candidates to nail carrier interviews |
| Career Agent Workflow (Notion) | Full Career Agent role spec, daily operations, pilot structure |
| FreeWorld Employer Pitch Deck | What we present to employers during discovery/sales |
| FitKit / Assessment Guide | How to administer and interpret Big Five + JoBehaviors |
| **CAP Playbook** | How to use the Career Agent Portal for placements |

---

<div align="center">

**FreeWorld**

*Building pathways to employment*

[freeworld.org](https://freeworld.org)

---

*This is a living document. As the Career Agent role evolves, this playbook will be updated. If something doesn't match reality, flag it.*

</div>
