import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PharmacyAgent } from './agent/agent';
import { logger } from './utils/logger';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Initialize agent
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  logger.error('OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

const agent = new PharmacyAgent(apiKey);

// Chat endpoint with streaming
app.post('/chat', async (req, res) => {
  const { message, userId } = req.body;

  // Validation
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required and must be a string' });
  }

  if (!userId || typeof userId !== 'number') {
    return res.status(400).json({ error: 'userId is required and must be a number' });
  }

  // Set up SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

  try {
    // Stream the response
    const eventStream = await agent.processMessage(message, userId);
    for await (const event of eventStream) {
      // Send event (text, tool_call, or tool_result)
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error: any) {
    logger.error('Error in /chat endpoint', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Open http://localhost:${PORT} in your browser`);
});


