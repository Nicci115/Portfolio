# Requirements (Hard Constraints)

This document defines the hard rules of the portfolio.
If something conflicts with this doc, the feature loses.

---

## 1) Product Requirements

### Must be:
- **Single Page Application** (No routing complexity).
- **Data-Driven**: All text/images driven by `src/content/portfolio.ts`.
- **"Senior" Aesthetic**: Dark mode (#09090b), technical, clean, "Tailored Approach" branding.

### Must include sections:
1.  **Hero**: Identity, Mission, Links.
2.  **Featured Project (Resell Tool)**: The star show. Architecture diagrams, tech stack, "Mirror Mode" explanation.
3.  **Skills**: Categorized (Frontend, Backend, Automation, AI/Agents).
4.  **Credibility**: "Self-taught," "Live Deployment," "Real Business."
5.  **Contact**: Cell, Email, LinkedIn, Facebook.

---

## 2) Engineering Requirements

### Tech Stack:
- **Framework**: React + Vite
- **Language**: TypeScript (Strict Mode enabled)
- **Styling**: Tailwind CSS (for velocity and modern standards)
- **Icons**: Lucide React
- **Animations**: Framer Motion (Subtle, strictly optional)
- **Testing**: Vitest (Unit tests for utilities and content integrity)

### Quality Control:
- **Linting**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged (Prevent bad commits)
- **Strict TS**: `noImplicitAny`, `strict: true`

---

## 3) Performance Requirements

### Targets (Mobile & Desktop):
- **Performance**: 95+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 95+

### Constraints:
- **Zero CLS** (Cumulative Layout Shift).
- **No Heavy Bundles**: Lazy load heavy assets if any.
- **Font Optimization**: Use `Geist` (or optimized web font).

---

## 4) Accessibility Requirements

- **WCAG AA** Compliant.
- **Reduced Motion**: Respect `prefers-reduced-motion` (disable flows/animations).
- **Semantic HTML**: Proper `<section>`, `<h1>`-`<h6>`, `<main>` tags.
- **Keyboard Nav**: Visible focus states (Blue/Glow).

---

## 5) Security & Privacy Requirements

- **NO SECRETS**: The repo must be public. No `.env` required to build.
- **No Backend for Portfolio**: Pure static site.
- **Contact Info**:
  - **Cell Phone**: REQUIRED (Must use placeholder `__REPLACE_WITH_PUBLIC_PHONE__` until pre-deploy check).
  - **Email**: REQUIRED (Must use placeholder `__REPLACE_WITH_PUBLIC_EMAIL__` until pre-deploy check).
  - **Socials**: Public URLs allowed.
- **CSP**: Content Security Policy headers via `vercel.json`.

---

## 6) Deployment Requirements

- **Host**: Vercel.
- **Domain**: `dominic.tailoredapproach.us` (Preferred Root) OR `tailoredapproach.us/portfolio`.
- **CI/CD**: Auto-deploy on push to `main`.
- **Analytics**: Vercel Analytics only (No external trackers).

---

## 7) Scope Guardrails

- **One Project Only**: The Resell Tool. Do not dilute with "Todo Apps."
- **One Page Only**: No complex routing.
- **No Blog**: This is a brochure/proof-of-competence.
