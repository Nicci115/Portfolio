# Project Audit: Tailored Approach Website

## A) Executive Snapshot
- What it is: Marketing site plus gated demo experiences (main Tailored Approach site, real-estate demo route, and China One restaurant demo route).
- Entrypoints: `TAsite/src/index.js`, routed app shell in `TAsite/src/App.js`.
- Primary stack: Create React App (`react-scripts`), React Router, CSS modules, static assets.
- Deployment assumptions: Vercel static deploy via `TAsite/vercel.json` (`build` output).
- Maturity state: Partial but deployable frontend artifact; no backend in this repo.

## B) File Inventory
- Filtered file count (skip-rule applied): 78
- Estimated LOC (text/code/docs): 21,921
- Top file types: `.js` (20), `.css` (10), `.jsx` (10), `.png` (20), `.md` (4)
- Key config files:
  - `TAsite/package.json`
  - `TAsite/vercel.json`
  - `TAsite/.env` (contains demo password variable usage)

### Tree (depth 6+ representative)
```text
Tailored Approach Website/
  TAsite/
    src/
      components/
        RestaurantDemo/
          assets/
            hero-main-spread.png
          index.jsx
          InteractiveMenu.jsx
          PasswordGate.js
          ReviewsRail.jsx
      hooks/
        useResizeObserver.js
      App.js
    public/
      index.html
    package.json
    vercel.json
  China One Demo Wireframes and Docs/
    ChinaOneMenu.md
```

## C) Architecture Map
- Subsystems:
  - Landing/brand pages (`Navbar`, `Hero`, `ServicesSection`, `BookingSection`).
  - Route-level demos (`/realestate-demo`, `/demo/china-one`).
  - Restaurant demo content engine (menu constants, reviews, media).
  - Client-side password gate wrapper for demo route.
- Runtime topology: Browser-only SPA.
- Data persistence: None; data is static constants in source.

```text
Browser (React SPA)
  -> Router (App.js)
     -> / (Home sections)
     -> /realestate-demo
     -> /demo/china-one
         -> PasswordGate (env var check)
         -> RestaurantDemo (static menu/reviews/assets)
```

## D) Feature Extraction
- Core features:
  - Multi-route marketing site with smooth scroll behavior.
  - Lazy-loaded demo route to reduce initial payload.
  - China One demo with menu, hours/location, reviews rail, CTA modules.
- Automation workflows: None (no backend jobs/webhooks).
- Integrations: Static Google Maps/Google review links only.
- Auth flows:
  - Client-side password comparison using `REACT_APP_DEMO_PASSWORD`.
- Background jobs/schedulers: None.

## E) Evidence Snippets
### Feature: Route composition + lazy demo loading
Path: `TAsite/src/App.js:12`
```js
const PasswordGate = React.lazy(() => import('./components/RestaurantDemo/PasswordGate'));
const RestaurantDemo = React.lazy(() => import('./components/RestaurantDemo'));
<Route path="/demo/china-one" element={<PasswordGate><RestaurantDemo /></PasswordGate>} />
```

### Feature: Demo access gate
Path: `TAsite/src/components/RestaurantDemo/PasswordGate.js:9`
```js
const correctPassword = process.env.REACT_APP_DEMO_PASSWORD;
if (inputValue === correctPassword) {
  setIsAuthenticated(true);
} else {
  setError('Invalid Access Code. Please try again.');
}
```

### Feature: Structured demo content model
Path: `TAsite/src/components/RestaurantDemo/constants.js:229`
```js
export const MENU_DATA = {
  categories: CATEGORY_ORDER,
  items: menuItems,
};
```

## F) Engineering Signals
- Separation of concerns: Good UI modularization (`components`, `hooks`, route-level composition).
- Reusable patterns: Reusable hooks (`useIsMobile`, `useResizeObserver`) and CSS modules.
- Typed models/schemas: Minimal; JS-only with no runtime schema validation.
- Error handling/logging: Basic UI error messaging in password gate; no centralized logging.
- Security posture:
  - Positive: demo gate uses env variable.
  - Constraint: auth is client-side only and not secure for sensitive content.
- Scalability constraints:
  - Large static constants file and media-heavy demo content could bloat bundle.
  - No API/backend seams yet.

## G) Scoring (1–100)
- Architecture: 61
- Code Quality: 67
- Structure: 72
- Deployment Readiness: 74
- Security: 42
- UX Maturity: 76
- Documentation Quality: 58
- Maintainability: 66
- Test Readiness: 45
- Overall Portfolio Worthiness: 64

### Score Justification
- Strongest points: clear component decomposition, realistic demo narrative, Vercel-ready config.
- Weakest points: client-only password gating, limited typing/tests, no backend contract.
