// Shared by all 3 pages. build-ghl.py inlines it into each GHL paste file.
// Offer end: Dec 20 2026, 11:59 pm Pacific (assumed until Jason confirms). Change it here only.
(function () {
  var END = Date.parse("2026-12-21T07:59:59Z");
  var pad = function (n) { return String(n).padStart(2, "0"); };

  function tick() {
    var left = Math.max(0, END - Date.now());
    var d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24,
        m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
    document.querySelectorAll("[data-countdown]").forEach(function (el) {
      if (!left) { el.textContent = "Early Bird has ended"; return; }
      var parts = { d: d, h: pad(h), m: pad(m), s: pad(s) };
      el.querySelectorAll("[data-unit]").forEach(function (u) { u.textContent = parts[u.dataset.unit]; });
    });
  }
  tick();
  setInterval(tick, 1000);

  // --- Lead source. UTMs land on page 1 but the form is on page 3, so:
  // 1) save the latest ad params in this browser for 90 days (survives a return visit),
  // 2) fall back to Google/Meta click cookies, 3) also carry params on links to the next step.
  // Same idea as the live window.ccAttribution helper, under its own key so the two never clash.
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"];
  var STORE = "cc_eb_attr", DAYS90 = 90 * 864e5;
  var url = new URLSearchParams(location.search), attr = {};
  KEYS.forEach(function (k) { if (url.get(k)) attr[k] = url.get(k); });
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && Date.now() - saved.t >= DAYS90) saved = null;
    if (Object.keys(attr).length) {
      // Same visit carried to the next step: keep the first landing page.
      var same = saved && KEYS.every(function (k) { return (saved.v[k] || "") === (attr[k] || ""); });
      attr.landing_page = same ? saved.v.landing_page : location.pathname;
      localStorage.setItem(STORE, JSON.stringify({ t: same ? saved.t : Date.now(), v: attr }));
    } else if (saved) {
      attr = saved.v;
    }
  } catch (e) { /* storage blocked: query string carry below still works */ }
  // Cabin picked on page 2 (page 3 only; not stored or carried).
  var CABINS = { selkirk: "Selkirk", apex: "Apex", shuswap: "Shuswap", monashee: "Monashee", elkhorn: "Elkhorn", multiple: "2 to 4 cabins side by side" };
  var cabin = CABINS[url.get("cabin")];
  if (cabin) {
    attr.cabin = cabin; // GHL hidden field "cabin" -> Make -> Constant Contact custom field
    var chip = document.getElementById("picked-cabin");
    if (chip) { chip.querySelector("[data-cabin-name]").textContent = cabin; chip.hidden = false; }
  }
  // Click cookies only when nothing else says where they came from (a newsletter UTM beats an old ad cookie).
  var cookie = function (n) { var m = document.cookie.match("(?:^|; )" + n + "=([^;]*)"); return m ? decodeURIComponent(m[1]) : ""; };
  if (!attr.utm_source) {
    if (!attr.gclid && cookie("_gcl_aw")) attr.gclid = cookie("_gcl_aw").split(".").pop();
    if (!attr.fbclid && cookie("_fbc")) attr.fbclid = cookie("_fbc").split(".").pop();
  }

  // Carry params on every link to another funnel step (mockup: page-N.html; GHL: /sled-early-bird...).
  document.querySelectorAll("a[data-step-link]").forEach(function (a) {
    var next = new URL(a.getAttribute("href"), location.href);
    KEYS.forEach(function (k) { if (attr[k]) next.searchParams.set(k, attr[k]); });
    a.href = next.pathname + next.search;
  });
  // Fill hidden form fields (mockup form, or the GHL form's hidden fields with the same names).
  // Safe to call again: the GHL form can render after this script runs.
  var eventId = "eb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  function fillHidden() {
    document.querySelectorAll("form input[type=hidden]").forEach(function (input) {
      if (input.value) return;
      var v = input.name === "event_id" ? eventId : attr[input.name];
      if (!v) return;
      input.value = v;
      // GHL's form is a Vue app: without an input event it keeps its own (empty) copy of the value.
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  fillHidden();

  window.dataLayer = window.dataLayer || [];

  // --- GHL page 3: the native form shows its own thank-you message. Fire the lead event once when it appears.
  var ghl = document.querySelector("[data-ghl-success-text]");
  if (ghl) {
    var successText = ghl.dataset.ghlSuccessText, fired = false;
    var shown = function () { // GHL may keep the message in the page, hidden, before submit: require it visible.
      var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
      while ((n = walk.nextNode())) {
        if (n.nodeValue.indexOf(successText) > -1 && n.parentElement.getClientRects().length) return true;
      }
      return false;
    };
    new MutationObserver(function () {
      fillHidden();
      if (fired || !shown()) return;
      fired = true;
      document.querySelectorAll("[data-before-submit]").forEach(function (el) { el.hidden = true; });
      document.querySelectorAll("[data-after-submit]").forEach(function (el) { el.hidden = false; });
      var idInput = document.querySelector("input[name=event_id]");
      window.dataLayer.push({ event: "sled_earlybird_lead", event_id: (idInput && idInput.value) || eventId });
    }).observe(document.body, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ["style", "class", "hidden"] });
  }


  // Photo slide (top to bottom) starts when the frame scrolls into view.
  var panFrames = document.querySelectorAll(".cc-photo__frame");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    panFrames.forEach(function (f) { if (f.querySelector(".cc-pan")) io.observe(f); });
  } else { panFrames.forEach(function (f) { f.classList.add("is-in"); }); }

  // Button press ripple.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.addEventListener("pointerdown", function (ev) {
      var b = ev.target.closest && ev.target.closest(".cc-btn");
      if (!b) return;
      var r = b.getBoundingClientRect(), dot = document.createElement("span");
      dot.className = "cc-ripple"; dot.style.left = (ev.clientX - r.left) + "px"; dot.style.top = (ev.clientY - r.top) + "px";
      b.appendChild(dot); setTimeout(function () { dot.remove(); }, 650);
    });
  }

  // All pages: opening sequence (page 1/2 hero, page 3 VIP card), then sections reveal on scroll and replay when scrolled back up.
  var heroEl = document.querySelector(".cc-hero"), vipEl = document.querySelector(".cc-vip");
  if ((heroEl || vipEl) && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (heroEl) heroEl.classList.add("is-opening");
    if (vipEl) { vipEl.classList.add("is-opening"); var vbg = document.querySelector(".cc-vip-bg"); if (vbg) vbg.classList.add("is-opening"); }
    if ("IntersectionObserver" in window) {
      var groups = document.querySelectorAll("main .cc-section, main .cc-after");
      var sel = ".cc-kicker, .cc-h2, .cc-body, .cc-photo, .cc-deal, .cc-term, .cc-acc__item, .cc-compare, .cc-map, .cc-caption, .cc-faq details, .cc-section-cta, .cc-card, .cc-after > h2, .cc-terms li, .cc-center";
      groups.forEach(function (sec) {
        var items = sec.querySelectorAll(sel);
        [].forEach.call(items, function (el, i) { el.classList.add("rv"); el.style.setProperty("--rv-d", Math.min(i, 8) * 120 + "ms"); });
      });
      var rvIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); }
          else { e.target.classList.remove("in"); e.target.setAttribute("data-from", e.boundingClientRect.top < 0 ? "top" : "bottom"); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      document.querySelectorAll(".rv").forEach(function (el) { rvIO.observe(el); });
    }
  }
  // Falling snow (same effect as the live hero): 20 flakes, skipped for reduced motion.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".cc-snow").forEach(function (box) {
      var count = parseInt(box.getAttribute("data-flakes"), 10) || 20;
      for (var i = 0; i < count; i++) {
        var f = document.createElement("i"), size = 2.3 + Math.random() * 2.5;
        f.style.cssText = "left:" + (Math.random() * 100) + "%;width:" + size + "px;height:" + size + "px;animation-duration:" +
          (4 + Math.random() * 4.6) + "s;animation-delay:" + (Math.random() * 6) + "s";
        box.appendChild(f);
      }
    });
  }

  // Accordion ("What's included"): one panel open at a time, real buttons, arrow keys move between rows.
  document.querySelectorAll("[data-accordion]").forEach(function (acc) {
    var btns = [].slice.call(acc.querySelectorAll(".cc-acc__btn"));
    function open(target) {
      btns.forEach(function (b) {
        var on = b === target && b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", String(on));
        document.getElementById(b.getAttribute("aria-controls")).toggleAttribute("inert", !on);
      });
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { open(b); });
      b.addEventListener("keydown", function (e) {
        var j = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: btns.length - 1 }[e.key];
        if (j === undefined) return;
        e.preventDefault();
        btns[(j + btns.length) % btns.length].focus();
      });
    });
  });

  // Mobile sticky CTA: show only when no other page button is on screen.
  var sticky = document.querySelector("[data-sticky-cta]");
  var inline = document.querySelectorAll("main .cc-btn");
  if (sticky && inline.length && "IntersectionObserver" in window) {
    var onScreen = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target); });
      var hide = onScreen.size > 0;
      sticky.classList.toggle("is-hidden", hide);
      sticky.toggleAttribute("inert", hide);
    });
    inline.forEach(function (b) { io.observe(b); });
  }

  // --- Page 3 form (mockup). In GHL the native form replaces it; see DESIGN-PLAN.md section 8.
  var form = document.querySelector("[data-earlybird-form]");
  if (!form) return;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  var checks = {
    name: function (v) { return v.trim() !== ""; },
    email: function (v) { return EMAIL.test(v.trim()); }
  };
  function check(id) {
    var input = form.elements[id], ok = checks[id](input.value);
    input.setAttribute("aria-invalid", String(!ok));
    document.getElementById(id + "-error").hidden = ok;
    return ok;
  }
  Object.keys(checks).forEach(function (id) {
    form.elements[id].addEventListener("input", function () {
      if (this.getAttribute("aria-invalid") === "true") check(id);
    });
  });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var bad = Object.keys(checks).filter(function (id) { return !check(id); });
    if (bad.length) { form.elements[bad[0]].focus(); return; }
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Sending...";
    setTimeout(function () {
      // One event per successful submit; event_id is shared by GA4, Meta and Google Ads for dedupe.
      window.dataLayer.push({ event: "sled_earlybird_lead", event_id: eventId,
        cabin: form.elements.cabin.value, nights: form.elements.nights ? form.elements.nights.value : "" });
      form.hidden = true;
      document.querySelectorAll("[data-before-submit]").forEach(function (el) { el.hidden = true; });
      document.querySelectorAll("[data-after-submit]").forEach(function (el) { el.hidden = false; });
      document.querySelector("[data-typed-email]").textContent = form.elements.email.value.trim();
      var done = document.getElementById("form-success");
      done.hidden = false;
      done.focus();
    }, 600);
  });
})();
