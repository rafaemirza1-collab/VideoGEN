/**
 * AI Script Generation Service
 * Uses Claude API to generate video scripts with scenes.
 * Falls back to a rule-based generator if no API key is set.
 */

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';

async function generateScript({ businessName, businessType, description, tone, duration }) {
  const totalSeconds = parseInt(duration) || 15;
  const numScenes = Math.max(3, Math.min(8, Math.ceil(totalSeconds / 4)));

  if (CLAUDE_API_KEY) {
    return generateWithClaude({ businessName, businessType, description, tone, totalSeconds, numScenes });
  }
  return generateFallback({ businessName, businessType, description, tone, totalSeconds, numScenes });
}

async function generateWithClaude({ businessName, businessType, description, tone, totalSeconds, numScenes }) {
  const prompt = `You are a video script writer for short-form social media marketing videos.

Generate a ${totalSeconds}-second promo video script for:
Business: ${businessName}
Type: ${businessType}
Description: ${description}
Tone: ${tone}

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "script": "Full narration script text",
  "scenes": [
    {
      "narration": "Text for this scene",
      "visualDescription": "Short description of what visual to show (for stock photo search)",
      "textOverlay": "Short text to display on screen",
      "duration": ${Math.round(totalSeconds / numScenes * 1000)}
    }
  ]
}

Requirements:
- Exactly ${numScenes} scenes
- Each scene duration in milliseconds, totaling ${totalSeconds * 1000}ms
- visualDescription should be 2-5 words ideal for stock photo search (e.g. "modern restaurant interior", "fitness workout gym")
- textOverlay should be short (under 6 words) and impactful
- Match the ${tone} tone
- End with a clear call-to-action`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Claude API error');

    const text = data.content?.[0]?.text || '';
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Claude API failed, using fallback:', err.message);
    return generateFallback({ businessName, businessType, description, tone, totalSeconds, numScenes });
  }
}

function generateFallback({ businessName, businessType, description, tone, totalSeconds, numScenes }) {
  const perScene = Math.round((totalSeconds * 1000) / numScenes);

  const toneStyles = {
    professional: { opener: 'Introducing', cta: 'Get Started Today', adjective: 'trusted' },
    energetic: { opener: 'Ready for', cta: 'Join Now!', adjective: 'amazing' },
    friendly: { opener: 'Welcome to', cta: 'Come Visit Us', adjective: 'wonderful' },
    luxury: { opener: 'Experience', cta: 'Book Your Appointment', adjective: 'premium' },
  };

  const style = toneStyles[tone] || toneStyles.professional;

  const typeVisuals = {
    restaurant: ['modern restaurant interior', 'gourmet food plating', 'chef cooking kitchen', 'happy diners restaurant', 'restaurant ambiance night'],
    fitness: ['modern gym equipment', 'workout training fitness', 'group fitness class', 'healthy lifestyle active', 'personal trainer gym'],
    salon: ['luxury salon interior', 'hair styling professional', 'beauty treatment spa', 'salon tools professional', 'happy client salon'],
    ecommerce: ['online shopping laptop', 'product packaging delivery', 'happy customer unboxing', 'modern ecommerce website', 'fast shipping delivery'],
    general: ['modern office workspace', 'business team meeting', 'professional service quality', 'happy customer satisfaction', 'modern website design'],
  };

  const visuals = typeVisuals[businessType] || typeVisuals.general;

  const scenes = [];

  // Scene 1: Hook
  scenes.push({
    narration: `${style.opener} ${businessName}`,
    visualDescription: visuals[0],
    textOverlay: `${style.opener} ${businessName}`,
    duration: perScene,
  });

  // Scene 2: What they do
  scenes.push({
    narration: description || `The most ${style.adjective} ${businessType} experience`,
    visualDescription: visuals[1],
    textOverlay: description?.split(' ').slice(0, 5).join(' ') || `${style.adjective} ${businessType}`,
    duration: perScene,
  });

  // Middle scenes
  const middleTexts = [
    { text: 'Quality You Can Trust', visual: visuals[2] },
    { text: 'Loved by Customers', visual: visuals[3] },
    { text: 'Professional Service', visual: visuals[4 % visuals.length] },
  ];

  for (let i = 0; i < numScenes - 3; i++) {
    const mid = middleTexts[i % middleTexts.length];
    scenes.push({
      narration: mid.text,
      visualDescription: mid.visual,
      textOverlay: mid.text,
      duration: perScene,
    });
  }

  // Final scene: CTA
  scenes.push({
    narration: `${style.cta} — ${businessName}`,
    visualDescription: visuals[0],
    textOverlay: style.cta,
    duration: perScene,
  });

  // Adjust last scene duration to hit exact total
  const totalUsed = scenes.reduce((sum, s) => sum + s.duration, 0);
  scenes[scenes.length - 1].duration += (totalSeconds * 1000) - totalUsed;

  return {
    script: scenes.map(s => s.narration).join('. '),
    scenes,
  };
}

module.exports = { generateScript };
