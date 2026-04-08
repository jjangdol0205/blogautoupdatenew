import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const envFile = fs.readFileSync('.env.local', 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^GEMINI_API_KEY=(.*)$/);
  if (match) process.env.GEMINI_API_KEY = match[1].trim();
});

const ai = new GoogleGenAI({});

async function test() {
  try {
    const r1 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'test',
      config: { tools: [{ googleSearch: {} }] }
    });
    console.log('WITH SEARCH SUCCESS:', r1.text?.substring(0, 50));
  } catch(e) {
    console.error('WITH SEARCH ERROR:', e.status, e.message);
  }

  try {
    const r2 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'test'
    });
    console.log('WITHOUT SEARCH SUCCESS:', r2.text?.substring(0, 50));
  } catch(e) {
    console.error('WITHOUT SEARCH ERROR:', e.status, e.message);
  }
}
test();
