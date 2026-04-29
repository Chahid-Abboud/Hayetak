# Hayetak Brand Palette

This palette is derived from the live theme tokens in `resources/css/app.css`, so it matches the current dashboard, charts, and light/dark mode styling.

## Core 8-Color Palette

| Name | Hex | Use |
| --- | --- | --- |
| Primary / 500 | `#8FC73F` | Main brand green, buttons, active states |
| Primary / 400 | `#A6D74F` | Bright highlight, graph accents, hover states |
| Primary / 900 | `#35501D` | Strong green text or contrast accent |
| Secondary / 100 | `#E6F4CC` | Soft fills, chips, light surfaces |
| Accent / Soft | `#F1F8E4` | Tinted cards, subtle callouts |
| Neutral / 50 | `#FBFCFD` | Light background |
| Neutral / 900 | `#262D34` | Main text and dark neutral anchor |
| Neutral / 950 | `#0F1114` | Dark background |

## Light and Dark Theme Sheet

### Light Mode

| Role | Hex |
| --- | --- |
| Background | `#FBFCFD` |
| Surface | `#FFFFFF` |
| Text | `#262D34` |
| Primary | `#8FC73F` |
| Primary Strong | `#35501D` |
| Secondary Fill | `#E6F4CC` |
| Accent Fill | `#F1F8E4` |
| Border | `#E4E8EC` |

### Dark Mode

| Role | Hex |
| --- | --- |
| Background | `#0F1114` |
| Surface | `#161A1F` |
| Text | `#F4F6F7` |
| Primary | `#8FC73F` |
| Primary Strong | `#A6D74F` |
| Secondary Fill | `#1A2E16` |
| Accent Fill | `#1E2816` |
| Border | `#242A31` |

## CSS Variables

These aliases now exist in `resources/css/app.css` and can be reused anywhere in the app:

```css
--palette-primary-500
--palette-primary-400
--palette-primary-900
--palette-secondary-100
--palette-accent-soft
--palette-neutral-50
--palette-neutral-900
--palette-neutral-950

--theme-bg
--theme-surface
--theme-text
--theme-primary
--theme-primary-strong
--theme-secondary
--theme-accent
--theme-border
```

## Figma-Friendly Naming

| Figma Token | Hex |
| --- | --- |
| `Brand/Primary/500` | `#8FC73F` |
| `Brand/Primary/400` | `#A6D74F` |
| `Brand/Primary/900` | `#35501D` |
| `Support/Secondary/100` | `#E6F4CC` |
| `Support/Accent/Soft` | `#F1F8E4` |
| `Neutral/50` | `#FBFCFD` |
| `Neutral/900` | `#262D34` |
| `Neutral/950` | `#0F1114` |

## Dashboard Graph Accent Guide

To keep charts readable and on-theme, these are the intended bright accent lanes:

| Graph | Color |
| --- | --- |
| Weight trend | `var(--info)` |
| Height trend | `var(--warning)` |
| Gym progress | `var(--success)` |
| Predictor trend | `var(--primary)` / `var(--palette-primary-400)` |
| Calorie distribution categories | Distinct theme-support colors with clear contrast in both modes |
