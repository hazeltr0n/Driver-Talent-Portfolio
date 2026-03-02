// Shared config for video coaching AI (feedback, chat, script generation)
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

// Shared context for all coaching interactions
export const CONTEXT = `## About FreeWorld
FreeWorld is a nonprofit that helps formerly incarcerated individuals find employment in trucking. We call our candidates "Free Agents" - they've paid their debt to society and are ready to build new careers.

## About the Drivers
These are CDL drivers with criminal records seeking employment. They:
- Are working-class, blue-collar people - most are not polished speakers
- Have faced rejection and stigma due to their background
- Are motivated to prove themselves and build stable lives
- Often have families depending on them
- May feel nervous or uncertain about how to present themselves

## The Video Purpose
This is a 2-3 minute "Driver Story Video" - a personal intro that goes beyond the resume. It's their chance to show employers who they really are as a person, not just a background check.

The video has 6 questions that tell a complete story:
1. **Who are you?** - Show personality, introduce themselves, make them likable and relatable
2. **What is your why?** - Show what motivates them (family, goals, purpose)
3. **Your turning point** - Address their record honestly, accept accountability, show what's changed and why they won't go backwards, and share who helped them, and what support they have. (Strong points for Props to FreeWorld!)
4. **Why trucking?** - Show commitment to the profession, why they chose it, why they're proud to be a driver
5. **Your next chapter** - Help employers understand what they're looking for in a company, what they care about most in their next job, and why safety is important to them.
6. **Your message to employers** - Close strong, sell themselves humbly

## The Audience
**Employers** watching these videos are:
- Trucking company recruiters and hiring managers
- Looking for reliable, safe, committed drivers
- Willing to give second chances but need reassurance
- Want to see the PERSON behind the record
- Looking for red flags (blaming others, anger, unprofessionalism, lack of personal accountability)
- Respond to authenticity, not polish
- Have heard it all, hundreds and hundreds of times, know how to recognize bs.

## Your Voice
- Direct and human. Not corporate, not salesy.
- Supportive but real - you're helping, not cheerleading.
- Short messages. No fluff.
- Help them sound like themselves - approachable, likable, genuine.
- NOT like a used car commercial or motivational poster.`;

// Form-based coaching: static intro + simple questions, shown chat-style
export const COACHING_FORMS = {
  1: {
    intro: "This question shows employers who you are as a person - not just another application. They want to see the real you.",
    questions: [
      "What do you do when you're not working?",
      "Who's important in your life? (names are great)",
      "How would your coworkers describe you?",
    ],
  },
  2: {
    intro: "This is about what drives you. Employers want to see your motivation - the deeper, the better.",
    questions: [
      "Who are you doing this for?",
      "What are you working toward?",
      "What keeps you going when it gets hard?",
    ],
  },
  3: {
    intro: "This is about your journey. Share it however feels right to you.",
    questions: [
      "What would you want an employer to know about where you've been and where you're going?",
      "Who helped you along the way to where you are now? (Family, Friends, Community, FreeWorld)",
    ],
  },
  4: {
    intro: "Show your connection to trucking. Employers want drivers who chose this career, not just ended up here.",
    questions: [
      "Why did you choose trucking?",
      "What do you love about driving?",
      "How does trucking help you build the life you want?",
    ],
  },
  5: {
    intro: "Help employers understand what kind of company you'd thrive at. This helps with matching.",
    questions: [
      "What matters most to you in a company?",
      "Why is safety important to you personally?",
    ],
  },
  6: {
    intro: "This is your closing pitch. Thank them for watching and for considering you, then tell them why you're worth hiring.",
    questions: [
      "What can you promise an employer who gives you a shot?",
    ],
    useEarlierContext: true,
    scriptMustInclude: "Start by thanking them for watching and for considering you.",
  },
};

// Single source of truth for all 6 questions
export const QUESTIONS = {
  1: {
    title: 'Who are you?',
    prompt: 'Tell me about yourself',
    objective: `Help the employer see them as a real person - someone they'd want on their team.

Great answers include:
- Personal stuff: family, hobbies, what they do on weekends
- How they show up at work: their reputation, what coworkers say about them
- Little details that make them human: their kid's name, their favorite fishing spot, the truck they're restoring

The more real and specific, the better. Generic is forgettable.`,
    focus: 'Hook the viewer with personality, show them as a relatable human with a life outside work',
    keyElements: ['name', 'personal interests/hobbies', 'how they show up at work'],
    probingQuestions: [
      'What do you enjoy doing when you\'re not working?',
      'What would your friends or family say you\'re like?',
      'What about you makes you a good worker?',
    ],
    scriptRequired: 'Start with their name.',
    relevantData: ['city', 'state'],
  },
  2: {
    title: 'What is your why?',
    prompt: 'What drives you every day?',
    objective: `Show what motivates them - the deeper the better.

Great answers include:
- Who they're doing this for: spouse's name, kids' ages, parents they're taking care of
- Specific goals: buying a house, getting their kids into college, building something
- What drives them when the work gets hard

Names and specifics make it real. "My family" is fine, but "my daughter Maya - she's 8 and wants to be a vet" is memorable.`,
    focus: 'Show their values and what makes them tick - goals, desires, the people they love',
    keyElements: ['clear motivation', 'who or what they work for', 'authentic drive'],
    probingQuestions: [
      'Who are you doing this for?',
      'What does success look like for you in 5 years?',
      'If someone says the word love, what is the first thing you think about?',
    ],
    relevantData: [],
  },
  3: {
    title: 'Your turning point',
    prompt: 'Tell me about your journey and support system',
    objective: `Address their past directly using the FreeWorld framework:
1. State what happened factually - don't over-explain or get emotional
2. Take responsibility - no excuses, no 'the system' speeches
3. Explain what's changed - time passed, programs completed, stability built
4. Pivot to the present - what they have to lose, their track record

Example flow: "[X] years ago, I was charged with [charge]. I deeply regret what I did. [What I learned]. My turning point was [family/FreeWorld/etc]. Now I have [what they have to lose] and the thought of risking that is unthinkable."

If they're not comfortable sharing specifics, use general language: "I made some mistakes in my past and paid my debt to society."`,
    focus: 'Address past directly, take responsibility, show what\'s changed, pivot to present',
    keyElements: ['factual acknowledgment', 'takes responsibility', 'what changed', 'turning point', 'what they have to lose'],
    probingQuestions: [
      'What did you learn from that experience?',
      'What\'s your turning point - what made you different?',
    ],
    relevantData: [],
  },
  4: {
    title: 'Why trucking?',
    prompt: 'What do you love about this career?',
    objective: `Show genuine connection to trucking as a profession.

Great answers include:
- What drew them to it in the first place
- What they love about the actual work - the independence, the road, the equipment
- How it fits their personality and goals
- Pride in being a professional driver

Passion and respect for the work come through. Employers want drivers who chose this, not just ended up here.`,
    focus: 'Show commitment to trucking, respect for the work, how it enables their goals',
    keyElements: ['why trucking fits them', 'respect for the profession', 'connection to goals'],
    probingQuestions: [
      'What do you respect about trucking as a profession?',
      'How does this career help you achieve your goals?',
      'What do you love most about the idea of being a driver?',
    ],
    relevantData: [],
  },
  5: {
    title: 'Your next chapter',
    prompt: 'What are you looking for in your next company?',
    objective: `Help employers understand what kind of company they'd thrive at.

Great answers include:
- What matters most: home time, safety culture, equipment quality, respect
- The kind of team/culture they work best in
- Where they see themselves growing
- Why safety matters to them personally

This helps with matching. An employer who values the same things will connect.`,
    focus: 'What matters most in a company, the culture they thrive in',
    keyElements: ['clear priorities', 'specific about what they want', 'safety mentioned'],
    probingQuestions: [
      'What\'s the most important thing you look for in a company?',
      'Where do you see yourself growing in this career?',
    ],
    relevantData: [],
  },
  6: {
    title: 'Your message to employers',
    prompt: 'Thank them for watching and tell them why they should hire you',
    objective: `Close strong - sell themselves humbly but confidently.

Great answers include:
- Gratitude for the opportunity to be considered
- What they bring: experience, attitude, work ethic
- Specific commitments or promises
- Why taking a chance on them is worth it

This is their pitch. Confidence without arrogance, specifics over generics.`,
    focus: 'Sell themselves humbly - why hire them, what sets them apart',
    keyElements: ['gratitude', 'value proposition', 'specific commitments'],
    probingQuestions: [
      'What makes you stand out from other candidates?',
      'What can you promise an employer who takes a chance on you?',
    ],
    relevantData: ['years_experience', 'endorsements', 'cdl_class'],
  },
};

// Shared function to fetch candidate data
export async function fetchCandidateData(uuid) {
  if (!uuid) return null;

  try {
    const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.records || data.records.length === 0) return null;

    return data.records[0].fields;
  } catch (err) {
    console.error('Failed to fetch candidate data:', err);
    return null;
  }
}

// Build candidate context string from data
export function buildCandidateContext(candidateData, relevantFields = []) {
  if (!candidateData) return '';

  const parts = [];

  // Always include name if available
  if (candidateData.fullName) parts.push(`Name: ${candidateData.fullName}`);

  // Include location if relevant
  if (relevantFields.includes('city') || relevantFields.includes('state')) {
    if (candidateData.city && candidateData.state) {
      parts.push(`From: ${candidateData.city}, ${candidateData.state}`);
    }
  }

  // Include other relevant data
  if (relevantFields.includes('years_experience') && candidateData.years_experience) {
    parts.push(`${candidateData.years_experience} years driving experience`);
  }
  if (relevantFields.includes('endorsements') && candidateData.endorsements) {
    parts.push(`Endorsements: ${candidateData.endorsements}`);
  }
  if (relevantFields.includes('cdl_class') && candidateData.cdl_class) {
    parts.push(`CDL Class: ${candidateData.cdl_class}`);
  }

  return parts.length > 0 ? `\n\nCandidate background:\n${parts.join('\n')}` : '';
}
