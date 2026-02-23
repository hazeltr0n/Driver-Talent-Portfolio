<div align="center">

![FreeWorld Logo](https://freeworld.org/fw-logo.svg)

# FreeWorld FitKit
## Product Specification

**Version 2.0 | February 2026**

*A scientifically-validated career guidance and job fit assessment*

</div>

---

## Executive Summary

FitKit is a two-stage assessment that helps justice-impacted individuals discover career paths where they'll thrive, then (for those entering trucking) predicts fit for specific roles and employers.

**Stage 1 (Career Compass):** 42 items, 8 minutes → Maps to 900+ occupations
**Stage 2 (Trucking Fit):** 30 items, 6 minutes → Predicts trucking success

Total assessment time: **8-14 minutes** depending on career path.

---

## Problem Statement

### For Free Agents
Most justice-impacted individuals entering or re-entering the workforce have no structured, scientifically-grounded tools for understanding their strengths and career fit. They deserve better than trial-and-error placement into the first available seat.

### For FreeWorld
- **Retention crisis:** Industry-wide truck driver turnover exceeds 90% annually (ATA)
- **Mismatched expectations:** Retention calls show drivers leave due to route type, home time, and culture mismatches
- **No predictive signal:** Currently no data on which Free Agents will thrive in which roles
- **Political challenge:** Telling someone "you're not a fit for trucking" feels like rejection

### The Solution
An assessment that:
1. Shows everyone where they'd naturally retain (career guidance)
2. Predicts trucking-specific success for those pursuing it (employment outcomes)
3. Redirects non-trucking fits to better paths with evidence, not rejection

---

## Product Architecture

### Two-Stage Funnel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         STAGE 1: CAREER COMPASS                              │
│                           Everyone takes this                                │
│                            (~42 items, 8 min)                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Mini-IP (30 items)                                                  │    │
│  │  → RIASEC interest profile                                          │    │
│  │  → Which work activities energize you?                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Work Values (12 items)                                              │    │
│  │  → What matters to you in a job?                                    │    │
│  │  → Achievement, Independence, Support, Relationships, etc.          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  OUTPUT:                                                                     │
│  • Your RIASEC profile (e.g., "Realistic-Conventional-Enterprising")       │
│  • Your top work values                                                     │
│  • Top 10 career clusters that match your profile                          │
│  • Specific occupations from O*NET's 900+ database                         │
│  • Whether trucking is a natural fit for your type                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │  Is trucking in your  │
                          │  top career matches?  │
                          └───────────┬───────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
          ┌─────────────────┐                 ┌─────────────────┐
          │       YES       │                 │       NO        │
          │                 │                 │                 │
          │  Continue to    │                 │  Complete!      │
          │  Stage 2        │                 │                 │
          │                 │                 │  "Based on your │
          │  "Great fit!    │                 │  profile, you'd │
          │  Let's learn    │                 │  thrive in..."  │
          │  more about     │                 │                 │
          │  your trucking  │                 │  → Top careers  │
          │  style."        │                 │  → Next steps   │
          │                 │                 │  → Resources    │
          └────────┬────────┘                 └─────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          STAGE 2: TRUCKING FIT                               │
│                    Only trucking candidates take this                        │
│                            (~30 items, 6 min)                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Safety-Relevant Personality Facets (24 items)                       │    │
│  │  → Empathy (4 items)                                                │    │
│  │  → Anxiety (4 items)                                                │    │
│  │  → Risk-taking / Excitement-seeking (4 items)                       │    │
│  │  → Self-discipline (4 items)                                        │    │
│  │  → Impulse control (4 items)                                        │    │
│  │  → Dutifulness (4 items)                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Grit-S (8 items)                                                    │    │
│  │  → Perseverance of effort                                           │    │
│  │  → Consistency of interest                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  OUTPUT:                                                                     │
│  • Trucking fit score                                                       │
│  • Predicted retention risk (low/medium/high)                               │
│  • Best-fit trucking vertical (OTR, Local, Dedicated, etc.)                │
│  • Coaching recommendations                                                  │
│  • Employer matching data (for Career Agents)                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Career Compass

### Purpose
Help any individual understand their vocational interests and work values, then map them to career paths where people like them typically thrive and retain.

### Instruments

#### 1. Mini Interest Profiler (Mini-IP)
| Attribute | Value |
|-----------|-------|
| **Items** | 30 |
| **Time** | ~5 minutes |
| **Output** | RIASEC profile (6 scores) |
| **Source** | U.S. Department of Labor / O*NET Center |
| **License** | Public domain |
| **Validation** | N=1,636, 73% first-letter code agreement with full IP |

**Citation:**
Rounds, J., Su, R., Lewis, P., & Rivkin, D. (2013). *O*NET Interest Profiler Short Form and Mini-IP Psychometric Characteristics.* National Center for O*NET Development. [Link](https://www.onetcenter.org/dl_files/Mini-IP_Linking.pdf)

**What it measures:**
| Code | Type | Description | Example Occupations |
|------|------|-------------|---------------------|
| R | Realistic | Working with things, tools, machines | Truck Driver, Mechanic, Welder |
| I | Investigative | Researching, analyzing, problem-solving | Engineer, Scientist, Analyst |
| A | Artistic | Creating, expressing, designing | Designer, Writer, Musician |
| S | Social | Helping, teaching, counseling | Teacher, Counselor, Nurse |
| E | Enterprising | Leading, persuading, managing | Manager, Sales, Entrepreneur |
| C | Conventional | Organizing, data, procedures | Accountant, Dispatcher, Admin |

**Trucking Holland Code:** Primarily **Realistic-Conventional (RC)**

#### 2. Work Values Assessment
| Attribute | Value |
|-----------|-------|
| **Items** | 12 |
| **Time** | ~3 minutes |
| **Output** | 6 work value scores |
| **Source** | Adapted from O*NET Work Importance Locator |
| **License** | Public domain |
| **Validation** | Based on Minnesota Theory of Work Adjustment |

**Citation:**
McCloy, R., Waugh, G., Medsker, G., Wall, J., Rivkin, D., & Lewis, P. (1999). *Development of the O*NET Paper-and-Pencil Work Importance Locator.* National Center for O*NET Development. [Link](https://www.onetcenter.org/dl_files/DevWIL.pdf)

Dawis, R. V., & Lofquist, L. H. (1984). *A Psychological Theory of Work Adjustment.* University of Minnesota Press.

**What it measures:**
| Value | Description | High Scorers Value... |
|-------|-------------|----------------------|
| Achievement | Using abilities, sense of accomplishment | Challenge, recognition for work |
| Independence | Working autonomously, making decisions | Freedom, self-direction |
| Recognition | Advancement, status, leadership | Prestige, authority |
| Relationships | Coworkers, teamwork, service | Social connection, helping others |
| Support | Company backing, fair treatment | Job security, good supervision |
| Working Conditions | Pay, activity, variety | Compensation, physical comfort |

### Output: Career Match Report

The Career Compass generates a personalized report showing:

1. **Your Interest Profile**
   - Primary RIASEC code (e.g., "RCE - Realistic, Conventional, Enterprising")
   - Visual hexagon showing relative strengths
   - What this means in plain language

2. **Your Work Values**
   - Ranked importance of 6 work values
   - What this suggests about ideal work environments

3. **Career Families That Fit You**
   - Top 5-10 career clusters from O*NET
   - Specific occupations within each cluster
   - Median salary and growth outlook
   - Typical education/training required

4. **Trucking Fit Indicator**
   - Clear signal: Is trucking a natural match for this profile?
   - If yes: "Your profile aligns well with trucking careers. Continue to the Trucking Fit assessment."
   - If no: "Your profile suggests you'd thrive more in [alternatives]. Here's why..."

---

## Stage 2: Trucking Fit

### Purpose
For individuals pursuing trucking, predict:
1. Overall likelihood of success and retention
2. Best-fit trucking vertical (OTR, Local, Dedicated, Tanker, etc.)
3. Specific strengths and risk factors
4. Coaching and development recommendations

### Instruments

#### 1. Safety-Relevant Personality Facets
| Attribute | Value |
|-----------|-------|
| **Items** | 24 (4 per facet × 6 facets) |
| **Time** | ~4 minutes |
| **Output** | 6 facet scores |
| **Source** | International Personality Item Pool (IPIP) |
| **License** | Public domain |
| **Validation** | Facet-level prediction of truck driver accidents |

**Citation:**
Sackett, P. R., Lievens, F., Van Iddekinge, C. H., & Kuncel, N. R. (2017). Individual differences and their measurement: A review of 100 years of research. *Journal of Applied Psychology, 102*(3), 254-273.

Wilmot, M. P., DeYoung, C. G., Stillwell, D., & Kosinski, M. (2019). Relationships between personality facets and accident involvement among truck drivers. *Journal of Research in Personality, 64*, 106-118. [Link](https://www.sciencedirect.com/science/article/abs/pii/S0092656619301102)

**Facets measured and why:**

| Facet | Domain | Why It Matters for Trucking | Direction |
|-------|--------|----------------------------|-----------|
| **Empathy** | Agreeableness | Lower accident rates | Higher = better |
| **Anxiety** | Neuroticism | Higher accident rates when elevated | Lower = better |
| **Excitement-Seeking** | Extraversion | Risk-taking behavior | Lower = better |
| **Self-Discipline** | Conscientiousness | Compliance, reliability | Higher = better |
| **Immoderation** | Neuroticism | Impulse control issues | Lower = better |
| **Dutifulness** | Conscientiousness | Following rules, safety protocols | Higher = better |

**Item Source:**
Items drawn from IPIP representations of NEO-PI-R facets. Available at [ipip.ori.org](https://ipip.ori.org/newNEOFacetsKey.htm).

#### 2. Short Grit Scale (Grit-S)
| Attribute | Value |
|-----------|-------|
| **Items** | 8 |
| **Time** | ~2 minutes |
| **Output** | Grit score + 2 subscales |
| **Source** | Angela Duckworth, University of Pennsylvania |
| **License** | Public domain for research/educational use |
| **Validation** | Predicts retention at West Point, sales jobs, military |

**Citation:**
Duckworth, A. L., & Quinn, P. D. (2009). Development and validation of the Short Grit Scale (Grit-S). *Journal of Personality Assessment, 91*(2), 166-174. [Link](https://pubmed.ncbi.nlm.nih.gov/19205937/)

**What it measures:**
| Subscale | Description | Relevance to Trucking |
|----------|-------------|----------------------|
| Perseverance of Effort | Working hard despite setbacks | Long hauls, difficult conditions |
| Consistency of Interest | Sticking with goals over time | Career commitment, not job-hopping |

**Key finding:** Among adults, Grit-S was associated with fewer career changes and higher retention in demanding roles.

### Output: Trucking Fit Report

1. **Trucking Fit Score** (0-100)
   - Overall prediction of success in trucking career
   - Based on weighted combination of facets + grit

2. **Retention Risk Level**
   - Low / Medium / High
   - Based on facet profile comparison to retention research

3. **Best-Fit Trucking Vertical**
   | Vertical | Profile Indicators |
   |----------|-------------------|
   | OTR (Over-the-Road) | High independence, high grit, low need for social connection |
   | Local/Regional | Moderate independence, values home time, relationships matter |
   | Dedicated | High dutifulness, values routine, lower excitement-seeking |
   | Tanker/Hazmat | High self-discipline, very low risk-taking, detail-oriented |
   | Flatbed | Higher physical tolerance, practical problem-solving |

4. **Strengths & Watch Areas**
   - Specific facets where they score well
   - Facets that may need coaching or self-awareness

5. **Coaching Recommendations**
   - Tailored guidance based on profile
   - E.g., "Your excitement-seeking score suggests you may get bored on long OTR runs. Consider dedicated routes with more variety."

6. **Employer Match Data** (Career Agent view only)
   - Fit scores against employer profiles
   - Which companies match this driver's profile

---

## Item Inventory

### Stage 1: Career Compass (42 items)

#### Mini-IP Items (30)
*5 items per RIASEC type, rated on 5-point scale (Strongly Dislike to Strongly Like)*

**Realistic (5 items)**
1. Build kitchen cabinets
2. Lay brick or tile
3. Repair household appliances
4. Raise fish in a fish hatchery
5. Assemble electronic parts

**Investigative (5 items)**
1. Develop a new medicine
2. Study ways to reduce water pollution
3. Conduct chemical experiments
4. Study the movement of planets
5. Examine blood samples using a microscope

**Artistic (5 items)**
1. Write books or plays
2. Play a musical instrument
3. Compose or arrange music
4. Draw pictures
5. Create special effects for movies

**Social (5 items)**
1. Teach an individual an exercise routine
2. Help people with personal or emotional problems
3. Give career guidance to people
4. Perform rehabilitation therapy
5. Help conduct a group therapy session

**Enterprising (5 items)**
1. Buy and sell stocks and bonds
2. Manage a retail store
3. Operate a beauty salon or barber shop
4. Manage a department within a large company
5. Start your own business

**Conventional (5 items)**
1. Develop a spreadsheet using computer software
2. Proofread records or forms
3. Load computer software into a large computer network
4. Operate a calculator
5. Keep shipping and receiving records

**Source:** O*NET Mini Interest Profiler. Public domain.

#### Work Values Items (12)
*2 items per value, rated on 5-point importance scale*

**Achievement**
1. Having work where I could do something different every day
2. Having work where I could see the results of my efforts

**Independence**
1. Having work where I could make decisions on my own
2. Having work where I could plan my work with little supervision

**Recognition**
1. Having work where I could be "somebody" in the community
2. Having work where I could direct and instruct others

**Relationships**
1. Having work where I could have co-workers who would be easy to get along with
2. Having work where I could be of service to others

**Support**
1. Having work where my employer would back me with fair policies
2. Having work where I could have steady employment

**Working Conditions**
1. Having work where I could be paid well compared to other workers
2. Having work where I could have good working conditions

**Source:** Adapted from O*NET Work Importance Locator. Public domain.

---

### Stage 2: Trucking Fit (32 items)

#### Personality Facets (24 items)
*4 items per facet, rated on 5-point accuracy scale (Very Inaccurate to Very Accurate)*

**Empathy (A6 - Sympathy)**
1. Sympathize with others' feelings
2. Feel others' emotions
3. Am concerned about others
4. Take time to help others *(R)*

**Anxiety (N1 - Anxiety)**
1. Worry about things
2. Am easily disturbed
3. Get stressed out easily
4. Am relaxed most of the time *(R)*

**Excitement-Seeking (E5 - Excitement-Seeking)**
1. Love excitement
2. Seek adventure
3. Enjoy being reckless
4. Act wild and crazy

**Self-Discipline (C5 - Self-Discipline)**
1. Get chores done right away
2. Am always prepared
3. Carry out my plans
4. Waste my time *(R)*

**Immoderation (N5 - Immoderation)**
1. Often eat too much
2. Go on binges
3. Rarely overindulge *(R)*
4. Easily resist temptations *(R)*

**Dutifulness (C3 - Dutifulness)**
1. Keep my promises
2. Follow through on my commitments
3. Tell the truth
4. Break rules *(R)*

*(R) = Reverse scored*

**Source:** IPIP representations of NEO-PI-R facets. ipip.ori.org. Public domain.

#### Grit-S (8 items)
*Rated on 5-point scale (Not at all like me to Very much like me)*

**Consistency of Interest**
1. New ideas and projects sometimes distract me from previous ones *(R)*
2. Setbacks don't discourage me
3. I have been obsessed with a certain idea or project for a short time but later lost interest *(R)*
4. I am a hard worker

**Perseverance of Effort**
5. I often set a goal but later choose to pursue a different one *(R)*
6. I have difficulty maintaining my focus on projects that take more than a few months to complete *(R)*
7. I finish whatever I begin
8. I am diligent

*(R) = Reverse scored*

**Source:** Duckworth, A. L., & Quinn, P. D. (2009). Public domain for research/educational use.

---

## Scoring Algorithms

### Stage 1: Career Compass

#### RIASEC Scoring
```
For each RIASEC type (R, I, A, S, E, C):
  Raw score = Sum of 5 item responses (range: 5-25)
  Standardized score = (Raw - 15) / 4  # Approximate z-score

Primary code = Top 3 types by score (e.g., "RCE")
```

#### Work Values Scoring
```
For each value (Achievement, Independence, Recognition, Relationships, Support, Working Conditions):
  Raw score = Sum of 2 item responses (range: 2-10)
  Rank values by score for prioritized list
```

#### O*NET Occupation Matching
```
For each of 900+ O*NET occupations:
  Occupation has assigned RIASEC code (e.g., "RC" for Truck Driver)

  Congruence score = Weighted match between person's RIASEC and occupation's code
    - First letter match: +3 points
    - Second letter match: +2 points
    - Third letter match: +1 point
    - Adjacent hexagon match: +0.5 points

  Sort occupations by congruence score
  Return top 20-30 matching occupations grouped by career cluster
```

#### Trucking Fit Gate
```
Trucking-related occupations:
  - Heavy and Tractor-Trailer Truck Drivers (53-3032)
  - Light Truck Drivers (53-3033)
  - Bus Drivers (53-3052)

If any trucking occupation in top 15 matches:
  trucking_fit_gate = TRUE
  Message: "Your profile aligns well with trucking careers."
Else:
  trucking_fit_gate = FALSE
  Message: "Your profile suggests stronger fit with [top alternatives]."
  Show: Top 5 non-trucking career clusters
```

### Stage 2: Trucking Fit

#### Facet Scoring
```
For each facet:
  Raw score = Sum of 4 item responses (range: 4-20)
  Reverse score items marked (R) before summing
  Standardized score = (Raw - 12) / 3.2  # Approximate z-score
```

#### Trucking Fit Score
```
# Based on Wilmot et al. (2019) findings on facet-accident relationships

Positive factors (higher = better):
  empathy_z = standardized empathy score
  self_discipline_z = standardized self-discipline score
  dutifulness_z = standardized dutifulness score
  grit_z = standardized grit score

Negative factors (lower = better, so we flip):
  anxiety_risk = -1 * standardized anxiety score
  excitement_risk = -1 * standardized excitement-seeking score
  impulse_risk = -1 * standardized immoderation score

Trucking Fit Score = 50 + 10 * (
  0.20 * empathy_z +
  0.20 * self_discipline_z +
  0.15 * dutifulness_z +
  0.15 * grit_z +
  0.10 * anxiety_risk +
  0.10 * excitement_risk +
  0.10 * impulse_risk
)

# Clamped to 0-100 range
# Mean = 50, SD ≈ 10 in general population
```

#### Retention Risk Classification
```
If trucking_fit_score >= 60:
  retention_risk = "Low"
  message = "Strong predicted retention. This person's profile aligns well with trucking demands."

Elif trucking_fit_score >= 45:
  retention_risk = "Medium"
  message = "Moderate retention risk. Some facets may need coaching attention."

Else:
  retention_risk = "High"
  message = "Elevated retention risk. Consider whether trucking is the best fit, or provide enhanced support."
```

#### Vertical Matching
```
# Vertical profiles based on job demands

OTR_fit = (
  0.3 * independence_value +      # From Stage 1
  0.3 * grit_z +
  0.2 * (-excitement_seeking_z) + # Lower = better for long hauls
  0.2 * self_discipline_z
)

Local_fit = (
  0.3 * relationships_value +     # From Stage 1
  0.3 * dutifulness_z +
  0.2 * empathy_z +
  0.2 * (-anxiety_z)
)

Dedicated_fit = (
  0.4 * dutifulness_z +
  0.3 * self_discipline_z +
  0.2 * (-excitement_seeking_z) +
  0.1 * support_value             # From Stage 1
)

Tanker_fit = (
  0.4 * self_discipline_z +
  0.3 * dutifulness_z +
  0.2 * (-immoderation_z) +
  0.1 * (-anxiety_z)
)

Best vertical = argmax(OTR_fit, Local_fit, Dedicated_fit, Tanker_fit)
```

---

## Technical Implementation

### Data Model

```
Assessment
├── id (uuid)
├── candidate_id (fk → Free Agents)
├── started_at (timestamp)
├── completed_at (timestamp)
├── stage_1_completed (boolean)
├── stage_2_completed (boolean)
└── version (string)

Stage1Response
├── assessment_id (fk)
├── item_code (string, e.g., "MINI_IP_R_1")
├── response (integer, 1-5)
└── response_time_ms (integer)

Stage1Results
├── assessment_id (fk)
├── riasec_r, riasec_i, riasec_a, riasec_s, riasec_e, riasec_c (float)
├── riasec_code (string, e.g., "RCE")
├── work_values (jsonb)
├── top_occupations (jsonb, array of O*NET codes + scores)
├── trucking_gate_passed (boolean)
└── computed_at (timestamp)

Stage2Response
├── assessment_id (fk)
├── item_code (string, e.g., "FACET_EMPATHY_1")
├── response (integer, 1-5)
└── response_time_ms (integer)

Stage2Results
├── assessment_id (fk)
├── facet_empathy, facet_anxiety, facet_excitement, facet_discipline, facet_immoderation, facet_dutifulness (float)
├── grit_perseverance, grit_consistency, grit_total (float)
├── trucking_fit_score (float)
├── retention_risk (enum: low, medium, high)
├── best_vertical (string)
├── vertical_scores (jsonb)
├── coaching_notes (text, AI-generated)
└── computed_at (timestamp)
```

### API Endpoints

```
POST /api/fitkit/start
  → Creates new assessment, returns assessment_id

POST /api/fitkit/stage1/respond
  → Records Stage 1 responses (batch)
  → Body: { assessment_id, responses: [{item_code, response}] }

POST /api/fitkit/stage1/complete
  → Triggers Stage 1 scoring
  → Returns: Stage1Results + trucking_gate decision

POST /api/fitkit/stage2/respond
  → Records Stage 2 responses (batch)

POST /api/fitkit/stage2/complete
  → Triggers Stage 2 scoring
  → Returns: Stage2Results

GET /api/fitkit/results/{assessment_id}
  → Returns full results (both stages if completed)

GET /api/fitkit/report/{assessment_id}
  → Returns formatted PDF/HTML report
```

### CareerOneStop / O*NET Integration

FreeWorld has access to the CareerOneStop API (DOL-sponsored), which provides full O*NET occupation data.

**API Credentials:**
```
CAREERONESTOP_USER_ID=MqoV6d3sqb32FXO
CAREERONESTOP_TOKEN=AHa++zldYOWWSsyKoWn+xqQyMGHD4W4QFq9iOKXDAvKqq95pmWkiWyf5yVlV+I2jct696ylPzqLz4QC9lDrCwA==
```

**Get Occupation Details:**
```bash
GET https://api.careeronestop.org/v1/occupation/{userId}/{onetCode}/{location}
    ?interest=true&skills=true&knowledge=true&tasks=true&values=true

Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
```

**Response includes:**
- `InterestDataList` - RIASEC codes with rankings
- `SkillsDataList` - 35 skills with importance scores (0-100)
- `KnowledgeDataList` - 33 knowledge areas with importance
- `Tasks` - Detailed job tasks
- `EducationTraining` - Typical education requirements
- `BrightOutlook` - Job growth outlook

**Example: Truck Driver (53-3032.00)**
```json
{
  "InterestDataList": [
    {"ElementName": "Realistic", "DataValue": "1"},
    {"ElementName": "Conventional", "DataValue": "6"}
  ],
  "SkillsDataList": [
    {"ElementName": "Operation and Control", "Importance": "69"},
    {"ElementName": "Operations Monitoring", "Importance": "69"}
  ]
}
```

**Matching Algorithm:**
```python
def match_occupations(candidate_riasec: dict, candidate_values: dict) -> list:
    """
    For each O*NET occupation:
    1. Fetch occupation details from CareerOneStop API
    2. Compare candidate's RIASEC to occupation's interest codes
    3. Compare candidate's work values to occupation's value requirements
    4. Return ranked list of matching occupations
    """
    # Cache occupation data to reduce API calls
    # API rate limit: Check CareerOneStop documentation
```

---

## User Experience

### Free Agent Journey

**1. Introduction (30 seconds)**
> "Welcome to FitKit. This assessment will help you discover careers where you'll thrive. It takes about 8-15 minutes. There are no right or wrong answers—just be honest about what you like and how you see yourself."

**2. Stage 1: Career Compass (8 minutes)**
- 42 questions, mobile-friendly
- Progress bar showing completion
- Simple language, no jargon

**3. Stage 1 Results**
> "Based on your responses, here's what we learned about you..."
- Interest profile visualization
- Work values ranking
- Top career matches with descriptions
- Clear indication of trucking fit

**4. Trucking Gate**

*If trucking fits:*
> "Great news! Trucking careers align well with your profile. Let's learn more about your trucking style with a few more questions."
> [Continue to Stage 2]

*If trucking doesn't fit:*
> "Based on your profile, you might find more satisfaction in careers like [logistics coordination, warehouse management, equipment operation]. Here's why..."
> - Show alternative careers with explanations
> - Provide resources for exploring those paths
> - Option to continue to Stage 2 anyway (override)

**5. Stage 2: Trucking Fit (6 minutes)**
- 32 questions
- Different framing: "How accurate is this for you?"

**6. Stage 2 Results**
> "Here's your trucking fit profile..."
- Fit score with context
- Best-fit vertical recommendation
- Strengths and watch areas
- Next steps

### Career Agent View

Career Agents see additional data:
- Raw scores and percentiles
- Comparison to successful drivers in database
- Employer matching recommendations
- Red flags requiring conversation
- Coaching guidance

---

## Validation Plan

### Phase 1: Content Validation (Weeks 1-2)
- [ ] Expert review of item selection
- [ ] Reading level analysis (target: 6th grade)
- [ ] Pilot with 20 Free Agents for comprehension

### Phase 2: Construct Validation (Weeks 3-8)
- [ ] Administer to 100+ Free Agents
- [ ] Confirm RIASEC factor structure
- [ ] Confirm facet reliability (target: α > 0.70)
- [ ] Compare to existing Career Compass if available

### Phase 3: Criterion Validation (Months 3-12)
- [ ] Track 90-day, 180-day retention for trucking placements
- [ ] Correlate Stage 2 scores with actual retention
- [ ] Build FreeWorld-specific norms
- [ ] Refine scoring weights based on outcomes

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Completion rate | > 85% | Assessments completed / started |
| Time to complete | < 15 min | Median completion time |
| Stage 1 reliability | α > 0.75 | Cronbach's alpha per scale |
| Stage 2 reliability | α > 0.70 | Cronbach's alpha per facet |
| Retention prediction | r > 0.20 | Correlation with 90-day retention |
| Candidate satisfaction | > 4.0/5.0 | Post-assessment survey |

---

## Bibliography

### Core Instruments

| Instrument | Citation |
|------------|----------|
| Mini Interest Profiler | Rounds, J., Su, R., Lewis, P., & Rivkin, D. (2013). *O*NET Interest Profiler Short Form and Mini-IP Psychometric Characteristics.* National Center for O*NET Development. |
| Work Values | McCloy, R., et al. (1999). *Development of the O*NET Paper-and-Pencil Work Importance Locator.* National Center for O*NET Development. |
| IPIP Facets | Goldberg, L. R., et al. (2006). The International Personality Item Pool and the future of public-domain personality measures. *Journal of Research in Personality, 40*, 84-96. |
| Grit-S | Duckworth, A. L., & Quinn, P. D. (2009). Development and validation of the Short Grit Scale (Grit-S). *Journal of Personality Assessment, 91*(2), 166-174. |

### Theoretical Foundations

| Theory | Citation |
|--------|----------|
| Holland's RIASEC | Holland, J. L. (1997). *Making Vocational Choices: A Theory of Vocational Personalities and Work Environments* (3rd ed.). Psychological Assessment Resources. |
| Minnesota Theory of Work Adjustment | Dawis, R. V., & Lofquist, L. H. (1984). *A Psychological Theory of Work Adjustment.* University of Minnesota Press. |
| Person-Environment Fit | Kristof-Brown, A. L., Zimmerman, R. D., & Johnson, E. C. (2005). Consequences of individuals' fit at work: A meta-analysis of person-job, person-organization, person-group, and person-supervisor fit. *Personnel Psychology, 58*, 281-342. |

### Trucking-Specific Research

| Finding | Citation |
|---------|----------|
| Facet-level accident prediction | Wilmot, M. P., DeYoung, C. G., Stillwell, D., & Kosinski, M. (2019). Relationships between personality facets and accident involvement among truck drivers. *Journal of Research in Personality, 64*, 106-118. |
| Big Five and driver safety | Luo, X., et al. (2023). Meta-analysis of Big Five personality traits and driving behavior. *BMC Psychology.* |
| Grit and retention | Duckworth, A. L., & Quinn, P. D. (2009). Development and validation of the Short Grit Scale. *Journal of Personality Assessment.* |

### Validation Studies

| Topic | Citation |
|-------|----------|
| RIASEC congruence and outcomes | Nye, C. D., Su, R., Rounds, J., & Drasgow, F. (2012). Vocational interests and performance: A quantitative summary of over 60 years of research. *Perspectives on Psychological Science, 7*, 384-403. |
| Short Big Five measures | Soto, C. J., & John, O. P. (2017). Short and extra-short forms of the Big Five Inventory-2. *Journal of Research in Personality, 68*, 69-81. |
| Work values and retention | Dawis, R. V. (2005). The Minnesota Theory of Work Adjustment. In S. D. Brown & R. W. Lent (Eds.), *Career Development and Counseling* (pp. 3-23). Wiley. |

---

## Appendix A: O*NET Trucking Occupations

| O*NET Code | Title | RIASEC | Typical Entry |
|------------|-------|--------|---------------|
| 53-3032.00 | Heavy and Tractor-Trailer Truck Drivers | RC | CDL training |
| 53-3033.00 | Light Truck Drivers | RC | HS diploma |
| 53-3052.00 | Bus Drivers, Transit and Intercity | RS | CDL training |
| 53-3031.00 | Driver/Sales Workers | EC | HS diploma |
| 53-1031.00 | First-Line Supervisors of Transportation Workers | EC | Experience |

---

## Appendix B: Alternative Career Clusters for Non-Trucking Fits

When trucking isn't the best fit, FitKit recommends these alternatives based on RIASEC profile:

| If Primary Code | Consider | Why |
|-----------------|----------|-----|
| R (Realistic) | Equipment Operator, Mechanic, Welder, Construction | Same hands-on orientation |
| RC | Logistics Coordinator, Warehouse Manager, Dispatcher | Related to trucking ecosystem |
| RE | Equipment Sales, Fleet Management | Realistic + leadership |
| RS | CDL Instructor, Safety Trainer | Realistic + helping others |
| C (Conventional) | Accounting, Data Entry, Inventory Control | Detail-oriented, organized |
| E (Enterprising) | Sales, Small Business, Management | Leadership, persuasion |
| S (Social) | Counseling, Teaching, Healthcare | Helping orientation |

---

## Appendix C: Coaching Recommendations by Profile

| Profile Pattern | Coaching Recommendation |
|-----------------|------------------------|
| High excitement-seeking + High grit | "You may get bored on long OTR runs. Consider dedicated routes with more variety, or set personal challenges to stay engaged." |
| High anxiety + Low self-discipline | "Trucking's unpredictability may be stressful. Work on routines and coping strategies. Consider local routes with more predictability." |
| Low empathy + High dutifulness | "You'll follow rules well but may struggle with customer service aspects. Practice patience with shippers/receivers." |
| High grit + Low excitement-seeking | "You're built for the long haul. OTR is likely a great fit. Your persistence will serve you well through the tough first year." |
| Low grit + High relationships | "Local routes with daily home time and regular customer relationships may suit you better than isolated OTR work." |

---

<div align="center">

**FreeWorld**

*Building pathways to employment*

[freeworld.org](https://freeworld.org)

---

*Document Version: 2.0*
*Last Updated: February 2026*

</div>
