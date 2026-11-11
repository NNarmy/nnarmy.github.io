/* Cielo de fondo: estrellas tenues y, en oro, una estrella por cada miembro unida en constelacion. */
(function () {
  const cv = document.getElementById("cielo");
  if (!cv) return;
  const cx = cv.getContext("2d");
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W, H, dpr, estrellas = [], doradas = [], fugaz = null;

  function semilla(n) { let s = n * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

  function crear() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    const n = Math.round((innerWidth * innerHeight) / 5200);
    estrellas = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() ** 2 * 1.3 + 0.25) * dpr,
      f: Math.random() * Math.PI * 2, v: 0.4 + Math.random() * 1.2, d: (Math.random() * 0.04 + 0.01) * dpr,
    }));
    ubicarDoradas();
  }

  // Cada miembro es una estrella dorada en una posicion fija derivada de su numero.
  let numeros = [];
  function ubicarDoradas() {
    doradas = numeros.slice(0, 400).map((num) => {
      const r = semilla(num);
      return { x: (0.08 + r() * 0.84) * W, y: (0.06 + r() * 0.6) * H, r: (1.4 + r() * 1.2) * dpr, f: r() * 6.28 };
    });
    // cada estrella se une a la mas cercana de las anteriores: una constelacion que crece con cada miembro
    doradas.forEach((d, i) => {
      let mejor = null, dist = Infinity;
      for (let j = 0; j < i; j++) { const o = doradas[j], q = (o.x - d.x) ** 2 + (o.y - d.y) ** 2; if (q < dist) { dist = q; mejor = o; } }
      d.p = mejor;
    });
  }
  window.fondo = { miembros(lista) { numeros = lista.slice(); ubicarDoradas(); } };

  function dibujar(t) {
    cx.clearRect(0, 0, W, H);
    for (const e of estrellas) {
      const a = 0.35 + 0.45 * Math.sin(e.f + t * 0.001 * e.v);
      if (!quieto) { e.y -= e.d; if (e.y < 0) { e.y = H; e.x = Math.random() * W; } }
      cx.globalAlpha = Math.max(0.05, a);
      cx.fillStyle = "#e8e4ff";
      cx.beginPath(); cx.arc(e.x, e.y, e.r, 0, 6.283); cx.fill();
    }
    // constelacion
    if (doradas.length > 1) {
      cx.globalAlpha = 0.13; cx.strokeStyle = "#d9b96a"; cx.lineWidth = 0.7 * dpr;
      cx.beginPath();
      for (const d of doradas) if (d.p) { cx.moveTo(d.p.x, d.p.y); cx.lineTo(d.x, d.y); }
      cx.stroke();
    }
    for (const d of doradas) {
      const a = 0.7 + 0.3 * Math.sin(d.f + t * 0.0015);
      const g = cx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 7);
      g.addColorStop(0, "rgba(251,238,194,.9)"); g.addColorStop(1, "rgba(217,185,106,0)");
      cx.globalAlpha = a * 0.6; cx.fillStyle = g; cx.beginPath(); cx.arc(d.x, d.y, d.r * 7, 0, 6.283); cx.fill();
      cx.globalAlpha = a; cx.fillStyle = "#fff6d8"; cx.beginPath(); cx.arc(d.x, d.y, d.r, 0, 6.283); cx.fill();
    }
    // estrella fugaz ocasional
    if (!quieto) {
      if (!fugaz && Math.random() < 0.0025) fugaz = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.3, vx: 9 * dpr, vy: 3.5 * dpr, vida: 1 };
      if (fugaz) {
        const g = cx.createLinearGradient(fugaz.x, fugaz.y, fugaz.x - fugaz.vx * 14, fugaz.y - fugaz.vy * 14);
        g.addColorStop(0, "rgba(255,246,216,.9)"); g.addColorStop(1, "rgba(255,246,216,0)");
        cx.globalAlpha = fugaz.vida; cx.strokeStyle = g; cx.lineWidth = 1.4 * dpr;
        cx.beginPath(); cx.moveTo(fugaz.x, fugaz.y); cx.lineTo(fugaz.x - fugaz.vx * 14, fugaz.y - fugaz.vy * 14); cx.stroke();
        fugaz.x += fugaz.vx; fugaz.y += fugaz.vy; fugaz.vida -= 0.012;
        if (fugaz.vida <= 0 || fugaz.x > W) fugaz = null;
      }
    }
    cx.globalAlpha = 1;
    if (!quieto && !document.hidden) requestAnimationFrame(dibujar);
  }

  addEventListener("resize", crear);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !quieto) requestAnimationFrame(dibujar); });
  crear();
  requestAnimationFrame(dibujar);
  if (quieto) setTimeout(() => dibujar(0), 1500);
})();
