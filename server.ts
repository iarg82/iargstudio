import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize GoogleGenAI SDK with server-side API Key
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Check API status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Prompt enhancer using gemini-3.8-flash
app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const { prompt, mode } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getAiClient();
    const systemInstruction = `You are an elite Hollywood director and AI cinematographer specializing in video generation prompts (like Veo, Sora, Runway Gen-3).
Transform the user's brief concept into a high-impact, visual cinematic video prompt.
Your response MUST be strict valid JSON with the following structure:
{
  "enhancedPrompt": "detailed cinematic prompt focusing on subject action, camera movement (e.g. slow dolly push-in, low angle tracking), atmospheric lighting (e.g. golden hour volumetric rays, neon reflections), lens specs (e.g. 35mm anamorphic), and motion dynamics",
  "cameraMotion": "Dolly In | Orbit Pan | Drone Crane | Tracking Shot | Static Cinematic",
  "styleTag": "Cinematic | Anime | Hyper-Realistic | Cyberpunk | Documentary | Dreamscape",
  "aspectRatio": "16:9 or 9:16",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `User idea: "${prompt}". Mode: ${mode || 'text-to-video'}. Enhance this into a professional video prompt.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Enhance prompt error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to enhance prompt',
      fallback: req.body.prompt,
    });
  }
});

// Start Video Generation (Veo)
app.post('/api/generate-video', async (req, res) => {
  try {
    const {
      prompt,
      imageBase64,
      imageMimeType,
      lastFrameBase64,
      lastFrameMimeType,
      aspectRatio = '16:9',
      resolution = '720p',
      model = 'veo-3.1-lite-generate-preview',
    } = req.body;

    const ai = getAiClient();

    const videoConfig: any = {
      numberOfVideos: 1,
      resolution: resolution === '1080p' ? '1080p' : '720p',
      aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
    };

    const payload: any = {
      model,
      config: videoConfig,
    };

    if (prompt && typeof prompt === 'string' && prompt.trim().length > 0) {
      payload.prompt = prompt.trim();
    }

    // Photo-to-video: starting image
    if (imageBase64) {
      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      payload.image = {
        imageBytes: cleanBase64,
        mimeType: imageMimeType || 'image/jpeg',
      };
    }

    // Optional ending image (last frame)
    if (lastFrameBase64) {
      const cleanLastFrame = lastFrameBase64.replace(/^data:image\/\w+;base64,/, '');
      videoConfig.lastFrame = {
        imageBytes: cleanLastFrame,
        mimeType: lastFrameMimeType || 'image/jpeg',
      };
    }

    if (!payload.prompt && !payload.image) {
      return res.status(400).json({ error: 'Either prompt or image is required' });
    }

    const operation = await ai.models.generateVideos(payload);
    res.json({
      success: true,
      operationName: operation.name,
      model,
    });
  } catch (error: any) {
    console.error('Generate video error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to initiate video generation',
      code: error?.code,
      details: error?.status,
    });
  }
});

// Check operation status
app.post('/api/video-status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getAiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({
      done: updated.done ?? false,
      error: updated.error ?? null,
    });
  } catch (error: any) {
    console.error('Video status error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to check video status',
    });
  }
});

// Download finished video
app.post('/api/video-download', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getAiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: 'Generated video URI not ready or missing' });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).send('Failed to fetch video file from remote storage');
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="generated-video.mp4"');

    const arrayBuf = await videoRes.arrayBuffer();
    res.send(Buffer.from(arrayBuf));
  } catch (error: any) {
    console.error('Video download error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to download video',
    });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CineAI Video Studio running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
