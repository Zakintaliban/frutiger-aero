# Moodboard & style guide: Y2K × Frutiger Aero × Glassmorphism

Research notes behind the AeroWave concept page. It covers where each aesthetic comes from, what it looks like, and how each trait maps to CSS.

---

## 1. The three ingredients

### Frutiger Aero (≈ 2004 – 2013)
- **Origin:** named by Sofi Xian of the Consumer Aesthetics Research Institute (CARI). The name joins the *Frutiger* typeface (Adrian Frutiger, 1976) and Microsoft's *Windows Aero* (Authentic, Energetic, Reflective, Open), introduced with Windows Vista in 2006. It came back as a Gen-Z nostalgia aesthetic around 2023.
- **Mood:** optimistic. Technology and nature live together in harmony.
- **Motifs:** blue skies, cumulus clouds, macro grass, water droplets, bubbles, half-underwater "waterline" shots, fish and koi, auroras, bokeh, lens flares, glossy orbs.
- **Materials:** skeuomorphic gloss with a hard white highlight across the top half of each control, translucent glass that is more saturated and reflective than modern glassmorphism, deep soft drop shadows.
- **Sub-genres:** Frutiger Eco (greener, sustainability), Frutiger Metro (flatter, Windows 8 era), Technozen, Frutiger Glacier / Cyber Glacier (icy).

### Y2K (≈ 1997 – 2004)
- **Mood:** millennium futurism, maximal and playful.
- **Motifs:** chrome and liquid-metal lettering with a dark "horizon band" through the middle, iridescent and holographic surfaces (CDs!), blobs and organic shapes used as buttons, four-point sparkles, translucent candy plastic (iMac G3), pixel fonts, 88×31 web badges, visitor counters, scrolling marquee text.
- **Color:** candy-bright hues anchored by metallic silver.

### Glassmorphism (2020 →)
Four parts make it work:
1. **Transparency:** a low-opacity fill (white or dark, about 10–30%).
2. **Backdrop blur:** `backdrop-filter: blur()` frosts whatever sits behind the panel.
3. **Light border:** a thin, semi-transparent white edge that "catches the light".
4. **Soft shadow:** a diffuse shadow that lifts the pane off a vivid background (aurora or mesh gradient).

---

## 2. The blend: rules for this page

| Layer | Comes from | How it shows up on the page |
|---|---|---|
| Scene | Frutiger Aero | Sky hero → grass hills → **waterline** → underwater sections, plus a night-aurora theme |
| Surfaces | Glassmorphism + Aero | Frosted panels, a white top sheen, and a hard diagonal reflection streak (Vista glass) |
| Controls | Frutiger Aero | Glossy pill buttons with a split highlight and outer glow |
| Accents | Y2K | Chrome / iridescent headline word, holographic CD, sparkles, LCD pixel readouts, marquee, 88×31 badges |
| Type | Frutiger (humanist) + Y2K | Humanist body, wide rounded display face, pixel LCD face for data |

Keep the boldness in one place. The hero headline word and the holographic player carry the spectacle, and everything below the waterline stays calmer.

---

## 3. Palette

### Day (light)
| Token | Value | Role |
|---|---|---|
| sky top → horizon | `oklch(55% .15 h)` → `oklch(97% .02 h)` | Hero sky (hue shifts slightly with the skin) |
| sea 1 / 2 / 3 | `#4fd0ea` / `#25b1df` / `#1592cc` | Underwater gradient |
| grass hi / mid / deep | `#c9f76a` / `#6cc72c` / `#2f8f1f` | Hills (Aero "artificial grass") |
| ink | `#052340` | Text, navy with a blue bias |
| accent | `oklch(60% .16 var(--hue))` | Glossy controls; hue set by skin picker |
| glass | `rgb(255 255 255 / .30–.62)` | Frosted panels |

### Night (dark): aurora variant
| Token | Value | Role |
|---|---|---|
| sky | `oklch(14–42% …)` | Deep navy to teal horizon glow |
| aurora ribbons | `#3dffb5`, `#a78bfa` | Light ribbons (they turn into white "Vista swooshes" by day) |
| sea | `#0b4a6e` → `#031527` | Bioluminescent deep water |
| LCD | `#062a2c` on `#7ff7e6` | Glowing pixel readout |

### Skins (accent hue)
Aqua `225` · Meadow `145` · Aurora `300` · Bubblegum `350`, in OKLCH hue degrees.

Reference palettes collected:
- Frutiger Aero: `#87ceeb` sky, `#7ec8e3` aqua glow, `#0054e3` XP blue, `#0997ff` title-bar blue, `#7cfc00` grass, `#ffffff`.
- Alternative Aero: `#88cc00`, `#00aaff`, `#ffffff`, `#e6f3ff`.
- Y2K: `#7df9ff` electric blue, `#ff6ec7` hot pink, `#bfff00` lime, `#c0c0c0` chrome, `#bc13fe` cyber purple, `#a7c7e7` baby blue.

---

## 4. Typography

| Role | Face | Why |
|---|---|---|
| Display | **Unbounded** 700/800 | Wide, rounded, geometric, with a millennium-gadget feel. Takes the chrome fill well |
| Body | **Hind** 400–600 | Free humanist sans and a close stand-in for Frutiger / Segoe UI: open apertures, high legibility |
| Data / LCD | **VT323** | Pixel readout like an MP3 player's LCD. Used only for numbers, timecodes and eyebrows |

Frutiger, Segoe UI and Myriad Pro aren't on Google Fonts, so they appear only in fallback stacks.

---

## 5. Effect recipes

- **Aero glass panel:** a 160° white gradient fill (62% → 30%), `backdrop-filter: blur(18px) saturate(170%)`, a 1px white edge, a 1px inset top highlight, and a 115° hard-stop reflection streak in `::before`.
- **Glossy button:** a vertical gradient with a hard split at 50%, a white "lens" highlight over the top half, an inner bottom glow and a colored outer glow.
- **Chrome text:** a 180° banded gradient (white → pale → dark horizon band at 50% → pale → white), clipped to text, with a thin dark drop-shadow edge and an iridescent overlay that drifts slowly.
- **Holographic CD:** a `conic-gradient` rainbow with a static conic "shine" layer on top, so the light stays put while the disc spins.
- **Bubbles:** canvas circles with a transparent core, a tinted rim, a white specular highlight at top-left and a faint bounce light at bottom-right. They pop on click.

---

## 6. Content concept

**AeroWave**, a fictional music player that "floats". It gives the page reasons to use authentic gadget details:
- A five-band EQ at 60 Hz · 230 Hz · 910 Hz · 3.6 kHz · 14 kHz (the classic 5-band split)
- A lossless readout at 24-bit / 96 kHz, with a to-scale bitrate comparison (128 → 320 → 4,608 kbps PCM)
- An iTunes-style segmented capacity bar for sync
- Swappable skins, the way Winamp and WMP did it

---

## 7. Sources

Live pages on cari.institute, Wikipedia, webdesignmuseum.org and trends.daisyui.com were blocked from this build environment. The notes above come from search summaries of these pages:

- [Frutiger Aero (Wikipedia)](https://en.wikipedia.org/wiki/Frutiger_Aero)
- [CARI: Frutiger Aero](https://cari.institute/aesthetics/frutiger-aero)
- [Frutiger Aero Archive](https://frutigeraeroarchive.org) · [History](https://frutigeraeroarchive.org/history)
- [Dazed: What is Frutiger Aero](https://dazeddigital.com/life-culture/article/58103/1/what-is-frutiger-aero-aesthetic-tiktok-msn-messenger-windows-vista-noughties)
- [daisyUI trends: Frutiger Aero](https://trends.daisyui.com/trend/frutiger-aero/) · [Glassmorphism](https://trends.daisyui.com/trend/glassmorphism/)
- [Windows Aero (Wikipedia)](https://en.wikipedia.org/wiki/Windows_Aero)
- [Web Design Museum: Y2K Aesthetic in Web Design](https://www.webdesignmuseum.org/exhibitions/y2k-aesthetic-in-web-design)
- [Webflow: Y2K aesthetic](https://webflow.com/blog/y2k-aesthetic)
- [Made Good Designs: Y2K color palette](https://madegooddesigns.com/y2k-color-palette/)
- [Eggradients: Frutiger Aero colors](https://www.eggradients.com/palette/frutiger-aero-colors) · [Design Pieces: Frutiger Aero palette](https://www.designpieces.com/palette/frutiger-aero-color-palette-hex-and-rgb/)
- [Design Pieces: Frutiger Aero design resources](https://www.designpieces.com/2026/08/frutiger-aero-design-resources/) (it mentions the *Frutiger Aero Player* Dribbble shot: translucent blue hardware, pearlescent buttons, pixel readout, green LED)
- [LogRocket: What is glassmorphism](https://blog.logrocket.com/ux-design/what-is-glassmorphism) · [IxDF: Glassmorphism](https://ixdf.org/literature/topics/glassmorphism)
- [Font alternatives to Frutiger](https://fontalternatives.com/alternatives/frutiger/)
- Dribbble glassmorphism landing-page shots: [endisaliaj](https://dribbble.com/endisaliaj), [pranavvvmak](https://dribbble.com/pranavvvmak)
