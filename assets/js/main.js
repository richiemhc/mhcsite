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
    if (!wrap || !vp || !track || !mid || !prev || !next) return; // not present / not ready yet
    mountMhts.done = true;
    const TOTAL = parseInt(wrap.dataset.count || "22", 10);
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
})();
