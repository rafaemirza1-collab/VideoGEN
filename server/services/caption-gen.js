/**
 * Auto-Caption Generation Service
 * Takes script scenes and generates word-level timed captions.
 * Keywords (business name, CTAs) get highlighted.
 */

const CTA_WORDS = ['now', 'today', 'free', 'visit', 'book', 'order', 'shop', 'join', 'call', 'click', 'sign', 'get', 'try', 'start', 'save', 'discover'];

function generateCaptions(scenes, businessName) {
  const captions = [];
  const businessWords = businessName.toLowerCase().split(/\s+/);

  scenes.forEach((scene) => {
    const text = scene.textOverlay || scene.narration || '';
    if (!text.trim()) return;

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    const wordsPerMs = scene.duration / words.length;

    words.forEach((word, i) => {
      const startTime = scene.startTime + (i * wordsPerMs);
      const isKeyword =
        businessWords.some(bw => word.toLowerCase().includes(bw)) ||
        CTA_WORDS.some(cta => word.toLowerCase().replace(/[^a-z]/g, '') === cta);

      captions.push({
        word,
        startTime: Math.round(startTime),
        endTime: Math.round(startTime + wordsPerMs),
        isKeyword,
      });
    });
  });

  return captions;
}

/**
 * Converts captions into timeline text clips.
 * Groups words into chunks that display together.
 */
function captionsToClips(captions, highlightColor = '#fbbf24', normalColor = '#ffffff') {
  if (captions.length === 0) return [];

  // Group into chunks of 4-6 words
  const chunkSize = 5;
  const clips = [];

  for (let i = 0; i < captions.length; i += chunkSize) {
    const chunk = captions.slice(i, i + chunkSize);
    const startTime = chunk[0].startTime;
    const endTime = chunk[chunk.length - 1].endTime;
    const hasKeyword = chunk.some(c => c.isKeyword);

    clips.push({
      type: 'text',
      startTime,
      duration: endTime - startTime,
      source: '',
      properties: {
        x: 10,
        y: 75,
        width: 80,
        height: 10,
        rotation: 0,
        opacity: 1,
        text: {
          content: chunk.map(c => c.word).join(' '),
          fontFamily: 'sans-serif',
          fontSize: 28,
          fontWeight: hasKeyword ? 800 : 600,
          color: hasKeyword ? highlightColor : normalColor,
          backgroundColor: '#000000',
          alignment: 'center',
          lineHeight: 1.3,
        },
        animation: {
          entrance: 'fade-in',
          exit: 'fade-out',
          entranceDuration: 200,
          exitDuration: 200,
        },
      },
    });
  }

  return clips;
}

module.exports = { generateCaptions, captionsToClips };
