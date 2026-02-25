import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description } = req.body;

  if (!description || description.length < 50) {
    return res.status(400).json({ error: 'Job description too short (min 50 characters)' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a job posting parser for CDL truck driver positions. Extract structured data from job descriptions.

Return a JSON object with these fields (use null if not found):
- title: string - Job title
- location: string - City, State format
- yard_zip: string - 5-digit zip code of yard/terminal
- route_type: "Local" | "Regional" | "OTR" | null
- cdl_class: "A" | "B" | null
- min_experience_years: number - Minimum years of experience required
- pay_min: number - Minimum weekly pay in dollars (convert hourly/CPM to weekly estimate if needed)
- pay_max: number - Maximum weekly pay in dollars
- home_time: "Home Daily" | "Home Weekly" | "Home Bi-weekly" | "Out 2-3 weeks" | null
- touch_freight: "Very Light" | "Light" | "Medium" | "Heavy" | null
- equipment_types: string - Comma-separated list (e.g., "Dry Van, Reefer")
- endorsements_required: string - Comma-separated endorsements (e.g., "Hazmat, Tanker")
- max_mvr_violations: number - Max violations allowed (default 2 if strict, 3 if lenient)
- max_accidents: number - Max accidents allowed (default 1)
- positions_available: number - Number of openings (default 1)
- notes: string - Key benefits or requirements not captured elsewhere

Pay conversion guidelines:
- CPM (cents per mile): Assume 2,500 miles/week. $0.55/mile = $1,375/week
- Hourly: Assume 50 hours/week. $25/hr = $1,250/week
- Annual: Divide by 52. $70,000/year = $1,346/week

Return ONLY valid JSON, no markdown or explanation.`
        },
        {
          role: 'user',
          content: description
        }
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;

    // Parse the JSON response
    let parsed;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Failed to parse OpenAI response:', content);
      return res.status(500).json({ error: 'Failed to parse job description' });
    }

    // Clean up null values
    const result = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && value !== undefined && value !== '') {
        result[key] = value;
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Parse job error:', error);
    res.status(500).json({ error: error.message });
  }
}
