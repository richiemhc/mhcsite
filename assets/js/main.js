/* Merit Hill Capital — interactions (vanilla, no dependencies) */
(function () {
  "use strict";

  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SAVE_DATA = navigator.connection && navigator.connection.saveData;
  const FOCUSABLE = 'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])';

  function trapFocus(container, e) {
    if (e.key !== "Tab") return;
    const items = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---- Mobile menu ---- */
  const toggle = document.querySelector(".nav-toggle");
  const drawer = document.getElementById("mobileNav");
  const backdrop = document.querySelector(".nav-backdrop");
  const closeBtn = document.querySelector(".mobile-nav__close");
  function openMenu() {
    drawer.classList.add("open");
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("open"));
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }
  function closeMenu() {
    if (!drawer.classList.contains("open")) return;
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => { backdrop.hidden = true; }, 300);
    toggle.focus();
  }
  if (toggle) {
    toggle.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    backdrop.addEventListener("click", closeMenu);
    drawer.addEventListener("keydown", (e) => trapFocus(drawer, e));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  /* ---- Carousels ---- */
  document.querySelectorAll(".carousel").forEach((carousel) => {
    const track = carousel.querySelector(".carousel__track");
    const prev = carousel.querySelector(".carousel__btn--prev");
    const next = carousel.querySelector(".carousel__btn--next");
    if (!track) return;
    const step = () => {
      const first = track.children[0];
      if (!first) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).gap) || 20;
      return first.getBoundingClientRect().width + gap;
    };
    const go = (dir) => {
      const max = track.scrollWidth - track.clientWidth;
      let target = track.scrollLeft + dir * step();
      if (target > max - 2) target = dir > 0 ? 0 : max;
      if (target < 0) target = max;
      track.scrollTo({ left: target, behavior: REDUCE ? "auto" : "smooth" });
    };
    if (next) next.addEventListener("click", () => go(1));
    if (prev) prev.addEventListener("click", () => go(-1));

    const scrollable = () => track.scrollWidth - track.clientWidth > 4;
    const delay = parseInt(carousel.dataset.autoplay || "0", 10);
    const canAuto = delay > 0 && !REDUCE;
    let timer = null, paused = !canAuto, pauseBtn = null;
    const start = () => { if (canAuto && !paused && !timer && scrollable()) timer = setInterval(() => go(1), delay); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    if (canAuto) {
      pauseBtn = document.createElement("button");
      pauseBtn.type = "button";
      pauseBtn.className = "carousel__pause";
      pauseBtn.setAttribute("aria-label", "Pause automatic rotation");
      pauseBtn.textContent = "⏸";
      pauseBtn.addEventListener("click", () => {
        paused = !paused;
        pauseBtn.textContent = paused ? "▶" : "⏸";
        pauseBtn.setAttribute("aria-label", paused ? "Start automatic rotation" : "Pause automatic rotation");
        paused ? stop() : start();
      });
      carousel.appendChild(pauseBtn);
      // pause on hover and on keyboard focus within the carousel
      carousel.addEventListener("mouseenter", stop);
      carousel.addEventListener("mouseleave", () => { if (!paused) start(); });
      carousel.addEventListener("focusin", stop);
      carousel.addEventListener("focusout", () => { if (!paused) start(); });
    }

    function sync() {
      const on = scrollable();
      if (prev) prev.hidden = !on;
      if (next) next.hidden = !on;
      if (pauseBtn) pauseBtn.hidden = !on;
      stop();
      if (on) start();
    }
    sync();
    window.addEventListener("resize", sync);
  });

  /* ---- Flip cards: keyboard + touch operable ---- */
  document.querySelectorAll(".flip").forEach((card) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    const titleEl = card.querySelector(".flip__title");
    if (titleEl) card.setAttribute("aria-label", titleEl.textContent.trim() + " — more info");
    const flip = () => card.classList.toggle("is-flipped");
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
    });
    if (window.matchMedia("(hover: none)").matches) card.addEventListener("click", flip);
  });

  /* ---- Property cards: reveal details on tap/keyboard (hover shows them on pointer devices) ---- */
  document.querySelectorAll(".prop-card").forEach((card) => {
    const labelEl = card.querySelector(".prop-card__overlay h3") || card.querySelector(".prop-card__label");
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    if (labelEl) card.setAttribute("aria-label", labelEl.textContent.trim() + " — details");
    const toggle = () => card.classList.toggle("is-revealed");
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
    // Touch devices have no hover — let a tap flip the overlay open/closed.
    if (window.matchMedia("(hover: none)").matches) card.addEventListener("click", toggle);
  });

  /* ---- Count-up stats ---- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const set = (el, v) => { el.textContent = Number(v).toLocaleString("en-US") + (el.dataset.suffix || ""); };
    if (REDUCE) {
      counters.forEach((el) => set(el, el.dataset.count));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target; io.unobserve(el);
          const end = parseFloat(el.dataset.count), dur = 1400, t0 = performance.now();
          const tick = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            set(el, Math.round(end * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }, { threshold: 0.4 });
      counters.forEach((c) => io.observe(c));
    }
  }

  /* ---- Scroll reveal ---- */
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && !REDUCE) {
    // threshold 0 (+ small bottom margin) so it fires for elements taller than the
    // viewport too — a high threshold never resolves for very tall blocks and would
    // leave them stuck at opacity:0.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((r) => io.observe(r));
    // Safety net: anything still hidden after load that's already in view gets shown.
    window.addEventListener("load", () => {
      reveals.forEach((r) => {
        const rect = r.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) r.classList.add("in");
      });
    });
  } else {
    reveals.forEach((r) => r.classList.add("in"));
  }

  /* ---- Hero video: autoplay (muted, looping) + a pause/play control (WCAG 2.2.2) ---- */
  document.querySelectorAll("video.hero__media").forEach((v) => {
    const hero = v.closest(".hero");
    if (!hero) return;
    v.muted = true;                 // required for autoplay
    v.play().catch(() => {});       // nudge playback (some browsers need an explicit call after JS runs)
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hero__videobtn";
    const sync = () => {
      btn.textContent = v.paused ? "▶" : "⏸";
      btn.setAttribute("aria-label", v.paused ? "Play background video" : "Pause background video");
    };
    btn.addEventListener("click", () => { v.paused ? v.play() : v.pause(); });
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    sync();
    hero.appendChild(btn);
  });

  /* ---- Key Milestones: horizontal zigzag timeline slider ---- */
  function mountMhts() {
    if (mountMhts.done) return;
    const wrap = document.getElementById("mhts-wrap");
    const vp = document.getElementById("mhts-vp");
    const track = document.getElementById("mhts-track");
    const mid = document.getElementById("mhts-mid");
    const prev = document.getElementById("mhts-prev");
    const next = document.getElementById("mhts-next");
    const bar = document.getElementById("mhts-bar");
    if (!wrap || !vp || !track || !mid || !prev || !next) return; // not present / not ready yet
    mountMhts.done = true;
    const TOTAL = parseInt(wrap.dataset.total || "22", 10);
    const STEP = 100 / TOTAL;
    let cur = 0;
    const vis = () => { const w = vp.offsetWidth; return w < 600 ? 1 : w < 900 ? 2 : 3; };
    const posArrows = () => {
      const wr = wrap.getBoundingClientRect(), mr = mid.getBoundingClientRect();
      prev.style.top = next.style.top = (mr.top + mr.height / 2 - wr.top) + "px";
    };
    const render = () => {
      const mx = TOTAL - vis();
      cur = Math.max(0, Math.min(cur, mx));
      track.style.transform = "translateX(-" + (cur * STEP) + "%)";
      prev.disabled = cur === 0;
      next.disabled = cur >= mx;
      if (bar) { bar.style.width = (vis() / TOTAL * 100) + "%"; bar.style.left = (cur / TOTAL * 100) + "%"; }
      posArrows();
    };
    prev.addEventListener("click", () => { cur -= 1; render(); });
    next.addEventListener("click", () => { cur += 1; render(); });
    render();
    let t;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(render, 120); });
  }
  mountMhts();
  window.addEventListener("load", mountMhts);

  /* ---- Contact form (static: compose a mailto) ---- */
  const cform = document.getElementById("contactForm");
  if (cform) {
    cform.addEventListener("submit", (e) => {
      e.preventDefault();
      const g = (n) => (cform.querySelector(`[name="${n}"]`) || {}).value || "";
      const body = `Name: ${g("Name")}\nCompany: ${g("Company")}\nEmail: ${g("Email")}\nPhone: ${g("Phone")}\n\n${g("Message")}`;
      window.location.href = "mailto:IR@merithillcapital.com?subject=" +
        encodeURIComponent("Website inquiry from " + (g("Name") || "")) +
        "&body=" + encodeURIComponent(body);
    });
  }

  /* ---- Team modal ---- */
  const modal = document.getElementById("teamModal");
  if (modal && window.mhcTeamData) {
    const panel = modal.querySelector(".modal__panel");
    const photo = modal.querySelector(".modal__photo");
    const nameEl = modal.querySelector(".modal__name");
    const titleEl = modal.querySelector(".modal__title");
    const bioEl = modal.querySelector(".modal__bio");
    const contactEl = modal.querySelector(".modal__contact");
    const closeM = modal.querySelector(".modal__close");
    const back = modal.querySelector(".modal__backdrop");
    const mainEl = document.getElementById("main");
    // Inert the rest of the page when the dialog is open — but NOT the modal,
    // which lives inside <main>, so inert main's siblings + its other children.
    const pageEls = [
      document.querySelector(".site-header"),
      document.querySelector(".site-footer"),
      ...(mainEl ? [...mainEl.children].filter((el) => el !== modal) : []),
    ].filter(Boolean);
    let lastFocused = null;

    function open(id, trigger) {
      const d = window.mhcTeamData[id];
      if (!d) return;
      lastFocused = trigger || document.activeElement;
      photo.classList.remove("is-loaded");
      photo.onload = () => photo.classList.add("is-loaded");
      photo.src = d.photo || d.thumb || "";
      photo.alt = d.name || "";
      if (photo.complete) photo.classList.add("is-loaded");
      nameEl.textContent = d.name || "";
      titleEl.textContent = d.title || "";
      bioEl.innerHTML = d.bio || "";
      let c = "";
      if (d.phone) c += `<a href="tel:${d.phone.replace(/[^0-9+]/g, "")}">${d.phone}</a>`;
      if (d.email) c += `<a href="mailto:${d.email}">${d.email}</a>`;
      if (d.linkedin) c += `<a href="${d.linkedin}" target="_blank" rel="noopener">LinkedIn</a>`;
      contactEl.innerHTML = c;
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
      pageEls.forEach((el) => el.setAttribute("inert", ""));
      closeM.focus();
    }
    function close() {
      if (!modal.classList.contains("open")) return;
      modal.classList.remove("open");
      document.body.style.overflow = "";
      pageEls.forEach((el) => el.removeAttribute("inert"));
      if (lastFocused) lastFocused.focus();
    }
    document.querySelectorAll("[data-member]").forEach((el) => {
      el.addEventListener("click", () => open(el.dataset.member, el));
    });
    closeM.addEventListener("click", close);
    back.addEventListener("click", close);
    modal.addEventListener("keydown", (e) => { if (e.key === "Tab") trapFocus(panel, e); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* ---- Portfolio map: plot owned/sold property dots + click-for-details popover ---- */
  const usMap = document.querySelector(".us-map[data-points]");
  if (usMap) {
    const dots = usMap.querySelector(".us-map__dots");
    const wrap = usMap.closest(".map-wrap");
    const SVGNS = "http://www.w3.org/2000/svg";
    let POINTS = [];
    let activeDot = null;
    let panMoved = false;

    // Detail popover (one reused element, anchored to the clicked dot). Lives on
    // <body> with fixed positioning so no transformed/stacked ancestor can offset it.
    const pop = document.createElement("div");
    pop.className = "map-pop";
    pop.hidden = true;
    document.body.appendChild(pop);

    const esc = (s) => String(s).replace(/[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const fmt = (n) => Number(n).toLocaleString("en-US");

    function closePop(restoreFocus) {
      pop.hidden = true; pop.dataset.open = "";
      if (activeDot) {
        activeDot.classList.remove("is-active");
        if (restoreFocus) activeDot.focus({ preventScroll: true });
        activeDot = null;
      }
    }

    function positionPop() {
      if (!activeDot) return;
      if (window.matchMedia("(max-width: 600px)").matches) {
        // Small screens: a fixed bottom card (anchoring to tiny dots is unusable).
        pop.classList.add("map-pop--fixed");
        pop.classList.remove("map-pop--below");
        pop.style.left = ""; pop.style.top = "";
        return;
      }
      // Larger screens: pin above the dot (viewport coords), clamped on-screen.
      pop.classList.remove("map-pop--fixed");
      const cr = activeDot.getBoundingClientRect();
      const cx = cr.left + cr.width / 2;
      const cy = cr.top + cr.height / 2;
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      const left = Math.max(8, Math.min(cx - pw / 2, window.innerWidth - pw - 8));
      const below = cy - ph - 14 < 8;
      pop.classList.toggle("map-pop--below", below);
      pop.style.left = left + "px";
      pop.style.top = (below ? cy + 16 : cy - ph - 14) + "px";
    }

    function openPop(i, circle) {
      const p = POINTS[i];
      if (!p) return;
      const grid = [];
      if (p.mgr) grid.push(`<div><dt>Manager</dt><dd>${esc(p.mgr)}</dd></div>`);
      if (p.year) grid.push(`<div><dt>Acquired</dt><dd>${p.year}</dd></div>`);
      if (p.units != null) grid.push(`<div><dt>Storage units</dt><dd>${fmt(p.units)}</dd></div>`);
      pop.innerHTML =
        `<button type="button" class="map-pop__close" aria-label="Close">&times;</button>` +
        `<span class="map-pop__status map-pop__status--${p.s ? "sold" : "owned"}">${p.s ? "Sold" : "Owned"}</span>` +
        `<h3 class="map-pop__title">${esc(p.name || "Property")}</h3>` +
        (p.addr ? `<p class="map-pop__addr">${esc(p.addr)}</p>` : "") +
        (grid.length ? `<dl class="map-pop__grid">${grid.join("")}</dl>` : "");

      if (activeDot) activeDot.classList.remove("is-active");
      activeDot = circle; circle.classList.add("is-active");
      pop.hidden = false;
      pop.dataset.open = "1";
      positionPop();
      pop.querySelector(".map-pop__close").focus({ preventScroll: true });
    }

    dots.addEventListener("click", (e) => {
      const c = e.target.closest("circle");
      if (!c) return;
      e.stopPropagation();
      if (panMoved) { panMoved = false; return; }  // a drag, not a tap
      openPop(Number(c.dataset.i), c);
    });
    dots.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const c = e.target.closest("circle");
      if (!c) return;
      e.preventDefault();
      openPop(Number(c.dataset.i), c);
    });
    pop.addEventListener("click", (e) => {
      if (e.target.closest(".map-pop__close")) closePop(true);
      else e.stopPropagation();
    });
    document.addEventListener("click", () => { if (pop.dataset.open) closePop(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pop.dataset.open) closePop(true); });
    window.addEventListener("resize", () => { if (pop.dataset.open) positionPop(); });
    document.addEventListener("scroll", () => { if (pop.dataset.open) positionPop(); }, true);

    /* ---- pan & zoom (drives the SVG viewBox; dots + map stay aligned) ---- */
    const VBW = 959, VBH = 593, MAXZOOM = 9;
    let vb = [0, 0, VBW, VBH];
    let resetBtn = null;

    function setVB() {
      usMap.setAttribute("viewBox", vb.join(" "));
      const zoomed = vb[2] < VBW - 0.5;
      usMap.classList.toggle("is-zoomable", zoomed);
      usMap.style.touchAction = zoomed ? "none" : "";   // free the page to scroll at base zoom
      if (resetBtn) resetBtn.disabled = !zoomed;
    }
    function clampVB() {
      vb[2] = Math.min(vb[2], VBW); vb[3] = Math.min(vb[3], VBH);
      vb[0] = Math.max(0, Math.min(vb[0], VBW - vb[2]));
      vb[1] = Math.max(0, Math.min(vb[1], VBH - vb[3]));
    }
    function toVB(clientX, clientY) {
      const r = usMap.getBoundingClientRect();
      return [vb[0] + (clientX - r.left) / r.width * vb[2],
              vb[1] + (clientY - r.top) / r.height * vb[3]];
    }
    function zoomTo(scale, fx, fy) {        // keep (fx,fy) fixed under the cursor
      const cur = VBW / vb[2];
      const nz = Math.max(1, Math.min(MAXZOOM, cur * scale));
      const nw = VBW / nz, nh = VBH / nz;
      vb[0] = fx - (fx - vb[0]) * (nw / vb[2]);
      vb[1] = fy - (fy - vb[1]) * (nh / vb[3]);
      vb[2] = nw; vb[3] = nh;
      clampVB(); setVB();
      if (pop.dataset.open) closePop(false);
    }
    function resetZoom() { vb = [0, 0, VBW, VBH]; setVB(); if (pop.dataset.open) closePop(false); }

    if (wrap) {
      const ctrl = document.createElement("div");
      ctrl.className = "map-zoom";
      ctrl.innerHTML =
        '<button type="button" class="map-zoom__btn" data-z="in" aria-label="Zoom in">+</button>' +
        '<button type="button" class="map-zoom__btn" data-z="out" aria-label="Zoom out">−</button>' +
        '<button type="button" class="map-zoom__btn" data-z="reset" aria-label="Reset zoom" title="Reset view">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"/></svg></button>';
      wrap.appendChild(ctrl);
      resetBtn = ctrl.querySelector('[data-z="reset"]');
      resetBtn.disabled = true;
      ctrl.addEventListener("click", (e) => {
        const btn = e.target.closest("button"); if (!btn) return;
        e.stopPropagation();
        const cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
        if (btn.dataset.z === "in") zoomTo(1.6, cx, cy);
        else if (btn.dataset.z === "out") zoomTo(1 / 1.6, cx, cy);
        else resetZoom();
      });
    }

    usMap.addEventListener("wheel", (e) => {
      e.preventDefault();
      const [fx, fy] = toVB(e.clientX, e.clientY);
      zoomTo(e.deltaY < 0 ? 1.18 : 1 / 1.18, fx, fy);
    }, { passive: false });

    usMap.addEventListener("dblclick", (e) => {
      e.preventDefault();
      const [fx, fy] = toVB(e.clientX, e.clientY);
      zoomTo(1.8, fx, fy);
    });

    // Drag to pan — only once zoomed in, so the page still scrolls over the map at base zoom.
    let panning = false, ps = [0, 0], pStart = null;
    usMap.addEventListener("pointerdown", (e) => {
      if (vb[2] >= VBW - 0.5) return;
      panning = true; panMoved = false; ps = [e.clientX, e.clientY]; pStart = vb.slice();
      try { usMap.setPointerCapture(e.pointerId); } catch (_) {}
      usMap.classList.add("is-grabbing");
    });
    usMap.addEventListener("pointermove", (e) => {
      if (!panning) return;
      const r = usMap.getBoundingClientRect();
      const dx = e.clientX - ps[0], dy = e.clientY - ps[1];
      if (!panMoved && Math.abs(dx) + Math.abs(dy) > 4) { panMoved = true; if (pop.dataset.open) closePop(false); }
      vb[0] = pStart[0] - dx / r.width * pStart[2];
      vb[1] = pStart[1] - dy / r.height * pStart[3];
      clampVB(); setVB();
    });
    const endPan = (e) => {
      if (!panning) return;
      panning = false; usMap.classList.remove("is-grabbing");
      try { usMap.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    usMap.addEventListener("pointerup", endPan);
    usMap.addEventListener("pointercancel", endPan);

    fetch(usMap.dataset.points)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((data) => {
        POINTS = data.points || [];
        const frag = document.createDocumentFragment();
        POINTS.forEach((p, i) => {
          const c = document.createElementNS(SVGNS, "circle");
          c.setAttribute("cx", p.x);
          c.setAttribute("cy", p.y);
          c.setAttribute("r", "3.7");
          c.setAttribute("class", "us-map__dot us-map__dot--" + (p.s ? "sold" : "owned"));
          c.setAttribute("data-i", i);
          c.setAttribute("tabindex", "0");
          c.setAttribute("role", "button");
          const label = (p.name || "Property") + " — " + (p.s ? "Sold" : "Owned");
          c.setAttribute("aria-label", label);
          const t = document.createElementNS(SVGNS, "title");
          t.textContent = label;
          c.appendChild(t);
          frag.appendChild(c);
        });
        if (dots) dots.appendChild(frag);
        const oc = document.querySelector("[data-count-owned]");
        const sc = document.querySelector("[data-count-sold]");
        if (oc && data.owned != null) oc.textContent = " (" + data.owned.toLocaleString("en-US") + ")";
        if (sc && data.sold != null) sc.textContent = " (" + data.sold.toLocaleString("en-US") + ")";
      })
      .catch(() => { /* leave the base map visible if the snapshot can't load */ });
  }
})();
