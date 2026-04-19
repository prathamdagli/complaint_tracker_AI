/*
 * Gemini / Gemma client — thin wrapper around @google/generative-ai.
 * Used by the CSE reply drafter and the customer chatbot.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = process.env.GEMINI_MODEL || 'gemma-3-27b-it';

let client = null;
if (API_KEY) {
    client = new GoogleGenerativeAI(API_KEY);
    console.log(`✅ Gemini client ready (model: ${MODEL_ID})`);
} else {
    console.log('No GEMINI_API_KEY set — AI reply drafter + chatbot disabled.');
}

const isReady = () => !!client;

/**
 * Generate text from a simple prompt — used by the CSE reply drafter.
 * Gemma 3 doesn't support a separate "system" role, so we fold the
 * system prompt into the first user turn.
 */
async function generateText({ systemPrompt, userPrompt }) {
    if (!client) throw new Error('Gemini client not configured. Set GEMINI_API_KEY in .env.');
    const model = client.getGenerativeModel({ model: MODEL_ID });
    const prompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${userPrompt}` : userPrompt;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

/**
 * Multi-turn chat — used by the customer chatbot.
 * `messages` is an array of { role: 'user' | 'assistant', content } in
 * chronological order. We fold the system prompt into the first user turn.
 */
async function chat({ systemPrompt, messages }) {
    if (!client) throw new Error('Gemini client not configured. Set GEMINI_API_KEY in .env.');
    const model = client.getGenerativeModel({ model: MODEL_ID });

    const history = [];
    messages.slice(0, -1).forEach((m, i) => {
        const role = m.role === 'assistant' ? 'model' : 'user';
        let text = m.content;
        if (i === 0 && role === 'user' && systemPrompt) {
            text = `${systemPrompt}\n\n---\n\n${text}`;
        }
        history.push({ role, parts: [{ text }] });
    });

    const last = messages[messages.length - 1];
    let lastText = last.content;
    if (messages.length === 1 && systemPrompt) {
        lastText = `${systemPrompt}\n\n---\n\n${lastText}`;
    }

    const chatSession = model.startChat({ history });
    const result = await chatSession.sendMessage(lastText);
    return result.response.text().trim();
}

module.exports = { isReady, generateText, chat, MODEL_ID };
