# PharmaCare Agent

A stateless real-time conversational AI pharmacy assistant that provides factual medication information in English and Hebrew, with strict medical safety rules.

## Features

- 🤖 **AI-Powered Assistant**: Uses OpenAI GPT-4 with function calling
- 🌐 **Bilingual Support**: Responds in both English and Hebrew
- 💊 **Medication Information**: Get details about medications, stock, and prescriptions
- 🔒 **Safety First**: Strict policies preventing medical advice, diagnosis, or encouragement to purchase
- 📊 **Tool Call Visualization**: See tool calls and results in real-time
- ⚡ **Streaming Responses**: Real-time streaming text responses
- 🐳 **Docker Support**: Fully containerized application

## Tech Stack

- **Backend**: TypeScript + Node.js + Express
- **AI**: OpenAI API with function calling and streaming
- **Database**: SQLite (in-memory) with synthetic data
- **Frontend**: HTML + JavaScript with modern UI

## Prerequisites

- Node.js 20+ and npm
- OpenAI API Key
- Docker (optional, for containerized deployment)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=8000
```

### 3. Build the Project

```bash
npm run build
```

### 4. Run the Application

```bash
npm start
```

Or for development with hot reload:

```bash
npm run dev
```

The application will be available at `http://localhost:8000`

## Docker Usage

### Build the Docker Image

```bash
docker build -t safemeds-ai .
```

### Run the Container

```bash
docker run -p 8000:8000 -e OPENAI_API_KEY=your_api_key_here safemeds-ai
```

Or use docker-compose (create a `docker-compose.yml` if needed):

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PORT=8000
```

## Database

The application uses an in-memory SQLite database with synthetic data:

- **10 Users**: Mix of users with and without prescription permissions
- **5 Medications**: 
  - Paracetamol (פאראצטמול)
  - Ibuprofen (איבופרופן)
  - Amoxicillin (אמוקסיצילין) - requires prescription
  - Aspirin (אספירין)
  - Metformin (מטפורמין) - requires prescription

## API Endpoints

### POST /chat

Send a message to the pharmacy assistant.

**Request Body:**
```json
{
  "message": "What is Paracetamol?",
  "userId": 1
}
```

**Response:** Server-Sent Events (SSE) stream with:
- `type: "text"` - Streaming text chunks
- `type: "tool_call"` - Tool call information
- `type: "tool_result"` - Tool execution results
- `type: "done"` - Stream completion

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Available Tools (Functions)

1. **getMedicationByName(name)**
   - Get detailed information about a medication
   - Supports both English and Hebrew names
   - Returns: name, active ingredient, stock, prescription requirements, usage instructions

2. **checkStock(medicationName)**
   - Check current stock availability
   - Returns: stock count and availability status

3. **checkPrescription(userId, medicationName)**
   - Check if a user has a valid prescription
   - Returns: prescription status and purchase eligibility

## Safety Policies

The agent follows strict safety rules:

- ❌ No medical diagnosis
- ❌ No medical advice beyond general information
- ❌ No encouragement to purchase medications
- ✅ Redirects to healthcare professionals when needed
- ✅ Provides only factual medication information

## Project Structure

```
.
├── backend/
│   ├── agent/
│   │   └── agent.ts          # Main agent logic with OpenAI integration
│   ├── db/
│   │   └── database.ts       # Database setup and synthetic data
│   ├── tools/
│   │   ├── toolDefinitions.ts # OpenAI function definitions
│   │   └── toolExecutor.ts   # Tool execution logic
│   ├── utils/
│   │   └── logger.ts         # Logging utility
│   └── index.ts              # Express server and API endpoints
├── frontend/
│   └── index.html            # Chat UI with streaming support
├── Dockerfile                # Docker configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Example Queries

- "What is Paracetamol?"
- "מה זה פאראצטמול?" (Hebrew)
- "Check stock for Ibuprofen"
- "Do I have a prescription for Amoxicillin?"
- "How do I use Aspirin?"

## Logging

All tool calls are logged with timestamps for debugging and observability. Check the console output for:
- Tool call events
- Tool execution results
- Agent iteration logs
- Safety redirect triggers

## Development

### TypeScript Compilation

The project uses TypeScript. To compile:

```bash
npm run build
```

### Code Structure

- **Stateless Agent**: Each request is processed independently
- **Type Safety**: Strict TypeScript types throughout
- **Error Handling**: Comprehensive error handling in all tools
- **Input Validation**: All tool inputs are validated

## License

MIT

## Notes

- The database is in-memory and resets on each server restart
- Conversation history is stored in-memory (stateless per request, but maintains session for demo)
- For production, consider using a persistent database and proper session management
- The agent uses GPT-4 - ensure you have API access and sufficient credits

