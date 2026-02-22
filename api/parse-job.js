import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Job description required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Extract structured job information from this job posting. Return JSON:
{
  "employer": "company name",
  "location": "city, state",
  "yard_zip": "5-digit zip code of the yard/terminal location (extract from address if available)",
  "title": "job title",
  "route_type": "Local" or "Regional" or "OTR",
  "cdl_class": "A" or "B",
  "min_experience_years": number (0 if entry-level or not specified),
  "pay_min": number (weekly, estimate if only hourly/annual given),
  "pay_max": number (weekly, estimate if only hourly/annual given),
  "equipment_types": "comma-separated list (use: Dry Van, Reefer, Flatbed, Tanker, Box Truck, Straight Truck, End Dump, Tractor-Trailer)",
  "home_time": "Home Daily" or "Home Weekly" or "Home Bi-weekly" or "Out 2-3 weeks",
  "touch_freight": "Yes" or "No" or "Light" (look for loading/unloading, physical requirements, "no touch", "drop and hook"),
  "endorsements_required": "comma-separated list: Hazmat, Tanker, Doubles/Triples, or empty if none",
  "benefits": "brief summary of benefits",
  "requirements": "brief summary of key requirements",
  "notes": "any other important details"
}

For touch freight:
- "Yes" = driver loads/unloads freight manually
- "No" = no touch, drop and hook only
- "Light" = occasional or light touch freight

For pay conversion:
- Hourly: multiply by 50 hours/week
- Annual: divide by 52 weeks

For equipment_types, also check the job title (e.g., "Flatbed Driver" means Flatbed equipment).

If information is not available, use null for strings and 0 for numbers.
Only return valid JSON.`,
        },
        { role: 'user', content: description },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    res.status(200).json(parsed);
  } catch (error) {
    console.error('Parse job error:', error);
    res.status(500).json({ error: error.message });
  }
}
