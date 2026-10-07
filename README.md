# AeroWave: a Y2K × Frutiger Aero × Glassmorphism concept

A one-page concept site for **AeroWave**, a fictional music player. The page goes from a sunny sky hero, past grassy hills and a waterline, into an underwater section of frosted-glass panels.

- **Frutiger Aero:** sky, clouds, lens flare, grass hills, a waterline, light rays, bubbles, glossy orbs, night aurora
- **Y2K:** chrome / iridescent headline, holographic CD, sparkles, pixel LCD readouts, a marquee, 88×31 badges, a visitor counter
- **Glassmorphism:** frosted, blurred panels with light edges, plus a Vista-style reflection streak

## Run it

It's a static site with no build step. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000
```

## What's interactive

- **Player:** play/pause, previous/next, seek. It's a silent simulation; the disc spins and the LCD visualizer moves while it "plays".
- **Skins:** Aqua / Meadow / Aurora / Bubblegum recolor the whole page (pure CSS via `:has()`).
- **Day / Night:** the toggle switches between sky and aurora themes. It follows your system setting by default.
- **EQ presets:** move the five-band sliders (pure CSS).
- **Bubbles:** click one to pop it.
- Respects `prefers-reduced-motion`. Glass falls back to solid panels where `backdrop-filter` isn't supported.

## Files

| Path | What |
|---|---|
| `index.html` | Markup |
| `assets/css/style.css` | Design tokens (day / night / skins), materials, layout, motion |
| `assets/js/main.js` | Bubbles canvas, theme toggle, skins memory, player simulation |
| `docs/moodboard.md` | Research, palette, type, effect recipes and sources |

AeroWave, its artists and its tracks are fictional.
