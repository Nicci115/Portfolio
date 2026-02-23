# Content Model

All content is defined in `src/content/portfolio.ts`.
This ensures the UI is a pure function of this data.

**Constraint:** Do not commit actual phone/email yet. Use placeholders.

---

## 1. Identity Object

```typescript
export const identity = {
  name: "Dominic Milburn",
  title: "Founder / Full-Stack Engineer",
  tagline: "Automation Engineer (AI + Systems)",
  location: "Missouri, USA",
  mission: "Build automation systems that eliminate human bottlenecks and turn chaotic operations into scalable workflows.",
  assets: {
    headshot: "/src/assets/Dom.png",
    logo: "/src/assets/TAlogo.jpg",
    banner: "/src/assets/TABanner.jpeg"
  },
  links: {
    linkedin: "https://www.linkedin.com/in/dominicmilburn/",
    facebook: "https://www.facebook.com/dominic.milburn.2025",
    email: "__REPLACE_WITH_PUBLIC_EMAIL__", // BLOCKER: Must be filled before deploy
    phone: "__REPLACE_WITH_PUBLIC_PHONE__"   // BLOCKER: Must be filled before deploy
  }
};
```

---

## 2. Featured Project: "Resell Tool"

This is the only project. It must be detailed but protect private code.
*Reference: `docs/ResellOverview.md` (Internal Context)*

```typescript
export const resellTool = {
  name: "Resell Tool (Mirror Mode)",
  status: "Live Deployment (Private Beta)",
  oneLiner: "A full-stack marketplace automation platform that uses a Chrome extension + real-time job orchestration to crosslist, scan inventory, and manage listings.",
  techStack: {
    frontend: "React, TypeScript, Vite",
    backend: "Node.js, Express, Supabase",
    realtime: "WebSockets (Custom Mirror Protocol)",
    extension: "Chrome MV3, CRXJS"
  },
  architecture: {
    controlPlane: "SPA + Express API + Supabase",
    executionPlane: "Chrome Extension + Content Scripts",
    protocol: "Mirror Mode (WebSocket Job Orchestration)"
  },
  metrics: [
    { label: "Listings Processed", value: "__METRIC_TBD__" }, // e.g. "Active Daily"
    { label: "Sync Jobs", value: "__METRIC_TBD__" },         // e.g. "Real-time"
    { label: "Uptime", value: "__METRIC_TBD__" }             // e.g. "Production"
  ],
  highlights: [
    "Mirror Mode: Dedicated authenticated WebSocket channel orchestrating jobs between backend and browser extension.",
    "Distributed Locking: Enforced job ownership via browserId + installId to prevent race conditions.",
    "Security: Encrypted credential storage for multi-tenant marketplace sessions."
  ]
};
```

---

## 3. Skills Categories

```typescript
export const skills = {
  frontend: ["React", "TypeScript", "Tailwind CSS", "Vite"],
  backend: ["Node.js", "Express", "Supabase", "PostgreSQL"],
  automation: ["Puppeteer", "Chrome Extensions (MV3)", "WebSockets", "Job Queues"],
  ai: ["OpenAI API", "Gemini CLI", "Local LLMs (Qwen, Ollama)", "Multi-agent Orchestration"]
};
```

---

## 4. Credibility / Bio

**Bio Paragraph 1 (Technical):**
"Specializing in real-time systems, browser automation, and secure orchestration. I build architectures where Chrome Extensions act as execution agents managed by a central control plane, solving complex synchronization challenges like 'Mirror Mode' job locking."

**Bio Paragraph 2 (Founder):**
"I don't just write code; I ship products. From self-taught beginnings to deploying production SaaS on Vercel and Render, I focus on systems that replace manual labor with reliable code."

---

## 5. Experience Timeline

- **2023**: Self-taught coding + First Automation Systems.
- **2024**: Built Resell Tool Foundation + Supabase Backend.
- **2025**: Deployed "Mirror Mode" (Extension + Realtime Orchestration).
- **2026**: Portfolio Launch + Next Gen AI Products.
