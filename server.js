require('dotenv').config();
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs-extra');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const QLOO_KEY = process.env.QLOO_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;



async function SearchId(queryd, entityType = "urn:entity:artist") {
  const apiKey = QLOO_KEY;
  const searchUrl = `https://hackathon.api.qloo.com/search?query=${encodeURIComponent(queryd)}&types=${encodeURIComponent(entityType)}`;

  try {
    const res = await axios.get(searchUrl, {
      headers: { 'X-Api-Key': apiKey }
    });

    const entityId = res.data.results?.[0]?.entity_id || null;
    return entityId;
  } catch (err) {
    console.error('[Qloo Search Error]', err.response?.data || err.message);
    return null;
  }
}

app.use('/data', express.static(path.join(__dirname, 'data')));

app.post('/get-qloo', async (req, res) => {
  try {
   
    let queries = req.body.query;
    if (!queries) return res.json({ success: false, error: "No query provided" });
    if (!Array.isArray(queries)) queries = [queries]; 

    const entityIds = (await Promise.all(queries.map(q => SearchId(q))))
      .filter(Boolean);

    if (entityIds.length === 0)
      return res.json({ success: false, error: "No entities found" });


    const payload = {
      filter: { type: "urn:entity:artist" }, 
      signal: {
        interests: {
          entities: entityIds.map(id => ({ entity: id, weight: 10 }))
        }
      }
    };



    const insightRes = await axios.post(
      'https://hackathon.api.qloo.com/v2/insights',
      payload,
      {
        headers: { 'X-Api-Key': QLOO_KEY, 'Content-Type': 'application/json' }
      }
    );

    const recs = insightRes.data.results?.entities?.items || [];
    const topNames = recs.map(r => r.name).slice(0, 12);
    res.json({ success: true, topNames });

  } catch (err) {
    console.error('[Qloo Error]:', err.response?.data || err.message);
    res.status(500).json({ success: false, error: 'API call failed', details: err.response?.data || err.message });
  }
});


app.post('/api/generate', async (req, res) => {
  try {

   
    
const imgBuffer = await screenshot({ format: 'png' });

 const croppedBuffer = await sharp(imgBuffer)
    .extract({ left: 586, top: 60, width: 771  , height: 921 }) // adjust these values
    .toBuffer();

const imgPath = './temp/screenshot.png';

await fs.ensureDir('./temp'); // make sure folder exists
await fs.writeFile(imgPath, croppedBuffer);
  const { data } = await Tesseract.recognize(imgPath, 'eng', { logger: m => console.log(m) });





function isBlue([r, g, b]) {
  return b > 150 && r < 100 && g < 150;
}

function isWhite([r, g, b]) {
  return r > 200 && g > 200 && b > 200;
}


async function classifyMessages(imagePath) {

  const { data } = await Tesseract.recognize(imagePath, 'eng', { logger: m => console.log(m) });

  let result = [];
  const img = sharp(imagePath);

  for (const line of data.lines) {
 
    const { x0, y0, x1, y1 } = line.bbox;
   
    const sampleX = Math.max(0, Math.floor((x0 + x1) / 2));
    const sampleY = Math.max(0, Math.floor((y0 + y1) / 2));
 
    const pixel = await img.extract({ left: sampleX, top: sampleY, width: 1, height: 1 }).raw().toBuffer();
    const rgb = [pixel[0], pixel[1], pixel[2]];

    
    if (isBlue(rgb)) {
      result.push('a: ' + line.text);
    } else if (isWhite(rgb)) {
      result.push('b: ' + line.text);
    } else {
      result.push('?: ' + line.text); 
    }
  }
  return result.join('\n');
}





    
//  await fs.remove(imgPath);
    const interests = await fs.readFile('./data/person.txt', 'utf8');
    const convo = data.text;
    const DataPrompt = "You are updating a personal profile with new interests or facts based on a chat.\n\n Current Known info about the person:\n" + interests + "\n\nNew conversation:\n\"\"\"\n" + convo + "\n\"\"\"\n\nExtract only new and specific interests or facts mentioned by the other person. IF SOMETHING IS REPEATED DO NOT TELL ME AGAIN. KEEP IT SHORT ONLY RESPOND WITH THE EXACT ITEM. example. drake, kpop, sushi YOU MUST FOLLOW THIS EXACT FORMAT! DO NOT ADD PERIODS ONLY SEPERATE EACH ITEM WITH COMMAS.  No explanation JUST THE SPECIFIC ITEMS. IF NOTHING IS IMPORTANT TO NOTE TO CHARM AND ATTRACT THE GIRL / BOY JUST RESPOND WITH A BLANK MESSAGE of SPACE BAR. IF EVERYTHING IS REDUNDANT OR NOT USEFUL RESPOND WITH A BLANK SPACE BAR";

     const newData = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: "You are RizzHelper AI — a charismatic, emotionally intelligent texting coach. You craft smooth, clever, or subtly flirty replies that match the user's vibe and the context of the conversation. Your goal is to help the user leave a strong impression while staying authentic and engaging. Adjust your tone based on the other person’s interests, personality, and generation (e.g. Gen Z), and keep your suggestions creative, modern, and concise. Avoid anything too cheesy or robotic. Always aim for charm, wit, or emotional depth — whichever fits best. Text like you know the slang and trends in 2025 of july 31 from tiktok and instagram. Feel free to tease but still be respectful when needed. Dont be too formal."
          },
          { role: 'user', content: DataPrompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'https://your-devpost-url.com',
          'Content-Type': 'application/json'
        }
      }
    );
    const extractedText = newData.data.choices[0].message.content;
    await fs.appendFile('./data/person.txt', extractedText, 'utf8');











    // generate 3 responses

    //const { name, age, gender, vibe, placeHolder, relatedTaste } = req.body;
    //const prompt = `\nConvo: \"${convo}\"\nPerson: ${name}, ${age}, ${gender}, ${vibe} vibe.\nTaste data: They like ${relatedTaste}.\nGenerate 3 reply suggestions that would match their energy and impress them.`;
    
    const prompt = `Here is the current conversation ${convo}
    Based on this, suggest 3 smart, smooth, or witty replies that match the tone of the conversation and would impress or connect with the other person.
     Keep the suggestions short and natural, like how someone would actually text.
     You are RizzHelper AI, an advanced digital wingman and conversation strategist.

Your job is to read the chat between the user (“a:”) and their match (“b:”), analyze both sides, and help the user stand out in DMs—confident, funny, and effortlessly charming.

How you analyze:

Look for signs of interest, engagement, or flirtation from both sides.

Pay attention to the vibe, tone, inside jokes, playful moments, and any signals (emojis, long replies, quick responses).

Note “green lights” (enthusiasm, playfulness) and “yellow/red lights” (short/dry answers, deflection, lack of energy).

Your advice:

Identify places where the user can escalate the conversation, make a callback joke, or deepen the connection.

Suggest up to 3 replies—playful, bold, sweet, or witty—that keep things moving, revive the convo, or make the other person smile.

For each reply, briefly explain why it works so the user can pick their favorite or combine ideas.

Ongoing strategy:

Recommend next moves if needed: Should the user ask them out? Play a game? Keep building the vibe? Or switch things up?

Let the user know if it’s time to push forward, switch topics, or dial back.

Goal:
Make the user stand out in DMs, get genuine replies, and enjoy the process—keeping things light, flirty, and respectful.

Format:

Conversation Analysis: Briefly describe the current state and signals in the convo.

Reply Options: Suggest up to 3 smart, smooth, or funny replies (like a real text).

Why It Works: For each reply, add a quick explanation. Make this in a new line!
`
    
    
    
    
    console.log('[Prompt]', prompt);
    
    const gptRes = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: "You are RizzHelper AI — a charismatic, emotionally intelligent texting coach. You craft smooth, clever, or subtly flirty replies that match the user's vibe and the context of the conversation. Your goal is to help the user leave a strong impression while staying authentic and engaging. Adjust your tone based on the other person’s interests, personality, and generation (e.g. Gen Z), and keep your suggestions creative, modern, and concise. Avoid anything too cheesy or robotic. Always aim for charm, wit, or emotional depth — whichever fits best. Text like you know the slang and trends in 2025 of july 31 from tiktok and instagram. Feel free to tease but still be respectful when needed. Dont be too formal."
          },
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'https://your-devpost-url.com',
          'Content-Type': 'application/json'
        }
      }
    );
    
    const reply = gptRes.data.choices[0].message.content;
    

    
    
    res.json({ response: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GPT failed' });
  }
});



app.post('/save-info', async (req, res) => {
  const { content } = req.body;
  try {
    await fs.writeFile('./data/person.txt', content, 'utf8');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save info:', err);
    res.status(500).json({ error: 'Failed to save info' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));