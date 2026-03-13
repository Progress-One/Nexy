# Nexy — Product Theme

> Product: Nexy (nexy.life)
> Type: Dark theme, intimate/sensual aesthetic
> Platform: Web (mobile-first PWA)

---

## Colors

```css
:root {
  /* Backgrounds */
  --surface-base:       #0C0A0F;
  --surface-card:       #1A1720;
  --surface-elevated:   #231F2B;
  --surface-overlay:    rgba(0, 0, 0, 0.6);

  /* Text */
  --text-primary:       #F5F0F0;
  --text-secondary:     #B8A9B4;
  --text-muted:         #6B5E6B;
  --text-inverse:       #0C0A0F;

  /* Accent */
  --accent-primary:     #E8747C;   /* coral */
  --accent-secondary:   #6B4E71;   /* purple */
  --accent-gradient:    linear-gradient(135deg, #E8747C 0%, #6B4E71 100%);

  /* Borders */
  --border-default:     rgba(255, 255, 255, 0.10);
  --border-subtle:      rgba(255, 255, 255, 0.06);

  /* Feedback */
  --feedback-success:   #4ADE80;
  --feedback-error:     #F87171;
  --feedback-warning:   #FBBF24;
  --feedback-info:      #60A5FA;

  /* Swipe-specific */
  --swipe-yes:          #4ADE80;   /* green */
  --swipe-no:           #F87171;   /* red */
  --swipe-very:         #A855F7;   /* purple-bright */
  --swipe-if-asked:     #FBBF24;   /* yellow */
}
```

## Tailwind Config Extension

```js
// tailwind.config.js — extend for Nexy
colors: {
  surface: {
    base: '#0C0A0F',
    card: '#1A1720',
    elevated: '#231F2B',
  },
  accent: {
    primary: '#E8747C',
    secondary: '#6B4E71',
  },
  coral: '#E8747C',
  purple: '#6B4E71',
}
```

---

## Typography

| Role     | Font                | Fallback          |
|----------|---------------------|--------------------|
| Headings | Plus Jakarta Sans   | system-ui, sans-serif |
| Body     | Inter               | system-ui, sans-serif |
| Accents  | Plus Jakarta Sans italic | — |

Google Fonts import:
```
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
```

---

## Component Overrides (Nexy-specific)

### Swipe Card

| Property      | Value                              |
|---------------|--------------------------------------|
| Aspect ratio  | Free height, image area 16:9       |
| Image radius  | rounded-xl (16px)                  |
| Card bg       | surface-card                       |
| Card border   | 1px border-subtle                  |
| Card radius   | rounded-2xl (20px)                 |
| Card padding  | space-4 (16px)                     |
| Swipe overlay | colored semi-transparent badge     |
| Rotation      | max ±15deg during drag             |
| Spring        | damping: 20, stiffness: 300        |

### Swipe Overlays

| Direction | Color      | Label             | Icon  |
|-----------|------------|-------------------|-------|
| Right →   | swipe-yes  | ДА / YES          | ✓     |
| Left ←    | swipe-no   | НЕТ / NO          | ✗     |
| Up ↑      | swipe-very | ОЧЕНЬ! / VERY!    | 🔥    |
| Down ↓    | swipe-if-asked | ЕСЛИ ПОПРОСИТ | 🤔    |

Overlay: rounded-lg, font text-xl bold, padding 8px 16px, bg with 90% opacity.

### Reaction Buttons (Discovery tap alternative)

| Property     | Value                              |
|--------------|--------------------------------------|
| Style        | Pill buttons in a row              |
| Height       | 40px                               |
| Radius       | rounded-full                       |
| Gap          | space-2 (8px)                      |
| Default bg   | surface-elevated                   |
| Active bg    | respective swipe color at 20%      |
| Border       | 1px border-subtle                  |

### Tags (on scene cards)

| Property     | Value                              |
|--------------|--------------------------------------|
| Height       | 28px                               |
| Padding      | 4px 10px                           |
| Font         | text-xs, weight 500                |
| Bg           | surface-elevated                   |
| Border       | 1px border-subtle                  |
| Radius       | rounded-sm (6px)                   |
| Color        | text-secondary                     |

### Intensity Dots

| Property     | Value                              |
|--------------|--------------------------------------|
| Dot size     | 6px                                |
| Gap          | 4px                                |
| Active       | accent-primary                     |
| Inactive     | border-default                     |
| Count        | 1-5                                |

### Progress Bar (onboarding)

| Property     | Value                              |
|--------------|--------------------------------------|
| Height       | 4px                                |
| Bg (track)   | surface-elevated                   |
| Bg (fill)    | accent-gradient                    |
| Radius       | rounded-full                       |

### Match Percentage Circle

| Property     | Value                              |
|--------------|--------------------------------------|
| Size         | 120px                              |
| Stroke width | 6px                                |
| Track        | border-default                     |
| Fill         | accent-gradient (conic)            |
| Center text  | text-3xl, bold, text-primary       |
| Label below  | text-sm, text-secondary            |

### Body Map

| Property     | Value                              |
|--------------|--------------------------------------|
| SVG stroke   | text-muted (default zones)         |
| Active zone  | accent-primary fill at 30%         |
| Selected zone| accent-primary fill at 60%, stroke accent-primary |
| Rejected zone| feedback-error fill at 20%         |

### Chat Bubbles

| Property     | Value                              |
|--------------|--------------------------------------|
| User bubble  | accent-primary bg, text-inverse    |
| AI bubble    | surface-card bg, text-primary      |
| Avatar bubble| accent-secondary bg, text-inverse  |
| Radius       | rounded-2xl, bottom-right 4px (user), bottom-left 4px (AI) |
| Max width    | 80%                                |
| Padding      | space-3 vertical, space-4 horizontal |

---

## Glassmorphism Effect (use sparingly)

```css
.glass {
  background: rgba(26, 23, 32, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

Use for: navigation overlay, floating elements, card highlights.
Do NOT use for: main cards, backgrounds, buttons.

---

## Landing Page Specifics

- Hero: full-screen, accent-gradient overlay on dark bg
- Sections alternate: surface-base and surface-card backgrounds
- CTA buttons: accent-gradient bg, text-inverse, shadow-glow
- Testimonials: italic Inter, text-secondary
- Comic book sketch illustrations as decorative elements
