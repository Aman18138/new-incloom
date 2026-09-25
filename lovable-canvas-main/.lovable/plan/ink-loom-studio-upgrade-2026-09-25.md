# Ink Loom Studio upgrade

## What I’ll build
- Replace the blank page with the uploaded Ink Loom creative studio, adapted to the current app structure.
- Keep the dark ink-and-gold visual language while improving hierarchy, spacing, mobile behavior, keyboard focus, and empty/loading states.
- Start with a polished example brand and two usable layout options so every control can be tried immediately.

## Built-in creative controls
- Add a searchable font picker with curated display/body pairings and immediate preview updates.
- Add editable brand colors, several suggested palettes, automatic matching suggestions, contrast/readability indicators, and a “New palette” generator.
- Add layout choices that switch the live page composition without changing the customer’s content.
- Add motion modes: off, subtle, expressive, plus reduced-motion support.
- Add a cliché audit that flags generic phrases and offers clearer replacement wording.

## Layout workflow
- Show desktop/mobile preview controls, zoom, fullscreen, layout switching, and HTML export.
- Add the merge-layout workspace from the uploaded files: choose sections from two options, reorder them, and apply the result.
- Keep attachment controls visible and validated; AI sending will use a graceful local demo response because no external generation service is connected.

## Technical details
- Recreate the missing shared types and color/file helpers referenced by the uploaded files.
- Adapt the uploaded React screens to TanStack Start and Tailwind v4, using semantic design tokens in the global stylesheet.
- Load web fonts through the page head, not CSS URL imports.
- Add route-specific title, description, Open Graph, and Twitter metadata.
- Verify the finished workspace at desktop and mobile widths, including core interactions and export.
