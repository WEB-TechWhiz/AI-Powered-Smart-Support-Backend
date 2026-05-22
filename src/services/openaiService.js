const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT =
  'You are a helpful and friendly customer support agent. ' +
  'Answer questions clearly and concisely. If you are unsure about ' +
  'something, say so honestly rather than guessing.';

// Phrases that indicate the AI could not provide a confident answer
const LOW_CONFIDENCE_PHRASES = [
  "i don't know",
  "i'm not sure",
  "i am not sure",
  "i cannot help",
  "i'm unable",
  "i am unable",
  "outside my scope",
  "beyond my capabilities",
];

const FALLBACK_MESSAGE =
  "I wasn't able to fully address your question. Our support team will contact you shortly to help resolve this.";

/**
 * Sends the conversation history + new user message to OpenAI and returns
 * the assistant reply along with token usage metadata.
 *
 * @param {Array<{role: string, content: string}>} previousMessages - past conversation messages
 * @param {string} userMessage - the new message from the user
 * @returns {Promise<{reply: string, tokensUsed: number, isFallback: boolean}>}
 */
async function getAIResponse(previousMessages, userMessage) {
  // Build the messages array for the API call
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...previousMessages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content.trim();
    const tokensUsed = completion.usage ? completion.usage.total_tokens : 0;

    // Check for low-confidence response
    const lowerReply = reply.toLowerCase();
    const isLowConfidence = LOW_CONFIDENCE_PHRASES.some((phrase) =>
      lowerReply.includes(phrase)
    );

    if (isLowConfidence) {
      return {
        reply: FALLBACK_MESSAGE,
        tokensUsed,
        isFallback: true,
      };
    }

    return {
      reply,
      tokensUsed,
      isFallback: false,
    };
  } catch (error) {
    console.error('OpenAI API error:', error.message);

    // Return fallback on any API error
    return {
      reply: FALLBACK_MESSAGE,
      tokensUsed: 0,
      isFallback: true,
    };
  }
}

module.exports = { getAIResponse };
