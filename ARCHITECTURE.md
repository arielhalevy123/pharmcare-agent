# PharmaCare Agent - Complete Code & Database Explanation

## Table of Contents
1. [Overall Architecture](#overall-architecture)
2. [Database Structure](#database-structure)
3. [Database Data](#database-data)
4. [Backend Components](#backend-components)
5. [Data Flow](#data-flow)
6. [Multi-Step Flows](#multi-step-flows)

---

## Overall Architecture

The PharmaCare Agent is a **stateless conversational AI system** built with:

- **Backend**: TypeScript + Node.js + Express
- **AI**: OpenAI GPT-4o with function calling
- **Database**: SQLite (in-memory) with synthetic data
- **Frontend**: HTML + JavaScript with streaming UI
- **Communication**: Server-Sent Events (SSE) for real-time streaming

### Architecture Flow:
```
User → Frontend (HTML/JS) → Express API → PharmacyAgent → OpenAI API
                                              ↓
                                         Tool Executor → Database
```

---

## Database Structure

### Database Type: SQLite (In-Memory)
- **Location**: `:memory:` (resets on server restart)
- **Initialization**: Automatic on server start
- **Purpose**: Synthetic demo data for testing

### Tables

#### 1. **users** Table
Stores user information and prescription permissions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing user ID |
| `name` | TEXT NOT NULL | User's full name |
| `hasPrescriptionPermission` | INTEGER (0/1) | Whether user can have prescriptions |

**SQL Schema:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hasPrescriptionPermission INTEGER NOT NULL DEFAULT 0
)
```

#### 2. **medications** Table
Stores medication information with bilingual support (English & Hebrew).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing medication ID |
| `name` | TEXT NOT NULL | Medication name in English |
| `nameHebrew` | TEXT NOT NULL | Medication name in Hebrew |
| `activeIngredient` | TEXT NOT NULL | Active ingredient in English |
| `activeIngredientHebrew` | TEXT NOT NULL | Active ingredient in Hebrew |
| `requiresPrescription` | INTEGER (0/1) | Whether prescription is required |
| `usageInstructions` | TEXT NOT NULL | Usage instructions in English |
| `usageInstructionsHebrew` | TEXT NOT NULL | Usage instructions in Hebrew |
| `purpose` | TEXT NOT NULL | Medication purpose in English |
| `purposeHebrew` | TEXT NOT NULL | Medication purpose in Hebrew |

**SQL Schema:**
```sql
CREATE TABLE medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  nameHebrew TEXT NOT NULL,
  activeIngredient TEXT NOT NULL,
  activeIngredientHebrew TEXT NOT NULL,
  requiresPrescription INTEGER NOT NULL DEFAULT 0,
  usageInstructions TEXT NOT NULL,
  usageInstructionsHebrew TEXT NOT NULL,
  purpose TEXT NOT NULL,
  purposeHebrew TEXT NOT NULL
)
```

**Note**: Stock information is stored separately in the `stock` table (see below).

#### 3. **stock** Table
Stores current stock quantities for each medication separately from medication information.

| Column | Type | Description |
|--------|------|-------------|
| `name` | TEXT PRIMARY KEY | Medication name in English (matches medications.name) |
| `quantity` | INTEGER NOT NULL | Current stock quantity |

**SQL Schema:**
```sql
CREATE TABLE stock (
  name TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL
)
```

**Note**: Stock is stored separately to allow independent management of inventory levels without modifying medication information.

#### 4. **prescriptions** Table
Links users to medications they have valid prescriptions for.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing prescription ID |
| `userId` | INTEGER NOT NULL | Foreign key to users.id |
| `medicationId` | INTEGER NOT NULL | Foreign key to medications.id |
| `valid` | INTEGER (0/1) | Whether prescription is currently valid |

**SQL Schema:**
```sql
CREATE TABLE prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  medicationId INTEGER NOT NULL,
  valid INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (medicationId) REFERENCES medications(id)
)
```

---

## Database Data

### Users (10 total)

| ID | Name | Has Prescription Permission |
|----|------|----------------------------|
| 1 | Alice Johnson | Yes |
| 2 | Bob Smith | No |
| 3 | Carol White | Yes |
| 4 | David Brown | No |
| 5 | Eve Davis | Yes |
| 6 | Frank Miller | No |
| 7 | Grace Wilson | Yes |
| 8 | Henry Moore | No |
| 9 | Iris Taylor | Yes |
| 10 | Jack Anderson | No |

**Pattern**: Every other user (IDs 1, 3, 5, 7, 9) has prescription permissions.

### Medications (5 total)

**Note**: Stock quantities are stored separately in the `stock` table (see Stock section below).

#### 1. **Paracetamol** (פאראצטמול)
- **Active Ingredient**: Acetaminophen (אצטאמינופן)
- **Purpose**: Pain relief and fever reduction (הקלה על כאבים והורדת חום)
- **Requires Prescription**: No (Over-the-counter)
- **Usage**: Take 500-1000mg every 4-6 hours as needed. Do not exceed 4g per day.

#### 2. **Ibuprofen** (איבופרופן)
- **Active Ingredient**: Ibuprofen (איבופרופן)
- **Purpose**: Pain relief, inflammation reduction, fever reduction (הקלה על כאבים, הפחתת דלקות, הורדת חום)
- **Requires Prescription**: No (Over-the-counter)
- **Usage**: Take 200-400mg every 4-6 hours with food. Maximum 1200mg per day.

#### 3. **Amoxicillin** (אמוקסיצילין)
- **Active Ingredient**: Amoxicillin (אמוקסיצילין)
- **Purpose**: Bacterial infections treatment (טיפול בזיהומים חיידקיים)
- **Requires Prescription**: Yes (Prescription required)
- **Usage**: Take 500mg three times daily for 7-10 days. Complete the full course even if symptoms improve.

#### 4. **Aspirin** (אספירין)
- **Active Ingredient**: Acetylsalicylic acid (חומצה אצטילסליצילית)
- **Purpose**: Pain relief, blood thinning, heart attack prevention (הקלה על כאבים, דילול דם, מניעת התקפי לב)
- **Requires Prescription**: No (Over-the-counter)
- **Usage**: Take 75-325mg once daily. Do not give to children under 16.

#### 5. **Metformin** (מטפורמין)
- **Active Ingredient**: Metformin hydrochloride (מטפורמין הידרוכלוריד)
- **Purpose**: Type 2 diabetes management (ניהול סוכרת מסוג 2)
- **Requires Prescription**: Yes (Prescription required)
- **Usage**: Take 500-1000mg twice daily with meals. Monitor blood sugar levels regularly.

### Stock (5 entries)

| Medication Name | Quantity |
|----------------|----------|
| Paracetamol | 150 |
| Ibuprofen | 80 |
| Amoxicillin | 45 |
| Aspirin | 200 |
| Metformin | 30 |

**Note**: Stock is stored separately in the `stock` table, allowing independent inventory management.

### Prescriptions (8 total)

| User ID | User Name | Medication ID | Medication Name |
|---------|-----------|---------------|-----------------|
| 1 | Alice Johnson | 3 | Amoxicillin |
| 1 | Alice Johnson | 5 | Metformin |
| 3 | Carol White | 3 | Amoxicillin |
| 5 | Eve Davis | 5 | Metformin |
| 7 | Grace Wilson | 3 | Amoxicillin |
| 7 | Grace Wilson | 5 | Metformin |
| 9 | Iris Taylor | 3 | Amoxicillin |
| 9 | Iris Taylor | 5 | Metformin |

**Pattern**: Users with prescription permissions (1, 3, 5, 7, 9) have prescriptions for prescription-required medications (Amoxicillin and Metformin).

---

## Backend Components

### 1. Database Module (`backend/db/database.ts`)

**Purpose**: Manages all database operations and data access.

**Key Features**:
- **Async Initialization**: Ensures database is ready before queries
- **Promisified SQLite**: Converts callback-based SQLite to Promise-based
- **Bilingual Search**: Searches medications by English or Hebrew name (case-insensitive)
- **Separate Stock Table**: Stock quantities are managed independently in the `stock` table
- **Stock Resolution**: `checkStock` method resolves medication names (English/Hebrew) to canonical English name before querying stock table

**Key Methods**:

```typescript
// Get user by ID
async getUser(userId: number): Promise<User | null>

// Get medication by name (English or Hebrew)
async getMedicationByName(name: string): Promise<Medication | null>

// Get all medication names
async getAllMedications(): Promise<string[]>

// Check stock level (queries stock table after resolving medication name)
async checkStock(medicationName: string): Promise<number>

// Check if user has valid prescription
async checkPrescription(userId: number, medicationName: string): Promise<boolean>
```

**Initialization Flow**:
1. Create in-memory SQLite database
2. Create four tables (users, medications, stock, prescriptions)
3. Insert synthetic data (10 users, 5 medications, 5 stock entries, 8 prescriptions)
4. All queries wait for initialization to complete

---

### 2. Tool Definitions (`backend/tools/toolDefinitions.ts`)

**Purpose**: Defines the functions available to the AI agent.

**Four Tools**:

#### Tool 1: `getMedicationByName`
- **Input**: `name` (string) - Medication name in English or Hebrew
- **Output**: Full medication details including bilingual info, stock, prescription requirements, usage instructions
- **Use Case**: When user asks "What is Paracetamol?" or "מה זה פאראצטמול?"

#### Tool 2: `checkStock`
- **Input**: `medicationName` (string or array of strings) - Medication name in English or Hebrew, or array for multiple medications
- **Output**: Stock count and availability status (or array of stock info for multiple medications)
- **Use Case**: When user asks "Do you have Ibuprofen in stock?" or "Check availability" or "Show stock for all medications"
- **Implementation**: Resolves medication name to English canonical name, then queries the `stock` table

#### Tool 3: `getAllMedications`
- **Input**: None
- **Output**: Array of all medication names in English
- **Use Case**: When user asks "Show me all medications" or "What medications do you have?" or requests stock overview

#### Tool 4: `checkPrescription`
- **Input**: `medicationName` (string) - userId is automatically provided from session context
- **Output**: Whether user has valid prescription and can purchase
- **Use Case**: When user asks "Can I buy Amoxicillin?" or "Do I have a prescription?"

**Tool Definition Format**:
- Uses OpenAI's `ChatCompletionTool` format
- Includes descriptions that help the AI decide when to use each tool
- Defines parameter schemas for validation

---

### 3. Tool Executor (`backend/tools/toolExecutor.ts`)

**Purpose**: Executes tools called by the AI agent.

**Key Features**:
- **Input Validation**: Validates all parameters before execution
- **Error Handling**: Comprehensive error handling with descriptive messages
- **Logging**: Logs all tool calls with timestamps
- **Type Safety**: Returns structured `ToolResult` objects

**Execution Flow**:
1. Receive tool name and arguments
2. Validate input parameters
3. Execute appropriate tool function
4. Return structured result with success/error status

**Tool Functions**:

```typescript
// Get medication information
executeGetMedicationByName(name: string): Promise<ToolResult>

// Get all medication names
executeGetAllMedications(): Promise<ToolResult>

// Check stock availability (supports single medication or array)
executeCheckStock(medicationName: string | string[]): Promise<ToolResult>

// Check prescription status
executeCheckPrescription(userId: number, medicationName: string): Promise<ToolResult>
```

**Error Handling**:
- Invalid input → Returns error with descriptive message
- Medication not found → Returns error with medication name
- User not found → Returns error with user ID
- Database errors → Logged and returned as error

---

### 4. Agent (`backend/agent/agent.ts`)

**Purpose**: Core AI agent that processes messages and orchestrates tool calls.

**Key Features**:
- **Safety First**: Pre-filters dangerous queries before sending to AI
- **Streaming**: Real-time streaming of AI responses
- **Function Calling**: Multi-step tool execution with iteration
- **Bilingual**: Responds in English or Hebrew based on user input
- **Stateless**: Each request is independent (with optional conversation history)

**Safety System**:
- **Pre-filtering**: Checks for medical advice patterns before processing
- **Pattern Detection**: Regex patterns for:
  - "should I take", "can I use"
  - "what should I do for", "how should I treat"
  - "I have pain/fever/headache"
  - "diagnosis", "side effects", "drug interactions"
- **Automatic Redirect**: Redirects to healthcare professionals when needed

**Processing Flow**:

```
User Message
    ↓
Safety Check (checkSafetyViolations)
    ↓
[If unsafe] → Redirect Message
[If safe] → Continue
    ↓
Build Message History (system prompt + conversation + user message)
    ↓
Stream with Function Calling (streamWithFunctionCalling)
    ↓
[AI decides to call tool?]
    ↓
[Yes] → Execute Tool → Add Result to History → Loop Back
[No] → Stream Final Response → Done
```

**Multi-Step Iteration**:
- Maximum 10 iterations to prevent infinite loops
- Each iteration can:
  1. Stream text response
  2. Call a tool
  3. Receive tool result
  4. Continue with next AI response
- Example flow:
  ```
  User: "Can I buy Amoxicillin?"
  → AI calls getMedicationByName("Amoxicillin")
  → AI receives: requiresPrescription=true
  → AI calls checkPrescription(userId=1, "Amoxicillin")
  → AI receives: hasValidPrescription=true
  → AI responds: "Yes, you have a valid prescription..."
  ```

**Event Types Emitted**:
- `{ type: 'text', data: string }` - Streaming text chunks
- `{ type: 'tool_call', data: { name, arguments, timestamp } }` - Tool call events
- `{ type: 'tool_result', data: { name, result, timestamp } }` - Tool execution results

---

### 5. Express Server (`backend/index.ts`)

**Purpose**: HTTP API server that handles requests and serves frontend.

**Endpoints**:

#### `POST /chat`
- **Input**: `{ message: string, userId: number }`
- **Output**: Server-Sent Events (SSE) stream
- **Flow**:
  1. Validate input
  2. Get conversation history for user
  3. Set up SSE headers
  4. Stream events from agent
  5. Update conversation history
  6. Send completion signal

**SSE Event Format**:
```
data: {"type":"text","data":"Hello"}
data: {"type":"tool_call","data":{"name":"getMedicationByName",...}}
data: {"type":"tool_result","data":{"name":"getMedicationByName",...}}
data: {"type":"done"}
```

#### `GET /health`
- **Output**: `{ status: 'ok', timestamp: string }`
- **Purpose**: Health check endpoint

#### `GET /`
- **Output**: Serves `frontend/index.html`
- **Purpose**: Frontend application

**Conversation History**:
- Stored in-memory: `Map<sessionKey, messageHistory[]>`
- Session key format: `user_${userId}`
- Note: In production, use Redis or database for persistence

---

## Data Flow

### Complete Request Flow:

```
1. User types message in frontend
   ↓
2. Frontend sends POST /chat with { message, userId }
   ↓
3. Express validates input
   ↓
4. Express gets conversation history (if any)
   ↓
5. Express calls agent.processMessage(message, userId, history)
   ↓
6. Agent checks safety violations
   ↓
7. Agent builds message array with system prompt
   ↓
8. Agent calls OpenAI API with streaming
   ↓
9. OpenAI responds with:
   - Text chunks (streamed immediately)
   - Tool call requests (when needed)
   ↓
10. If tool call:
    - Agent emits tool_call event
    - Agent executes tool via toolExecutor
    - Tool executor queries database
    - Agent emits tool_result event
    - Agent adds result to message history
    - Agent loops back to step 8
   ↓
11. If no tool call:
    - Agent streams final text response
    - Agent emits completion
   ↓
12. Express streams all events to frontend via SSE
   ↓
13. Frontend displays:
    - Streaming text in real-time
    - Tool calls in yellow boxes
    - Tool results in blue boxes
   ↓
14. User sees complete response
```

### Example Multi-Step Flow:

**User Query**: "Can I buy Amoxicillin? I'm user 1."

```
Step 1: Agent receives message
Step 2: Safety check passes
Step 3: OpenAI decides to call getMedicationByName("Amoxicillin")
Step 4: Tool executor queries database
Step 5: Returns: { requiresPrescription: true, stock: 45, ... }
Step 6: Agent adds result to history, continues
Step 7: OpenAI sees prescription required, calls checkPrescription(1, "Amoxicillin")
Step 8: Tool executor checks prescriptions table
Step 9: Returns: { hasValidPrescription: true, canPurchase: true }
Step 10: Agent adds result, continues
Step 11: OpenAI generates final response: "Yes, you have a valid prescription..."
Step 12: All events streamed to frontend
```

---

## Multi-Step Flows

The agent supports complex multi-step reasoning through iterative function calling:

### Flow 1: Medication Inquiry → Stock Check → Prescription Check
```
User: "I want to buy Amoxicillin"
→ getMedicationByName("Amoxicillin") → requiresPrescription=true
→ checkPrescription(userId, "Amoxicillin") → hasValidPrescription=true
→ checkStock("Amoxicillin") → stock=45
→ Final response with all information
```

### Flow 2: Usage Instructions → Safety Warning
```
User: "How do I use Paracetamol?"
→ getMedicationByName("Paracetamol") → usageInstructions
→ AI provides instructions + safety warnings from system prompt
```

### Flow 3: Safety Redirect
```
User: "I have a headache, should I take Aspirin?"
→ Safety check detects "I have" + "should I take"
→ Immediate redirect to healthcare professional
→ No tool calls needed
```

---

## Safety Mechanisms

1. **Pre-filtering**: Regex patterns detect medical advice requests
2. **System Prompt**: Explicit instructions to never diagnose or advise
3. **Tool Limitations**: Tools only return factual data, no medical advice
4. **Automatic Redirects**: Redirects to professionals when needed

---

## Key Design Decisions

1. **In-Memory Database**: Fast, resets on restart (good for demos)
2. **Stateless Agent**: Each request independent (scalable)
3. **Streaming Responses**: Real-time UX, better perceived performance
4. **Tool Call Visualization**: Users see what tools are being used (transparency)
5. **Bilingual Support**: English + Hebrew for broader accessibility
6. **Type Safety**: Full TypeScript types throughout
7. **Error Handling**: Comprehensive validation and error messages

---

## Extending the System

### To Add a New Medication:
1. Add entry to `medications` array in `database.ts`
2. Rebuild and restart

### To Add a New Tool:
1. Define tool in `toolDefinitions.ts`
2. Add execution logic in `toolExecutor.ts`
3. Rebuild and restart

### To Change AI Model:
1. Update `model: 'gpt-4o'` in `agent.ts`
2. Rebuild and restart

---

This architecture provides a solid foundation for a production pharmacy assistant with proper safety measures, bilingual support, and real-time streaming capabilities.

