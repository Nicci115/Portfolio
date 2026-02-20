# UI / UX Spec

This doc defines the "Senior Engineer" aesthetic.
Minimal. Dark. Data-heavy.

---

## 1. Visual Language

- **Theme**: Dark Mode Default (No Light Mode).
- **Background**: `#09090b` (Zinc 950).
- **Surface**: `#18181b` (Zinc 900) with 1px borders `#27272a` (Zinc 800).
- **Accent**: `#3B82F6` (Electric Blue) for primary actions/links.
- **Text**:
  - Headings: `#f4f4f5` (Zinc 100)
  - Body: `#a1a1aa` (Zinc 400)
- **Font**: **Geist Sans** (UI) + **Geist Mono** (Code/Tech).

---

## 2. Layout Structure

### **Global Container**
- Max-width: `1200px`.
- Padding: `24px` (Mobile), `48px` (Desktop).
- Centered.

### **Navigation**
- **Mobile**: Simple vertical stack (No hamburger).
- **Desktop**: Minimal top-right links. Glassmorphism blur on scroll.

---

## 3. Component Specs

### **Hero Section**
- **Layout**: Split (Text Left / Headshot Right) or Centered.
- **Headshot**: `src/assets/Dom.png` (Circle or rounded square, grayscale to color on hover).
- **Banner**: Use `src/assets/TABanner.jpeg` for OpenGraph or subtle section backgrounds.
- **Effect**: Subtle background gradient glow (Blue/Purple) behind the text.

### **Showcase Card (Resell Tool)**
- **Design**: "Schematic" look. Dark card with code-like details.
- **Visual**: Use a CSS/SVG diagram representing "Extension <-> Backend <-> DB".
- **Interaction**: Hover reveals "Status: Online" or similar technical detail.

### **Tech Pills**
- **Style**: Small badges, Zinc-800 bg, Mono font, subtle border.

### **Timeline**
- **Style**: Vertical line with dots. Minimal text.

### **Footer / Contact**
- **Logo**: `src/assets/TAlogo.jpg` (Small, grayscale, opacity 50%).
- **Links**: Plain text or clean icons.

---

## 4. Motion Guidelines (Framer Motion)

- **Entrance**: Subtle fade-in + slide-up (`y: 20 -> 0`).
- **Hover**: Scale `1.02` or Border Color shift.
- **Reduced Motion**: If preferred, strictly opacity fade only. No movement.

---

## 5. Accessibility

- **Focus Rings**: Sharp Blue (`ring-2 ring-blue-500`).
- **Contrast**: Text must satisfy WCAG AA (4.5:1).
- **Touch Targets**: Min 44px for all links/buttons on mobile.

---

## 6. Assets

- **Favicon**: Tailored Approach Logo (`src/assets/TAlogo.jpg`) or Minimal "D".
- **OG Image**: Custom banner with Name + Title (uses `src/assets/TABanner.jpeg`).
