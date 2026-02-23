# Dominic Portfolio — Overview (Source of Truth)

## What this is

This repo is a **single-page, production-grade portfolio** built to do one job:

> Prove that Dominic Milburn can build real distributed systems — without relying on a resume, degree, or generic claims.

This is not a template. This is an engineered artifact.

It demonstrates:
- **Senior-level execution** (Architecture, TypeScript, Performance)
- **Product ownership** (Full-stack systems, not just components)
- **Real-world automation** (Chrome Extensions, WebSockets, Job Orchestration)

---

## Why it exists

I have spent years building real projects, but my primary work — the **Resell Tool** — is a **PRIVATE** codebase.

I need a public-facing proof of competence that:
- Showcases the **architecture** of my private work
- Proves I understand **distributed systems** and **security**
- Is deployable instantly with **zero secrets**
- Is impressive to senior engineers and founders

---

## The Showcase: "Resell Tool" (Private Beta)

The core credibility piece is the **Resell Tool**: a full-stack marketplace automation platform.

- **Status**: Live Deployment (Private Beta)
- **Architecture**: Split "Control Plane" (SPA/Backend) and "Execution Plane" (Chrome Extension).
- **Core Feat**: "Mirror Mode" — Real-time job orchestration between a backend and a browser extension via WebSockets.
- **Tech**: React, Node.js, Supabase, WebSockets, Chrome Extension (MV3).

**CONSTRAINT:** The Resell Tool codebase is strictly **PRIVATE**.
- We do NOT link to its repo.
- We do NOT expose internal code.
- We DO show architecture diagrams, workflows, and metrics.
- Internal Context: `docs/ResellOverview.md` serves as the private reference for this project, but its low-level details are NOT to be committed to the public `src`.

---

## Success Criteria

This project is successful if a reviewer thinks:
> "This person understands how to build stable, scalable automation systems."

It fails if:
- It looks like a "bootcamp portfolio"
- It has performance issues (Lighthouse < 95)
- It lacks technical depth (no architecture diagrams)

---

## Core Mandates

1.  **Zero Secrets**: No API keys, no env vars required for the portfolio itself.
2.  **Data-Driven**: Content is separated from UI (`src/content/portfolio.ts`).
3.  **Strict Quality**: TypeScript strict mode, ESLint, Prettier, Husky.
4.  **Performance**: 95+ Lighthouse scores. Mobile-first.

---

## Identity & Assets

- **Name**: Dominic Milburn
- **Role**: Founder / Full-Stack Engineer
- **Specialty**: Automation Systems & AI Agents
- **Location**: Missouri, USA
- **Education**: Self-taught (Pride point: Built by obsession and shipping).

**Available Assets:**
- Headshot: `src/assets/Dom.png`
- Logo: `src/assets/TAlogo.jpg`
- Banner: `src/assets/TABanner.jpeg`
