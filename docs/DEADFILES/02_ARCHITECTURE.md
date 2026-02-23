# Architecture

This project is designed as a **production-grade artifact**, not a hacky template.
It follows a clear separation of concerns: **Content vs. Presentation**.

---

## 1. High-Level Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS Modules (for specific complex animations if needed)
- **Motion**: Framer Motion (only for "delight" details)
- **Testing**: Vitest
- **Build**: Vite -> Static Assets -> Vercel Edge

---

## 2. Directory Structure (Feature-Based)

We avoid "Atomic Design" in favor of **Feature-Based** organization for readability.

```
src/
├── assets/          # Static images (Dom.png, TABanner.jpeg, TAlogo.jpg)
├── components/      # Shared UI (Buttons, Cards, Pills)
├── content/         # The Data Layer (Single Source of Truth)
│   └── portfolio.ts # ALL text/data lives here
├── features/        # Main Sections
│   ├── hero/
│   ├── showcase/    # Resell Tool Section
│   ├── skills/
│   ├── credibility/
│   └── contact/
├── hooks/           # Shared logic (useScroll, etc.)
├── styles/          # Global styles, Tailwind config
└── utils/           # Helpers (cn, formatting)
```

---

## 3. The "Resell Tool" Architecture (Showcase)

Since the codebase is private, we showcase its architecture here. The portfolio must visualize this topology:

### **Control Plane (The Brain)**
- **SPA (Vercel)**: React/Vite dashboard.
- **Backend (Render/Node)**: Express API, Auth, Job Orchestration.
- **Database (Supabase)**: Persistence, Auth, Storage.

### **Execution Plane (The Muscle)**
- **Chrome Extension (MV3)**: Runs on marketplace domains.
- **Mirror Mode**: WebSocket channel connecting Extension <-> Backend.

**Key Pattern**: The portfolio will render a *schematic* or *diagram* of this system using Tailwind/Framer Motion or SVG, proving understanding of distributed systems.

---

## 4. Data Flow (Portfolio)

1.  **Build Time**: `src/content/portfolio.ts` is imported by components.
2.  **Runtime**: React renders static content.
3.  **No API**: No fetching at runtime (except Vercel Analytics).

---

## 5. Deployment Architecture

- **Repo**: GitHub (Public)
- **Host**: Vercel
- **Domain**: `dominic.tailoredapproach.us`
- **Headers**:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Strict-Transport-Security`

---

## 6. Design System (Tokens)

- **Font**: Geist (Sans & Mono).
- **Background**: Zinc-950 (`#09090b`).
- **Primary**: Blue-500 (`#3B82F6`).
- **Surface**: Zinc-900 with subtle borders.
- **Glows**: CSS `box-shadow` and radial gradients.