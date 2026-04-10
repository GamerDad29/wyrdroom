# APOC Claude Handoff

## Purpose

This document is a working handoff for Claude to:

1. Fix the highest-risk engineering issues already identified in review
2. Convert those issues into concrete backlog items
3. Review the product as a product, not just a codebase
4. Recommend feature additions, UX changes, and structural improvements

This is based on direct code review of the current repo state, plus a feature review against the product intent in `README.md`, `apoc-chatroom-spec.md`, and `CHANGELOG.md`.

## Current State Summary

APOC already has a strong product identity:

- Distinct retro chat-room presentation
- Multi-room multi-agent setup
- Agent personalities with sound, expression, emotes, and group discussion modes
- Scribe notes and Obsidian vault integration
- Cloudflare Worker proxy in front of OpenRouter

The app is interesting and differentiated. The weak spots are mostly:

- security boundaries
- cancellation and concurrency correctness
- operational resilience
- feature discoverability
- missing quality-of-life systems around persistence, moderation, and room control

## Existing Test Harness

A Vitest harness now exists and passes.

- `npm test`
- 10 passing tests
- Coverage currently targets:
- command parsing
- note transcript generation
- token budgeting
- proxy streaming behavior
- worker auth rejection

Claude should extend this harness before touching the higher-risk runtime paths.

## Shipment Status

### ✅ Shipment 1 — Trust the Runtime (shipped 2026-04-10)

Commits on `main`: `82dc2a0`, `bcb90c8`, `a5e50e1`. 19/19 tests passing.

Closed:
- **SEC-03** XSS in MessageBubble — React tokenizer, no `dangerouslySetInnerHTML`
- **BUG-01** Real `/stop` cancellation — AbortController threaded through
- **BUG-06** Concurrent streaming state — per-request Map, per-agent typing
- **BUG-02** `/save` structured intent — no more fake-message injection
- **BUG-07** Truthful connectivity — failed health check → disconnected
- **BUG-04** Pure state initializer — audio moved to mount effect
- **BUG-03** Sidebar resize — ref-based width at mouse-up
- **TEST-01** Vitest harness + service coverage extended

### 🟡 Shipment 2 Phase 1 — Worker Hardening (shipped 2026-04-10)

Commit `c82400d` on main, 34/34 tests passing. Not yet pushed.

Closed:
- **SEC-02** Strict origin validation — parsed URL, exact host allow-list,
  structured subdomain matching, forward-compat for `wyrdroom.com`
- **SEC-01** Removed `VITE_PROXY_SECRET` from browser bundle and worker
- **OPS-01** In-memory per-IP rate limiting (v0 tier)
- **BUG-05** `/api/models` derived from shared manifest
- **REF-02** Shared agent manifest as single source of truth

Deferred to Shipment 4: KV/DO-backed rate limiter (this is per-isolate).

### ⏳ Shipment 2 Phase 2 — Rebrand (code-only portion)

Open: REBRAND-02, REBRAND-03, REBRAND-04. All pure code changes per
the rename map in `wyrdroom-rebrand.md`. Branch strategy TBD.

### ⏳ Shipment 2 Phase 3 — Infra cutover (needs Christopher)

Open: REBRAND-01. Requires dashboard access:
- GitHub repo rename (`apoc` → `wyrdroom`)
- Delete old `apoc-proxy` Worker in Cloudflare
- `wrangler deploy` under new name `wyrdroom-proxy`
- Cloudflare Pages custom domain setup (`wyrdroom.com`)
- `git remote set-url` locally

### ⏳ Shipment 3 — Usability
Open: FEAT-01, FEAT-02, FEAT-04, FEAT-05, FEAT-11, VAULT-01

### ⏳ Shipment 4 — Wyrdroom as a Workflow Tool
Open: REF-01, FEAT-03, FEAT-06..10, FEAT-12, FEAT-13, REBRAND-05, OPS-02

---

## Fix-Now Backlog

> Historical reference. Items marked ✅ DONE above shipped in Shipment 1.

### P0. Remove fake frontend secret auth

**Problem**

The app currently sends `VITE_PROXY_SECRET` from the frontend to the worker and the worker treats it as authorization.

Relevant files:

- `src/services/proxyService.ts`
- `worker/index.ts`

This is not a real secret because `VITE_*` variables are bundled client-side. Anyone with the app can extract it and reuse the worker.

**Required change**

- Remove the shared-secret model between browser and worker
- Replace it with one of these patterns:
- Cloudflare Access enforced at the edge
- signed user/session tokens minted server-side
- turn the worker into a public proxy but enforce strict origin, rate limit, and abuse protection

**Minimum acceptance criteria**

- No client-bundled secret used for worker authorization
- `worker/index.ts` no longer trusts `X-Proxy-Secret` from the browser
- README and deployment docs updated
- Add tests for unauthorized and authorized request paths

### P0. Fix origin validation

**Problem**

Current CORS logic uses `origin.startsWith(...)` and `origin.endsWith(...)`. This is too loose and can reflect attacker-controlled origins such as `https://apoc.pages.dev.evil.example`.

Relevant file:

- `worker/index.ts`

**Required change**

- Parse `Origin` with `new URL(origin)`
- Compare exact hostnames
- Allow exact localhost dev origins and exact production hosts only
- Reject malformed origins cleanly

**Minimum acceptance criteria**

- Exact-host matching only
- Tests for valid localhost
- Tests for valid production
- Tests for malformed origin
- Tests for crafted subdomain or suffix attacks

### P0. Make `/stop` actually cancel work

**Problem**

The UI says active responses are stopped, but the underlying fetch and stream reader continue running. This can still append content after the user thinks the run was canceled.

Relevant files:

- `src/hooks/useChat.ts`
- `src/services/proxyService.ts`
- `src/services/chatService.ts`

**Required change**

- Introduce `AbortController` per active request
- Track active requests by message or agent id
- `/stop` must abort all active requests and clear related UI state

**Minimum acceptance criteria**

- No more chunks appended after `/stop`
- Typing indicator clears immediately
- Iteration and freeform timers stop
- Add tests for cancellation path

### P1. Fix shared streaming state for multi-agent replies

**Problem**

`streamingRef.current` and `typingAgent` are treated as single global state even though `hey all`, iteration, and freeform can overlap multiple requests.

Relevant file:

- `src/hooks/useChat.ts`

**Required change**

- Replace single boolean with per-request tracking
- Replace single `typingAgent` string with set or array of active typers, or a richer active-request state object
- Ensure UI can represent multiple active agent responses correctly

**Minimum acceptance criteria**

- User input does not unlock early while other agents are still responding
- Typing indicator behavior is correct in multi-agent flows
- Idle systems do not think the room is idle while agents are still streaming

### P1. Fix health and connectivity truthfulness

**Problem**

A failed health check currently falls back to `true`, which tells the UI the app is connected even when the backend is unavailable.

Relevant files:

- `src/hooks/useChat.ts`
- `src/services/proxyService.ts`

**Required change**

- Failed health checks should surface as disconnected
- Add retry or periodic recheck
- Add a visible disconnected state and retry affordance in UI

**Minimum acceptance criteria**

- Composer disables when backend is down
- Connection state transitions visibly in the UI
- Manual retry available

### P1. Separate product commands from hidden implementation hacks

**Problem**

`/save` currently depends on injecting a fake user message `"push to obsidian"` to trigger auto-save behavior.

Relevant file:

- `src/hooks/useChat.ts`

**Required change**

- Replace string-based side effects with explicit command intent
- Pass structured metadata through the notes flow

**Minimum acceptance criteria**

- No fake user message injected into chat history
- Save-to-vault is explicit, deterministic, and testable

### P2. Tighten vault integration and secret handling

**Problem**

The Obsidian vault API key is stored in localStorage and the UX around vault availability is brittle.

Relevant files:

- `src/services/vaultService.ts`
- `src/services/commandService.ts`

**Required change**

- Improve connection and certificate handling
- Consider session-only storage for vault key, or at least document tradeoffs clearly
- Better vault error messages and setup flow

**Minimum acceptance criteria**

- Vault failures tell the user what to do next
- Connection discovery is reliable
- User can see vault status without trial-and-error commands

## Suggested Engineering Backlog

### Now

- P0 security/auth rework for worker access
- P0 strict origin validation
- P0 real request cancellation
- P1 concurrent streaming state fix
- P1 truthful connectivity handling

### Next

- Structured command intent instead of content sniffing
- Better test coverage for `useChat`
- Room persistence cleanup and migration strategy
- Analytics/logging for worker errors and rate limits

### Later

- Durable storage beyond localStorage
- Real user identity/session model
- Room-level moderation and safety controls

## Feature Review

## What is already strong

- The product has a clear voice and aesthetic. It does not feel like generic model chat.
- Multi-agent dynamics are the core differentiator and should stay central.
- Scribe plus Obsidian is a real workflow, not a gimmick.
- Room specialization is good product design. It gives the cast structure.

## Where the product still feels thin

- Rooms are mostly static presets, not controllable spaces
- The user cannot shape agent behavior at the room/session level in a precise way
- Discoverability is weak. Many features are hidden behind commands
- Notes are exportable, but there is no stronger artifact pipeline
- There is no sense of long-lived memory, pinned context, or project continuity
- Group discussion exists, but facilitation tools are minimal

## Recommended Product Features

### 1. Room Control Panel

Add a visible room control panel instead of hiding core orchestration behind slash commands.

Suggested controls:

- Start discussion
- Stop discussion
- Choose discussion mode: round-robin, debate, brainstorm, critique, synthesis
- Pick duration
- Select which agents participate
- Include or exclude Scribe

Why this matters:

- makes the app understandable without memorizing commands
- turns APOC into a facilitation tool, not just a themed chat client

### 2. Session Goals and Pinned Context

Add a pinned session brief per room.

Suggested fields:

- current goal
- project or topic
- constraints
- desired output
- notes to keep in scope

Why this matters:

- improves agent consistency
- reduces prompt drift
- makes rooms feel persistent and purposeful

### 3. Better Output Artifacts

Right now Scribe gives notes. Expand the artifact model.

Suggested artifacts:

- meeting notes
- action list
- decision log
- ADR-style summary
- backlog draft
- research memo
- handoff brief

Why this matters:

- this product should end in useful assets, not just chat scrollback

### 4. Room Memory Layers

Introduce explicit memory scopes:

- ephemeral session memory
- room memory
- user-pinned memory
- imported vault memory

Why this matters:

- current localStorage history is not enough for project continuity
- explicit memory is better than accidental memory

### 5. Agent Role Controls

Let the user temporarily shift an agent’s mode without editing prompts.

Examples:

- Patch: critique mode, rewrite mode, QA mode
- Oracle: research mode, compare mode, risk mode
- Echo: emotional read, conflict read, team read
- Drift: timeline mode, scenario mode, pre-mortem mode

Why this matters:

- the current cast is strong, but role control would make them much more usable

### 6. Guided Multi-Agent Patterns

Build reusable orchestration templates.

Suggested templates:

- brainstorm -> critique -> synthesis
- proposal -> challenge -> revise
- strategy -> execution plan -> risk review
- idea jam -> shortlist -> action plan
- postmortem -> lessons -> next steps

Why this matters:

- gives APOC a product loop that ordinary chat apps do not have

### 7. Visible Cost and Budget UI

Token budgets exist, but they are mostly command-line style.

Add:

- per-room token burn
- per-agent session usage
- rate-limit warnings
- “cheap mode” vs “quality mode”

Why this matters:

- helps users trust and control multi-agent usage

### 8. Message-Level Actions

Add actions on messages:

- pin
- send to Scribe
- turn into note
- ask another agent to respond
- quote into room brief
- save to vault

Why this matters:

- chat becomes manipulable workflow material

### 9. Better Search and Retrieval

Current search is simple string search.

Consider:

- filter by room
- filter by agent
- search only notes
- search only decisions
- jump to pinned messages

Why this matters:

- once the app becomes useful, scrollback becomes a liability

### 10. Room Presence and Status Improvements

Current presence is mostly decorative. Make it productively informative.

Suggested additions:

- active speaker indicator
- queued participants in discussion mode
- “thinking” vs “streaming” vs “idle”
- conflict or energy state in group mode

Why this matters:

- strengthens the illusion of a room
- helps users understand the system state

## Specific Feature Suggestions By Agent

### Scribe

- decision log mode
- backlog generation mode
- compare two room sessions
- convert notes into markdown templates

### Patch

- inline rewrite options
- severity-tagged critique
- acceptance-criteria drafting

### Echo

- room temperature indicator
- conflict detection
- unresolved tension summary after debates

### Drift

- pre-mortem mode
- milestone timeline generation
- scenario comparison table

### Oracle

- source-backed research memo mode
- compare alternatives side-by-side
- unknowns and assumptions list

## UX Review

## Suggested UX changes

### Surface commands in UI

Do not force the user to remember `/iterate`, `/freeform`, `/save`, `/vault`, `/notes`.

Add:

- action buttons near the composer
- keyboard-friendly quick actions
- command palette

### Clarify when no agent will respond

Current behavior where unaddressed messages go to chat but trigger no response is valid, but the UI should make that obvious.

Suggested additions:

- composer hint
- system toast
- mention suggestions as you type `@`

### Improve empty states

Each room should explain:

- who is here
- what this room is for
- what commands or actions are most useful here

### Strengthen mobile responsiveness

The desktop feel is good. Mobile likely needs:

- collapsible user list
- pinned composer
- less cramped titlebar controls
- action menu instead of always-visible utility controls

## Epic 0. Wyrdroom Rebrand (APOC → Wyrdroom)

Full rename tracked in `C:\Users\Clyle\OneDrive\Documents\wyrdroom-rebrand.md`. That doc is the source of truth — execute against it, don't re-derive the rename map.

**Scope summary**

- Infrastructure: GitHub repo `GamerDad29/apoc` → `wyrdroom`, local folder `~/Downloads/apoc` → `wyrdroom`, Cloudflare Worker `apoc-proxy` → `wyrdroom-proxy`, new custom domain `wyrdroom.com` on Cloudflare Pages
- Branding: titlebar becomes `ᚹ WYRDROOM`, tagline "where fate gets woven", Mead & Modem color palette, VT323 + Share Tech Mono typography
- Terminology: "room" → "hall" in all user-facing strings only (code identifiers, file names, CSS methodology stay as-is — `ChatRoom.tsx` stays `ChatRoom.tsx`)
- Rooms rename: Main Room → Main Hall, Project Room → War Room, Makers Space → The Forge, Vision Space → The Loom (with Norse-vibe descriptions)
- localStorage keys: `apoc_*` → `wyrd_*` across sidebar width, messages, token budgets, vault key, sound settings. Decision: **no migration** — fresh start, v0, no production users
- System messages: each agent gets a unique Elder Futhark rune flanking their enter/exit notice (map in rebrand doc PART 2)
- Agent system prompts: all 11 agents + `_template.ts` + `profiles.ts` reference "APOC chat room" → "the Wyrdroom"
- Worker CORS: replace `endsWith('.apoc.pages.dev')` with exact-host check for `wyrdroom.com` (coordinate with P0 origin validation work — don't ship loose `endsWith` under the new name)
- Note filenames: `apoc-${slug}...` → `wyrd-${slug}...`
- Scribe vault folder: already writes to `APOC/Scribe Notes/` (per recent commit b09eafc) — rename to `Wyrdroom/Scribe Notes/`

**Deferred / separate track**

- Viking pixel-art sprites (PART 3 of rebrand doc): 48x48 PNGs per agent in `public/avatars/`. Sprite style guide and per-agent descriptions are documented. Production options: AI-generated, commissioned, or keep current colored-letter placeholders. Not blocking the rename.

**Coordination with Codex findings**

- Do the rebrand *after* or *bundled with* the P0 origin validation fix, not before. Shipping the rename with loose `endsWith` CORS would just move the bug to a new hostname.
- The `/save` fake-message fix (P1) should land before or with the rebrand so the new branding doesn't inherit the transcript-integrity hack.
- Worker `/api/models` drift (Codex finding #7) should be resolved as part of the rename since the Worker is being redeployed anyway — kill the hardcoded list, derive from `src/agents`.

**Acceptance criteria** — see PART 6 checklist in the rebrand doc.

## Suggested New Backlog Epics

### Epic 1. Trust and Safety of the Runtime

- worker auth redesign
- origin hardening
- rate limiting and abuse protection
- vault secret handling improvements

### Epic 2. Reliable Multi-Agent Orchestration

- true cancellation
- concurrent streaming state
- discussion queue visualization
- deterministic orchestration templates

### Epic 3. APOC as a Work Product Tool

- structured outputs
- pinned briefs
- session memory
- note/action/decision pipeline

### Epic 4. Discoverability and Room Controls

- visible controls for discussion modes
- command palette
- message actions
- better room onboarding and empty states

## Recommended Next 3 Shipments

### Shipment 1. Stability and Trust

- remove fake proxy secret auth
- strict origin validation
- real cancellation
- truthful connection state

### Shipment 2. Usability Upgrade

- room control panel
- visible quick actions for notes/save/discussion
- mention autocomplete
- message-level actions

### Shipment 3. APOC as a Workflow Tool

- pinned session brief
- structured output modes for Scribe
- decision log and backlog artifact generation
- room memory layers

## Instructions for Claude

When implementing changes, Claude should:

1. preserve the product identity and retro room feel
2. prioritize correctness over adding more hidden behavior
3. replace string-based hacks with explicit state and typed intent
4. extend the existing Vitest suite before and after risky changes
5. update docs when security, deployment, or operator workflow changes

## Short Version

If only a short backlog is needed, use this:

### Must fix

- Remove frontend `VITE_PROXY_SECRET` auth model
- Harden worker origin validation
- Implement true request cancellation for `/stop`
- Fix concurrent streaming state for multi-agent flows
- Make connectivity state truthful

### Must add soon

- Room control panel
- Pinned session brief
- Better Scribe artifact outputs
- Message-level actions
- Token/cost visibility

### Strong feature bets

- orchestration templates
- explicit room memory
- role/mode controls per agent
- vault-aware workflow improvements
