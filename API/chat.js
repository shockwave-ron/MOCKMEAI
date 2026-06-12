// api/chat.js — Vercel Serverless Function
// Proxies chat messages to Claude. API key stays on the server.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, bizName, bizContent } = req.body || {};
  if (!messages || !bizName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "Server configuration error" });

  // Limit conversation history to last 10 messages to control cost
  const trimmedMessages = messages.slice(-10);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022", // Fast + cheap — perfect for live chat demos
        max_tokens: 300,
        system: `You are a friendly, helpful AI assistant for ${bizName}. 
Business info: ${bizContent}

Rules:
- Keep all replies to 2–3 short sentences max
- Be warm, conversational, and helpful
- If asked about pricing, hours, or booking — encourage them to call or visit the website
- Never invent details not found in the business info above
- If you don’t know something, say: "Great question! Let me connect you with our team."
- Always end with a helpful follow-up question or offer`,
        messages: trimmedMessages,
      }),
    });

    const data = await response.json();

    if (data?.content?.[0]?.text) {
      return res.status(200).json({ reply: data.content[0].text });
    }

    throw new Error(data?.error?.message || "No response from AI");
  } catch (err) {
    console.error("Chat error:", err.message);
    return res.status(500).json({
      reply: "Sorry, I had a little trouble there. Could you try again?",
    });
  }
};
