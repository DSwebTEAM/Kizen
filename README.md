# Kizen — AI Research Platform

A power-user AI research and chat platform. Multi-provider, privacy-first, built for developers and builders.

## Features
- **6 AI Providers** — Groq, OpenRouter, Together AI, Fireworks AI, Anthropic, OpenAI (BYOK)
- **Cross-chat memory** — Kizen remembers facts about you across conversations
- **Smart model routing** — Vision, code, document tasks auto-route to the right model
- **Web search** — Optional Serper integration with inline citations
- **Diagnostics dashboard** — API health, usage, token tracking, cost estimates
- **Incognito mode** — Zero writes, session vanishes on close
- **Economy / Balanced / Max** spending modes
- **File & image uploads** — PDF, TXT, MD, JSON, CSV, images (base64)
- **Streaming responses** — Real-time token streaming
- **All data local** — Nothing leaves your browser

## Setup

### Local development
```bash
npm install
npm run dev
```

### Deploy to Cloudflare Pages
1. Push this repo to GitHub
2. Connect to Cloudflare Pages
3. Build command: `npm install && npm run build`
4. Output directory: `dist`
5. Done — no environment variables needed (all keys are BYOK in the browser)

## Tech stack
- React 18 + Vite
- Tailwind CSS
- React Router v6
- marked (markdown)
- Fonts: Syne (display) + DM Sans + JetBrains Mono

## Project structure
```
src/
  core/
    StorageManager.js   — Platform controller (all localStorage access)
    ModelRouter.js      — Provider configs, intent detection, API calls, streaming
  pages/
    Landing.jsx         — Marketing landing page
    Onboarding.jsx      — API key setup (2-step)
    Home.jsx            — New chat screen
    ChatPage.jsx        — Active conversation with streaming
    SettingsPage.jsx    — Full control panel (7 sections)
    AnalysisPage.jsx    — Diagnostics dashboard
  components/
    layout/AppShell.jsx — Sidebar + conversation history
    chat/ChatInput.jsx  — Input with file chips + model switcher
    chat/MessageBubble.jsx — Markdown + code blocks + attachment cards
  assets/icons/Icons.jsx — SVG icon library (no emojis)
```

## Built by DSwebTEAM
Also check out [Hibiki](https://hibiki-beta.netlify.app) — the AI character companion platform.
