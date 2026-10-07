(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const prefersDark = matchMedia("(prefers-color-scheme: dark)");

  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
    },
  };

  /* ------------------------------------------------------------------
     Bubbles: glossy soap bubbles drift upward; click one to pop it.
     ------------------------------------------------------------------ */
  const bubbles = (() => {
    const canvas = document.getElementById("bubbles");
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx) return { refresh() {} };

    const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    let width = 0;
    let height = 0;
    let dpr = 1;
    let list = [];
    let pops = [];
    let tint = [140, 220, 255];
    let rim = [255, 255, 255];
    let running = false;
    let last = 0;

    // Resolve any CSS color (including oklch) to RGB through a 1px canvas.
    function toRGB(color, fallback) {
      if (!probe || !color) return fallback;
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = `rgb(${fallback.join(",")})`;
      probe.fillStyle = color;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    }

    function readColors() {
      const css = getComputedStyle(root);
      tint = toRGB(css.getPropertyValue("--accent-hi").trim(), [140, 220, 255]);
      rim = toRGB(css.getPropertyValue("--sparkle").trim(), [255, 255, 255]);
    }

    function rgba(c, a) {
      return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    }

    function spawn(atBottom) {
      const r = 6 + Math.random() ** 1.6 * 34;
      return {
        x: Math.random() * width,
        y: atBottom ? height + r + Math.random() * height * 0.3 : Math.random() * height,
        r,
        speed: 0.12 + (1 - r / 40) * 0.35 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        sway: 0.25 + Math.random() * 0.5,
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = width < 700 ? 11 : 20;
      while (list.length < target) list.push(spawn(false));
      list.length = target;
      if (!running) draw();
    }

    function drawBubble(b) {
      const { x, y, r } = b;

      // Body: clear core, tinted rim
      const body = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
      body.addColorStop(0, rgba(tint, 0.02));
      body.addColorStop(0.72, rgba(tint, 0.08));
      body.addColorStop(0.93, rgba(tint, 0.34));
      body.addColorStop(1, rgba(rim, 0.6));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      // Specular highlight (top-left)
      ctx.beginPath();
      ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.3, r * 0.17, -0.65, 0, Math.PI * 2);
      ctx.fillStyle = rgba(rim, 0.85);
      ctx.fill();

      // Bounce light (bottom-right)
      ctx.beginPath();
      ctx.arc(x + r * 0.42, y + r * 0.45, r * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = rgba(rim, 0.45);
      ctx.fill();
    }

    function drawPop(p) {
      const t = p.t;
      ctx.strokeStyle = rgba(rim, 0.7 * (1 - t));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + t * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(tint, 0.9 * (1 - t));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + p.r;
        const d = p.r * (0.9 + t * 1.4);
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 2.2 * (1 - t) + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (const b of list) drawBubble(b);
      for (const p of pops) drawPop(p);
    }

    function step(now) {
      if (!running) return;
      const dt = Math.min((now - last) / 16.7, 3);
      last = now;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        b.y -= b.speed * dt;
        b.phase += 0.012 * dt;
        b.x += Math.sin(b.phase) * b.sway * 0.4 * dt;
        if (b.y < -b.r * 2) list[i] = spawn(true);
      }
      pops = pops.filter((p) => (p.t += 0.045 * dt) < 1);
      draw();
      requestAnimationFrame(step);
    }

    function start() {
      if (running || reduceMotion.matches || document.hidden) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(step);
    }

    function stop() {
      running = false;
    }

    // Pop a bubble under the pointer, unless the click was on a control.
    document.addEventListener("pointerdown", (event) => {
      if (event.target.closest("a, button, input, label, select, textarea")) return;
      const x = event.clientX;
      const y = event.clientY;
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        if ((x - b.x) ** 2 + (y - b.y) ** 2 <= (b.r + 6) ** 2) {
          pops.push({ x: b.x, y: b.y, r: b.r, t: 0 });
          list[i] = spawn(true);
          if (!running) draw();
          break;
        }
      }
    });

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    reduceMotion.addEventListener("change", () => {
      if (reduceMotion.matches) { stop(); draw(); } else { start(); }
    });

    readColors();
    resize();
    start();

    return {
      refresh() {
        readColors();
        if (!running) draw();
      },
    };
  })();

  /* ------------------------------------------------------------------
     Day / Night toggle (two states: follow system, or its opposite)
     ------------------------------------------------------------------ */
  const themeButton = document.getElementById("theme-toggle");
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');

  const currentTheme = () => {
    const pinned = root.dataset.theme;
    if (pinned === "light" || pinned === "dark") return pinned;
    return prefersDark.matches ? "dark" : "light";
  };

  function syncTheme() {
    themeButton.setAttribute("aria-pressed", String(currentTheme() === "dark"));
    bubbles.refresh();
  }

  themeButton.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    if (colorSchemeMeta) colorSchemeMeta.content = next;
    store.set("aw-theme", next);
    syncTheme();
  });

  prefersDark.addEventListener("change", syncTheme);
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  syncTheme();

  /* ------------------------------------------------------------------
     Skins: CSS reads the checked radio; we just remember the choice.
     ------------------------------------------------------------------ */
  const savedSkin = store.get("aw-skin");
  if (savedSkin) {
    const input = document.getElementById(`skin-${savedSkin}`);
    if (input) input.checked = true;
  }
  document.querySelectorAll('input[name="skin"]').forEach((input) => {
    input.addEventListener("change", () => {
      store.set("aw-skin", input.value);
      bubbles.refresh();
    });
  });
  bubbles.refresh();

  /* ------------------------------------------------------------------
     Player (a silent simulation: there is no audio on this page)
     ------------------------------------------------------------------ */
  const tracks = [
    { title: "Glass Lagoon", artist: "Sora Lake", length: 227, format: "FLAC 24/96" },
    { title: "Dewdrop Protocol", artist: "Lumen Koi", length: 194, format: "FLAC 16/44" },
    { title: "Aurora.exe", artist: "Neo Meadow", length: 262, format: "FLAC 24/96" },
    { title: "Koi Pond Sunrise", artist: "The Bubble Theory", length: 208, format: "320 KBPS" },
  ];

  const el = {
    play: document.getElementById("play"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    seek: document.getElementById("seek"),
    title: document.getElementById("track-title"),
    titleDup: document.getElementById("track-title-dup"),
    format: document.getElementById("track-format"),
    now: document.getElementById("time-now"),
    total: document.getElementById("time-total"),
    count: document.getElementById("track-count"),
    state: document.getElementById("lcd-state"),
  };

  let index = 0;
  let position = 84;
  let timer = null;

  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  function render() {
    const track = tracks[index];
    const label = `${track.title} · ${track.artist}`;
    el.title.textContent = label;
    el.titleDup.textContent = label;
    el.format.textContent = track.format;
    el.total.textContent = clock(track.length);
    el.now.textContent = clock(position);
    el.count.textContent = `TRK ${String(index + 1).padStart(2, "0")}/${String(tracks.length).padStart(2, "0")}`;
    el.seek.max = String(track.length);
    el.seek.value = String(position);
    el.seek.setAttribute("aria-valuetext", `${clock(position)} of ${clock(track.length)}`);
    el.seek.style.setProperty("--p", `${(position / track.length) * 100}%`);
  }

  function setPlaying(playing) {
    root.classList.toggle("is-playing", playing);
    el.play.setAttribute("aria-label", playing ? "Pause" : "Play");
    el.state.textContent = playing ? "▶ PLAYING" : "PAUSED";
    clearInterval(timer);
    timer = playing
      ? setInterval(() => {
          position += 1;
          if (position >= tracks[index].length) {
            index = (index + 1) % tracks.length;
            position = 0;
          }
          render();
        }, 1000)
      : null;
  }

  function change(delta) {
    index = (index + delta + tracks.length) % tracks.length;
    position = 0;
    render();
  }

  el.play.addEventListener("click", () => setPlaying(!root.classList.contains("is-playing")));
  el.prev.addEventListener("click", () => change(-1));
  el.next.addEventListener("click", () => change(1));
  el.seek.addEventListener("input", () => {
    position = Number(el.seek.value);
    render();
  });

  render();
})();
