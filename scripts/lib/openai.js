import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractTextFromPDF(filePath) {
  // Read the PDF file as base64
  const absolutePath = path.resolve(filePath);
  const fileBuffer = await fs.readFile(absolutePath);
  const base64 = fileBuffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all text from this PDF document. Return the raw text content, preserving the structure as much as possible.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:application/pdf;base64,${base64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  return response.choices[0].message.content;
}

export async function parseTenstreetApplication(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a data extraction specialist. Extract structured information from a Tenstreet driver application.
Return a JSON object with these fields:
{
  "fullName": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "email": "string",
  "city": "string",
  "state": "string",
  "cdl_class": "A or B",
  "endorsements": "comma-separated string",
  "license_number": "string",
  "license_state": "string",
  "license_expiration": "YYYY-MM-DD or null",
  "years_experience": number,
  "employment_history": [
    {
      "company": "string",
      "role": "string (usually Company Driver)",
      "tenure": "X months or X years",
      "start_date": "string",
      "end_date": "string",
      "verified": true,
      "regulated": true/false (DOT-regulated carrier)
    }
  ],
  "equipment_experience": [
    {
      "type": "string (e.g., Tractor-Trailer, 53' Dry Van, Tanker)",
      "level": "string (e.g., Yes, Primary Experience, < 1 year)"
    }
  ]
}
Only return valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Extract driver information from this Tenstreet application:\n\n${pdfText}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function parseMVR(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a data extraction specialist. Extract Motor Vehicle Record (MVR) information.
Return a JSON object:
{
  "mvr_status": "Clear or Has Violations",
  "mvr_violations_3yr": number (moving violations in past 3 years),
  "mvr_accidents_3yr": number (at-fault accidents in past 3 years),
  "suspensions": number,
  "summary": "Brief text summary of MVR status"
}
Only return valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Extract MVR information:\n\n${pdfText}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function parsePSP(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a data extraction specialist. Extract Pre-Employment Screening Program (PSP) information.
Return a JSON object:
{
  "psp_crashes_5yr": number (crashes in past 5 years),
  "psp_inspections_3yr": number (inspections in past 3 years),
  "psp_driver_oos": number (driver out-of-service violations)
}
Only return valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Extract PSP information:\n\n${pdfText}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function parseClearinghouse(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a data extraction specialist. Extract FMCSA Drug & Alcohol Clearinghouse information.
Return a JSON object:
{
  "clearinghouse_status": "Not Prohibited" or "Prohibited"
}
Only return valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Extract Clearinghouse status:\n\n${pdfText}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function generateRecruiterNotes(driverData) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a professional trucking recruiter writing notes about a driver candidate.
Write 3-4 sentences summarizing:
- Safety record highlights
- Experience level and equipment familiarity
- Work stability / tenure patterns
- Key selling points for employers

Be factual, concise, and professional. Focus on what makes this driver hireable.
Do not use bullet points - write in paragraph form.`,
      },
      {
        role: 'user',
        content: `Write recruiter notes for this driver:\n${JSON.stringify(driverData, null, 2)}`,
      },
    ],
    max_tokens: 300,
  });

  return response.choices[0].message.content;
}

export async function generateNarrative(driverData, storyResponses) {
  const hasStory = storyResponses && Object.values(storyResponses).some(v => v);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a storyteller crafting a compelling driver narrative for recruiters.
Write 4-5 sentences about the driver covering:
- Background and where they're from
- Why they got into trucking
- What they're looking for in an employer
- What makes them stand out

Write in third person, warm but professional tone. Make it feel human and authentic.
${hasStory ? 'Use the story responses provided to personalize the narrative.' : 'Base this on their professional background.'}`,
      },
      {
        role: 'user',
        content: `Create a narrative for:\nDriver data: ${JSON.stringify(driverData, null, 2)}\n\nStory responses: ${JSON.stringify(storyResponses || {}, null, 2)}`,
      },
    ],
    max_tokens: 400,
  });

  return response.choices[0].message.content;
}

export async function generatePullQuote(storyResponses) {
  if (!storyResponses || !Object.values(storyResponses).some(v => v)) {
    return null;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract or craft a single compelling 1-2 sentence quote from the driver's story responses.
This should be something memorable that captures their motivation or values.
Return just the quote text, no quotation marks.`,
      },
      {
        role: 'user',
        content: `Extract a pull quote from:\n${JSON.stringify(storyResponses, null, 2)}`,
      },
    ],
    max_tokens: 100,
  });

  return response.choices[0].message.content;
}

export async function generateCareerAgentRecommendation(driverData, requisitionData, fitScores) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Career Agent AI making a hiring recommendation.
Write 2-3 sentences explaining:
- Why this driver is a good/poor fit for this specific job
- Key alignment points or concerns
- Your recommendation (proceed to interview, conditional, not recommended)

Be direct and actionable.`,
      },
      {
        role: 'user',
        content: `Make a recommendation:\n\nDriver: ${JSON.stringify(driverData, null, 2)}\n\nJob: ${JSON.stringify(requisitionData, null, 2)}\n\nFit Scores: ${JSON.stringify(fitScores, null, 2)}`,
      },
    ],
    max_tokens: 200,
  });

  return response.choices[0].message.content;
}
