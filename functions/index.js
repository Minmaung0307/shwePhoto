import functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import OpenAI from 'openai';

// IMPORTANT: set these in Firebase functions config or environment variables
// firebase functions:config:set openai.key="sk-..."
const openaiKey = process.env.OPENAI_API_KEY || (functions.config().openai && functions.config().openai.key);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));

// Convert a base64 data URL to a Buffer
function dataURLToBuffer(dataUrl){
  const base64 = dataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
}

// Very simple prompt router
function buildPrompt(kind, extra){
  switch(kind){
    case 'bg': return `Replace the background according to this instruction: ${extra.prompt || 'clean studio background'}. Keep person intact.`;
    case 'fg': return `Adjust the foreground/main subject according to: ${extra.prompt || 'formal attire'}. Keep background coherent.`;
    case 'age': return `Transform the face age mode: ${extra.mode || 'older'} while keeping identity.`;
    case 'celeb': return `Create a side-by-side or friendly pose photo with celebrity: ${extra.celeb||'a famous actor'}. Keep it tasteful, non-political.`;
    default: return 'Improve the photo aesthetics tastefully.';
  }
}

app.post('/image-edit', async (req,res)=>{
  try{
    if(!openaiKey){ return res.status(500).send('Missing OPENAI_API_KEY'); }
    const { kind, extra, image } = req.body;
    if(!image) return res.status(400).send('No image');

    const client = new OpenAI({ apiKey: openaiKey });

    // Use the Images API (edits) — one-shot, return base64 for the front-end
    const prompt = buildPrompt(kind, extra);
    const result = await client.images.edits({
      model: 'gpt-image-1',
      prompt,
      image: image, // data URL is supported by SDK
      size: '1024x1024',
    });

    const b64 = result.data[0].b64_json;
    const imageDataUrl = 'data:image/png;base64,' + b64;
    res.json({ imageDataUrl });
  }catch(err){
    console.error(err);
    res.status(500).send(err.message || 'AI error');
  }
});

export const api = functions.https.onRequest(app);
