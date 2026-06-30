/* Merit Hill Capital — interactions (vanilla, no dependencies) */
(function () {
  "use strict";

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
  }
  function closeMenu() {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => { backdrop.hidden = true; }, 300);
  }
  if (toggle) {
    toggle.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    backdrop.addEventListener("click", closeMenu);
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
      if (target > max - 2) target = dir > 0 ? 0 : max;       // wrap
      if (target < 0) target = max;
      track.scrollTo({ left: target, behavior: "smooth" });
    };
    if (next) next.addEventListener("click", () => go(1));
    if (prev) prev.addEventListener("click", () => go(-1));

    // autoplay
    const delay = parseInt(carousel.dataset.autoplay || "0", 10);
    if (delay > 0) {
      let timer = setInterval(() => go(1), delay);
      carousel.addEventListener("mouseenter", () => clearInterval(timer));
      carousel.addEventListener("mouseleave", () => { timer = setInterval(() => go(1), delay); });
    }
  });

  /* ---- Flip cards on touch (tap to flip) ---- */
  if (window.matchMedia("(hover: none)").matches) {
    document.querySelectorAll(".flip").forEach((card) => {
      card.addEventListener("click", () => card.classList.toggle("is-flipped"));
    });
  }

  /* ---- Count-up stats ---- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const end = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const dur = 1400;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = Math.round(end * eased);
          el.textContent = val.toLocaleString("en-US") + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => io.observe(c));
  }

  /* ---- Scroll reveal ---- */
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach((r) => io.observe(r));
  } else {
    reveals.forEach((r) => r.classList.add("in"));
  }

  /* ---- Contact form (static: compose a mailto) ---- */
  const cform = document.getElementById("contactForm");
  if (cform) {
    cform.addEventListener("submit", (e) => {
      e.preventDefault();
      const g = (n) => (cform.querySelector(`[name="${n}"]`) || {}).value || "";
      const body =
        `Name: ${g("Name")}\nCompany: ${g("Company")}\nEmail: ${g("Email")}\nPhone: ${g("Phone")}\n\n${g("Message")}`;
      const href =
        "mailto:IR@merithillcapital.com?subject=" +
        encodeURIComponent("Website inquiry from " + (g("Name") || "")) +
        "&body=" + encodeURIComponent(body);
      window.location.href = href;
    });
  }

  /* ---- Team modal ---- */
  const modal = document.getElementById("teamModal");
  if (modal && window.mhcTeamData) {
    const photo = modal.querySelector(".modal__photo");
    const nameEl = modal.querySelector(".modal__name");
    const titleEl = modal.querySelector(".modal__title");
    const bioEl = modal.querySelector(".modal__bio");
    const contactEl = modal.querySelector(".modal__contact");
    const closeM = modal.querySelector(".modal__close");
    const back = modal.querySelector(".modal__backdrop");

    function open(id) {
      const d = window.mhcTeamData[id];
      if (!d) return;
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
      closeM.focus();
    }
    function close() { modal.classList.remove("open"); document.body.style.overflow = ""; }
    document.querySelectorAll("[data-member]").forEach((el) => {
      el.addEventListener("click", () => open(el.dataset.member));
    });
    closeM.addEventListener("click", close);
    back.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }
})();
