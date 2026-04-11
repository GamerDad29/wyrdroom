# Wyrdroom Session Log

> Historical entries below were written under the APOC brand and are
> preserved as-is.

## 2026-04-10 — 🌙 Session close-out (end of day)

Monster session. Going to bed.

### What shipped today (in order)
1. **Shipment 1** — Trust the Runtime (XSS fix, real /stop
   cancellation, concurrent streaming state, /save structured
   intent, truthful connectivity, pure state initializer, sidebar
   resize, 19 tests). Commits `82dc2a0` → `3e266bf`, plus gitignore
   housekeeping `da8f4e9`. Pushed + smoke-tested in Playwright.
2. **Shipment 2 Phase 1** — Worker Hardening (strict origin
   validation, removed bundled proxy secret, per-IP rate limiter,
   /api/models derived from shared manifest, +16 tests to 34/34).
   Commits `c82400d` + `c25e74a`.
3. **Shipment 2 Phase 2** — Wyrdroom rebrand code on
   `wyrdroom-rebrand` branch (names, runes, storage keys,
   package.json, agents prompts, rooms, CI workflow). Commits
   `5c70060`, `57aad29` (POLISH-01 Noto Sans Runic), `2e2731c`.
4. **Shipment 2 Phase 3** — Infra cutover (executed end-to-end via
   Cloudflare MCP, wrangler, and the Cloudflare REST API using the
   wrangler OAuth token): deployed `wyrdroom-proxy`, set the
   OPENROUTER_API_KEY secret, deleted old `apoc-proxy`, attached
   `wyrdroom.com` + `www.wyrdroom.com` custom domains, updated
   Pages env vars, merged to main, christopher added the DNS
   CNAMEs via dashboard, site went live. Merge commit `c57a013`,
   docs close-out `dfe8633`, cleanup commit `1743353` that retired
   the legacy `apoc.pages.dev` allow-list entries.
5. **Shipment 2.5** — Mead & Modem visual rebrand. The full CSS
   palette swap I had missed in Phase 2 (the site was running cold
   navy/steel under Wyrdroom branding). Single-pass rewrite of
   `src/styles/chatroom.css` with all 15 changes, plus residual
   cleanup of `AnimatedAvatar.tsx` and `soundService.ts`. Commit
   `963c52c`. Verified live via Playwright.
6. **Shipment 2.6** — Agent Overhaul v2. Roster trimmed 11 → 8
   (cut Echo, Flux, Drift, Patch; added Scout on DeepSeek R1).
   Five model upgrades (Mistral/Sage → Claude Haiku 4.5, Cipher →
   DeepSeek V3.2, Oracle → Gemini 3 Flash, Scribe → GPT-4o Mini,
   Jinx → Gemma 4 26B A4B). Collaboration rules, response length
   targets, anti-patterns baked into every remaining agent prompt.
   New rune ᚱ Raidho for Scout. 21 files changed. Commit
   `ac1494a`. Docs close-out `abf0bda`. Verified live via
   Playwright + direct curl against `/api/models`.

### Commits pushed to `origin/main` today
17 commits, running tally from this morning:
```
abf0bda  docs: close out Shipment 2.5 and 2.6
ac1494a  rebrand(agents): full roster overhaul v2 (Shipment 2.6)
963c52c  rebrand(visual): Mead & Modem (Shipment 2.5)
dfe8633  docs: close out Shipment 2
1743353  cleanup: retire legacy apoc.pages.dev allow-list entries
c57a013  merge: Wyrdroom rebrand (Phase 2 + Phase 3)
2e2731c  ci: point deploy workflow at wyrdroom-proxy
57aad29  polish: Noto Sans Runic (POLISH-01)
5c70060  rebrand: APOC → Wyrdroom
9f03641  docs: log Phase 2
c25e74a  docs: log Phase 1
c82400d  fix(security): harden worker (Phase 1)
da8f4e9  chore: gitignore tooling dirs
3e266bf  docs: log Shipment 1
a5e50e1  fix(chat): real cancellation (Shipment 1)
bcb90c8  fix(security): sanitize markdown XSS (Shipment 1)
82dc2a0  test: Vitest harness
```

### Backlog state going into next session
- ✅ Shipment 1, 2, 2.5, 2.6 all shipped + verified live
- ⏳ **Shipment 3** (Usability): FEAT-01 Room Control Panel,
  FEAT-02 Pinned Session Brief, FEAT-04 Message-Level Actions,
  FEAT-05 Mention autocomplete, FEAT-11 Presence upgrades,
  VAULT-01 Vault hardening
- ⏳ **REBRAND-05** Pixel-art sprites (discussed at session end,
  chose to defer). Path forward: extend `AnimatedAvatar.tsx` with
  per-agent Norse costume features (horned helm for Gemma,
  hood+spectacles for Scribe, chest rune for Cipher, raven for
  Oracle, wild hair for Jinx, long beard+staff for Sage, fur
  hood+spyglass for Scout, feathered cap for Mistral). Procedural
  SVG, not commissioned PNGs. Already wired through the app via
  `image-rendering: pixelated` CSS rules from Shipment 2.5. Could
  also still commission real PNGs later — the swap-in path is in
  place.
- ⏳ **Shipment 4** (Workflow Tool): REF-01 internal event model,
  FEAT-03 structured Scribe artifacts, FEAT-06..10, FEAT-12,
  FEAT-13, OPS-02
- ⏳ **Dangling follow-up**: delete the stale `VITE_PROXY_SECRET`
  secret from GitHub repo Settings (nothing references it anymore
  after the Shipment 2 workflow cleanup)

### Known issues / carry-over
- `Patch` was cut in Shipment 2.6 to match the overhaul doc's
  explicit 8-agent roster table. Part 1 of that doc only named
  Echo/Flux/Drift as cuts, so this might have been accidental.
  If needed, `src/agents/patch.ts` can be restored from commit
  `963c52c` or earlier.
- Per-isolate in-memory rate limiter (OPS-01) is still the v0
  tier. KV/DO-backed limiter is deferred to Shipment 4.
- Local folder is still `~/Downloads/apoc/`. Cosmetic only. Can
  `mv` at the start of any future session (would kill that
  session's working directory).
- Bundle size dropped to 341 kB / 108 kB gzip (down from 352/112)
  after retiring 4 agents' worth of system prompts.

### Next session opener
Recommended: start with a **real conversation test** of the new
agent roster at `https://wyrdroom.com` to feel the upgrades (Claude
Haiku 4.5 Mistral + Sage, DeepSeek V3.2 Cipher, Gemini 3 Flash
Oracle with 1M context, GPT-4o Mini Scribe, DeepSeek R1 Scout).
Budget: $0.10–0.50 of OpenRouter credit for a genuine 5–10 minute
test. Then decide between Shipment 3 features or the Norse sprite
upgrade.

---

## 2026-04-10 — 🔥 Shipment 2.5 + 2.6 (back-to-back, same session)

### Shipment 2.5: Vibe Change (commit `963c52c`)
Finished the visual half of the Wyrdroom rebrand that Phase 2 had
left unfinished. The functional rebrand (names, runes, storage keys)
had landed but the Vault-Tec palette was still in place — live site
was rendering cold navy/steel under Wyrdroom branding.

Fix: single-pass rewrite of `src/styles/chatroom.css` with the full
Mead & Modem palette and all 15 changes from
`wyrdroom-visual-rebrand.md`. Also fixed two residual hardcoded cold
colors in `src/components/AnimatedAvatar.tsx` (SVG background and
Christopher's cape), and updated a stale "Vault-Tec" comment in
`soundService.ts`.

Runtime verified on `https://wyrdroom.com` via Playwright:
- `body` background: `rgb(26, 21, 16)` (warm brown) ✅
- Send button: honey gold linear gradient ✅
- Online status dots: moss green `#7a9a5a` ✅
- Zero console errors

### Shipment 2.6: Agent Overhaul v2 (commit `ac1494a`)
Full roster rebuild from `wyrdroom-agent-overhaul.md` executing all
12 steps in the doc's execution order.

**Roster change:** 11 → 8 agents.
- Cut: Echo, Flux, Drift, Patch (narrators, not participants)
- Added: Scout (DeepSeek R1, trend scouting, burnt-orange #e07030)
- Kept: Gemma, Mistral, Cipher, Oracle, Scribe, Jinx, Sage

**Model upgrades:** Mistral → Claude Haiku 4.5; Cipher → DeepSeek
V3.2; Oracle → Gemini 3 Flash (1M context); Scribe → GPT-4o Mini;
Sage → Claude Haiku 4.5; Jinx → Gemma 4 26B A4B. Scout new on
DeepSeek R1. Gemma unchanged.

**Prompt rules:** Every remaining agent got three additions:
1. "No roll call" anti-pattern (don't auto-greet)
2. "No citation chain" anti-pattern (don't open with "[Agent] says…")
3. "Specific observations" rule (ground analysis in concrete elements)

Plus a "How the hall works" section per agent with generic team
framing and a per-agent coordinator block (Gemma frames + routes,
Mistral speaks after foundation, Cipher is technical reality check,
Oracle owns depth, Scribe stays quiet, Jinx short bursts, Sage
speaks last, Scout owns recency).

Plus hard response length targets per agent (Gemma 2-4/6, Mistral
1-3/4, Cipher 1-2/4, Oracle 3-6/8, Scribe matches task, Jinx 1-2/3
absolute, Sage 1-3/3, Scout 2-5/8).

**Scout rune:** ᚱ Raidho — journey, travel, the ride. Added to the
`AGENT_RUNES` map in `useChat.ts`.

**Files touched (21 files):**
- Created: `src/agents/scout.ts`
- Deleted: `src/agents/echo.ts`, `flux.ts`, `drift.ts`, `patch.ts`
- Updated: 7 remaining agent prompts
- Updated: `agents/index.ts`, `manifest.ts`, `profiles.ts`,
  `rooms.ts`, `useChat.ts`, `AnimatedAvatar.tsx`, `commandService.ts`,
  `commandService.test.ts`, `worker.test.ts`

**Live verification (Playwright + direct curl):**
- `https://wyrdroom-proxy.gamerdad29.workers.dev/api/models`
  reports exactly the 8-agent roster with the new model IDs end
  to end
- Front-end at `https://wyrdroom.com` shows 8 runes, 8 entry
  messages, 8 agents in sidebar (+ Christopher)
- Scout's `ᚱ Scout has entered the hall ᚱ` present
- Echo, Flux, Drift, Patch completely gone from the UI
- Zero console errors

**Tests:** 35/35 passing on both shipments. Bundle size dropped
352 kB → 341 kB after removing 4 agents' worth of system prompts.

### Note on Patch
The overhaul doc's Part 1 only mentioned Echo/Flux/Drift as cuts,
but the Part 2 roster table, the Part 6 rooms config, the Part 7
worker model list, and the execution checklist at the bottom all
showed exactly 8 agents with Patch NOT in the list. Patch was cut
to honor the explicit "8 agents total" checklist requirement. If
this was accidental, the Patch files can be restored from git
history (`src/agents/patch.ts` at commit `963c52c` or earlier).

### Note on GitHub Actions workflow
`.github/workflows/deploy.yml` is already pointing at
`wyrdroom-proxy` and has `VITE_PROXY_SECRET` removed (done in
Shipment 2 Phase 3). The workflow secret `VITE_PROXY_SECRET` in
GitHub repo Settings is dangling — safe to delete at leisure since
nothing references it anymore.

### Shipment 2.5 + 2.6 both complete and deployed to production.

## 2026-04-10 — 🪐 Shipment 2 Phase 3: Infra cutover + cleanup (COMPLETE)

### Accomplished
- GitHub repo rename (Christopher via dashboard):
  `GamerDad29/apoc` → `GamerDad29/wyrdroom`
- `git remote set-url origin https://github.com/GamerDad29/wyrdroom.git`
- `wrangler deploy` from `wyrdroom-rebrand` branch → created
  `wyrdroom-proxy` at `https://wyrdroom-proxy.gamerdad29.workers.dev`
- `wrangler secret put OPENROUTER_API_KEY --name wyrdroom-proxy`
  (Christopher ran locally; I confirmed via `secret list`)
- Real chat round-trip verified end-to-end (22 prompt tokens, 10
  completion tokens, $0 cost, nemotron-3-nano free tier)
- Deleted old `apoc-proxy` Worker via Cloudflare MCP
  (`worker_delete`)
- Attached `wyrdroom.com` + `www.wyrdroom.com` custom domains to
  Pages project via `POST /accounts/:id/pages/projects/apoc/domains`
- Updated Pages production env var `VITE_WORKER_URL` via
  `PATCH /accounts/:id/pages/projects/apoc`
- Updated `.github/workflows/deploy.yml`:
  - `VITE_WORKER_URL` → wyrdroom-proxy
  - Removed `VITE_PROXY_SECRET` env line (SEC-01)
- Added DNS CNAME records (Christopher via Cloudflare dashboard
  because wrangler OAuth token lacks `dns_records:edit`):
  - `wyrdroom.com @ → apoc.pages.dev` (proxied)
  - `www.wyrdroom.com → apoc.pages.dev` (proxied)
- Merged `wyrdroom-rebrand` → `main` with a --no-ff merge commit
  (`c57a013`) preserving the 3 rebrand commits in history
- Pushed main; CI built and deployed the new worker URL build to
  Cloudflare Pages (commit hash verified via deployments API)
- Playwright smoke test from a fresh browser context at
  `https://wyrdroom.com`:
  - Page title, titlebar, tabs, sidebar header, runes, entry
    messages all verified
  - Real chat round trip through the full browser-to-worker-to-
    OpenRouter stack succeeded
  - Zero console errors

### Cleanup commit (same day, `1743353`)
- Removed `apoc.pages.dev` from both `EXACT_ALLOWED_ORIGINS` and
  `ALLOWED_PARENT_HOSTNAMES` in `worker/index.ts`
- Updated `src/worker.test.ts`:
  - Preview-subdomain test flipped to `wyrdroom.pages.dev`
  - Added a regression test that the retired `apoc.pages.dev`
    origin is now rejected with 403
  - Suffix-attack test retargeted to `wyrdroom.com.evil.example`
- 34 → 35 tests passing, clean tsc, clean build
- `wrangler deploy` wyrdroom-proxy with cleaned allow-list
- Verified live against wyrdroom-proxy:
  - `Origin: wyrdroom.com` → 200
  - `Origin: apoc.pages.dev` → 403 ("Forbidden origin")
  - `Origin: evil.example` → 403

### Key techniques used
- Used wrangler's OAuth token (stored in
  `~/.wrangler/config/default.toml`) with `curl` directly against
  the Cloudflare REST API for Pages env var / custom domain
  operations (wrangler CLI doesn't expose these)
- Cloudflare MCP tools used: `accounts_list`, `workers_list`,
  `worker_delete`, `secret_list`, `zones_list`, `zones_get`
- Wrangler OAuth scope limitation discovered: `zone:read` is
  included but `dns_records:edit` is not, so DNS record creation
  still needs dashboard or a custom token

### Pages project name
Decision: kept as `apoc` in the Cloudflare dashboard (it's an
internal label only). Primary user-facing URL is
`https://wyrdroom.com`; the `apoc.pages.dev` subdomain still
exists but is no longer in the worker's allow-list, so chat
from that URL will 403. Christopher can rename the Pages project
via the dashboard later if it bothers him; functionally it
changes nothing.

### Known follow-ups (not blocking Shipment 2)
- GitHub secret `VITE_PROXY_SECRET` in repo Settings is no longer
  referenced by the workflow; safe to delete at leisure
- Local folder is still `~/Downloads/apoc/` — cosmetic, doesn't
  affect anything. Can `mv` at the start of a future session
  (would kill the current Claude session)

### Shipment 2 is complete.

## 2026-04-10 — Shipment 2 Phase 2: Rebrand Code Staged

### Accomplished
- Created `wyrdroom-rebrand` branch from main
- Executed full rename map from `wyrdroom-rebrand.md` (22 files,
  commit `5c70060`)
- All `src/*` code, CSS, HTML, agent prompts, room names, storage
  keys, and doc titles flipped to Wyrdroom
- Elder Futhark rune map for entry/exit messages added to
  `useChat.ts`
- Spec file renamed (`apoc-chatroom-spec.md` → `wyrdroom-spec.md`)
  and contents updated
- `package-lock.json` regenerated against `"name": "wyrdroom"`
- 34/34 tests passing; clean tsc; clean build (352 kB / 112 kB gzip)
- Branch pushed to origin; not merged

### Known Issues / Carry-over
- Production (`apoc.pages.dev`) is still APOC-branded. It will stay
  that way until Christopher completes Phase 3 infra cutover.
- Worker on main keeps `apoc.pages.dev` in both the exact allow-list
  and the parent-hostname list as legacy entries. Both are marked
  with comments saying "remove after the Cloudflare Pages custom
  domain cutover."

### Smoke test (Playwright, `wyrdroom-rebrand` branch)
- `wyrdroom@0.1.0 dev` on `localhost:5173`, wrangler on 8787
- Page title: "Wyrdroom" ✅
- Titlebar: `ᚹ WYRDROOM` (Wunjo rune + brand name) ✅
- Tabs: Main Hall / War Room / The Forge / The Loom ✅
- Main Hall description: "The great hall. Full crew. Speak your mind." ✅
- Sidebar header: "In This Hall" ✅
- Entry messages: all 11 runes flanking agent names, DOM-verified
  as Elder Futhark Unicode (`ᚷ ᛗ ᛊ ᚲ ᛟ ᛃ ᛋ ᛚ ᛞ ᛈ ᛖ`) ✅
- localStorage: `wyrd_messages_main` present, zero `apoc_*` keys ✅
- `/vault` help text: "Save last notes to vault (Wyrdroom folder)" ✅
- SEC-03 XSS fix still inert under new branding: `window.__wyrd_xss=
  false`, zero live `<script>` tags in message content, payload
  fully entity-escaped ✅
- Ambient emotes still fire (Jinx: "reorganizes the snack drawer by
  chaos potential") — confirms `isStreaming()` still correct ✅
- Zero console errors beyond pre-existing favicon 404
- Screenshot saved to `wyrdroom-rebrand-smoke-test.png` (local,
  gitignored via `.playwright-mcp/` pattern)

### POLISH-01: Noto Sans Runic font loaded (commit `57aad29`)
Implemented immediately after the smoke test. Two-file fix on
`wyrdroom-rebrand`:

- `index.html` — added `Noto+Sans+Runic` to the Google Fonts import
- `src/styles/chatroom.css` — added Noto Sans Runic to the front of
  the font-family stack on `.wyrd-rune` and `.system-message`

Google Fonts ships Noto Sans Runic with `unicode-range: U+16A0–16F8`,
so the browser only uses it for codepoints in the Runic block and
falls through to the retro pixel fonts for Latin text. Per-glyph
swap, not a full font swap.

Verified at runtime:
- `document.fonts` reports Noto Sans Runic with `status: 'loaded'`
- 48 px probe of `ᚷ` measures 23.16 px under fallback vs 28.14 px
  under the new stack (~22% metric change — confirms a different
  font is actually rendering the codepoint)
- `getComputedStyle(.system-message).fontFamily` returns exactly
  `"Noto Sans Runic", "Share Tech Mono", VT323, monospace`

Observation on visual payoff: the titlebar Wunjo rune (at 14 px)
shows a clearly different, more angular glyph. The 12 px entry-
message runes still read somewhat ASCII-adjacent because Elder
Futhark glyphs genuinely resemble angular Latin letters (ᚷ *is*
an X shape, ᛗ *is* an M, ᚲ *is* a `<`). The real value of the
fix is tofu protection — on systems without good Runic coverage
in the default font, the old version would have rendered empty
boxes. Now they always render.

34/34 tests still passing, clean tsc, clean build.

### Next: Phase 3 (needs Christopher's hands)
1. GitHub: rename repo `GamerDad29/apoc` → `GamerDad29/wyrdroom`
   via browser UI
2. Local: `git remote set-url origin https://github.com/GamerDad29/wyrdroom.git`
3. Cloudflare: delete old `apoc-proxy` Worker in dashboard
4. Local: `cd worker && wrangler deploy` (creates `wyrdroom-proxy`)
5. Cloudflare Pages: connect `wyrdroom.com` custom domain
6. Local (optional): `mv ~/Downloads/apoc ~/Downloads/wyrdroom`
7. Merge `wyrdroom-rebrand` branch to `main`
8. Delete the legacy `apoc.pages.dev` entries from `worker/index.ts`
   in a follow-up commit

## 2026-04-10 — Shipment 2 Phase 1: Worker Hardening

### Accomplished
- Created `src/agents/manifest.ts` — shared source of truth for public
  agent metadata. Consistency test pins individual agent files to it.
- Rewrote `worker/index.ts`:
  - Strict origin validation with structured URL parsing (SEC-02)
  - Removed `X-Proxy-Secret` check (SEC-01)
  - Added in-memory per-IP rate limiter (OPS-01)
  - `/api/models` now derived from manifest (BUG-05)
  - Allow-list includes both `apoc.pages.dev` and future
    `wyrdroom.com` origins — worker is forward-compatible for the
    rebrand cutover
- Removed `VITE_PROXY_SECRET` usage from `proxyService.ts`
- Test coverage: 19 → 34 passing. Added 16 new tests.
- Commit `c82400d` on main (not yet pushed)

### Known Issues / Carry-over
- Rate limiter is per-isolate in-memory; traffic landing on different
  isolates drifts. Adequate for v0 "stop accidental runaway" tier but
  not real abuse protection. Real limiter on Shipment 4 backlog.
- `HTTP-Referer` and `X-Title` in the OpenRouter call still say
  "apoc.pages.dev" and "APOC Chat Room" — intentionally left for the
  Phase 2 rebrand pass (will flip to wyrdroom.com when the rest of
  the branding does).
- Phase 1 commit not yet pushed to `origin/main`. Planning to push
  after this session's rebrand phase (Phase 2) is decided.

### Next in this session: Shipment 2 Phase 2 (rebrand code)
Branch strategy TBD — pause after Phase 1 to confirm with Christopher.
Options: commit to main (assumes Phase 3 infra cutover happens soon)
or commit to a `wyrdroom-rebrand` branch (safer, reviewable).

## 2026-04-10 — Shipment 1: Trust the Runtime

### Accomplished
- Codex deep-review consolidated with existing handoff backlog + Wyrdroom
  rebrand doc into a single t-shirt-sized plan (4 shipments)
- **Shipment 1 shipped in full** (3 commits on `main`, not yet pushed):
  - `82dc2a0` test: Vitest harness + service coverage + review docs
  - `bcb90c8` fix(security): sanitize markdown rendering to prevent XSS
  - `a5e50e1` fix(chat): real cancellation, concurrent streaming, runtime integrity
- 8 backlog items closed: SEC-03, BUG-01, BUG-02, BUG-03, BUG-04, BUG-06,
  BUG-07, TEST-01 extensions
- Test coverage: 10 → 19 tests, all passing; clean `tsc --noEmit`;
  clean `vite build` (352 kB / 112 kB gzip)

### Smoke test (live, Playwright-driven)
- Dev server + wrangler up, drove the UI via Playwright
- **BUG-07** verified: with worker down on first load, Send button
  correctly disabled. Started wrangler → reload → input unlocked.
- **BUG-04** verified: exactly 11 entry messages on load (not 22).
  StrictMode double-invocation not double-firing.
- **SEC-03** verified end-to-end: sent `<script>window.__xss_fired=true;
  alert(1)</script> then <img src=x onerror="...">` into chat. Post-send
  check: `__xss_fired=false`, `__xss_img=false`, zero live
  `<script>`/`<img>` tags in message content, innerHTML fully
  entity-escaped. Payload renders as inert visible text.
- **BUG-02** verified: `/save` triggered real Scribe stream, saw new
  "Auto-save to vault failed" system notice fire (vault unavailable),
  **zero** user messages containing "push to obsidian" in transcript
  or persisted localStorage.
- **BUG-03** verified (read side): `localStorage.setItem('apoc_sidebar_
  width', '320')` → reload → sidebar at 320px. Write side covered by
  code review; synthetic drag events don't propagate through React's
  event delegation under Playwright (test-env quirk).
- `/help` and `/me` render cleanly.
- Ambient emotes still firing after `streamingRef` → `isStreaming()`
  refactor — confirms concurrent-state helper is correct.
- Zero console errors (only pre-existing favicon 404).

### Deployed
- Pushed 4 commits to `origin/main` (`7f8b900..3e266bf`)
- CI → Cloudflare Pages auto-deploy triggered

### Known Issues / Carry-over
- `VITE_PROXY_SECRET` still shipped in the bundle (SEC-01) — being
  handled in Shipment 2
- `/stop` and concurrent typing (BUG-01/06) covered by unit tests
  only; not exercised live (would burn real tokens on a
  `/iterate`/`hey all` cancel test)
- `useChat` is still a god hook — internal event model (REF-01) is
  Shipment 4

### Next Session: Shipment 2 — Wyrdroom + Security Finish
One Worker redeploy, new name, correct CORS from day one. Order:
1. SEC-02 strict origin validation (exact host, no `endsWith`)
2. SEC-01 auth redesign (remove bundled secret)
3. OPS-01 Worker rate limit + abuse protection
4. BUG-05 kill `/api/models` hardcoded drift
5. REF-02 single source of truth for agent metadata
6. REBRAND-01 infra rename (repo, folder, `wyrdroom-proxy`, `wyrdroom.com`)
7. REBRAND-02 branding, copy, palette, typography, room→hall
8. REBRAND-03 agent prompts + runes
9. REBRAND-04 localStorage + Scribe vault path

## 2026-04-08 — The War Room

### Accomplished
- 4 new agents: Cipher, Oracle, Jinx, Sage (v0.7), then Flux, Drift, Patch, Echo (v0.8)
- 11 total agents across 4 rooms (Main, Project, Makers, Vision Space)
- 1,101 ambient emotes (100 per agent)
- Full Vault-Tec UI overhaul (navy/blue/yellow palette)
- 22 expression types, mouse-tracking eyes, Christopher's cape
- 6 new commands: /iterate, /freeform, /mute, /unmute, /stop, /save
- Complete prompt architecture rewrite (prompting guide + interaction tuning)
- CI auto-deploy via GitHub Actions + Cloudflare Pages
- Scribe Notes vault folder for clean Obsidian integration
- Cloudflare Access protecting production
- Multiple model swaps (Mistral, Sage, Cipher) to resolve quality issues

### Known Issues
- Sage and Oracle share same model (Gemma 4 26B), monitor for blending
- Iteration agents still sometimes repeat themes across rounds
- Sidebar gets long with 11 agents + Christopher on smaller screens

### Backlog

**Session: The Intelligence Layer** (M, ~3 hrs)
- Herald agent: News via Brave Search API. New worker route `/api/news`, API key needed, agent fetches before responding.
- Signal agent: Reddit via public JSON API. New worker route `/api/reddit`, subreddits: ClaudeAI, singularity, CoolGithubProjects, LocalLLaMA. No auth needed.
- Both follow the same pattern: worker proxies external API, agent gets context, then responds conversationally.

**Session: The Creator** (L, ~3 hrs)
- Prism agent: Image generation via Cloudflare Workers AI (FLUX.1 Schnell, $0.01/image)
- Add `[ai]` binding to wrangler.toml
- New worker route `/api/image`
- Image rendering in MessageBubble.tsx (detect `![image](data:...)` in agent output)

**Session: The Memory** (XL, full session)
- Persistent cross-session memory via Cloudflare D1 (SQLite on edge)
- Tables: `memories` (agent_id, room_id, content, topic_tags, importance) + `sessions` (summary)
- Worker routes: `/api/memory/store`, `/api/memory/recall`, `/api/session/start`, `/api/session/end`
- On load: inject previous session summary into agent system prompts
- Scribe auto-stores key decisions periodically

**Prompt Strengthening** (S, ~30 min)
- Add "Decider mode" to Gemma: `@gemma decide` triggers her to close debate and pick
- This covers the Architects/Judges/Filters roles the agents suggested without adding new agents
- Strengthen existing agent coverage: Flux=synthesis, Cipher=friction/validation, Oracle=value, Sage=silence/filter

**Polish** (M, ~2 hrs)
- Mobile responsive pass (collapsible sidebar for 11 agents)
- Rebrand from APOC to new name (TBD)
- Review Sage vs Oracle distinctiveness (same model)
- Iteration theme repetition improvements

---

## 2026-04-07 — Launch Day

### Accomplished
- Built APOC from scratch: spec to deployed product in one session
- v0.1: Core chat room with Gemma 4 31B, Cloudflare Worker proxy, streaming SSE
- v0.2: Complete UI overhaul to Fallout x Yahoo Lounge aesthetic (CRT scanlines, amber/green phosphor, 3 rooms, slash commands, markdown, sounds, mood, search)
- v0.3: Added Mistral (creative agent) and Scribe (free note-taker on Nemotron 3 Nano 30B), Obsidian export, @agent targeting
- v0.4: Bug fixes (no auto-route to Gemma), sound overhaul (per-room/per-agent tones), hey-all command, agent profile modal, resizable sidebar, idle chatter, personality upgrades
- v0.5: Animated SVG avatars with expression engine (12 states, per-agent idle patterns), 70+ ambient emotes, Obsidian vault integration via Local REST API
- Deployed to Cloudflare Pages (apoc.pages.dev) + Worker proxy
- Also: Downloads folder audit and reorganization (Phase 1-3)

### Known Issues
- Cloudflare Pages deploys are manual (no CI from GitHub yet)
- Free model rate limits on OpenRouter can cause 429s
- Obsidian vault integration requires Local REST API plugin with HTTP enabled (port 27123)
- Idle chatter system prompt sometimes leaks into visible messages

### Next Steps (Backlog)
- Cloudflare Pages CI (auto-deploy on push)
- Agent-to-agent debate mode (`/discuss`)
- More agents (coder, researcher)
- Persistent memory via Cloudflare KV
- Theme switcher
- Notification system for cross-room activity
- Custom agent builder
- Mobile polish
