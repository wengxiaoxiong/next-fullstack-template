import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const litellm = createOpenAI({
    baseURL: OPENAI_BASE_URL,
    apiKey: OPENAI_API_KEY,
});

export const qwen = createOpenAICompatible({
    name: 'thinking',
    baseURL: OPENAI_BASE_URL || "",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    fetch: async (url, init) => {
      if (typeof url === 'string' && url.endsWith('/chat/completions') && init?.body) {
        const raw = Buffer.isBuffer(init.body) ? init.body.toString('utf8') : String(init.body);
        const body = JSON.parse(raw);
        body.enable_thinking = false;
        init.body = JSON.stringify(body);
        // 调试输出（只在开发时打开）
        // console.log('[request] JSON.stringify(body)', JSON.stringify(body));
        // console.log('[request] enable_thinking =', body.enable_thinking);
      }
      return fetch(url, init);
    },
  });
