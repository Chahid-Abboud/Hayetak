# Hayetak Design System

## Brand Essence

**Positioning:** Premium AI Health Operating System  
**Tone:** Calm, trustworthy, modern, structured, intelligent  
**Not:** Flashy AI, clinical software, aggressive gym branding, generic fitness app

---

## Color System

### Semantic Palette

**Primary (Brand)**
- `--color-primary-50`: #f5f3ff (lightest accent surface)
- `--color-primary-100`: #ede9fe
- `--color-primary-200`: #ddd6fe
- `--color-primary-300`: #c4b5fd
- `--color-primary-400`: #a78bfa
- `--color-primary-500`: #8b5cf6 (primary brand color)
- `--color-primary-600`: #7c3aed
- `--color-primary-700`: #6d28d9
- `--color-primary-800`: #5b21b6
- `--color-primary-900`: #4c1d95

**Neutral (Surfaces & Text)**
- `--color-neutral-0`: #ffffff (pure white)
- `--color-neutral-50`: #fafaf9
- `--color-neutral-100`: #f5f5f4
- `--color-neutral-200`: #e7e5e4
- `--color-neutral-300`: #d6d3d1
- `--color-neutral-400`: #a8a29e
- `--color-neutral-500`: #78716c
- `--color-neutral-600`: #57534e
- `--color-neutral-700`: #44403c
- `--color-neutral-800`: #292524
- `--color-neutral-900`: #1c1917
- `--color-neutral-950`: #0c0a09

**Success (Goals, completion)**
- `--color-success-50`: #f0fdf4
- `--color-success-500`: #22c55e
- `--color-success-600`: #16a34a
- `--color-success-700`: #15803d

**Warning (Attention, caution)**
- `--color-warning-50`: #fffbeb
- `--color-warning-500`: #f59e0b
- `--color-warning-600`: #d97706
- `--color-warning-700`: #b45309

**Danger (Allergies, restrictions, errors)**
- `--color-danger-50`: #fef2f2
- `--color-danger-500`: #ef4444
- `--color-danger-600`: #dc2626
- `--color-danger-700`: #b91c1c

**Info (Insights, AI suggestions)**
- `--color-info-50`: #eff6ff
- `--color-info-500`: #3b82f6
- `--color-info-600`: #2563eb
- `--color-info-700`: #1d4ed8

### Theme Modes

**Light Mode**
- Background: `--color-neutral-50`
- Surface: `--color-neutral-0`
- Surface elevated: `--color-neutral-0` with shadow
- Border: `--color-neutral-200`
- Text primary: `--color-neutral-900`
- Text secondary: `--color-neutral-600`
- Text tertiary: `--color-neutral-500`

**Dark Mode**
- Background: `--color-neutral-950`
- Surface: `--color-neutral-900`
- Surface elevated: `--color-neutral-800`
- Border: `--color-neutral-800`
- Text primary: `--color-neutral-50`
- Text secondary: `--color-neutral-400`
- Text tertiary: `--color-neutral-500`

---

## Typography

### Font Stack

**Primary (UI & Body):** Inter, system-ui, sans-serif  
**Mono (Code, data):** 'IBM Plex Mono', 'SF Mono', Consolas, monospace  
**Display (Optional marketing):** Inter with tighter tracking

### Type Scale

| Token | Size | Line Height | Weight | Use Case |
|-------|------|-------------|--------|----------|
| `--text-xs` | 0.75rem (12px) | 1rem | 500 | Labels, captions, metadata |
| `--text-sm` | 0.875rem (14px) | 1.25rem | 400 | Secondary text, helper text |
| `--text-base` | 1rem (16px) | 1.5rem | 400 | Body text, paragraphs |
| `--text-lg` | 1.125rem (18px) | 1.75rem | 500 | Emphasized body, card titles |
| `--text-xl` | 1.25rem (20px) | 1.875rem | 600 | Section headings |
| `--text-2xl` | 1.5rem (24px) | 2rem | 600 | Page titles |
| `--text-3xl` | 1.875rem (30px) | 2.25rem | 700 | Dashboard headings |
| `--text-4xl` | 2.25rem (36px) | 2.5rem | 700 | Hero headings |
| `--text-5xl` | 3rem (48px) | 1 | 800 | Landing page display |

### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extrabold: 800

---

## Spacing System

**Base unit:** 4px (0.25rem)

| Token | Value | Common Use |
|-------|-------|------------|
| `--space-0` | 0 | Reset |
| `--space-1` | 0.25rem (4px) | Tight inline spacing |
| `--space-2` | 0.5rem (8px) | Small gaps, icon spacing |
| `--space-3` | 0.75rem (12px) | Compact padding |
| `--space-4` | 1rem (16px) | Standard element spacing |
| `--space-5` | 1.25rem (20px) | Card padding |
| `--space-6` | 1.5rem (24px) | Section spacing |
| `--space-8` | 2rem (32px) | Large section spacing |
| `--space-10` | 2.5rem (40px) | Container padding |
| `--space-12` | 3rem (48px) | Page section gaps |
| `--space-16` | 4rem (64px) | Major layout divisions |
| `--space-20` | 5rem (80px) | Landing page sections |
| `--space-24` | 6rem (96px) | Hero sections |

---

## Elevation & Shadows

Subtle, soft shadows for premium feel. Avoid harsh drop shadows.

| Level | Token | Box Shadow | Use Case |
|-------|-------|------------|----------|
| 0 | `--shadow-none` | none | Flush surfaces |
| 1 | `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.04) | Subtle cards |
| 2 | `--shadow-base` | 0 2px 8px rgba(0,0,0,0.08) | Default cards, dropdowns |
| 3 | `--shadow-md` | 0 4px 16px rgba(0,0,0,0.12) | Elevated panels |
| 4 | `--shadow-lg` | 0 8px 24px rgba(0,0,0,0.16) | Modals, drawers |
| 5 | `--shadow-xl` | 0 12px 40px rgba(0,0,0,0.20) | Major overlays |

**Dark mode adjustments:** Increase shadow opacity by 50% and use pure black rgba(0,0,0,...)

---

## Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `--radius-none` | 0 | Flush layouts |
| `--radius-sm` | 0.25rem (4px) | Badges, tags |
| `--radius-base` | 0.5rem (8px) | Buttons, inputs |
| `--radius-md` | 0.75rem (12px) | Cards, panels |
| `--radius-lg` | 1rem (16px) | Large cards, modals |
| `--radius-xl` | 1.5rem (24px) | Hero cards |
| `--radius-full` | 9999px | Pills, avatars |

---

## Iconography

**Library:** Lucide React  
**Style:** Outlined, consistent stroke weight  
**Sizes:**
- 16px: Dense UI, inline icons
- 20px: Standard buttons, nav
- 24px: Section headers, feature icons
- 32px: Empty states
- 48px: Hero illustrations

**Stroke weight:** 2px (Lucide default)

---

## Motion & Transitions

**Philosophy:** Smooth, purposeful, never distracting

**Duration Scale:**
- Fast: 150ms (hover states, simple fades)
- Base: 200ms (most transitions)
- Moderate: 300ms (drawers, dropdowns)
- Slow: 500ms (page transitions, complex animations)

**Easing:**
- `ease-out`: UI entering (cubic-bezier(0, 0, 0.2, 1))
- `ease-in`: UI exiting (cubic-bezier(0.4, 0, 1, 1))
- `ease-in-out`: Smooth states (cubic-bezier(0.4, 0, 0.2, 1))

**Common Patterns:**
- Button hover: scale(1.02) + brightness increase, 150ms
- Card hover: translate(0, -2px) + shadow increase, 200ms
- Modal enter: fade + scale(0.95 → 1), 300ms
- Drawer: translateX with ease-out, 300ms
- Page transitions: Crossfade, 200ms

---

## Component Library

### Core Components

#### **Button**
Variants: primary, secondary, outline, ghost, danger  
Sizes: sm (32px), base (40px), lg (48px)  
States: default, hover, active, disabled, loading

**Anatomy:**
- Icon (optional, 20px)
- Label (medium weight)
- Padding: 12px horizontal, 8px vertical (base)
- Radius: `--radius-base`

#### **Input**
Types: text, email, password, number, textarea, select  
States: default, focused, error, disabled, filled  
Includes: label, helper text, error message, character count

**Anatomy:**
- Label (text-sm, medium)
- Input field (40px height, 12px padding)
- Border: 1px solid neutral-300 (focus: primary-500)
- Optional prefix/suffix icons

#### **Card**
Variants: flat, elevated, interactive, outlined  
**Anatomy:**
- Container (radius-md, padding-6)
- Optional header (text-lg, semibold)
- Body content
- Optional footer with actions

#### **Badge**
Variants: neutral, primary, success, warning, danger, info  
Sizes: sm, base  
**Anatomy:**
- Label (text-xs, medium)
- Padding: 4px 8px
- Radius: radius-sm
- Optional dot indicator

#### **Avatar**
Sizes: xs (24px), sm (32px), base (40px), lg (56px), xl (80px)  
States: image, initials, icon, skeleton  
Optional status indicator (online, busy, away)

#### **Dropdown Menu**
**Anatomy:**
- Trigger button
- Menu container (shadow-md, radius-base)
- Menu items (40px height, hover state)
- Dividers
- Optional sections with labels

#### **Modal**
Sizes: sm (400px), base (600px), lg (800px), xl (1000px), full  
**Anatomy:**
- Backdrop (rgba overlay)
- Container (shadow-xl, radius-lg)
- Header (title + close button)
- Body (scrollable)
- Footer (action buttons)

#### **Drawer**
Positions: left, right, top, bottom  
Sizes: sm (320px), base (400px), lg (600px)  
**Anatomy:**
- Same as modal but slides from edge
- Overlay backdrop

#### **Toast/Alert**
Variants: success, warning, danger, info  
Positions: top-right, top-center, bottom-right, bottom-center  
**Anatomy:**
- Icon (24px)
- Title + description
- Close button
- Auto-dismiss timer
- Progress bar (optional)

#### **Progress Bar**
Variants: determinate, indeterminate  
Sizes: sm (4px), base (8px), lg (12px)  
Colors: Match semantic colors

#### **Skeleton Loader**
Variants: text, circle, rectangle, card  
Animation: Shimmer effect, 1.5s duration

#### **Empty State**
**Anatomy:**
- Icon (48px, neutral-400)
- Heading (text-xl)
- Description (text-base, neutral-600)
- CTA button (optional)

#### **Tabs**
Variants: line (underline), pills, segmented  
**Anatomy:**
- Tab list container
- Tab buttons (active state with primary color)
- Tab panels

#### **Table**
**Anatomy:**
- Header row (text-sm, medium, neutral-600)
- Body rows (40px height)
- Hover states
- Sortable columns (icon indicator)
- Pagination controls

#### **Chart Container**
**Anatomy:**
- Title + timeframe selector
- Chart area (Recharts integration)
- Legend
- Tooltip styling
- Empty state

---

## Advanced UI Patterns

### **Master-Detail**
Desktop: Side-by-side panes (30/70 or 40/60 split)  
Mobile: Stack with back navigation  
Use: Messages, appointments, client management

### **Command Center Dashboard**
Layout: Grid of stat cards + featured content  
Components: Metric cards, mini charts, quick actions  
Hierarchy: Today's priority → Recent activity → Trends

### **Timeline Layout**
Vertical timeline with date markers  
Use: Meal log, workout log, activity history  
Components: Time stamp, event card, connecting line

### **Filter Panel**
Desktop: Sticky sidebar or collapsible drawer  
Mobile: Bottom sheet or full-screen overlay  
Components: Search, date range, tags, categories, reset

### **Progressive Disclosure**
Accordion sections for complex forms  
Expandable cards for detail views  
Stepped wizards for onboarding

### **Sticky Actions**
Desktop: Floating action bar that sticks on scroll  
Mobile: Bottom action bar (56px height)  
Use: Form submit, batch actions, primary CTAs

---

## App Shell Architecture

### **Role-Based Layouts**

#### **Public Layout**
- Full-width centered content
- Minimal header (logo + login/register)
- Footer (links, legal)
- Use: Landing, login, register, password flows

#### **Client Layout**
- **Desktop:** Side navigation (240px) + top bar (64px) + content area
- **Mobile:** Bottom navigation (64px) + top bar (56px) + content
- **Components:**
  - Logo + app name
  - Navigation links with icons
  - User profile dropdown
  - Theme toggle
  - Search (global)
  - Notifications icon

#### **Professional Layout**
- Similar to Client Layout
- Additional "Professional Mode" toggle/indicator
- Role badge in profile menu
- Access to professional tools in nav

#### **Admin Layout**
- **Desktop:** Compact side nav (200px) + top bar + content
- Admin badge/indicator
- System health indicators
- Quick action toolbar

### **Navigation Patterns**

**Primary Navigation (Client/Professional):**
1. Dashboard (home icon)
2. AI Coach (sparkles icon)
3. Meals (utensils icon)
4. Workouts (dumbbell icon)
5. Nearby (map-pin icon)
6. Messages (message-square icon)
7. Appointments (calendar icon)
8. Profile (user icon)

**Professional Navigation (Additional):**
9. Clients (users icon)
10. Pro Dashboard (briefcase icon)

**Admin Navigation:**
1. Dashboard (layout-dashboard icon)
2. Users (users icon)
3. Professionals (shield-check icon)
4. Content (database icon)
5. Logs (file-text icon)
6. Settings (settings icon)

---

## Responsive Patterns

### **Breakpoints**
- `xs`: < 640px (mobile portrait)
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet portrait)
- `lg`: 1024px (tablet landscape / small desktop)
- `xl`: 1280px (desktop)
- `2xl`: 1536px (large desktop)

### **Key Responsive Behaviors**

**Navigation:**
- Desktop (lg+): Persistent side nav
- Mobile (< lg): Bottom tab bar OR hamburger menu

**Dashboard:**
- Desktop: 3-4 column grid
- Tablet: 2 column grid
- Mobile: Single column stack

**Master-Detail:**
- Desktop: Side-by-side
- Mobile: Full screen with back button

**Modals:**
- Desktop: Centered overlay
- Mobile: Full screen or bottom sheet

**Tables:**
- Desktop: Full table
- Mobile: Card-based list OR horizontal scroll

**Charts:**
- Desktop: Full width with hover tooltips
- Mobile: Touch-friendly, simplified

**Forms:**
- Desktop: Multi-column when appropriate
- Mobile: Single column, full width inputs

**Sticky Elements:**
- Desktop: Sticky headers, filters
- Mobile: Sticky bottom action bars

---

## Data Visualization Style

**Chart Library:** Recharts

**Color Strategy:**
- Single series: Primary gradient
- Multi-series: Distinct hues from palette
- Positive trends: Success green
- Negative trends: Danger red

**Chart Types:**
- Line: Progress over time
- Bar: Comparisons, weekly summaries
- Pie/Donut: Macro distribution
- Area: Volume with trend
- Radial: Goal completion

**Typography:**
- Axis labels: text-xs, neutral-600
- Values: text-sm, medium
- Legends: text-sm, neutral-700

---

## States & Feedback

### **Loading States**
- Skeleton screens for initial load
- Spinner for actions (button loading state)
- Progress bars for uploads
- Optimistic UI updates where safe

### **Empty States**
- Illustrative icon
- Friendly heading
- Helpful description
- Clear CTA (when applicable)

### **Error States**
- Inline field errors (below input)
- Toast for system errors
- Error boundary fallback
- Retry action

### **Success States**
- Toast confirmation
- Success badge/icon
- Subtle animation (checkmark)
- Auto-redirect (when appropriate)

---

## Accessibility Standards

- WCAG 2.1 AA minimum
- Color contrast: 4.5:1 for text, 3:1 for UI
- Keyboard navigation for all interactive elements
- Focus indicators: 2px primary-500 outline
- Screen reader labels (aria-label, aria-describedby)
- Semantic HTML (headings, landmarks, lists)
- Skip links
- Form validation with clear error messages

---

## Content Guidelines

**Tone of Voice:**
- Professional but warm
- Clear and concise
- Encouraging, not judgmental
- Evidence-based, not gimmicky

**Microcopy Examples:**
- Buttons: "Save Changes", "Create Plan", "Log Meal"
- Empty states: "No meals logged yet. Start by adding your first meal."
- Errors: "Unable to save. Please check your connection and try again."
- Success: "Meal logged successfully"

**AI Coach Voice:**
- Supportive, knowledgeable
- Context-aware references
- Safety-first language for restrictions
- Action-oriented suggestions

---

## Brand Assets

**Logo Usage:**
- Full logo: Landing page, marketing
- Logomark: App header (mobile), favicon
- Minimum size: 24px height

**Illustrations:**
- Style: Minimal, geometric, monochromatic
- Use: Empty states, onboarding, error pages
- Color: Neutral-400 with primary accent

---

## Design Tokens Reference

All tokens defined in `/src/styles/theme.css` using CSS custom properties for runtime theme switching.

---

**Last Updated:** March 2026  
**Design System Version:** 1.0.0
