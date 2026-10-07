# Changelog

## 2.1.0 (2026-10-07)

### Models
- Nano Banana 2.1 (`gemini-nano-banana-2.1`) replaces Nano Banana 2 (`gemini-3.1-flash-image`) as the Standard model and the default. Google released it on 2026-10-06 and deprecated Nano Banana 2 the same day. Credit prices are unchanged.
- Standard renders at 1K, 2K and 4K (Nano Banana 2.1 has no 512px tier) and accepts up to 14 reference images.
- Saved settings and history that name Nano Banana 2 move to Nano Banana 2.1 automatically, and the image endpoint accepts the old id from cached frontends.

## 2.0.0 (2026-09-10)

The editor was rebuilt from the ground up for the current Nano Banana models.

### Models
- Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`), Nano Banana 2 (`gemini-3.1-flash-image`) and Nano Banana Pro (`gemini-3-pro-image`) selectable per render, with the credit cost shown next to each.
- Output at 512px, 1K, 2K and 4K where the model supports it.
- Extended aspect ratios (4:1, 1:4, 8:1, 1:8) on the Flash models.
- Thinking level control (fast or deep) on the Flash models.
- Google Search grounding for prompts that need real-world facts.
- Multi-turn edit context, so follow-up edits understand the thread.

### Editor
- New brand, light and dark themes with a system default, no flash on load.
- Composer with drag, drop and paste for reference images, a model picker, ratio and resolution controls, 1, 2 or 4 parallel variants.
- Brush and eraser masks with a live cursor, undo, and a coverage check.
- Before and after compare slider, one-click 4K re-render, copy to clipboard, PNG, JPG and WebP download.
- History that survives a refresh, with per-item settings, model notes, grounding sources and request details.
- Bring-your-own Gemini key stored only in the browser.
- Keyboard shortcuts that work: generate, modes, brush size, undo, compare, download, theme.
- Toasts for every error, with refunds explained.

### Backend
- One edge function, `nano-image`, handles generation and editing. It verifies the session, reserves credits before calling Gemini, refunds on failure, and logs usage.
- Credits can no longer be changed from the browser. The credit functions are service-role only and the open update policy is gone.
- New accounts start with 5 credits through a database trigger.
- `usage_log` table for model, size, credits, tokens and duration per render.

### Removed
- Client-side credit deduction.
- The `gemini-2.5-flash-image-preview` and `gemini-3-pro-image-preview` model ids.
- Unused canvas and segmentation code.

## 1.0.0 (2025-09)

First release. Text-to-image and conversational editing with Gemini 2.5 Flash Image, brush masks, history, credit packs through Stripe.
