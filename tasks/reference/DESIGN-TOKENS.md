# Design Tokens Reference

> Complete design system for JISA App (ContractorHub)

---

## 1. Color System

### 1.1 Core Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--background` | `#ffffff` | `#000000` | Page background |
| `--foreground` | `#0f1419` | `#e7e9ea` | Primary text |
| `--card` | `#f7f8f8` | `#17181c` | Card backgrounds |
| `--card-foreground` | `#0f1419` | `#d9d9d9` | Card text |
| `--popover` | `#ffffff` | `#000000` | Dropdown/popover bg |
| `--popover-foreground` | `#0f1419` | `#e7e9ea` | Popover text |

### 1.2 Brand Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--primary` | `#1e9df1` | `#1c9cf0` | Primary actions, links |
| `--primary-foreground` | `#ffffff` | `#ffffff` | Text on primary |
| `--secondary` | `#0f1419` | `#f0f3f4` | Secondary buttons |
| `--secondary-foreground` | `#ffffff` | `#0f1419` | Text on secondary |
| `--accent` | `#e3ecf6` | `#061622` | Accent backgrounds |
| `--accent-foreground` | `#1e9df1` | `#1c9cf0` | Accent text |
| `--destructive` | `#f4212e` | `#f4212e` | Delete, error actions |
| `--destructive-foreground` | `#ffffff` | `#ffffff` | Text on destructive |

### 1.3 UI Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--muted` | `#e5e5e6` | `#181818` | Muted backgrounds |
| `--muted-foreground` | `#0f1419` | `#72767a` | Muted text |
| `--border` | `#e1eaef` | `#242628` | Borders, dividers |
| `--input` | `#f7f9fa` | `#22303c` | Input backgrounds |
| `--ring` | `#1da1f2` | `#1da1f2` | Focus rings |

### 1.4 Chart Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--chart-1` | `#1e9df1` | Primary chart color (blue) |
| `--chart-2` | `#00b87a` | Secondary chart (green) |
| `--chart-3` | `#f7b928` | Tertiary chart (yellow) |
| `--chart-4` | `#17bf63` | Success chart (green) |
| `--chart-5` | `#e0245e` | Alert chart (pink) |

### 1.5 Sidebar Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--sidebar` | `#f7f8f8` | `#17181c` | Sidebar background |
| `--sidebar-foreground` | `#0f1419` | `#d9d9d9` | Sidebar text |
| `--sidebar-primary` | `#1e9df1` | `#1da1f2` | Active sidebar item |
| `--sidebar-primary-foreground` | `#ffffff` | `#ffffff` | Active item text |
| `--sidebar-accent` | `#e3ecf6` | `#061622` | Hover state |
| `--sidebar-accent-foreground` | `#1e9df1` | `#1c9cf0` | Hover text |
| `--sidebar-border` | `#e1e8ed` | `#38444d` | Sidebar dividers |
| `--sidebar-ring` | `#1da1f2` | `#1da1f2` | Focus ring |

---

## 2. Typography

### 2.1 Font Families

```css
--font-sans: 'Noto Sans KR', 'Open Sans', sans-serif;
--font-serif: Georgia, serif;
--font-mono: Menlo, monospace;
```

**Important**: All UI text must be in Korean using Noto Sans KR.

### 2.2 Font Loading (Next.js)

```typescript
// app/layout.tsx
import { Noto_Sans_KR } from 'next/font/google';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### 2.3 Font Sizes (Tailwind)

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Captions, labels |
| `text-sm` | 14px | Secondary text, table cells |
| `text-base` | 16px | Body text |
| `text-lg` | 18px | Subheadings |
| `text-xl` | 20px | Section titles |
| `text-2xl` | 24px | Page titles |
| `text-3xl` | 30px | Hero headings |

### 2.4 Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-light` | 300 | De-emphasized text |
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, nav items |
| `font-semibold` | 600 | Subheadings, buttons |
| `font-bold` | 700 | Headings, emphasis |

### 2.5 Letter Spacing

```css
--tracking-normal: 0em;
```

---

## 3. Spacing System

### 3.1 Base Spacing

```css
--spacing: 0.25rem; /* 4px */
```

### 3.2 Spacing Scale

| Class | Value | Pixels |
|-------|-------|--------|
| `p-0` | 0 | 0px |
| `p-1` | 0.25rem | 4px |
| `p-2` | 0.5rem | 8px |
| `p-3` | 0.75rem | 12px |
| `p-4` | 1rem | 16px |
| `p-5` | 1.25rem | 20px |
| `p-6` | 1.5rem | 24px |
| `p-8` | 2rem | 32px |
| `p-10` | 2.5rem | 40px |
| `p-12` | 3rem | 48px |
| `p-16` | 4rem | 64px |

### 3.3 Common Spacing Patterns

```tsx
// Card padding
<Card className="p-6">

// Section spacing
<section className="py-8 px-4">

// Form field gap
<div className="space-y-4">

// Inline items
<div className="flex gap-2">

// Grid gap
<div className="grid gap-4">
```

---

## 4. Border Radius

### 4.1 Radius Scale

```css
--radius: 1.3rem;  /* Base: 20.8px */
--radius-sm: calc(var(--radius) - 4px);   /* 16.8px */
--radius-md: calc(var(--radius) - 2px);   /* 18.8px */
--radius-lg: var(--radius);               /* 20.8px */
--radius-xl: calc(var(--radius) + 4px);   /* 24.8px */
```

### 4.2 Usage

| Class | Token | Usage |
|-------|-------|-------|
| `rounded-sm` | `--radius-sm` | Small elements, chips |
| `rounded-md` | `--radius-md` | Buttons, inputs |
| `rounded-lg` | `--radius-lg` | Cards, modals |
| `rounded-xl` | `--radius-xl` | Large cards, containers |
| `rounded-full` | 9999px | Avatars, circular buttons |

---

## 5. Shadows

### 5.1 Shadow Scale

**Note**: This design system uses minimal/no shadows for a flat, modern look.

```css
--shadow-2xs: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
--shadow-xs: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
--shadow-sm: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 1px 2px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
--shadow: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 1px 2px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
--shadow-md: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 2px 4px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
--shadow-lg: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 4px 6px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
--shadow-xl: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00), 0px 8px 10px -1px hsl(202.8169 89.1213% 53.1373% / 0.00);
--shadow-2xl: 0px 2px 0px 0px hsl(202.8169 89.1213% 53.1373% / 0.00);
```

### 5.2 Shadow Color

```css
--shadow-color: rgba(29, 161, 242, 0.15); /* Light mode */
--shadow-color: rgba(29, 161, 242, 0.25); /* Dark mode */
```

---

## 6. Complete CSS Variables

### 6.1 Light Mode (`:root`)

```css
:root {
  /* Core Colors */
  --background: #ffffff;
  --foreground: #0f1419;
  --card: #f7f8f8;
  --card-foreground: #0f1419;
  --popover: #ffffff;
  --popover-foreground: #0f1419;

  /* Brand Colors */
  --primary: #1e9df1;
  --primary-foreground: #ffffff;
  --secondary: #0f1419;
  --secondary-foreground: #ffffff;
  --accent: #e3ecf6;
  --accent-foreground: #1e9df1;
  --destructive: #f4212e;
  --destructive-foreground: #ffffff;

  /* UI Colors */
  --muted: #e5e5e6;
  --muted-foreground: #0f1419;
  --border: #e1eaef;
  --input: #f7f9fa;
  --ring: #1da1f2;

  /* Chart Colors */
  --chart-1: #1e9df1;
  --chart-2: #00b87a;
  --chart-3: #f7b928;
  --chart-4: #17bf63;
  --chart-5: #e0245e;

  /* Sidebar */
  --sidebar: #f7f8f8;
  --sidebar-foreground: #0f1419;
  --sidebar-primary: #1e9df1;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e3ecf6;
  --sidebar-accent-foreground: #1e9df1;
  --sidebar-border: #e1e8ed;
  --sidebar-ring: #1da1f2;

  /* Typography */
  --font-sans: 'Noto Sans KR', 'Open Sans', sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Menlo, monospace;

  /* Radius */
  --radius: 1.3rem;

  /* Spacing */
  --spacing: 0.25rem;
  --tracking-normal: 0em;
}
```

### 6.2 Dark Mode (`.dark`)

```css
.dark {
  --background: #000000;
  --foreground: #e7e9ea;
  --card: #17181c;
  --card-foreground: #d9d9d9;
  --popover: #000000;
  --popover-foreground: #e7e9ea;

  --primary: #1c9cf0;
  --primary-foreground: #ffffff;
  --secondary: #f0f3f4;
  --secondary-foreground: #0f1419;
  --muted: #181818;
  --muted-foreground: #72767a;
  --accent: #061622;
  --accent-foreground: #1c9cf0;
  --destructive: #f4212e;
  --destructive-foreground: #ffffff;

  --border: #242628;
  --input: #22303c;
  --ring: #1da1f2;

  --sidebar: #17181c;
  --sidebar-foreground: #d9d9d9;
  --sidebar-primary: #1da1f2;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #061622;
  --sidebar-accent-foreground: #1c9cf0;
  --sidebar-border: #38444d;
  --sidebar-ring: #1da1f2;
}
```

---

## 7. Tailwind CSS v4 Integration

### 7.1 Theme Configuration

```css
/* globals.css */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
}
```

### 7.2 Usage Examples

```tsx
// Background colors
<div className="bg-background text-foreground">
<div className="bg-card text-card-foreground">
<div className="bg-primary text-primary-foreground">

// Border colors
<div className="border border-border">
<input className="border-input bg-input">

// Sidebar
<aside className="bg-sidebar text-sidebar-foreground">

// Charts
<div className="text-chart-1">
<div className="bg-chart-2">
```

---

## 8. Semantic Color Usage

### 8.1 Status Colors

| Status | Color Token | Usage |
|--------|-------------|-------|
| Success | `--chart-2` (#00b87a) | Success messages, completed |
| Warning | `--chart-3` (#f7b928) | Warnings, attention |
| Error | `--destructive` (#f4212e) | Errors, destructive actions |
| Info | `--primary` (#1e9df1) | Information, links |

### 8.2 Custom Status Classes

```tsx
// components/ui/badge.tsx variants
const badgeVariants = {
  success: "bg-[#00b87a]/10 text-[#00b87a] border-[#00b87a]/20",
  warning: "bg-[#f7b928]/10 text-[#f7b928] border-[#f7b928]/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary/10 text-primary border-primary/20",
};
```

---

## 9. Accessibility

### 9.1 Color Contrast

All color combinations meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum contrast ratio
- Large text: 3:1 minimum contrast ratio

### 9.2 Focus States

```css
/* Focus ring for interactive elements */
.focus-visible:ring-2
.focus-visible:ring-ring
.focus-visible:ring-offset-2
.focus-visible:ring-offset-background
```

### 9.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Quick Reference Card

```
PRIMARY:     #1e9df1 (Blue)
SECONDARY:   #0f1419 (Dark)
DESTRUCTIVE: #f4212e (Red)
SUCCESS:     #00b87a (Green)
WARNING:     #f7b928 (Yellow)

FONT:        Noto Sans KR
RADIUS:      1.3rem (20.8px)
SHADOWS:     Minimal/None

LIGHT BG:    #ffffff
DARK BG:     #000000
```
