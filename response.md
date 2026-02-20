✅ MASTER ANSWERS — Dominic Portfolio Build (ALL 60 QUESTIONS)
CATEGORY 1: THE SHOWCASE (RESELL TOOL)
1) What is being resold?

Primarily online marketplace items — the system is designed for crosslisting + inventory automation across platforms like:

Poshmark

Depop

Mercari

(and eBay via OAuth integration)

It’s not limited to one item category — it supports the workflow for any reselling inventory, but the real use case is:

clothing (especially vintage)

electronics

general consumer goods

2) What is the "one-liner" value prop?

“A full-stack marketplace automation platform that uses a Chrome extension + real-time job orchestration to crosslist, scan inventory, and manage listings across multiple resale marketplaces.”

3) What is the specific tech stack?

Frontend: React + TypeScript + Vite

Backend: Node.js + Express

Database + Auth + Storage: Supabase

Realtime: WebSockets (custom WS server + Mirror Mode WS path)

Extension: Chrome Extension (Manifest V3) built with Vite + crxjs

4) How do you handle "Private Beta" access on a public portfolio?

The Resell Tool codebase will never be public.

Portfolio should show:

System Architecture diagram

Screenshots

Video demo

Feature list

Technical breakdown

Optional: “Request access” (manual, not automated)

No repo links.

5) Most impressive technical hurdle solved?

Mirror Mode orchestration:

A dedicated authenticated WebSocket channel (/api/mirror)

Extension and SPA coordinate jobs in real-time

Ownership locks based on browserId + installId

Job state stored in DB (marketplace_sync_jobs)

Heartbeat enforcement + reconnect logic

This is “distributed system thinking” inside a browser automation product.

6) Does the Extension have a name?

Not currently. In the portfolio it should be branded as:

“Resell Tool Automation Extension”
(or)
“Mirror Mode Extension”

7) Chromium-based or Firefox?

Chromium-based (Chrome / Brave / Edge).
Manifest V3.

8) Dashboard? Top 3 metrics?

Yes — dashboard exists in the SPA.

The 3 most important “portfolio worthy” metrics are:

Listings processed (this week/month)

Sync jobs completed vs failed

Sales events recorded / delist automation events

9) Live status?

Live + deployed.
Not public SaaS scale, but actively deployed and functioning.

Revenue status: not a public claim.
Portfolio phrasing should be:

“Live deployment. Active private beta.”

10) Can we include a System Architecture Diagram?

YES — REQUIRED.
Senior engineers expect this.

CATEGORY 2: IDENTITY & “TAILORED APPROACH”
11) Who is Dominic? Last name?

Dominic Milburn.
Yes, include full name.

12) Tailored Approach = company, LLC, or brand?

Tailored Approach LLC.
It is a real business entity.

13) Official title?

Use:

Founder / Full-Stack Engineer
Secondary tagline:
Automation Engineer (AI + Systems)

Do NOT label as “Senior Software Engineer” officially, but the portfolio must be senior-level execution.

14) Why “No Degree”?

Lean into it as pride.

Position it as:

“Self-taught engineer. Built production systems by obsession, documentation, and shipping.”

15) Mission statement (one sentence)

“Build automation systems that eliminate human bottlenecks and turn chaotic operations into scalable workflows.”

16) 3 words that describe coding style

Systematic. Documented. Surgical.

17) Location?

Missouri, USA
(also acceptable: Kansas City metro)

18) CTA

Simple and direct:

“Work with me / Contact me”

It should include:

Cell phone number

Email

LinkedIn

Facebook

No other CTA.

19) LinkedIn URL

https://www.linkedin.com/in/dominicmilburn/

20) Twitter/X?

Not used. Replace with Facebook:

https://www.facebook.com/dominic.milburn.2025

CATEGORY 3: TECHNICAL ARCHITECTURE & STACK
21) CSS choice

Tailwind CSS.

Reason:

fast

modern

clean

high-quality UI without fighting CSS

22) State management (Zustand?)

No.
Single page portfolio = keep it lean.

Use:

React state

small useMemo

no global store unless needed

23) Testing

Yes: Vitest
But minimal tests:

content model validation

utilities

rendering smoke tests

24) Linting / Prettier / Husky

YES.

Install immediately:

ESLint

Prettier

Husky

lint-staged

25) TS strictness

YES.

Enable:

"strict": true

"noImplicitAny": true

"exactOptionalPropertyTypes": true

"noUncheckedIndexedAccess": true

This portfolio is supposed to be OCD.

26) Icon library

Lucide React

27) Animations

Framer Motion

Rules:

subtle

intentional

no gimmicks

disable under prefers-reduced-motion

28) Asset optimization

No imagem-in plugin for now.

We will:

compress assets manually

use modern formats where possible

keep page light

29) Component pattern

Feature-based folders, not Atomic.

Portfolio must be readable by reviewers quickly.

30) Utils folder?

Yes.

Include:

utils/cn.ts (clsx + tailwind-merge)

utils/format.ts

utils/links.ts

utils/motion.ts (shared motion presets)

CATEGORY 4: UI / UX SPECIFICS
31) The glow

Both:

background gradient glow

subtle border glow on cards

32) Typography

Pick one:

Geist
(Geist Sans + Geist Mono)

33) Background color

Zinc / Slate black
Use: #09090b

34) Accent color (hex)

Electric blue:

#3B82F6
(optional highlight: #60A5FA)

35) Mobile nav

No hamburger.

Single page = simple stacked nav:

“Top”

“Resell Tool”

“Skills”

“About”

“Contact”

36) Scrolled header state

Yes:

blur

glass effect

border-bottom subtle

37) Reduced motion behavior

If prefers-reduced-motion:

remove all entrance animations

disable glow pulsing

keep layout stable

38) Skeleton screens

No.
Page must load instantly.

39) Contrast ratio

Strictly WCAG AA.
AAA is optional but not required.

40) Favicon

Use Tailored Approach logo for now.

Fallback:

minimalist “D” favicon if needed.

CATEGORY 5: CONTENT MODEL & PROOF
41) Skills categories

Use these categories:

Frontend

Backend

Automation

Databases

Deployment

AI / Agents

Browser Extensions

Realtime Systems

42) Automation meaning

Automation includes:

custom scripts

webhooks

cron-like workflows

browser automation via extension

system-level orchestration (jobs + WS)

Not “Zapier-only.”

43) AI/Agents experience

Must include these keywords:

OpenAI API

Gemini CLI

Claude CLI / MOLT style tools

Local LLMs (Qwen 2.5, Ollama)

OpenWebUI

LiveKit (voice agent architecture)

HummingbirdXT (local experimentation)

Multi-agent orchestration (“Council” style runtime)

44) Proof item 1

Name it:

Resell Tool — Marketplace Automation Platform

45) Proof item 2 (years of experience)

Answer:

~2+ years building full-stack systems seriously
(plus earlier business / automation work)

46) Timeline list?

Yes — minimal.

Example:

2023: self-taught coding + first automation systems

2024: built Resell Tool foundation + Supabase backend

2025: deployed live, extension + Mirror Mode

2026: portfolio + next products

47) Bio paragraph 1 (technical depth)

Focus:

real-time systems

extension + backend + auth

encryption

job orchestration

48) Bio paragraph 2 (founder mindset)

Focus:

shipping

product obsession

systems that replace labor

automation-first thinking

49) Project highlights (3 bullets)

Use these:

Chrome Extension + SPA bridge with real-time orchestration (“Mirror Mode”)

Supabase-backed multi-tenant system with encrypted credential storage

Deployed production stack (Vercel + Render + Supabase) with live automation workflows

Avoid fake metrics like “99.9% uptime” unless measured.

50) Contact line

Use:

“Open to freelance, consulting, partnerships, and serious engineering roles — especially where automation and product ownership matter.”

CATEGORY 6: DEPLOYMENT & METRICS
51) Domain path

We will use:

dominic.tailoredapproach.us/portfolio

But note:

This is actually easiest as either:

portfolio.tailoredapproach.us

or dominic.tailoredapproach.us (root)

Path-based hosting is harder on Vercel.

So final decision:

Preferred: dominic.tailoredapproach.us (root portfolio)

Acceptable: tailoredapproach.us/portfolio (harder)

Requested by user: dominic.tailoredapproach.us/portfolio

Agent should implement the easiest Vercel-safe solution and then we route DNS accordingly.

52) Lighthouse goals

Goal: 95+

If 94:

fix it

do not ship

53) Analytics

Vercel Analytics only.

No PostHog.

54) SEO keywords / meta description

Meta description should be something like:

“Dominic Milburn — self-taught full-stack engineer and founder. I build real-time automation systems, Chrome extensions, and AI-driven workflows.”

55) OG image

Yes.

Use:

Tailored Approach banner

or Dominic headshot + text overlay

56) Robots.txt

YES — allow indexing.

57) Security headers / CSP

Yes.

Add vercel.json headers:

X-Content-Type-Options

X-Frame-Options

Referrer-Policy

Permissions-Policy

Strict-Transport-Security

CSP can be moderate, not overly strict (since this is static).

58) Error logging

No Sentry.

Overkill for a static portfolio.

59) Maintenance frequency

Monthly updates (or when a major project ships).

60) Contact form without secrets

We will NOT host SMTP credentials on frontend.

Options:

No contact form (preferred)

Use mailto link

Or use a no-secret form handler like:

Formspree

Getform

Netlify Forms

Since you already use ZohoSMTP in business:

If we do a form, it must go through a backend service.

But portfolio requirement says: deployable with no secrets
So: No SMTP in this repo.

IMPORTANT BUILD RULES / CONSTRAINTS
Repo privacy

Resell Tool codebase: private forever

Portfolio codebase: public GitHub

Assets now available

These files are present and should be used:

src/assets/TABanner.jpeg

src/assets/TAlogo.jpg

src/assets/Dom.png

Use Dom.png as hero headshot.

CTA requirements

Contact section must include ONLY:

Phone

Email

LinkedIn

Facebook

No Twitter, no Discord, no Instagram.

FINAL NOTE TO THE AGENT

The portfolio is a single page, but it must feel like:

a senior engineer wrote it

a founder owns it

and it’s the front door to a serious product company

No fluff. No “cute.” No generic template vibes.