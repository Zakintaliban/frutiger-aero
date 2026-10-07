(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const prefersDark = matchMedia("(prefers-color-scheme: dark)");
  const music = window.AeroMusic && window.AeroMusic.supported ? window.AeroMusic : null;

  const storage = (area) => ({
    get(key) {
      try { return window[area].getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { window[area].setItem(key, value); } catch (e) { /* storage unavailable */ }
    },
  });
  const store = storage("localStorage");
  const session = storage("sessionStorage");

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ------------------------------------------------------------------
     Toasts: MSN Messenger-style notifications, bottom right
     ------------------------------------------------------------------ */
  const toasts = (() => {
    const region = document.getElementById("toasts");
    const byKey = new Map();

    function dismiss(node) {
      if (!node.isConnected || node.classList.contains("is-out")) return;
      clearTimeout(node.timer);
      node.classList.remove("is-in");
      node.classList.add("is-out");
      byKey.forEach((value, key) => { if (value === node) byKey.delete(key); });
      setTimeout(() => node.remove(), 450);
    }

    function arm(node, ms) {
      clearTimeout(node.timer);
      node.timer = setTimeout(() => dismiss(node), ms);
    }

    function build() {
      const node = h("div", "toast glass");
      const bar = h("div", "toast-bar");
      const close = h("button", "toast-close", "×");
      close.type = "button";
      close.setAttribute("aria-label", "Dismiss notification");
      close.addEventListener("click", () => dismiss(node));
      bar.append(h("span", "player-mini-orb"), h("span", "toast-app", "AeroWave"), close);

      const body = h("div", "toast-body");
      const avatar = h("span", "toast-avatar");
      avatar.setAttribute("aria-hidden", "true");
      const text = h("div", "toast-text");
      text.append(h("p", "toast-title"), h("p", "toast-msg"));
      body.append(avatar, text);

      node.append(bar, body);
      node.addEventListener("pointerenter", () => clearTimeout(node.timer));
      node.addEventListener("pointerleave", () => arm(node, 2500));
      return node;
    }

    function show({ key, title, message, hue = 210, sound = false }) {
      let node = key ? byKey.get(key) : null;
      if (!node) {
        node = build();
        region.append(node);
        if (key) byKey.set(key, node);
        const open = [...region.children].filter((n) => !n.classList.contains("is-out"));
        if (open.length > 3) dismiss(open[0]);
        requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add("is-in")));
      }
      node.querySelector(".toast-title").textContent = title;
      node.querySelector(".toast-msg").textContent = message;
      node.querySelector(".toast-avatar").style.setProperty("--th", hue);
      arm(node, 5200);
      if (sound && music) music.chime();
    }

    return { show };
  })();

  /* ------------------------------------------------------------------
     Scene canvas: soap bubbles (whole page) + koi (below the waterline)
     ------------------------------------------------------------------ */
  const scene = (() => {
    const canvas = document.getElementById("bubbles");
    const ctx = canvas && canvas.getContext("2d");
    const ocean = document.querySelector(".ocean");
    if (!ctx || !ocean) return { refresh() {}, onPop() {} };

    const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const TAU = Math.PI * 2;
    let width = 0;
    let height = 0;
    let bubbles = [];
    let pops = [];
    let koi = [];
    let tint = [140, 220, 255];
    let rim = [255, 255, 255];
    let koiAlpha = 0.95;
    let koiShadow = "rgba(0,40,80,0.14)";
    let oceanTop = 0;
    let oceanBottom = 0;
    let running = false;
    let last = 0;
    let popped = 0;
    let popListener = () => {};
    const pointer = { cx: -1e4, cy: -1e4, t: 0, mouse: false };

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
      koiAlpha = parseFloat(css.getPropertyValue("--koi-alpha")) || 0.95;
      koiShadow = css.getPropertyValue("--koi-shadow").trim() || koiShadow;
    }

    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const wrap = (a) => {
      a = (a + Math.PI) % TAU;
      return (a < 0 ? a + TAU : a) - Math.PI;
    };

    function measureOcean() {
      const r = ocean.getBoundingClientRect();
      oceanTop = r.top + window.scrollY;
      oceanBottom = r.bottom + window.scrollY;
    }

    /* ---- Bubbles ---- */
    function spawnBubble(atBottom) {
      const r = 6 + Math.random() ** 1.6 * 34;
      return {
        x: Math.random() * width,
        y: atBottom ? height + r + Math.random() * height * 0.3 : Math.random() * height,
        r,
        speed: 0.12 + (1 - r / 40) * 0.35 + Math.random() * 0.12,
        phase: Math.random() * TAU,
        sway: 0.25 + Math.random() * 0.5,
      };
    }

    function drawBubble(b) {
      const { x, y, r } = b;
      const body = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
      body.addColorStop(0, rgba(tint, 0.02));
      body.addColorStop(0.72, rgba(tint, 0.08));
      body.addColorStop(0.93, rgba(tint, 0.34));
      body.addColorStop(1, rgba(rim, 0.6));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = body;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.3, r * 0.17, -0.65, 0, TAU);
      ctx.fillStyle = rgba(rim, 0.85);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + r * 0.42, y + r * 0.45, r * 0.09, 0, TAU);
      ctx.fillStyle = rgba(rim, 0.45);
      ctx.fill();
    }

    function drawPop(p) {
      const t = p.t;
      ctx.strokeStyle = rgba(rim, 0.7 * (1 - t));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + t * 0.6), 0, TAU);
      ctx.stroke();
      ctx.fillStyle = rgba(tint, 0.9 * (1 - t));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + p.r;
        const d = p.r * (0.9 + t * 1.4);
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 2.2 * (1 - t) + 0.4, 0, TAU);
        ctx.fill();
      }
    }

    /* ---- Koi ---- */
    const PROFILE = [0.62, 0.9, 1, 0.98, 0.9, 0.8, 0.68, 0.55, 0.42, 0.3, 0.2, 0.12];
    const SEGS = PROFILE.length;
    const KOI_STYLES = [
      { base: "#fff7f0", spots: ["#ff5a1f", "#ff7136"], fin: "rgba(255,255,255,0.55)" }, // kohaku
      { base: "#ffc83d", spots: ["#ff9a1a"], fin: "rgba(255,222,140,0.55)" }, // yamabuki
      { base: "#fffaf6", spots: ["#ff4b1a", "#1f2433"], fin: "rgba(255,255,255,0.5)" }, // sanke
      { base: "#ff7a2e", spots: ["#fff4ea"], fin: "rgba(255,198,150,0.55)" }, // orange ogon
      { base: "#f4f7fb", spots: ["#ff4a24"], fin: "rgba(255,255,255,0.55)", tancho: true }, // tancho
      { base: "#fff3e6", spots: ["#ff6a2a", "#ffb23d"], fin: "rgba(255,240,220,0.5)" },
    ];

    function spawnKoi(i) {
      const style = KOI_STYLES[i % KOI_STYLES.length];
      const len = 74 + Math.random() * 40;
      const minY = oceanTop + 140;
      const maxY = Math.max(minY + 1, oceanBottom - 120);
      const x = 60 + Math.random() * Math.max(1, width - 120);
      const y = minY + Math.random() * (maxY - minY);
      const angle = Math.random() * TAU - Math.PI;
      const k = {
        x, y, angle, target: angle,
        speed: 0.5 + Math.random() * 0.3,
        boost: 1,
        phase: Math.random() * TAU,
        w: len * 0.13,
        seg: len / (SEGS - 1),
        style,
        segs: [],
        pose: [],
        spots: [],
      };
      for (let j = 0; j < SEGS; j++) {
        k.segs.push({ x: x - Math.cos(angle) * k.seg * j, y: y - Math.sin(angle) * k.seg * j });
        k.pose.push({ x: 0, y: 0, nx: 0, ny: 0, dir: 0 });
      }
      if (style.tancho) {
        k.spots.push({ i: 0.6, side: 0, r: 0.72, c: style.spots[0] });
      } else {
        const count = 2 + Math.floor(Math.random() * 3);
        for (let s = 0; s < count; s++) {
          k.spots.push({
            i: 0.5 + Math.random() * 7,
            side: (Math.random() * 2 - 1) * 0.7,
            r: 0.55 + Math.random() * 0.7,
            c: style.spots[s % style.spots.length],
          });
        }
      }
      return k;
    }

    function updateKoi(k, dt, now) {
      const minY = oceanTop + 120;
      const maxY = oceanBottom - 100;
      const margin = 60;
      k.target += (Math.random() - 0.5) * 0.06 * dt;
      let rate = 0.025;

      if (k.x < margin || k.x > width - margin || k.y < minY || k.y > maxY) {
        const cx = Math.min(Math.max(k.x, margin * 3), width - margin * 3);
        const cy = Math.min(Math.max(k.y, minY + 100), maxY - 100);
        k.target = Math.atan2(cy - k.y, cx - k.x);
        rate = 0.05;
      }

      // Scatter away from the pointer (a resting mouse, or a recent tap)
      if (pointer.mouse || now - pointer.t < 2000) {
        const dx = k.x - pointer.cx;
        const dy = k.y - (pointer.cy + window.scrollY);
        if (dx * dx + dy * dy < 160 * 160) {
          k.target = Math.atan2(dy, dx);
          rate = 0.16;
          k.boost = Math.max(k.boost, 3.4);
        }
      }

      k.target = k.angle + wrap(k.target - k.angle);
      k.angle = wrap(k.angle + Math.max(-rate, Math.min(rate, wrap(k.target - k.angle))) * dt);
      k.boost += (1 - k.boost) * 0.025 * dt;
      const v = k.speed * k.boost * dt;
      k.x += Math.cos(k.angle) * v;
      k.y += Math.sin(k.angle) * v;
      k.phase += (0.07 + 0.045 * k.boost) * dt;

      // Follow-the-leader spine: the tail trails the head naturally.
      const s = k.segs;
      s[0].x = k.x;
      s[0].y = k.y;
      for (let j = 1; j < SEGS; j++) {
        const ax = s[j].x - s[j - 1].x;
        const ay = s[j].y - s[j - 1].y;
        const d = Math.hypot(ax, ay) || 1;
        s[j].x = s[j - 1].x + (ax / d) * k.seg;
        s[j].y = s[j - 1].y + (ay / d) * k.seg;
      }
    }

    function smoothClosed(points) {
      const path = new Path2D();
      const n = points.length;
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const start = mid(points[n - 1], points[0]);
      path.moveTo(start[0], start[1]);
      for (let i = 0; i < n; i++) {
        const p = points[i];
        const m = mid(p, points[(i + 1) % n]);
        path.quadraticCurveTo(p[0], p[1], m[0], m[1]);
      }
      path.closePath();
      return path;
    }

    function drawKoi(k, offsetY) {
      const { segs, pose, w, style } = k;
      const left = [];
      const right = [];
      for (let j = 0; j < SEGS; j++) {
        const a = segs[Math.max(j - 1, 0)];
        const b = segs[Math.min(j + 1, SEGS - 1)];
        const dir = Math.atan2(a.y - b.y, a.x - b.x);
        const nx = -Math.sin(dir);
        const ny = Math.cos(dir);
        const wiggle = Math.sin(k.phase - j * 0.55) * w * 0.35 * (j / SEGS);
        const p = pose[j];
        p.x = segs[j].x + nx * wiggle;
        p.y = segs[j].y - offsetY + ny * wiggle;
        p.nx = nx;
        p.ny = ny;
        p.dir = dir;
        const half = w * PROFILE[j];
        left.push([p.x + nx * half, p.y + ny * half]);
        right.push([p.x - nx * half, p.y - ny * half]);
      }
      const head = pose[0];
      const tip = [head.x + Math.cos(head.dir) * w * 0.95, head.y + Math.sin(head.dir) * w * 0.95];
      const body = smoothClosed([tip, ...left, ...right.reverse()]);

      ctx.globalAlpha = koiAlpha;

      // Soft shadow on the "floor" below the fish
      ctx.save();
      ctx.translate(w * 0.5, w * 0.9);
      ctx.fillStyle = koiShadow;
      ctx.fill(body);
      ctx.restore();

      // Fins sit under the body
      ctx.fillStyle = style.fin;
      const fin = pose[2];
      const flap = Math.sin(k.phase * 1.4) * 0.25;
      for (const side of [1, -1]) {
        const rot = fin.dir + side * (2.36 + flap);
        const ax = fin.x + fin.nx * side * w * 0.8;
        const ay = fin.y + fin.ny * side * w * 0.8;
        ctx.beginPath();
        ctx.ellipse(ax + Math.cos(rot) * w * 0.7, ay + Math.sin(rot) * w * 0.7, w * 0.95, w * 0.38, rot, 0, TAU);
        ctx.fill();
      }
      const tail = pose[SEGS - 1];
      const tailDir = tail.dir + Math.PI + Math.sin(k.phase - SEGS * 0.55) * 0.5;
      const tl = w * 2.3;
      const lobe = (s) => [tail.x + Math.cos(tailDir + s * 0.55) * tl, tail.y + Math.sin(tailDir + s * 0.55) * tl];
      const [l1x, l1y] = lobe(1);
      const [l2x, l2y] = lobe(-1);
      const nx = tail.x + Math.cos(tailDir) * tl * 0.55;
      const ny = tail.y + Math.sin(tailDir) * tl * 0.55;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.quadraticCurveTo(tail.x + Math.cos(tailDir + 0.9) * tl * 0.6, tail.y + Math.sin(tailDir + 0.9) * tl * 0.6, l1x, l1y);
      ctx.quadraticCurveTo(nx, ny, l2x, l2y);
      ctx.quadraticCurveTo(tail.x + Math.cos(tailDir - 0.9) * tl * 0.6, tail.y + Math.sin(tailDir - 0.9) * tl * 0.6, tail.x, tail.y);
      ctx.fill();

      // Body, patterned spots, glossy highlight
      ctx.fillStyle = style.base;
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      for (const spot of k.spots) {
        const j = Math.min(Math.floor(spot.i), SEGS - 2);
        const f = spot.i - j;
        const a = pose[j];
        const b = pose[j + 1];
        const px = a.x + (b.x - a.x) * f + a.nx * spot.side * w;
        const py = a.y + (b.y - a.y) * f + a.ny * spot.side * w;
        ctx.beginPath();
        ctx.arc(px, py, spot.r * w, 0, TAU);
        ctx.fillStyle = spot.c;
        ctx.fill();
      }
      ctx.beginPath();
      for (let j = 1; j < 7; j++) {
        const p = pose[j];
        const x = p.x + p.nx * w * 0.32;
        const y = p.y + p.ny * w * 0.32;
        if (j === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = w * 0.32;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      // Eyes
      ctx.fillStyle = "#1a1f2b";
      for (const side of [1, -1]) {
        ctx.beginPath();
        ctx.arc(
          head.x + Math.cos(head.dir) * w * 0.3 + head.nx * side * w * 0.48,
          head.y + Math.sin(head.dir) * w * 0.3 + head.ny * side * w * 0.48,
          Math.max(1.3, w * 0.11), 0, TAU
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* ---- Loop ---- */
    function draw() {
      ctx.clearRect(0, 0, width, height);
      const scrollY = window.scrollY;
      if (oceanBottom - scrollY > 0 && oceanTop - scrollY < height) {
        for (const k of koi) {
          const sy = k.y - scrollY;
          if (sy > -160 && sy < height + 160) drawKoi(k, scrollY);
        }
      }
      for (const b of bubbles) drawBubble(b);
      for (const p of pops) drawPop(p);
    }

    function step(now) {
      if (!running) return;
      const dt = Math.min((now - last) / 16.7, 3);
      last = now;
      measureOcean();
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.speed * dt;
        b.phase += 0.012 * dt;
        b.x += Math.sin(b.phase) * b.sway * 0.4 * dt;
        if (b.y < -b.r * 2) bubbles[i] = spawnBubble(true);
      }
      for (const k of koi) updateKoi(k, dt, now);
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

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureOcean();

      const bubbleCount = width < 700 ? 11 : 20;
      while (bubbles.length < bubbleCount) bubbles.push(spawnBubble(false));
      bubbles.length = bubbleCount;

      const koiCount = width < 700 ? 3 : 6;
      while (koi.length < koiCount) koi.push(spawnKoi(koi.length));
      koi.length = koiCount;
      for (const k of koi) k.x = Math.min(k.x, width - 40);

      if (!running) draw();
    }

    // Pop a bubble under the pointer, unless the press was on a control.
    document.addEventListener("pointerdown", (event) => {
      pointer.cx = event.clientX;
      pointer.cy = event.clientY;
      pointer.t = performance.now();
      if (event.target.closest("a, button, input, label, select, textarea")) return;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if ((event.clientX - b.x) ** 2 + (event.clientY - b.y) ** 2 <= (b.r + 6) ** 2) {
          pops.push({ x: b.x, y: b.y, r: b.r, t: 0 });
          bubbles[i] = spawnBubble(true);
          popped += 1;
          popListener(popped);
          if (!running) draw();
          break;
        }
      }
    });

    document.addEventListener("pointermove", (event) => {
      pointer.cx = event.clientX;
      pointer.cy = event.clientY;
      pointer.t = performance.now();
      pointer.mouse = event.pointerType === "mouse";
    });

    document.documentElement.addEventListener("pointerleave", () => {
      pointer.cx = -1e4;
      pointer.cy = -1e4;
    });

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", () => { if (!running) draw(); }, { passive: true });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    reduceMotion.addEventListener("change", () => {
      if (reduceMotion.matches) { stop(); draw(); } else { start(); }
    });
    window.addEventListener("load", () => { measureOcean(); if (!running) draw(); });

    readColors();
    resize();
    start();

    return {
      refresh() {
        readColors();
        if (!running) draw();
      },
      onPop(fn) {
        popListener = fn;
      },
    };
  })();

  const POP_MILESTONES = {
    10: "You popped 10 bubbles. Bubble wrap is shaking.",
    25: "25 bubbles popped. There are plenty more where those came from.",
    50: "50 bubbles! The koi are impressed.",
    100: "100 bubbles. You win the internet, 2007 edition.",
  };
  scene.onPop((count) => {
    if (POP_MILESTONES[count]) {
      toasts.show({ key: "pop", title: "Bubble popper", message: POP_MILESTONES[count], hue: 190, sound: true });
    }
  });

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
    scene.refresh();
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
     Live sky: the hero sky follows the viewer's local time
     ------------------------------------------------------------------ */
  (() => {
    const chip = document.getElementById("sky-chip");
    if (!chip) return;
    const modeEl = document.getElementById("sky-mode");
    const timeEl = document.getElementById("sky-time");
    const nameEl = document.getElementById("sky-name");
    const ORDER = ["dawn", "day", "sunset", "night"];
    const NAMES = { dawn: "Dawn", day: "Daytime", sunset: "Golden hour", night: "Night" };
    const HUES = { dawn: 330, day: 210, sunset: 40, night: 270 };
    const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
    let preview = null;
    let live = null;

    const phaseAt = (date) => {
      const hour = date.getHours();
      if (hour >= 5 && hour < 8) return "dawn";
      if (hour >= 8 && hour < 17) return "day";
      if (hour >= 17 && hour < 20) return "sunset";
      return "night";
    };

    function render() {
      const now = new Date();
      const phase = phaseAt(now);
      if (live && phase !== live && !preview) {
        toasts.show({ key: "sky", title: "The sky is changing", message: `${NAMES[phase]} has arrived where you are.`, hue: HUES[phase], sound: true });
      }
      live = phase;
      const shown = preview || live;
      root.dataset.sky = shown;
      modeEl.textContent = preview ? "Preview" : "Live sky";
      timeEl.textContent = preview ? "" : timeFormat.format(now);
      timeEl.hidden = Boolean(preview);
      nameEl.textContent = NAMES[shown];
    }

    chip.addEventListener("click", () => {
      const next = ORDER[(ORDER.indexOf(preview || live) + 1) % ORDER.length];
      preview = next === live ? null : next;
      render();
    });

    render();
    setInterval(render, 30000);
  })();

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
      scene.refresh();
    });
  });
  scene.refresh();

  /* ------------------------------------------------------------------
     Player: generated music (Web Audio), live visualizers, real EQ
     ------------------------------------------------------------------ */
  const tracks = [
    { title: "Glass Lagoon", artist: "Sora Lake", length: 227, format: "FLAC 24/96", hue: 200 },
    { title: "Dewdrop Protocol", artist: "Lumen Koi", length: 194, format: "FLAC 16/44", hue: 150 },
    { title: "Aurora.exe", artist: "Neo Meadow", length: 262, format: "FLAC 24/96", hue: 290 },
    { title: "Koi Pond Sunrise", artist: "The Bubble Theory", length: 208, format: "320 KBPS", hue: 30 },
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
  let playing = false;

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

  function announceTrack() {
    const track = tracks[index];
    toasts.show({ key: "now", title: "Now playing", message: `${track.title} · ${track.artist}`, hue: track.hue });
  }

  /* ---- Visualizers driven by the analyser ---- */
  const lcdBars = [...document.querySelectorAll(".lcd-viz i")];
  const cardBars = [...document.querySelectorAll(".viz-bars i")];
  let vizFrame = 0;
  let freq = null;

  function levels(count) {
    const nyquist = music.sampleRate() / 2;
    const bins = freq.length;
    const lo = 45;
    const hi = 9000;
    const out = [];
    for (let i = 0; i < count; i++) {
      const f0 = lo * (hi / lo) ** (i / count);
      const f1 = lo * (hi / lo) ** ((i + 1) / count);
      const b0 = Math.min(bins - 1, Math.floor((f0 / nyquist) * bins));
      const b1 = Math.min(bins, Math.max(b0 + 1, Math.ceil((f1 / nyquist) * bins)));
      let sum = 0;
      for (let b = b0; b < b1; b++) sum += freq[b];
      const v = (sum / (b1 - b0) / 255) * (1 + (i / count) * 0.7);
      out.push(Math.min(1, v));
    }
    return out;
  }

  function paint(bars, values) {
    for (let i = 0; i < bars.length; i++) {
      bars[i].style.scale = `1 ${(0.06 + 0.94 * values[i] ** 1.5).toFixed(3)}`;
    }
  }

  function vizLoop() {
    const analyser = music && music.analyser();
    if (!analyser || !root.classList.contains("audio-live")) return;
    if (!freq || freq.length !== analyser.frequencyBinCount) freq = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freq);
    paint(lcdBars, levels(lcdBars.length));
    paint(cardBars, levels(cardBars.length));
    vizFrame = requestAnimationFrame(vizLoop);
  }

  function startViz() {
    if (!music || reduceMotion.matches) return;
    root.classList.add("audio-live");
    cancelAnimationFrame(vizFrame);
    vizFrame = requestAnimationFrame(vizLoop);
  }

  function stopViz() {
    root.classList.remove("audio-live");
    cancelAnimationFrame(vizFrame);
    for (const bar of [...lcdBars, ...cardBars]) bar.style.removeProperty("scale");
  }

  /* ---- Transport ---- */
  function setPlaying(next) {
    playing = next;
    root.classList.toggle("is-playing", playing);
    el.play.setAttribute("aria-label", playing ? "Pause" : "Play");
    el.state.textContent = playing ? "▶ PLAYING" : "PAUSED";
    clearInterval(timer);
    timer = null;

    if (playing) {
      if (music) music.play(index);
      startViz();
      announceTrack();
      timer = setInterval(() => {
        position += 1;
        if (position >= tracks[index].length) {
          index = (index + 1) % tracks.length;
          position = 0;
          if (music) music.setTrack(index);
          announceTrack();
        }
        render();
      }, 1000);
    } else {
      if (music) music.pause();
      stopViz();
    }
  }

  function change(delta) {
    index = (index + delta + tracks.length) % tracks.length;
    position = 0;
    render();
    if (playing) {
      if (music) music.setTrack(index);
      announceTrack();
    }
  }

  el.play.addEventListener("click", () => setPlaying(!playing));
  el.prev.addEventListener("click", () => change(-1));
  el.next.addEventListener("click", () => change(1));
  el.seek.addEventListener("input", () => {
    position = Number(el.seek.value);
    render();
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) stopViz();
    else if (playing) startViz();
  });

  /* ---- EQ: the CSS preset levels drive real filter gains ---- */
  const eqCard = document.querySelector(".card-eq");
  const dbLabels = eqCard ? [...eqCard.querySelectorAll(".db")] : [];
  const PRESETS = { flat: "Flat", bass: "Bass boost", vocal: "Vocal", sparkle: "Sparkle" };

  function syncEq(preset) {
    if (!eqCard) return;
    const css = getComputedStyle(eqCard);
    const gains = [1, 2, 3, 4, 5].map((n) => Math.round((parseFloat(css.getPropertyValue(`--l${n}`)) - 0.5) * 24));
    dbLabels.forEach((label, i) => {
      const g = gains[i];
      label.textContent = `${g > 0 ? "+" : g < 0 ? "−" : ""}${Math.abs(g)} dB`;
    });
    if (music) music.setEq(gains);
    if (preset && playing) {
      toasts.show({ key: "eq", title: "Equalizer", message: `${PRESETS[preset]} preset applied.`, hue: 225 });
    }
  }

  document.querySelectorAll('input[name="eq"]').forEach((input) => {
    input.addEventListener("change", () => syncEq(input.value));
  });
  syncEq();

  render();

  /* ---- MSN-style hello, once per visit ---- */
  if (!session.get("aw-hello")) {
    session.set("aw-hello", "1");
    setTimeout(() => {
      if (!playing) {
        toasts.show({
          key: "hello",
          title: "AeroWave has just signed in.",
          message: music ? "Press play on the player to hear Glass Lagoon." : "Press play on the player to start the demo.",
          hue: 200,
        });
      }
    }, 1800);
  }
})();
