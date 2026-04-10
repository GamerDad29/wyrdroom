# Wyrdroom: Claude Code Build Specification
## AI Chat Room Platform - Phase 0 (Gemma 4 31B)

---

## WHAT THIS IS

Wyrdroom is a custom web app that looks and feels like a late-90s/early-2000s chat room. You walk in, you're in the room. AI agents are the other people in the room. They have names, avatars, personalities. You chat with them. They chat with you. Eventually, they chat with each other.

Phase 0 is one room, one agent: Gemma 4 31B. Prove the pipeline. Then scale.

This is NOT Open WebUI. This is NOT a model picker. This is a custom-built chat room with a retro aesthetic and sophisticated AI plumbing underneath.

---

## DEVELOPER CONTEXT

Christopher is a no-code developer. He works in Git Bash on Windows. He does NOT use VS Code, nano, or vim. All files must be complete (never partial edits). All operations must be bash commands. Never use heredocs (they break in Windows Git Bash). Never say "open the file and paste this."

His deployment workflow: Cloudflare Pages (auto-deploy from GitHub) + Cloudflare Workers (backend proxy). This is the same pattern as his other projects (Mythos Architect, Mesa Civic Guide).

---

## PREREQUISITES (Christopher does before starting Claude Code)

### 1. Create an OpenRouter account
- Go to https://openrouter.ai and sign up
- Add $10-20 in credits (Settings > Billing)
- Create an API key (Settings > API Keys), label it "Wyrdroom"
- Output needed: The API key string (starts with sk-or-v1-...)

### 2. Create a GitHub repo
- Create a new repo: `wyrdroom` (or whatever name)
- Clone it locally: `cd ~/Downloads && git clone https://github.com/GamerDad29/wyrdroom.git`
- Output needed: The repo URL

### 3. Have these values ready
```
OPENROUTER_API_KEY=sk-or-v1-xxxxx
GITHUB_REPO=https://github.com/GamerDad29/wyrdroom.git
```

No VPS needed. No Docker. Cloudflare Pages deploys from GitHub automatically. The Worker handles API proxying.

---

## TECH STACK

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Vite + React + TypeScript | Free (Cloudflare Pages) |
| Backend proxy | Cloudflare Worker | Free tier (100K requests/day) |
| AI models | OpenRouter API (Gemma 4 31B first) | $0.14/$0.40 per M tokens |
| DNS/CDN | Cloudflare | Free |
| Storage | LocalStorage for chat history (Phase 0), IndexedDB later | Free |

---

## PROJECT STRUCTURE

```
~/Downloads/wyrdroom/
├── src/
│   ├── App.tsx                   # Root component, just renders ChatRoom
│   ├── main.tsx                  # Vite entry
│   ├── types.ts                  # Shared types (Message, Agent, Room)
│   ├── components/
│   │   ├── ChatRoom.tsx          # The main room: message feed + input + user list
│   │   ├── MessageBubble.tsx     # Single chat message (avatar, name, timestamp, text)
│   │   ├── UserList.tsx          # Sidebar showing who's "in the room"
│   │   ├── ChatInput.tsx         # Text input bar at bottom
│   │   ├── SystemMessage.tsx     # "[Gemma has entered the room]" style messages
│   │   └── TypingIndicator.tsx   # "Gemma is typing..." indicator
│   ├── agents/
│   │   ├── index.ts              # Agent registry (add new agents here)
│   │   ├── gemma.ts              # Gemma 4 agent config (model ID, system prompt, persona)
│   │   └── _template.ts          # Template for adding new agents
│   ├── services/
│   │   ├── proxyService.ts       # HTTP client to Cloudflare Worker
│   │   ├── chatService.ts        # Message orchestration (send, receive, agent-to-agent)
│   │   └── tokenBudget.ts        # Token budget tracker (prevents runaway agent-to-agent convos)
│   ├── hooks/
│   │   └── useChat.ts            # React hook managing chat state, message history, streaming
│   └── styles/
│       └── chatroom.css          # The retro chat room aesthetic (all styles here)
├── worker/
│   ├── index.ts                  # Cloudflare Worker: proxies to OpenRouter
│   └── wrangler.toml             # Worker config
├── public/
│   └── avatars/
│       ├── gemma.png             # Gemma's avatar (or SVG)
│       └── user.png              # Default user avatar
├── index.html                    # Vite HTML entry
├── vite.config.ts                # Vite config
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies
└── README.md                     # Quick reference
```

---

## THE UI: RETRO CHAT ROOM AESTHETIC

### Design Direction
Late 90s / early 2000s chat room. Not a pixel-perfect AOL clone, but the VIBE. Think: AIM, mIRC, Yahoo Chat, early MSN. The feeling of being in a room with other people, not using a tool.

### Visual Language
- Background: Dark or medium gray, slightly warm. Not pure black, not white.
- Chat area: Lighter inset panel, like a recessed text area. Subtle inner shadow or border.
- Font: Monospace or semi-monospace for the chat messages. Something like `"Courier New", "Lucida Console", monospace` or a web font like IBM Plex Mono, Space Mono, or Fira Mono.
- Usernames: Bold, color-coded. Each agent gets a signature color. Christopher gets one too.
- Timestamps: Small, gray, beside or above each message cluster.
- Input bar: A simple text input at the bottom with a "Send" button. Flat, minimal. Maybe a slight bevel to feel like a 2000s form field.
- User list sidebar: Right side. Shows who's in the room. Each user has a small avatar/icon, their name, and a status dot (online/typing/away).
- System messages: Centered, italicized, gray. "[Gemma has entered the room]", "[Gemma is typing...]"
- No gradients, no glassmorphism, no rounded-everything. Flat, slightly beveled, utilitarian but warm.
- Window chrome: Optional subtle title bar at the top of the chat panel. "Wyrdroom - Main Room" or similar.
- Scrollback: Messages scroll up. New messages appear at the bottom. Auto-scroll to bottom on new message unless user has scrolled up.

### Color Palette (starting point, refine during build)
- Room background: #1a1a2e or similar dark blue-gray
- Chat panel: #16213e or similar slightly lighter
- Text: #e0e0e0 (messages), #8888aa (timestamps/system)
- Christopher's name color: #00ff88 (green, like a classic username)
- Gemma's name color: #ff6b9d (warm pink/coral)
- Input bar background: #0f3460 or similar
- Accent/borders: #30475e
- Send button: Slightly brighter accent

### Layout
```
+--------------------------------------------------+
|  Wyrdroom - Main Room                            [_]  |
+--------------------------------------------------+
|                                    | USERS        |
|  [Gemma has entered the room]      |              |
|                                    | * Gemma      |
|  Gemma (2:34 PM)                   |   online     |
|  Hey, I'm here. What are we        |              |
|  working on?                       | * Christopher|
|                                    |   online     |
|  Christopher (2:34 PM)             |              |
|  Let's break down the Q2           |              |
|  roadmap.                          |              |
|                                    |              |
|  Gemma is typing...                |              |
|                                    |              |
+--------------------------------------------------+
| [Type a message...               ]  [Send]        |
+--------------------------------------------------+
```

---

## THE AGENT SYSTEM

### Agent Configuration (agents/gemma.ts)

Each agent is a config object:

```typescript
export interface AgentConfig {
  id: string;                    // unique identifier
  name: string;                  // display name in chat
  modelId: string;               // OpenRouter model ID
  avatarUrl: string;             // path to avatar image
  nameColor: string;             // hex color for username in chat
  systemPrompt: string;          // the full system prompt
  personality: string;           // short description shown in user list
  maxTokensPerResponse: number;  // output token cap per message
  temperature: number;           // model temperature
  enableReasoning: boolean;      // Gemma 4 supports configurable thinking mode
}
```

### Gemma 4 31B Config

```
id: "gemma"
name: "Gemma"
modelId: "google/gemma-4-31b-it"
nameColor: "#ff6b9d"
personality: "Strategic thinker, builder, generalist"
maxTokensPerResponse: 2048
temperature: 0.7
enableReasoning: true
```

### Gemma's System Prompt

Write a system prompt that establishes Gemma as a chat room participant, not a corporate AI assistant. Key elements:

- You are Gemma, a participant in the Wyrdroom chat room. You are talking to Christopher.
- You are NOT a generic AI assistant. You are a specific person in this room with a personality.
- You are sharp, direct, collaborative. You think out loud. You push back when something doesn't make sense.
- You speak conversationally. Short messages are fine. Not everything needs to be a wall of text.
- You NEVER use em dashes. Use periods, commas, colons, or restructure.
- When Christopher asks you to do something complex, you break it into steps and confirm before diving in.
- You remember everything in this conversation. Reference earlier messages naturally.
- You know Christopher is an AI Strategy leader at Slalom, runs tech for Lucky Duck Dealz, is active in AZ civic research, and builds web projects. You're his collaborator, not his servant.
- Keep responses proportional to the question. A simple question gets a simple answer. A complex question gets depth.

### Adding a New Agent (Scaffolding)

The agent registry (agents/index.ts) is an array of AgentConfig objects:

```typescript
import { gemma } from './gemma';
// import { mistral } from './mistral';  // uncomment when ready

export const agents: AgentConfig[] = [
  gemma,
  // mistral,
];
```

To add Mistral later: duplicate `_template.ts`, fill in the config, add it to the array. The UI automatically shows them in the user list and routes messages to the right model.

### Agent-to-Agent Chat (Scaffolding for Phase 1)

The `chatService.ts` should include a scaffolded (but disabled) method for agent-to-agent conversation:

```typescript
async function agentToAgentExchange(
  agentA: AgentConfig,
  agentB: AgentConfig,
  topic: string,
  maxTurns: number = 4,       // hard cap on back-and-forth
  maxTokensBudget: number = 4000  // total token budget for the whole exchange
): Promise<Message[]> {
  // Phase 1: implement this
  // For now, return empty array
  return [];
}
```

The `tokenBudget.ts` service tracks cumulative token usage per agent per session and enforces hard limits. This prevents two agents from burning through $20 in a runaway loop.

```typescript
interface TokenBudget {
  agentId: string;
  sessionTokensUsed: number;
  sessionTokenLimit: number;      // e.g., 50,000 tokens per agent per session
  dailyTokensUsed: number;
  dailyTokenLimit: number;        // e.g., 200,000 tokens per agent per day
}
```

---

## THE WORKER (Backend Proxy)

### worker/index.ts

Same pattern as Christopher's other Cloudflare Workers. The Worker:

1. Receives POST requests from the frontend at `/api/chat`
2. Validates the request (checks for a proxy secret header)
3. Forwards to OpenRouter's chat completions endpoint: `https://openrouter.ai/api/v1/chat/completions`
4. Passes through the OpenRouter API key (stored as a Worker secret, NOT in frontend code)
5. Supports streaming responses (SSE) so messages appear token-by-token in the chat room
6. Returns the response to the frontend

### Worker Secrets (set via wrangler)
- `OPENROUTER_API_KEY` - the OpenRouter API key
- `PROXY_SECRET` - a shared secret the frontend sends to authenticate with the Worker

### Worker Routes
- `POST /api/chat` - Send a message, get a streamed response
- `GET /api/models` - Return list of available agents/models (for future model switching)
- `GET /api/health` - Simple health check

### CORS
- Allow requests from the Cloudflare Pages domain
- Allow requests from localhost during development

### wrangler.toml
```toml
name = "wyrdroom-proxy"
main = "index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
```

---

## EXECUTION ORDER FOR CLAUDE CODE

Claude Code should build these files in this order:

```
1. Create project directory structure
   mkdir -p ~/Downloads/wyrdroom/src/{components,agents,services,hooks,styles}
   mkdir -p ~/Downloads/wyrdroom/worker
   mkdir -p ~/Downloads/wyrdroom/public/avatars

2. Generate package.json (Vite + React + TypeScript deps)
3. Generate vite.config.ts
4. Generate tsconfig.json
5. Generate index.html (Vite entry, load retro fonts)
6. Generate src/types.ts (Message, AgentConfig, Room, TokenBudget types)
7. Generate src/styles/chatroom.css (THE WHOLE RETRO AESTHETIC)
8. Generate src/agents/gemma.ts (Gemma 4 config + full system prompt)
9. Generate src/agents/_template.ts (blank template for future agents)
10. Generate src/agents/index.ts (agent registry, just Gemma for now)
11. Generate src/services/proxyService.ts (HTTP client to Worker)
12. Generate src/services/chatService.ts (message orchestration + scaffolded agent-to-agent)
13. Generate src/services/tokenBudget.ts (token tracking and limits)
14. Generate src/components/MessageBubble.tsx
15. Generate src/components/UserList.tsx
16. Generate src/components/ChatInput.tsx
17. Generate src/components/SystemMessage.tsx
18. Generate src/components/TypingIndicator.tsx
19. Generate src/components/ChatRoom.tsx (main room, composes all components)
20. Generate src/hooks/useChat.ts (chat state management hook)
21. Generate src/App.tsx (root, just renders ChatRoom)
22. Generate src/main.tsx (Vite entry point)
23. Generate worker/index.ts (Cloudflare Worker proxy)
24. Generate worker/wrangler.toml
25. Generate README.md
```

After generation:
```bash
cd ~/Downloads/wyrdroom

# Install deps
npm install

# Test locally
npm run dev
# (Frontend runs on localhost:5173, won't connect to Worker yet but UI should render)

# Set up Worker
cd worker
wrangler login
wrangler secret put OPENROUTER_API_KEY
# (paste the API key when prompted)
wrangler secret put PROXY_SECRET
# (make up a long random string, save it, you'll put it in the frontend .env too)
wrangler deploy
cd ..

# Create .env.local for local dev
# (Claude Code should generate this with placeholder values)

# Push to GitHub
git add .
git commit -m "feat: Wyrdroom Phase 0 - Gemma chat room"
git push

# Set up Cloudflare Pages
# (Christopher does this in Cloudflare dashboard: connect GitHub repo, set build command to "npm run build", output dir to "dist")
```

---

## QUALITY CHECKS

Before presenting files, Claude Code should verify:

- [ ] All TypeScript types are consistent across files
- [ ] All imports reference files that actually exist in the project structure
- [ ] No em dashes anywhere in any file (including system prompts)
- [ ] No `process.env` in frontend code (use `import.meta.env` for Vite)
- [ ] Worker CORS allows both localhost and the Pages domain
- [ ] The chat room renders something meaningful even before the Worker is deployed (show the UI, show Gemma in the user list, show a "connecting..." state)
- [ ] Token budget service has hard limits that prevent runaway spending
- [ ] Agent-to-agent exchange function exists but is disabled/scaffolded
- [ ] The agent registry pattern makes it trivial to add a second agent (one file + one import)
- [ ] Streaming SSE handling works for token-by-token message rendering
- [ ] Chat history persists in localStorage across page reloads
- [ ] The retro aesthetic is genuinely retro, not "modern with a retro font"
- [ ] No purple-to-blue gradients, no glassmorphism, no Inter/Roboto
- [ ] System messages ("[Gemma has entered the room]") appear on load

---

## REFERENCE MATERIAL

- OpenRouter API: https://openrouter.ai/docs - OpenAI-compatible chat completions
- Gemma 4 31B on OpenRouter: https://openrouter.ai/google/gemma-4-31b-it
- LLM-to-LLM conversation pattern: https://github.com/hugalafutro/llm-convo
- Scryfall-style API patterns (for future card/data integrations): https://scryfall.com/docs/api

---

## WHAT SUCCESS LOOKS LIKE

You open the URL. You're in the room. The room looks like 1999. Gemma is in the user list on the right. A system message says "[Gemma has entered the room]." You type "Hey Gemma, let's talk about Q2 planning." Gemma's response streams in, token by token, in the chat feed. Her name is pink. Your name is green. It feels like talking to someone in a room, not using an AI tool.

And when you're ready to add Mistral, it's one config file and one line in the agent registry.
