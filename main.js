/* BG Consultora · interacción
   - líquido en canvas que sube/baja según la sección y toma el color del frente
   - "mundos" (cultura / liderazgo / ia / metodo) que cambian la paleta entera
   - la marca 2x2 fija que gira y se desplaza con el scroll (GSAP + ScrollTrigger)
*/
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  if (!hasGsap) root.classList.add("no-motion");

  var WORLDS = ["cultura", "liderazgo", "ia"];
  var THEME = { cultura: "#fff6da", liderazgo: "#fdeceb", ia: "#e9f5fd", metodo: "#e8f6ee" };
  var LABEL = { cultura: "Diagnóstico cultural", liderazgo: "Liderazgo y delegación", ia: "Adopción de IA" };

  /* ---------------------------------------------------------------
     Mundos
     --------------------------------------------------------------- */
  var state = { chosen: "cultura", override: null };
  var fromUrl = new URLSearchParams(location.search).get("frente");
  if (fromUrl && WORLDS.indexOf(fromUrl) > -1) state.chosen = fromUrl;

  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var frenteInput = document.getElementById("frente");

  function applyWorld() {
    var w = state.override || state.chosen;
    if (root.getAttribute("data-world") !== w) {
      root.setAttribute("data-world", w);
      liquid.kick(1);
    }
    if (themeMeta) themeMeta.setAttribute("content", THEME[w]);
    liquid.setColor(getComputedStyle(root).getPropertyValue("--liquid"));
  }

  function setChosen(w) {
    if (WORLDS.indexOf(w) < 0) return;
    state.chosen = w;
    document.querySelectorAll('[role="radio"][data-world]').forEach(function (b) {
      var on = b.getAttribute("data-world") === w;
      b.setAttribute("aria-checked", on);
      b.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll(".choose").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-choose") === w);
    });
    if (frenteInput) frenteInput.value = w;
    applyWorld();
  }

  // grupos de radio (menú y selector final), con flechas del teclado
  document.querySelectorAll('[role="radiogroup"]').forEach(function (group) {
    var radios = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
    radios.forEach(function (r, i) {
      r.addEventListener("click", function () { setChosen(r.getAttribute("data-world")); });
      r.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var next = radios[(i + d + radios.length) % radios.length];
        setChosen(next.getAttribute("data-world"));
        next.focus();
      });
    });
  });
  document.querySelectorAll(".choose").forEach(function (b) {
    b.addEventListener("click", function () { setChosen(b.getAttribute("data-choose")); });
  });

  /* ---------------------------------------------------------------
     Líquido
     --------------------------------------------------------------- */
  var liquid = (function () {
    var cvs = document.getElementById("liquid");
    var ctx = cvs.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var level = 0.3, target = 0.3, amp = 0;
    var cur = [255, 212, 92], to = cur.slice();
    var bubbles = [];

    function hexToRgb(hex) {
      hex = String(hex).trim().replace("#", "");
      if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
      var n = parseInt(hex, 16);
      return isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cvs.width = W * dpr; cvs.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    for (var i = 0; i < 18; i++) bubbles.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3, s: 0.0004 + Math.random() * 0.0008 });

    function surface(x, t, base, a) {
      return base +
        Math.sin(x * 0.006 + t * 0.0011) * (7 + a * 26) +
        Math.sin(x * 0.013 - t * 0.0017) * (4 + a * 12);
    }
    function wavePath(t, base, a, phase) {
      ctx.beginPath();
      ctx.moveTo(0, H + 2);
      for (var x = 0; x <= W + 20; x += 20) ctx.lineTo(x, surface(x + phase, t, base, a));
      ctx.lineTo(W, H + 2);
      ctx.closePath();
    }
    function rgba(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; }

    function draw(t) {
      if (reduce) t = 0;
      level += (target - level) * 0.045;
      amp *= 0.975;
      for (var k = 0; k < 3; k++) cur[k] += (to[k] - cur[k]) * 0.06;

      ctx.clearRect(0, 0, W, H);
      var base = H * (1 - level);
      if (base > H + 60) return;

      // ola de fondo
      wavePath(t * 0.8, base - 10, amp, 400);
      ctx.fillStyle = rgba(cur, 0.45);
      ctx.fill();
      // ola principal
      wavePath(t, base, amp, 0);
      var g = ctx.createLinearGradient(0, base - 40, 0, H);
      g.addColorStop(0, rgba(cur, 0.95));
      g.addColorStop(1, rgba([cur[0] * 0.92, cur[1] * 0.92, cur[2] * 0.95], 1));
      ctx.fillStyle = g;
      ctx.fill();
      // brillo en la superficie
      ctx.beginPath();
      for (var x = 0; x <= W + 20; x += 20) {
        var y = surface(x, t, base, amp) + 3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // burbujas
      ctx.fillStyle = "rgba(255,255,255,.45)";
      bubbles.forEach(function (b) {
        if (!reduce) { b.y -= b.s; if (b.y < 0) { b.y = 1; b.x = Math.random(); } }
        var by = base + 30 + b.y * (H - base);
        if (by > H) return;
        ctx.beginPath();
        ctx.arc(b.x * W, by, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    resize();
    window.addEventListener("resize", resize);
    return {
      draw: draw,
      setLevel: function (v) { target = v; },
      setColor: function (hex) { var c = hexToRgb(hex); if (c) to = c; },
      kick: function (v) { amp = Math.min(1.4, amp + v); },
      jump: function (v) { level = target = v; }
    };
  })();

  /* ---------------------------------------------------------------
     Secciones: nivel del líquido, mundo temporal, foco de la marca
     --------------------------------------------------------------- */
  var levelEls = Array.prototype.slice.call(document.querySelectorAll("[data-level]"));
  var overrideEls = Array.prototype.slice.call(document.querySelectorAll("[data-beat], [data-world-override]"));
  var servicios = document.getElementById("servicios");
  var stage = document.getElementById("stage");
  var gaugeFill = document.getElementById("gaugeFill");

  function contains(el, y) { var r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; }

  function onFrame() {
    var mid = window.innerHeight * 0.5;
    for (var i = 0; i < levelEls.length; i++) {
      if (contains(levelEls[i], mid)) { liquid.setLevel(parseFloat(levelEls[i].getAttribute("data-level"))); break; }
    }
    var ov = null;
    for (var j = 0; j < overrideEls.length; j++) {
      if (contains(overrideEls[j], mid)) { ov = overrideEls[j].getAttribute("data-beat") || overrideEls[j].getAttribute("data-world-override"); break; }
    }
    if (ov !== state.override) { state.override = ov; applyWorld(); }
    stage.classList.toggle("is-focus", contains(servicios, mid));

    var max = document.documentElement.scrollHeight - window.innerHeight;
    rigFrame();
    gaugeFill.style.height = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  }

  /* ---------------------------------------------------------------
     La marca: keyframes atados a la posición de scroll
     (x, y en px · r, ry en grados · s escala · o opacidad)
     --------------------------------------------------------------- */
  var rig = document.getElementById("rig");
  var rigCur = null;
  function docTop(id) { return document.getElementById(id).getBoundingClientRect().top + window.scrollY; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rigKeys() {
    var W = window.innerWidth, H = window.innerHeight, d = W > 900;
    var S0 = { x: d ? W * 0.21 : 0, y: d ? H * 0.04 : H * 0.05, r: -6, ry: 0, s: d ? 1 : 0.78, o: 1 };
    var S1 = { x: 0, y: d ? 0 : -H * 0.17, r: 0, ry: 360, s: d ? 0.9 : 0.8, o: 1 };
    var S2 = { x: 0, y: -H * 0.3, r: 0, ry: 360, s: 0.4, o: 0 };
    var S3in = { x: d ? -W * 0.22 : 0, y: H * 0.4, r: 8, ry: 360, s: 0.6, o: 0 };
    var S3 = { x: d ? -W * 0.22 : 0, y: d ? H * 0.05 : -H * 0.06, r: 0, ry: 360, s: d ? 0.85 : 0.68, o: 1 };
    var S4 = { x: d ? -W * 0.22 : 0, y: -H * 0.5, r: -6, ry: 360, s: 0.5, o: 0 };
    var dist = docTop("distancia"), num = docTop("numeros"), srv = docTop("servicios"), met = docTop("metodo");
    return [
      [0, S0], [dist - H, S0], [dist + H * 0.6, S1],
      [num - H, S1], [num - H * 0.25, S2],
      [srv, S3in], [srv + H * 0.55, S3],
      [met - H * 0.9, S3], [met - H * 0.35, S4]
    ];
  }
  function rigFrame() {
    var keys = rigKeys(), y = window.scrollY, a = keys[0], b = keys[0];
    for (var i = 0; i < keys.length - 1; i++) {
      if (y >= keys[i][0]) { a = keys[i]; b = keys[i + 1]; }
    }
    if (y >= keys[keys.length - 1][0]) a = b = keys[keys.length - 1];
    var t = b[0] > a[0] ? Math.min(1, Math.max(0, (y - a[0]) / (b[0] - a[0]))) : 1;
    t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
    var tgt = {};
    for (var k in a[1]) tgt[k] = lerp(a[1][k], b[1][k], t);
    if (!rigCur || reduce) rigCur = tgt;
    else for (var k2 in tgt) rigCur[k2] = lerp(rigCur[k2], tgt[k2], 0.14);
    var c = rigCur;
    rig.style.transform = "translate3d(" + c.x.toFixed(1) + "px," + c.y.toFixed(1) + "px,0) rotate(" + c.r.toFixed(2) + "deg) rotateY(" + c.ry.toFixed(2) + "deg) scale(" + c.s.toFixed(3) + ")";
    rig.style.opacity = c.o.toFixed(3);
    rig.style.visibility = c.o < 0.01 ? "hidden" : "visible";
  }

  /* ---------------------------------------------------------------
     Aparición de elementos
     --------------------------------------------------------------- */
  var revealables = document.querySelectorAll(".rv, .spec");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sib = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("rv") || c.classList.contains("spec"); });
        el.style.transitionDelay = sib.indexOf(el) * 90 + "ms";
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------------------------------------------------------------
     Texto partido en letras (título principal)
     --------------------------------------------------------------- */
  document.querySelectorAll("[data-split]").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map(function (w) {
      return '<span class="char-wrap" aria-hidden="true">' + w.split("").map(function (c) { return '<span class="char">' + c + "</span>"; }).join("") + "</span>";
    }).join(" ");
  });

  /* ---------------------------------------------------------------
     Scroll suave + coreografía
     --------------------------------------------------------------- */
  var lenis = null;
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);

    if (!reduce && typeof window.Lenis === "function") {
      lenis = new Lenis({ lerp: 0.1 });
      lenis.on("scroll", function (e) { ScrollTrigger.update(); liquid.kick(Math.min(Math.abs(e.velocity) * 0.004, 0.05)); });
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // palabras gigantes que corren con el scroll
    document.querySelectorAll(".marquee__row").forEach(function (row) {
      var dir = parseFloat(row.getAttribute("data-dir"));
      gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -35 }, {
        xPercent: dir < 0 ? -35 : 0, ease: "none",
        scrollTrigger: { trigger: "#frentes-intro", start: "top bottom", end: "bottom top", scrub: 0.6 }
      });
    });
    gsap.fromTo("#aperture", { scale: 0.35, rotation: -20 }, {
      scale: 1, rotation: 0, ease: "none",
      scrollTrigger: { trigger: "#frentes-intro", start: "top bottom", end: "top top", scrub: 0.6 }
    });

    // la palabra gigante de cada frente aparece al entrar
    gsap.utils.toArray(".beat__word").forEach(function (w) {
      gsap.fromTo(w, { yPercent: 30, autoAlpha: 0 }, {
        yPercent: 0, autoAlpha: 1, ease: "none",
        scrollTrigger: { trigger: w.parentNode, start: "top 85%", end: "top 30%", scrub: 0.6 }
      });
    });
    gsap.fromTo(".footer__brand", { yPercent: 40 }, {
      yPercent: 0, ease: "none",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: 0.6 }
    });
  }

  // enlaces internos con el scroll suave
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      var t = id === "#top" ? 0 : document.querySelector(id);
      if (t === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { offset: id === "#top" ? 0 : -64, duration: 1.4 });
      else window.scrollTo({ top: t === 0 ? 0 : t.getBoundingClientRect().top + window.scrollY - 64, behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---------------------------------------------------------------
     Bucle de animación
     --------------------------------------------------------------- */
  function loop(t) {
    onFrame();
    liquid.draw(t);
    requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------------
     Loader → entrada
     --------------------------------------------------------------- */
  var loader = document.getElementById("loader");
  var count = document.getElementById("loaderCount");
  var fill = document.getElementById("loaderFill");

  function intro() {
    root.classList.remove("is-loading");
    loader.classList.add("is-done");
    liquid.kick(1.2);
    if (!hasGsap || reduce) return;
    gsap.from(".hero .char", { yPercent: 115, duration: 1.2, ease: "expo.out", stagger: 0.03 });
    gsap.from("#mark", { y: window.innerHeight * 0.6, rotation: 14, duration: 1.5, ease: "expo.out", delay: 0.1 });
    gsap.from(".hero__meta, .hero__cue", { autoAlpha: 0, y: 20, duration: 1, ease: "power3.out", delay: 0.5 });
  }

  function runLoader() {
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var minTime = reduce ? 0 : 1400;
    var start = performance.now();
    var done = false;
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () { done = true; });
    (function tick(now) {
      var p = Math.min(1, (now - start) / minTime || 1);
      if (!done) p = Math.min(p, 0.9);
      var eased = 1 - Math.pow(1 - p, 3);
      count.textContent = Math.round(eased * 100);
      fill.style.height = eased * 100 + "%";
      if (p >= 1 && done) {
        if (hasGsap) ScrollTrigger.refresh();
        setTimeout(intro, 150);
      } else requestAnimationFrame(tick);
    })(start);
  }

  /* ---------------------------------------------------------------
     Formulario (falta conectarlo a un servicio de envío)
     --------------------------------------------------------------- */
  var form = document.getElementById("form");
  var hint = document.getElementById("formHint");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    form.querySelectorAll("[required]").forEach(function (f) {
      var bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
      f.classList.toggle("is-invalid", bad);
      if (bad && ok) { f.focus(); ok = false; }
    });
    if (!ok) { hint.textContent = "Completá nombre y un email válido."; hint.classList.remove("is-ok"); return; }
    // TODO: enviar a un backend / Formspree / email. Por ahora sólo confirma.
    hint.textContent = "¡Gracias! Te escribimos a la brevedad por " + LABEL[frenteInput.value] + ".";
    hint.classList.add("is-ok");
    form.reset();
    frenteInput.value = state.chosen;
    liquid.kick(1.2);
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  setChosen(state.chosen);
  requestAnimationFrame(loop);
  runLoader();
})();
