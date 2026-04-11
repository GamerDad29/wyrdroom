# Wyrdroom Changelog

> Historical entries below were written under the APOC brand and are
> preserved as-is. The project was renamed to Wyrdroom on 2026-04-10.

## 2026-04-10 — 🔥 Shipment 2.6: Agent Overhaul v2

Full roster rebuild, 5 model upgrades, collaboration rules baked into
every remaining agent prompt. Commit `ac1494a` on main, deployed live.

### Roster (11 → 8)

**Cut:** Echo, Flux, Drift, Patch. They were narrators and meta-
commentators rather than participants with distinct expertise.

**New:** Scout (DeepSeek R1). The room's antenna to the outside world.
Tracks what just shipped, who's using it, whether it's hype or signal.
Thinks in landscapes. Owns breadth and recency; Oracle owns depth.

**Kept:** Gemma, Mistral, Cipher, Oracle, Scribe, Jinx, Sage.

### Model upgrades

| Agent | Old | New |
|---|---|---|
| Mistral | GLM 4.7 Flash | Claude Haiku 4.5 |
| Cipher | Qwen3 Coder Next | DeepSeek V3.2 |
| Oracle | Gemma 4 26B | Gemini 3 Flash (1M context) |
| Scribe | Nemotron 3 Nano (free) | GPT-4o Mini |
| Sage | Gemma 4 26B | Claude Haiku 4.5 |
| Scout | (new) | DeepSeek R1 |
| Jinx | Step 3.5 Flash | Gemma 4 26B A4B |

### Prompt rules in every remaining agent

- **No roll call** — don't auto-greet when Christopher says "hi all"
  unless you're one of the first two to speak
- **No citation chain** — don't open with "[Agent] says X, but…"
- **Specific observations** — when analyzing a URL/doc/code, ground
  in concrete elements
- **Collaboration model** — each agent has a per-agent coordinator
  block defining their lane and how they work with the others
- **Response length targets** — hard per-agent limits (Gemma 2-4/6,
  Mistral 1-3/4, Cipher 1-2/4, Oracle 3-6/8, Scribe matches task,
  Jinx 1-2/3, Sage 1-3/3, Scout 2-5/8)

### New Scout rune

ᚱ (Raidho — journey, travel, the ride). Added to `AGENT_RUNES` in
`src/hooks/useChat.ts`. Entry message: `[ ᚱ Scout has entered the
hall ᚱ ]`.

### Tests
- 35/35 still passing
- `/api/models` test now pins the 8-agent roster and explicitly
  asserts Scout is present, Echo/Flux/Drift/Patch absent
- `commandService` `@scout` parsing test replaces old `@echo` test
- Manifest consistency test auto-pins the new roster
- Clean tsc, clean build (bundle dropped 352 kB → 341 kB because
  4 system prompts are gone)

### Live verification (Playwright against https://wyrdroom.com)
- `/api/models` reports exactly 8 agents with the new model IDs
- All 8 entry messages with runes including Scout's ᚱ
- Sidebar shows 8 agents + Christopher, Scout present with burnt-
  orange `#e07030` avatar
- Zero console errors

## 2026-04-10 — 🔥 Shipment 2.5: Vibe Change (Mead & Modem visual rebrand)

Finished the visual half of the Wyrdroom rebrand that Phase 2 left
incomplete. Phase 2 flipped names, runes, and copy but left the
Vault-Tec Fallout palette intact — the site was rendering cold
navy/steel under Wyrdroom branding. This swaps the skin to Mead &
Modem: warm wood, honey gold, moss green, parchment, hearthfire.

Commit `963c52c` on main, deployed live.

### 15 concrete changes in `src/styles/chatroom.css`

1. Replaced the entire `:root` variable block with the Mead & Modem
   palette. Every token now resolves to warm tones. Added new
   Wyrdroom-specific tokens: `--hearth-glow`, `--wood-grain`,
   `--parchment`, `--moss`, `--moss-light`, `--rune-gold`.
2. Removed the CRT scanline `#root::after` overlay entirely
3. Replaced `#root::before` screen glow with subtle hearthfire
4. Titlebar: flat warm brown (no gradient), wider amber shadow,
   carved-edge bottom highlight
5. Room tabs: `--hearth-glow` hover, warmed active glow
6. Chat messages: warm brown panel with repeating 24px wood-grain
   texture
7. Code blocks: honey gold on dark (was terminal green)
8. System message bracket color: `--rune-gold`
9. Action messages: warm parchment italic at 70% opacity
10. Avatar `image-rendering: pixelated` rules for future PNG sprites
11. Input bar: warm dark, inset carved shadow, amber focus; send
    button honey-gold gradient (was military green)
12. Sidebar: warm background, hearth-glow hover, moss-green online
    status dots
13. Modal: warm box-shadow, removed avatar scanline overlay
14. Typing dot bounce softened 4px → 3px
15. Streaming cursor unchanged (already warm amber)

### Residual cleanup
- `src/components/AnimatedAvatar.tsx`: SVG background `#0d0f14` →
  `#1a1510`; Christopher's cape `#3B6BA5`/`#2a4a75` (Vault-Tec blue)
  → `#5a7a3a`/`#3d5220` (moss)
- `src/services/soundService.ts`: "Vault-Tec attention chime"
  comment → "Hall-call attention chime"

### Verification (Playwright, fresh browser context on live site)
- `body` computed background: `rgb(26, 21, 16)` = `#1a1510` ✅
- `--bg-deep` CSS var: `#1a1510` ✅
- Send button: `linear-gradient(rgb(139, 105, 20), rgb(107, 80, 16))`
  — honey gold, not green ✅
- Online status dot: `rgb(122, 154, 90)` = `#7a9a5a` moss ✅
- Zero console errors

Layout, components, fonts, animations, responsive breakpoints, and
all functionality are identical. Same bones, different clothes.

## 2026-04-10 — 🪐 Shipment 2 COMPLETE: Wyrdroom is live

Production is running on `https://wyrdroom.com` with the new worker,
new branding, strict security posture, and the legacy APOC entries
retired. End-to-end verified via Playwright against the live site.

### Phase 3 — Infrastructure cutover (executed this session)

- **GitHub repo renamed** `GamerDad29/apoc` → `GamerDad29/wyrdroom`
  (by Christopher); local git remote updated to match
- **New Cloudflare Worker deployed**: `wyrdroom-proxy` at
  `https://wyrdroom-proxy.gamerdad29.workers.dev`
- **OPENROUTER_API_KEY secret** set on the new worker via
  `wrangler secret put`
- **Old `apoc-proxy` Worker deleted** via Cloudflare MCP
- **Pages custom domains attached**: `wyrdroom.com` and
  `www.wyrdroom.com`, both proxied through Cloudflare
- **DNS records** added: apex CNAME `wyrdroom.com → apoc.pages.dev`
  (proxied, orange cloud on) plus `www` CNAME to the same target
  (Pages project name kept as `apoc` internally — it's a label,
  not user-visible)
- **Pages production env var** `VITE_WORKER_URL` updated to the new
  worker URL
- **GitHub Actions workflow** updated: build target flipped to
  `wyrdroom-proxy.gamerdad29.workers.dev`, `VITE_PROXY_SECRET` line
  removed entirely (SEC-01 killed the mechanism)
- **`wyrdroom-rebrand` branch merged to `main`** (commit `c57a013`)
  with a merge commit preserving the rebrand history
- **CI built and deployed** the merged main to Cloudflare Pages;
  verified the new build is serving at `https://wyrdroom.com`

### Phase 3 cleanup (same-day follow-up commit `1743353`)

- **Removed `apoc.pages.dev` from `worker/index.ts`** allow-list
  (both the exact-origins Set and the parent-hostnames list)
- **Removed the transitional "Legacy — remove after cutover"**
  comments
- **Redeployed wyrdroom-proxy** with the cleaned allow-list
- **Updated `src/worker.test.ts`**:
  - Preview-subdomain test now uses `wyrdroom.pages.dev`
  - New regression test: `rejects the retired apoc.pages.dev
    legacy origin` (403)
  - Suffix-attack test now targets `wyrdroom.com.evil.example`
- 34 → 35 tests passing

### Live verification (Playwright + curl against `https://wyrdroom.com`)

- Page title: `Wyrdroom` ✅
- Titlebar: `ᚹ WYRDROOM` (Wunjo rune + brand name, Noto Sans Runic
  font loaded) ✅
- Room tabs: Main Hall · War Room · The Forge · The Loom ✅
- Sidebar: "In This Hall" ✅
- All 11 Elder Futhark runes flanking entry messages, DOM-verified
  as Unicode codepoints ✅
- Health endpoint through `wyrdroom-proxy`: 200 OK ✅
- Chat round trip (Nemotron 3 Nano free tier, 10 tokens): real
  OpenRouter response, $0 cost ✅
- CORS posture:
  - Origin `https://wyrdroom.com` → 200
  - Origin `https://apoc.pages.dev` → **403 (retired)**
  - Origin `https://evil.example` → **403**
- Zero console errors

### Summary of Shipment 2

Between Phase 1 (worker hardening), Phase 2 (rebrand code), and
Phase 3 (infra cutover + cleanup), Shipment 2 shipped:

- Strict origin validation (SEC-02)
- Removed bundled VITE_PROXY_SECRET (SEC-01)
- Per-IP rate limiting (OPS-01)
- Shared agent manifest + `/api/models` drift fix (BUG-05, REF-02)
- Full APOC → Wyrdroom rebrand (REBRAND-01, 02, 03, 04)
- Noto Sans Runic font loading (POLISH-01)
- Cleanup of transitional allow-list entries

Open for Shipment 3: usability features (Room Control Panel,
Pinned Session Brief, Message-Level Actions, mention autocomplete,
vault hardening).

## 2026-04-10 — Shipment 2 Phase 2: Rebrand Code Staged

The code-only half of the APOC → Wyrdroom rebrand is staged on the
`wyrdroom-rebrand` branch. Not merged to `main` yet. Production
continues to run under the APOC brand until Christopher completes the
Phase 3 infra cutover (GitHub repo rename, `wrangler deploy` under
the new `wyrdroom-proxy` name, Cloudflare Pages custom domain
`wyrdroom.com`, `git remote set-url`).

### On the branch
- 22 files changed, full file-by-file rename map from
  `wyrdroom-rebrand.md` executed
- Titlebar: APOC → ᚹ WYRDROOM (Wunjo rune + brand name)
- Rooms: Main Hall, War Room, The Forge, The Loom
- All `apoc_*` localStorage keys → `wyrd_*` (no migration; v0)
- Elder Futhark runes flank every agent's entry/exit notice
- `package.json` name, `index.html` title, `wrangler.toml` name all
  flipped
- `apoc-chatroom-spec.md` renamed to `wyrdroom-spec.md`
- Backlog handoff doc fully rebranded; CHANGELOG + SESSION_LOG titled
  Wyrdroom with historical entries preserved
- `README.md` rewritten with Wyrdroom tagline and new security notes
- 34/34 tests still passing, clean tsc + clean build
- Commits on `wyrdroom-rebrand`:
  - `5c70060` — full rename map executed
  - `57aad29` — POLISH-01: Noto Sans Runic loaded for crisp
    Elder Futhark rune rendering (Google Fonts `unicode-range`
    U+16A0–16F8 so only Runic codepoints swap; Latin text stays
    on the retro pixel fonts)

### On main
This document and `main` still reflect the APOC brand. Once the
Phase 3 infra cutover is complete, `wyrdroom-rebrand` will be merged
and `main` itself will flip.

## 2026-04-10 — Shipment 2 Phase 1: Worker Hardening

Security-layer half of the Wyrdroom arc, landing under the APOC brand
so the rebrand phase inherits a clean surface. Worker is now forward-
compatible with `wyrdroom.com` origins — no CORS race during cutover.

### Security
- **Strict origin validation (SEC-02).** Parses `Origin` with
  `new URL()`, constrains scheme to http/https, rejects headers with
  injected paths/queries/fragments, compares canonical origin against
  an exact allow-list, and uses the parser's normalized `hostname`
  for subdomain matching. Suffix attacks like
  `https://apoc.pages.dev.evil.example` are rejected. Allow-list now
  covers both current production (`apoc.pages.dev` + Pages previews)
  and future production (`wyrdroom.com`, `*.wyrdroom.com`,
  `*.wyrdroom.pages.dev`).
- **Removed bundled proxy secret (SEC-01).** `VITE_PROXY_SECRET` is
  gone from the client; the worker no longer checks `X-Proxy-Secret`.
  The header was a real secret in name only — `VITE_*` vars ship in
  the browser bundle. Access is now gated by origin validation +
  rate limiting.
- **Per-IP rate limiting (OPS-01).** In-memory sliding window per
  isolate: 30/min `/api/chat`, 120/min `/api/health`, 60/min
  `/api/models`. 429 responses carry `Retry-After`. Known limitation:
  per-isolate state, not KV/DO-backed; this is the "prevent
  accidental runaway loops" tier.

### Bug fixes
- **`/api/models` derived from shared manifest (BUG-05).** Created
  `src/agents/manifest.ts` as the single source of truth for public
  agent metadata. The worker's models endpoint is now derived from
  it — the old hardcoded list was silently missing Drift and Echo.
  A consistency test pins manifest entries to individual agent files
  so drift cannot return.

### Test coverage
- **19 → 34 tests passing.** Added 16 new tests covering origin
  validation (7), SEC-01 no-secret behavior (2), manifest-derived
  models (1), rate limiting (2), manifest consistency (4).

## 2026-04-10 — Shipment 1: Trust the Runtime

Post-Codex-review hardening pass. No new features — eight correctness
and security fixes, plus doubled test coverage.

### Security
- **XSS killed in message rendering (SEC-03).** `MessageBubble` no longer
  uses `dangerouslySetInnerHTML`. Rewritten as a recursive React
  tokenizer so user and model content is auto-escaped by React. Pasted
  `<script>`, `<img onerror=...>`, and similar payloads now render as
  inert text. 7 regression tests added.

### Chat runtime integrity
- **`/stop` actually cancels (BUG-01).** `AbortController` threaded
  through `sendChatRequest` → `sendMessageToAgent` → `useChat`. Upstream
  fetches tear down immediately instead of burning tokens in the
  background. `AbortError` is swallowed, not surfaced.
- **Concurrent streaming state (BUG-06).** Replaced the single
  `streamingRef` boolean and single `typingAgent` slot with a
  per-request `Map<msgId, AbortController>` and a `typingAgents: string[]`.
  Hey-all, iterate, and freeform can now show multiple agents typing
  at once, and the composer lock / idle scheduler agree on "is anything
  streaming" across all active requests.
- **`/save` no longer pollutes the transcript (BUG-02).** Deleted the
  hack where `/save` injected a fake `"push to obsidian"` user message
  to trick Scribe's auto-save branch. Replaced with structured
  `sendToAgent(..., { autoSaveToVault: true })` intent.
- **Truthful connectivity (BUG-07).** Failed health check used to fall
  back to `setIsConnected(true)`, lying to the UI when the worker was
  down. Now surfaces as disconnected, with a 60-second periodic
  recheck.

### Polish
- **Pure state initializer (BUG-04).** `createEntryMessages` no longer
  plays audio from inside a React state initializer. Entry sounds
  moved to a mount effect so StrictMode's double-invocation can't
  double-fire.
- **Sidebar resize persistence (BUG-03).** Drag handler reads latest
  width from a ref at mouse-up instead of the stale value captured
  when the drag started, so localStorage saves what the user actually
  dragged to.

### Test harness
- Vitest + jsdom scaffolded with `src/test/setup.ts`.
- Service-level tests: command parsing, note transcript generation,
  token budgeting, proxy streaming, worker auth.
- Cancellation tests for `proxyService.sendChatRequest` covering
  signal forwarding and already-aborted short-circuit.
- **10 → 19 tests passing. Clean typecheck. Clean build.**

## 2026-04-08 — The War Room

### New Agents
- **Flux** (Xiaomi MiMo v2 Flash): The connector. Finds the thread between what everyone else said that nobody noticed. Warm gold (#e6a830).
- **Drift** (GLM 4.7 Flash): The scenario builder. "If we ship this in 3 months, here's what the world looks like in 6." Horizon blue (#7eb8da).
- **Patch** (Gemma 4 26B): The editor. Does not create. Improves. Tighter, cleaner, stronger. Muted lavender (#c0a0d0).
- **Echo** (Step 3.5 Flash): The room's emotional intelligence. Reads tone shifts, tracks what's unsaid. Soft coral (#e08080).

### Vision Space
- 4th room: forward-looking exploration with Jinx, Drift, Flux, Oracle, Echo, Scribe

### 1,101 Ambient Emotes
- Expanded from ~150 to 100 per agent across all 11 agents
- Categories: professional, personality, cross-agent reactions, environmental, rare/special
- Each emote carefully aligned to agent personality and role

### Vault-Tec Overhaul
- Full color palette shift from green terminal to Fallout aesthetic: navy backgrounds, Vault-Tec blue (#3B6BA5), Vault Boy yellow (#F0C75E), warm orange accents
- CRT glow shifted from green to warm blue wash with amber vignette

### Sprite System Upgrade
- Sidebar sprites: 40px to 56px
- Chat message sprites: 32px to 38px, always animated (not just during streaming)
- Christopher's cape (Vault-Tec blue) with wave animation
- Mouse-tracking eyes in agent profile modal
- 22 expression types (10 new: angry, sad, excited, confused, wink, sleepy, sly, whisper, proud, nervous)
- New CSS animations: cape wave, excited bounce, nervous jitter, sleepy sway, proud chin-up

### New Commands
- `/iterate <time> <topic>` : Agents discuss round-robin for set duration, Scribe auto-summarizes
- `/freeform` : Agents freely discuss to learn each other (stop with /stop)
- `/mute` / `/unmute` : Toggle ambient emotes and idle chatter
- `/stop` : Cancel all active responses and iterations (works during streaming)
- `/save` : Compile notes via Scribe and auto-push to Obsidian vault
- `hi all`, `yo all`, `sup everyone` now trigger group responses

### Prompt Architecture Overhaul
- Complete rewrite of all agent system prompts following prompting guide
- Every agent has: example exchanges, specific opinions, interaction dynamics, conversational habits, depth modes
- Anti-narration rule: agents react to each other, don't summarize each other
- Response length tuning per agent (Jinx: 1-2 sentences, Oracle: 3-6 with substance, Sage: 1-3)
- Scribe activated as quiet participant (clarifies decisions, reminds of forgotten context)
- Jinx rewritten from "chaos gremlin" to "possibility engine"
- All biographical bias stripped: agents wait for direction, don't assume project context

### Infrastructure
- CI auto-deploy via GitHub Actions (Cloudflare Pages on every push to main)
- Worker retry (3x exponential backoff) on 429 rate limits
- Repetition loop detector cuts off degenerate model output
- Agents see each other during /iterate (stale closure fix)
- /stop works during active streaming
- Scribe Notes vault folder (`Scribe Notes/{date}-{room}-{time}.md`)
- Auto-push to Obsidian when Scribe detects vault request
- Cloudflare Access protecting production

### Model Changes
- Mistral: mistral-small-3.1-24b (fake dialogue problem) → GLM 4.7 Flash
- Sage: Qwen 3.5 9B (silent failures) → Gemma 4 26B
- Cipher: deepseek-r1 (no endpoints) → Qwen3 Coder Next
- All free models replaced with paid cheap models (except Scribe)

### Bug Fixes
- 429 rate limit handling with friendly error messages
- Idle chatter system prompt leak (instruction injected via ref, not system message)
- React render loop (useMemo for users array)
- Mention alert sound when agents @mention Christopher

---

## 2026-04-08 — v0.6: The Full Crew

### Bug Fixes
- **429 Rate Limit Handling**: Worker proxy now retries up to 3x with exponential backoff (1s, 2s, 4s) when OpenRouter returns 429. Client shows a clean, friendly error message instead of raw JSON.
- **Idle Chatter Prompt Leak**: Fixed root cause where idle chat instructions (type: 'system') were being filtered by `buildChatHistory`, meaning the model never received the instruction and would sometimes echo its own system prompt. Idle instructions are now injected directly into the API call as a `[Room atmosphere]` user message. Added response sanitizer to strip instruction-echoing prefixes.

### CI Auto-Deploy
- GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys to Cloudflare Pages on every push to `main`
- Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets in the GitHub repo

### 4 New Agents (All FREE Models)
- **Cipher** (DeepSeek R1): Hacker/coder. Terse, precise, security-minded. Views everything as a system to reverse-engineer. Terminal green (#00ff41). Visor avatar with short cropped hair.
- **Oracle** (Llama 3.3 70B): Researcher/analyst. Thorough deep-diver who returns with context nobody asked for but everyone needed. Soft violet (#b388ff). Circlet/headpiece avatar.
- **Jinx** (Step 3.5 Flash): Chaos agent. "But what if we did the opposite?" Loves breaking things experimentally. Gets excited by failure. Hot orange (#ff6347). Wild asymmetric spiky hair avatar.
- **Sage** (Nemotron 3 Super): Philosopher/anchor. Quiet wisdom. Asks "why" when everyone asks "how." Drops metaphors that stop the room. Warm teal (#4dd0e1). Hooded sage with beard avatar.

### Room Specialization
- **Main Room**: Full crew (all 7 agents)
- **Project Room**: Gemma + Cipher + Oracle + Scribe (focused work)
- **Makers Space**: Mistral + Jinx + Sage + Scribe (creative/experimental)

### Per-Agent Details
- 20 unique emotes per new agent (80 total new emotes)
- Unique synthesized sound tones for each new agent
- Idle animation patterns tuned to personality (Cipher: focused, Jinx: fidgety, Sage: calm)
- Full Fallout-style profile cards with strengths, weaknesses, backstory
- Animated SVG avatars with agent-specific features (visor, circlet, wild hair, hood+beard)

### Agent Awareness Updates
- All existing agents (Gemma, Mistral, Scribe) now know about the full crew
- Inter-agent relationship dynamics defined (Gemma/Cipher build pair, Mistral/Jinx chaos twins, Oracle/Sage meaning-makers)
- Help command updated with full agent roster

---

## 2026-04-07 — v0.5: Living Room

### Animated SVG Avatars
- All avatars converted from static SVGs to inline React components
- Composable parts: head, eyes, mouth, eyebrows, body per agent
- Expression engine detects keywords in messages:
  - "lol/haha" = laugh, "hmm/interesting" = think, "whoa/wow" = surprised
  - "honestly/actually" = smirk, "plan/deploy/build" = focused
  - Questions = think, "really/you sure" = eyebrow raise
- 12 expression states: idle, blink, talk, laugh, think, surprised, smirk, focused, look-left, look-right, nod, eyebrow-raise
- Per-agent idle animation patterns with weighted randomness:
  - Gemma: blinks slower, stays focused, occasional nod
  - Mistral: fidgets more, smirks, raises eyebrows
  - Scribe: steady focus, minimal movement, adjusts glasses
- Typing state triggers "think" expression
- Large animated avatar (112px) in profile modal

### Ambient Emotes (70+ unique, zero API cost)
- Agents perform small actions every 30-90 seconds
- **Gemma** (24 emotes): adjusts notes, sips coffee, reorganizes tabs, steeples fingers, catches herself staring, quietly closes 14 browser tabs
- **Mistral** (28 emotes): drums fingers, flips pen (and drops it), tilts chair dangerously, smirks at nothing, air quotes, slow claps sarcastically, types furiously then deletes all of it
- **Scribe** (20 emotes): twiddles pen, adjusts glasses, turns pages, underlines something twice, traces a wikilink bracket in the air, opens a fresh page
- Weighted probability so favorites appear more often

### Obsidian Vault Integration
- Uses Obsidian "Local REST API" community plugin
- Auto-discovers HTTP (port 27123) and HTTPS (port 27124)
- `/vault key <key>` -- set API key
- `/vault search <query>` -- search vault for notes
- `/vault read <path>` -- read a note into chat
- `/vault write <path>` -- write Scribe notes to vault
- `/vault list [folder]` -- browse vault structure
- `/vault save` -- auto-save notes to `APOC/` folder with date
- Graceful fallback when Obsidian not running

### Scribe Model Upgrade
- Switched from Gemma 4 31B (free, rate-limited) to NVIDIA Nemotron 3 Nano 30B (free, better quality)
- Produces tables, structured headers, key takeaways in notes

---

## 2026-04-07 — v0.4: The Crew Comes Alive

### Bug Fix
- Unaddressed messages no longer auto-route to Gemma
- Must @mention an agent or say "hey all" to trigger a response

### Sound Overhaul
- Different tones per room:
  - Main Room: warm open chord
  - Project Room: focused two-note
  - Makers Space: playful descending bounce
- Different tones per agent:
  - Gemma: confident double-ping
  - Mistral: quick sharp triplet
  - Scribe: soft pen-scratch
- Agent enter sounds (ascending vault-door chime, colored by agent)
- Agent leave sounds (descending departure tone)
- "Hey all" broadcast chime
- Idle chatter murmur sound

### "Hey All" Command
- Say "hey all", "hey everyone", "hey team", "hey crew", etc.
- All non-scribe agents respond sequentially with different sounds

### Agent Profile Modal (Fallout Terminal Card)
- Click any agent name in chat or sidebar
- Opens Fallout-style personnel file with:
  - Large avatar, name, title, model, cost
  - Personality description and backstory
  - Strengths list (green bullets)
  - Weaknesses list (red bullets)
- CRT scanline overlay on avatar
- Escape or click outside to close

### Resizable Sidebar
- Drag the left edge to resize between 150-400px
- Width persists in localStorage across sessions

### Idle Agent-to-Agent Chatter
- After 3+ minutes of user inactivity, agents occasionally chat
- 4-7 minutes between attempts, 40% chance to skip
- Max 3 idle messages per session (hard cap)
- Prompts limited to one short sentence

### Agent Personality Upgrades
- Richer system prompts with inter-agent awareness
- Gemma/Mistral friendly rivalry dynamics
- Agents only respond when addressed (room etiquette)
- Scribe personality: quiet professional with notebook

---

## 2026-04-07 — v0.3: The Full Crew

### New Agents
- **Mistral** (mistral-small-3.1-24b): Creative lateral thinker, dry wit, punchy responses. $0.03/$0.11 per M tokens.
- **Scribe** (nemotron-3-nano-30b:free): Silent note-taker and archivist. FREE.

### Note System + Obsidian Export
- `/notes [topic]` asks Scribe to compile structured session notes
- Notes formatted as Obsidian-compatible Markdown (YAML frontmatter, wikilinks, checkboxes)
- `/export` downloads the last compiled notes as a timestamped .md file

### Agent Targeting
- `@gemma`, `@mistral`, `@scribe` to direct messages
- Default: unaddressed messages go to chat only

### Avatars
- All four avatars as Fallout Pip-Boy style pixel art SVGs with CRT scanlines

### Deployment
- Live at https://apoc.pages.dev
- Cloudflare Pages with baked production env vars

---

## 2026-04-07 — v0.2: Fallout x Yahoo Lounge

### UI Overhaul
- Fallout retro-futuristic meets Yahoo Chat Lounge aesthetic
- CRT scanline overlay and subtle green screen glow
- Amber (#C9A84C) and phosphor green palette
- Share Tech Mono + VT323 fonts
- Bigger avatar cards in sidebar, room description header
- Pip-Boy style panel frames, glowing status dots

### Multi-Room System
- Main Room, Project Room, Makers Space
- Per-room message history in localStorage

### Slash Commands
- `/me`, `/clear`, `/reset`, `/budget`, `/resetbudget`, `/help`
- Input highlights amber in command mode

### Markdown, Sound Effects, Agent Mood, Message Search
- Markdown rendering (bold, italic, code)
- Web Audio API synth sounds with SFX toggle
- Agent mood shifts by time of day and conversation depth
- Search with match count and amber highlighting

---

## 2026-04-07 — v0.1: Phase 0 Launch

### Built
- Retro chat room UI, Gemma 4 31B via OpenRouter, streaming SSE
- Cloudflare Worker proxy with CORS and auth
- Agent registry, token budget system, localStorage persistence
- System messages, typing indicator, auto-scroll

### Infrastructure
- GitHub: https://github.com/GamerDad29/apoc
- Worker: `apoc-proxy.gamerdad29.workers.dev`
- Stack: Vite + React + TypeScript, Cloudflare Worker, OpenRouter API

---

## Backlog (Next Session)

### Quick Wins
- **Cloudflare Pages CI** -- hook up GitHub auto-deploy so every push goes live
- **Timestamp grouping on emotes** -- dim or collapse rapid emotes
- **Agent memory across sessions** -- persist last N messages per room to Cloudflare KV

### Medium Lifts
- **Agent-to-agent debate mode** -- `/discuss <topic>` and watch Gemma and Mistral go back and forth (scaffolding already exists)
- **More agents** -- add a coder (Devstral), a researcher, or a wild card personality
- **Notification system** -- subtle ping when activity happens in another room
- **Theme switcher** -- Fallout green (default), blue Vault-Tec variant, amber-only Pip-Boy mode

### Bigger Plays
- **Persistent memory via Cloudflare KV** -- agents remember across sessions
- **File/image sharing in chat** -- drop images, agents can reference them
- **Mobile responsive polish** -- works on mobile but could be tighter
- **Custom agent builder** -- `/agent create` to spin up a new agent with a custom persona on the fly
