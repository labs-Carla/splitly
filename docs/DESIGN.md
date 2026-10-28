# Splitly — Design System "DreamHunter"

Visual language inspired by the editorial workbook "La navaja suiza" and the talk deck "De aprendiz a creador" by Carla Valderrama and Sonia Cano G. Bold, editorial, high-contrast, playful hand-drawn accents.

Project authors: Carla Valderrama (GitHub @labs-Carla) and Sonia Cano G. (GitHub @DreamHunterG). Credits must always name both.

## Brand personality
Editorial, confident, creative, a bit rebellious. Feels like a printed zine or a creator's pocket manual, not a corporate SaaS. Spanish copy (Colombia), money in COP.

## Colors
| Token | Hex | Use |
|---|---|---|
| ink | #0C0C0C | Main dark background (hero, footer, cover sections), primary text on light |
| ink-soft | #1D1D1F | Cards on dark backgrounds |
| paper | #FFFFFF | Light sections background |
| cream | #FFF6EA | Alternate light sections, cards on white |
| fuchsia | #FF2E93 | Primary accent: highlighted words in headings, primary buttons, links |
| fuchsia-deep | #E6237F | Hover/pressed state of fuchsia; fuchsia text on white/cream (better contrast) |
| yellow | #FFE600 | Secondary accent: sparkles, highlights, badges, marker underline. Never as text color on light backgrounds |
| muted | #6B6B6B | Secondary text on light |

Contrast rules: yellow and fuchsia text only on ink. On light backgrounds use ink text; fuchsia-deep for accent words.

## Typography
- Display / headings: **Playfair Display** (serif), regular weight for huge titles, often UPPERCASE with wide letter-spacing for covers; mixed case for section titles ("UX/UI Sin rodeos" style). Very large sizes (clamp 2.5rem–5.5rem).
- Body / UI: **Open Sans** (stand-in for Aileron), 400 and 700. Labels and key terms in bold.
- Accent subtitle: Playfair Display UPPERCASE in fuchsia directly under a white title.

## Shapes & components
- Corners: small radius (8px) on inputs and cards; buttons are pill-shaped (999px).
- Buttons: primary = fuchsia background, ink text, bold; secondary = transparent with 2px current-color border.
- Cards: cream on light sections, ink-soft on dark, 1px hairline border, no heavy shadows.
- "Regla de oro" callout: italic bold text next to a yellow burst/sparkle shape.
- Badges/chips: yellow background, ink text, uppercase small bold.

## Decoration
- Hand-drawn white or black scribbles, loops and spirals in section corners (thin brush stroke, SVG).
- Four-point sparkle star ✦ in yellow next to headings.
- Long hand-drawn arrow pointing to key content.
- Alternate dark "cover" sections with light "page" sections, like a printed workbook.

## Layout
- Generous whitespace, left-aligned editorial text, max content width 1120px.
- Mobile first, works from 320px.
- Footer credit style: small centered "Hecho por Carla Valderrama (@labs-Carla) y Sonia Cano G. (@DreamHunterG)", each GitHub handle linking to its profile. Never credit only one author.
