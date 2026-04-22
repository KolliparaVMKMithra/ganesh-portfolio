const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") setTheme(saved);
  else {
    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
    setTheme(prefersLight ? "light" : "dark");
  }
  $("#theme")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    setTheme(next);
  });
}

async function postVisit(name) {
  try {
    const res = await fetch("/api/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function initGate() {
  const gate = $("#gate");
  const form = $("#gate-form");
  const input = $("#viewerName");
  const hint = $("#gate-hint");
  const hello = $("#hello");

  const existing = (localStorage.getItem("viewerName") || "").trim();
  if (existing) {
    gate?.remove();
    if (hello) hello.textContent = `Hi, ${existing}`;
    const pending = (localStorage.getItem("pendingVisitName") || "").trim();
    if (pending) {
      postVisit(pending).then((ok) => {
        if (ok) localStorage.removeItem("pendingVisitName");
      });
    }
    return;
  }

  input?.focus();
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (input?.value || "").trim().replace(/\s+/g, " ");
    if (!name || name.length > 60) {
      if (hint) hint.textContent = "Please enter a short name (1–60 chars).";
      return;
    }
    if (hint) hint.textContent = "Saving…";
    const ok = await postVisit(name);
    localStorage.setItem("viewerName", name);
    if (hello) hello.textContent = `Hi, ${name}`;
    if (!ok) localStorage.setItem("pendingVisitName", name);
    if (hint) hint.textContent = ok ? "Welcome." : "Welcome (offline log will sync later).";
    setTimeout(() => gate?.remove(), 400);
  });
}

function initCopy() {
  $("#year").textContent = new Date().getFullYear();
  $("#copyEmail")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("ganeshsuraj29@gmail.com");
      $("#copyEmail").textContent = "Copied";
      setTimeout(() => ($("#copyEmail").textContent = "Copy Email"), 900);
    } catch {
      // ignore
    }
  });
}

function initTilt() {
  const cards = $$(".tilt");
  const prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduce) return;

  for (const el of cards) {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (py - 0.5) * -14;
      const ry = (px - 0.5) * 16;
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    });
  }
}

function initSkillOrbs() {
  // deprecated (kept only to avoid breaking old imports)
}

function initSkillStacks() {
  const prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const stacks = $$(".skill-stack");
  if (!stacks.length) return;

  const sets = {
    prog: ["Python", "DSA", "OOP", "DBMS", "Java"],
    web: ["HTML", "CSS", "SQL", "FastAPI", "Docker", "Agile/Scrum", "React", "Next.js", "GitHub", "Postman"],
    ai: ["RAG", "LangChain", "FAISS", "Pinecone", "LLMs", "OCR", "Azure Vision", "Tesseract"],
  };

  const proof = {
    python: "Used across projects + coursework.",
    dsa: "Coursework + problem solving.",
    oop: "Core CS foundation.",
    dbms: "Coursework + SQL usage.",
    java: "Basics (coursework).",
    html: "Built interactive UIs.",
    css: "Performance + accessibility.",
    sql: "DBMS + real usage.",
    fastapi: "Backend APIs.",
    docker: "Containerized workflows.",
    "agile/scrum": "Team execution style.",
    react: "Modern frontend builds.",
    "next.js": "App routing + SSR patterns.",
    github: "Version control + collaboration.",
    postman: "API testing.",
    rag: "Document Analysis RAG.",
    langchain: "RAG orchestration.",
    faiss: "Vector retrieval.",
    pinecone: "Vector DB experience.",
    llms: "Prompting + integration.",
    ocr: "Smart Food tracker.",
    "azure vision": "Expiry detection pipeline.",
    tesseract: "OCR extraction.",
  };

  const normalize = (s) => s.trim().toLowerCase();

  let activeKey = "";
  let tooltip = null;

  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "skill-tip";
    tooltip.setAttribute("role", "status");
    tooltip.innerHTML = `<div class="skill-tip-title"></div><div class="skill-tip-body"></div>`;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function hideTooltip() {
    if (!tooltip) return;
    tooltip.classList.remove("in");
  }

  function setActive(skillKey) {
    activeKey = skillKey;
    for (const tile of $$(".skill-tile")) {
      tile.classList.toggle("active", tile.dataset.key === activeKey);
    }
    const projects = $$(".project[data-tags]");
    if (!activeKey) {
      for (const p of projects) p.classList.remove("match", "dim");
      return;
    }
    for (const p of projects) {
      const tags = (p.dataset.tags || "").split(/\s+/g);
      const match = tags.includes(activeKey);
      p.classList.toggle("match", match);
      p.classList.toggle("dim", !match);
    }
  }

  function showTooltipFor(tile) {
    const key = tile.dataset.key || "";
    const tip = ensureTooltip();
    $(".skill-tip-title", tip).textContent = tile.dataset.label || "";
    $(".skill-tip-body", tip).textContent = proof[key] || "Used in my builds.";

    const r = tile.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top - 12;
    tip.style.left = `${Math.round(x)}px`;
    tip.style.top = `${Math.round(y)}px`;
    tip.classList.add("in");
  }

  document.addEventListener("pointerdown", (e) => {
    if (!activeKey) return;
    if (e.target.closest?.(".skill-stack") || e.target.closest?.(".skill-tip")) return;
    setActive("");
    hideTooltip();
  });

  for (const stack of stacks) {
    const key = stack.dataset.stack || "prog";
    const list = sets[key] || sets.prog;
    stack.innerHTML = "";

    const frame = document.createElement("div");
    frame.className = "skill-frame";
    stack.appendChild(frame);

    const hint = document.createElement("div");
    hint.className = "skill-hint";
    hint.textContent = "Hover to lift • Click to highlight projects";
    stack.appendChild(hint);

    for (let i = 0; i < list.length; i++) {
      const label = list[i];
      const k = normalize(label);
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "skill-tile";
      tile.dataset.key = k;
      tile.dataset.label = label;
      tile.innerHTML = `<span class="skill-tile-text">${label}</span><span class="skill-tile-shine" aria-hidden="true"></span>`;
      frame.appendChild(tile);

      tile.addEventListener("pointerenter", () => {
        if (!prefersReduce && !activeKey) showTooltipFor(tile);
      });
      tile.addEventListener("pointerleave", () => {
        if (!activeKey) hideTooltip();
      });
      tile.addEventListener("click", () => {
        const next = activeKey === k ? "" : k;
        setActive(next);
        if (next) showTooltipFor(tile);
        else hideTooltip();
      });
    }

    if (!prefersReduce) {
      stack.addEventListener("mousemove", (e) => {
        const r = stack.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        stack.style.setProperty("--mx", `${px * 100}%`);
        stack.style.setProperty("--my", `${py * 100}%`);
      });
      stack.addEventListener("mouseleave", () => {
        stack.style.removeProperty("--mx");
        stack.style.removeProperty("--my");
        if (!activeKey) hideTooltip();
      });
    }
  }
}

function initReveal() {
  const prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduce) return;
  const els = [...$$(".hero"), ...$$(".section"), ...$$(".footer")];
  for (const el of els) el.classList.add("reveal");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) e.target.classList.add("in");
    },
    { threshold: 0.12, rootMargin: "40px 0px -10% 0px" }
  );
  for (const el of els) io.observe(el);
}

async function initHero3D() {
  const canvas = $("#hero3d");
  if (!canvas) return;
  const prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const hint = canvas.parentElement?.querySelector?.(".canvas-hint");
  if (prefersReduce && hint) hint.textContent = "3D reduced (prefers-reduced-motion).";

  let w = 0;
  let h = 0;
  let dpr = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = Math.max(2, Math.floor(r.width * dpr));
    h = Math.max(2, Math.floor(r.height * dpr));
    canvas.width = w;
    canvas.height = h;
  }
  resize();
  new ResizeObserver(resize).observe(canvas.parentElement);

  const points = [];
  const segs = 1000;
  const R = 1.55;
  const r = 0.62;
  const p = 2;
  const q = 3;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const phi = p * t;
    const theta = q * t;
    const cth = Math.cos(theta);
    const sth = Math.sin(theta);
    const x = (R + r * cth) * Math.cos(phi);
    const y = (R + r * cth) * Math.sin(phi);
    const z = r * sth;
    points.push({ x, y, z });
  }

  const stars = [];
  for (let i = 0; i < 360; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 2.4 + Math.random() * 4.0;
    const y = (Math.random() - 0.5) * 2.2;
    stars.push({ x: Math.cos(a) * rr, y, z: Math.sin(a) * rr });
  }

  const pointer = { x: 0, y: 0 };
  let scrollSpin = 0;
  let drag = false;
  let lastX = 0;
  let lastY = 0;
  let velX = 0;
  let velY = 0;

  window.addEventListener(
    "scroll",
    () => {
      scrollSpin = clamp(window.scrollY / 900, 0, 1);
    },
    { passive: true }
  );

  canvas.addEventListener(
    "pointermove",
    (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width - 0.5;
      pointer.y = (e.clientY - r.top) / r.height - 0.5;
      if (drag) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        velY += dx * 0.0009;
        velX += dy * 0.0009;
      }
    },
    { passive: true }
  );

  canvas.addEventListener("pointerdown", (e) => {
    drag = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  window.addEventListener("pointerup", () => {
    drag = false;
  });

  function rotX(v, a) {
    const s = Math.sin(a);
    const c = Math.cos(a);
    return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
  }
  function rotY(v, a) {
    const s = Math.sin(a);
    const c = Math.cos(a);
    return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
  }
  function project(v, scale, fov) {
    const z = v.z + fov;
    const k = fov / z;
    return { x: v.x * k * scale, y: v.y * k * scale, k };
  }

  let t0 = performance.now();
  function tick(now) {
    const dt = Math.min(34, now - t0);
    t0 = now;
    if (!prefersReduce) {
      velX *= 0.94;
      velY *= 0.94;
    } else {
      velX = 0;
      velY = 0;
    }

    const time = now * 0.001;
    const baseRX = time * 0.35 + scrollSpin * 1.1 + velX;
    const baseRY = time * 0.45 + scrollSpin * 1.4 + velY;
    const rx = baseRX + pointer.y * -0.9;
    const ry = baseRY + pointer.x * 1.2;

    ctx.clearRect(0, 0, w, h);

    // vignette glow
    const g = ctx.createRadialGradient(w * 0.55, h * 0.48, 10, w * 0.55, h * 0.48, Math.max(w, h) * 0.7);
    g.addColorStop(0, "rgba(34,211,238,0.09)");
    g.addColorStop(0.45, "rgba(139,92,246,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const scale = Math.min(w, h) * 0.18;
    const fov = 4.3;
    const cx = w * 0.52;
    const cy = h * 0.52;

    // stars
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s0 of stars) {
      let v = rotY(rotX(s0, rx * 0.25), ry * 0.25);
      const pr = project(v, scale * 0.9, fov + 2.2);
      const a = clamp(pr.k, 0, 1);
      ctx.fillStyle = `rgba(34,211,238,${0.12 * a})`;
      ctx.beginPath();
      ctx.arc(cx + pr.x, cy + pr.y, (0.6 + a * 1.4) * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // knot (glow stroke)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    const stroke = (alpha, width, hueShift) => {
      ctx.strokeStyle = `rgba(${hueShift ? "139,92,246" : "34,211,238"},${alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        let v = rotY(rotX(points[i], rx), ry);
        v.z *= 1.35;
        const pr = project(v, scale, fov);
        const x = pr.x * dpr;
        const y = pr.y * dpr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    stroke(0.14, 7.5 * dpr, 0);
    stroke(0.12, 4.2 * dpr, 1);
    stroke(0.30, 1.6 * dpr, 0);
    ctx.restore();

    // subtle depth dots on top
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < points.length; i += 8) {
      let v = rotY(rotX(points[i], rx), ry);
      v.z *= 1.35;
      const pr = project(v, scale, fov);
      const a = clamp((pr.k - 0.35) / 0.75, 0, 1);
      ctx.fillStyle = `rgba(167,243,208,${0.10 + a * 0.22})`;
      ctx.beginPath();
      ctx.arc(pr.x * dpr, pr.y * dpr, (0.9 + a * 1.6) * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (hint && hint.textContent.includes("reduced")) {
      // keep reduced hint
    } else if (hint && dt > 0) {
      hint.textContent = "Move • Drag • Scroll";
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initBackground3D() {
  const canvas = $("#bg3d");
  if (!canvas) return;
  const prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = Math.max(2, Math.floor(innerWidth * dpr));
    h = Math.max(2, Math.floor(innerHeight * dpr));
    canvas.width = w;
    canvas.height = h;
  }
  resize();
  addEventListener("resize", resize, { passive: true });

  const pointer = { x: 0, y: 0 };
  addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX / innerWidth - 0.5;
      pointer.y = e.clientY / innerHeight - 0.5;
    },
    { passive: true }
  );

  let scrollSpin = 0;
  addEventListener(
    "scroll",
    () => {
      scrollSpin = clamp(scrollY / 1200, 0, 1);
    },
    { passive: true }
  );

  // Creative 3D background: a drifting “constellation mesh” in 3D space with parallax.
  const points = [];
  const count = 140;
  const box = { x: 10.0, y: 6.0, z: 10.0 };
  for (let i = 0; i < count; i++) {
    points.push({
      x: (Math.random() - 0.5) * box.x,
      y: (Math.random() - 0.5) * box.y,
      z: (Math.random() - 0.5) * box.z,
      vx: (Math.random() - 0.5) * 0.015,
      vy: (Math.random() - 0.5) * 0.015,
      vz: (Math.random() - 0.5) * 0.015,
      p: Math.random() * Math.PI * 2,
    });
  }

  let pulse = 0;
  addEventListener(
    "pointerdown",
    () => {
      pulse = 1;
    },
    { passive: true }
  );

  function rotX(v, a) {
    const s = Math.sin(a);
    const c = Math.cos(a);
    return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
  }
  function rotY(v, a) {
    const s = Math.sin(a);
    const c = Math.cos(a);
    return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
  }
  function project(v, scale, fov) {
    const z = v.z + fov;
    const k = fov / z;
    return { x: v.x * k * scale, y: v.y * k * scale, k };
  }

  function colorForTheme() {
    const light = document.documentElement.dataset.theme === "light";
    return light
      ? {
          c1: "6,182,212", // cyan
          c2: "124,58,237", // violet
          c3: "16,185,129", // green
          star: "8,145,178",
        }
      : {
          c1: "34,211,238",
          c2: "139,92,246",
          c3: "167,243,208",
          star: "34,211,238",
        };
  }

  let lastTheme = "";
  let colors = colorForTheme();
  function tick(now) {
    const theme = document.documentElement.dataset.theme || "";
    if (theme !== lastTheme) {
      colors = colorForTheme();
      lastTheme = theme;
    }

    ctx.clearRect(0, 0, w, h);

    const time = now * 0.001;
    const rx = time * 0.10 + scrollSpin * 0.7 + (prefersReduce ? 0 : pointer.y * -0.85);
    const ry = time * 0.13 + scrollSpin * 1.0 + (prefersReduce ? 0 : pointer.x * 1.15);

    const cx = w * (0.5 + (prefersReduce ? 0 : pointer.x * 0.08) + Math.sin(time * 0.12 + scrollSpin * 1.8) * 0.05);
    const cy = h * (0.5 + (prefersReduce ? 0 : pointer.y * 0.06) + Math.cos(time * 0.10 + scrollSpin * 1.6) * 0.05);
    const scale = Math.min(w, h) * 0.24;
    const fov = 6.8 - scrollSpin * 1.2;

    // soft glow
    const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.85);
    glow.addColorStop(0, `rgba(${colors.c1},0.10)`);
    glow.addColorStop(0.5, `rgba(${colors.c2},0.06)`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // secondary glow to avoid “only in middle” feeling
    const glow2 = ctx.createRadialGradient(w * 0.15, h * 0.82, 10, w * 0.15, h * 0.82, Math.max(w, h) * 0.75);
    glow2.addColorStop(0, `rgba(${colors.c3},0.07)`);
    glow2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, w, h);

    if (!prefersReduce) pulse *= 0.93;
    else pulse = 0;

    // Drift points a bit (wrap around a 3D box)
    const drift = prefersReduce ? 0 : 1;
    for (const p of points) {
      p.p += 0.008 * drift;
      p.x += (p.vx + Math.cos(p.p) * 0.0015) * drift;
      p.y += (p.vy + Math.sin(p.p * 1.3) * 0.0012) * drift;
      p.z += p.vz * drift;

      if (p.x > box.x / 2) p.x = -box.x / 2;
      if (p.x < -box.x / 2) p.x = box.x / 2;
      if (p.y > box.y / 2) p.y = -box.y / 2;
      if (p.y < -box.y / 2) p.y = box.y / 2;
      if (p.z > box.z / 2) p.z = -box.z / 2;
      if (p.z < -box.z / 2) p.z = box.z / 2;
    }

    // Project and sort by depth
    const projected = new Array(points.length);
    for (let i = 0; i < points.length; i++) {
      let v = rotY(rotX(points[i], rx * 0.9), ry * 0.9);
      // Subtle “camera bob”
      v.y += Math.sin(time * 0.35) * 0.12;
      const pr = project(v, scale, fov);
      projected[i] = {
        x: cx + pr.x,
        y: cy + pr.y,
        k: pr.k,
        z: v.z,
      };
    }
    projected.sort((a, b) => a.k - b.k);

    // Draw links
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const linkDist = Math.min(w, h) * 0.20;
    for (let i = 0; i < projected.length; i++) {
      const a = projected[i];
      for (let j = i + 1; j < projected.length; j++) {
        const b = projected[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > linkDist * linkDist) continue;
        const d = Math.sqrt(d2);
        const t = 1 - d / linkDist;
        const depth = clamp((a.k + b.k) * 0.5, 0, 1);
        const alpha = (0.05 + t * 0.14) * (0.35 + depth * 0.8) + pulse * 0.06 * t;
        ctx.strokeStyle = `rgba(${colors.c1},${alpha})`;
        ctx.lineWidth = (0.6 + t * 1.0) * dpr;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Draw nodes
    for (const p of projected) {
      const depth = clamp(p.k, 0, 1);
      const r = (0.9 + depth * 2.4) * dpr;
      const alpha = (0.10 + depth * 0.25) + pulse * 0.12 * depth;
      ctx.fillStyle = `rgba(${colors.star},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      // tiny glow
      ctx.fillStyle = `rgba(${colors.c2},${0.05 + depth * 0.08})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

initTheme();
initGate();
initCopy();
initTilt();
initSkillStacks();
initReveal();
initBackground3D();
