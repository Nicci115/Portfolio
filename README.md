# Dominic Milburn — Portfolio

Production-grade single-page portfolio for Dominic Milburn.
Built to demonstrate senior-level engineering standards, distributed system architecture awareness, and "no-secrets" deployment.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🛠 Tech Stack

- **Framework:** React 19 + Vite
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS + CSS Modules
- **Motion:** Framer Motion
- **Testing:** Vitest
- **Linting:** ESLint + Prettier + Husky

## 🏗 Architecture

The project follows a **Feature-Based** directory structure:

```
src/
├── features/        # Self-contained sections (Hero, Showcase, etc.)
├── components/      # Shared UI atoms (Buttons, Cards)
├── content/         # Single Source of Truth (Data Layer)
└── utils/           # Shared logic
```

See `docs/` for detailed architectural decisions:
- [Overview](docs/00_OVERVIEW.md)
- [Architecture](docs/02_ARCHITECTURE.md)
- [Content Model](docs/03_CONTENT_MODEL.md)

## 🔒 Security & Privacy

- **Zero Secrets:** This repo contains NO `.env` files or API keys.
- **Resell Tool:** The showcased "Resell Tool" is a **private codebase**. This portfolio describes its architecture ("Mirror Mode") without exposing internal code.
- **Contact Info:** Public contact details are strictly controlled via `src/content/portfolio.ts`.

## 📦 Deployment

Hosted on **Vercel**.
- **Domain:** `dominic.tailoredapproach.us`
- **Analytics:** Vercel Analytics

## 📝 License

© 2026 Dominic Milburn. All Rights Reserved.