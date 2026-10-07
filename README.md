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

- **Player with real sound:** four original loops generated live with the Web Audio API (no audio files): chillout bells, chiptune, ambient, and Y2K pop. The disc spins, and both visualizers read the actual audio through an `AnalyserNode`.
- **Working EQ:** the presets drive five real filters (60 Hz · 230 Hz · 910 Hz · 3.6 kHz · 14 kHz), and the dB readouts update to match.
- **MSN-style notifications:** "has just signed in", now playing, EQ changes and bubble milestones, with a two-note chime once audio is on.
- **Live sky:** the hero sky follows your local time (dawn, daytime, golden hour, night) and fades between phases. Press the *Live sky* chip to preview the others.
- **Koi:** they swim below the waterline, pass behind the frosted glass, and scatter from your cursor or tap.
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
| `assets/js/music.js` | Web Audio synth: instruments, the four tracks, EQ chain, analyser |
| `assets/js/main.js` | Bubbles + koi canvas, toasts, theme, live sky, skins, player wiring |
| `docs/moodboard.md` | Research, palette, type, effect recipes and sources |

AeroWave, its artists and its tracks are fictional.
