const Anthropic = require('@anthropic-ai/sdk');

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

function notConfiguredError() {
  const err = new Error('AI features are not configured — set ANTHROPIC_API_KEY in .env');
  err.statusCode = 503;
  return err;
}

function parseJsonSafely(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) {
    return null;
  }
}

function extractReportBlock(text) {
  const m = text.match(/```report\s*([\s\S]*?)```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch (e) {
    return null;
  }
}

// Classifies free-text description into one of the app's existing categories.
async function suggestCategory(description, categories) {
  const c = getClient();
  if (!c) throw notConfiguredError();

  const categoryList = categories.map((cat) => `${cat.key}: ${cat.label}`).join('\n');
  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: `You classify public transit incident reports into exactly one category.\nAvailable categories:\n${categoryList}\n\nRespond with ONLY strict JSON, no other text: {"category":"<key>","confidence":<0-1 number>,"reason":"<one short sentence>"}. Always pick the closest category even if the match isn't perfect.`,
    messages: [{ role: 'user', content: description }]
  });
  const textBlock = msg.content.find((b) => b.type === 'text');
  const result = parseJsonSafely(textBlock ? textBlock.text : '');
  if (!result || !result.category) {
    const err = new Error('AI could not produce a category suggestion — try again.');
    err.statusCode = 502;
    throw err;
  }
  return result;
}

// Multi-turn conversational assistant that guides a rider through filing a
// report, then emits a fenced ```report JSON block once it has enough detail.
// The controller strips that block out of the visible reply and returns it
// separately as `draft` so the frontend can pre-fill the report form.
async function chat(history, userMessage, categories) {
  const c = getClient();
  if (!c) throw notConfiguredError();

  const categoryList = categories.map((cat) => `${cat.key}: ${cat.label}`).join('\n');
  const system = `You are the LineWatch reporting assistant. Help a rider file a public transit incident report through short, friendly conversation. Ask one follow-up question at a time to learn:
1) what happened (a clear one-sentence description)
2) which category it fits: ${categoryList}
3) severity: low, medium, or high
4) where it happened (a station, stop, or landmark)

Keep replies to at most 2-3 sentences. Once — and only once — you're confident you have all four fields, end your reply with a fenced block on its own lines, exactly in this format:
\`\`\`report
{"category":"<key>","description":"<one clear sentence>","severity":"<low|medium|high>","locationLabel":"<text>"}
\`\`\`
Do not include that block until you actually have all four fields from the rider.`;

  const messages = [...history.map((h) => ({ role: h.role, content: h.content })), { role: 'user', content: userMessage }];
  const msg = await c.messages.create({ model: MODEL, max_tokens: 400, system, messages });
  const textBlock = msg.content.find((b) => b.type === 'text');
  const rawText = textBlock ? textBlock.text : '';
  const draft = extractReportBlock(rawText);
  const reply = rawText.replace(/```report[\s\S]*?```/, '').trim();
  return { reply, draft };
}

module.exports = { suggestCategory, chat };
