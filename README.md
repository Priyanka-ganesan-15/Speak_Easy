# Speak Easy

Speak Easy is a public speaking trainer web app.

This repository is currently in a **UI-first phase**:
- complete front-end experience and flow
- mock data and interactions
- no Supabase/auth backend wiring yet
- no AI/ML processing pipeline yet

## Current UI Scope

- Landing page explaining public speaking value and product journey
- Sign-in page with provider options (Google, Apple, email, magic link) as UI placeholders
- Dashboard with progress cards, session history, and trend views
- Practice page with:
  - topic wheel over a 1000-topic mock library
  - prep timer options: 1, 3, 5, 10 minutes
  - speech timer options: 1, 3, 5, 10 minutes

## Routes

- `/` landing page
- `/signin` sign-in UI
- `/dashboard` user dashboard UI
- `/practice` topic wheel + timer workflow UI

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality Checks

```bash
npm run lint
npm run build
```

## Next Phases

1. Supabase backend integration
	- real auth with Google, Apple, email/password, magic link
	- persisted users/sessions/topics
2. AI/ML and data layer
	- speech-to-text pipeline
	- scoring and coaching feedback
	- analytics persistence for pace, volume, pronunciation trends

