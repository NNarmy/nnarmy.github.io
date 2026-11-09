/* Movimiento sin nombre: logica de la pagina. Sin servidores propios salvo el patrocinador de gas. */
const C = window.CONFIG;
const ABI = [
  "function totalMiembros() view returns (uint256)",
  "function numeros(uint256 desde, uint256 cantidad) view returns (uint256[])",
  "function numeroDe(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)",
];
const provider = new ethers.JsonRpcProvider(C.rpc, C.chainId, { staticNetwork: true });
const contrato = new ethers.Contract(C.contrato, ABI, provider);
const DOMINIO = { name: "Movimiento", version: "1", chainId: C.chainId, verifyingContract: C.contrato };
const TIPOS = { Invitacion: [
  { name: "invitador", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "vence", type: "uint256" }] };
const VALIDEZ_PRUEBA = 90; // segundos

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const b64u = { enc: (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
               dec: (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))) };
const base = () => location.href.split("#")[0];

function qr(texto) {
  const q = qrcode(0, "M"); q.addData(texto); q.make();
  return `<div class="qr">${q.createImgTag(6, 0)}</div>`;
}
function msg(el, texto, tipo = "") { el.innerHTML += `<p class="msg ${tipo}">${esc(texto)}</p>`; }

// ---------- Llave (billetera anonima guardada solo en este telefono) ----------
const LLAVE = "movimiento.llave";
function leerLlave() { try { const f = localStorage.getItem(LLAVE); return f ? ethers.Wallet.fromPhrase(f) : null; } catch { return null; } }
function crearLlave() { const w = ethers.Wallet.createRandom(); localStorage.setItem(LLAVE, w.mnemonic.phrase); return w; }
function importarLlave(frase) { const w = ethers.Wallet.fromPhrase(frase.trim().toLowerCase()); localStorage.setItem(LLAVE, w.mnemonic.phrase); return w; }

async function miNumero() {
  const w = leerLlave(); if (!w) return [null, 0];
  return [w, Number(await contrato.numeroDe(w.address))];
}

async function imagenBadge(n) {
  const uri = await contrato.tokenURI(n);
  return JSON.parse(atob(uri.split(",")[1])).image;
}

// ---------- Vistas ----------
const vistas = {
  async inicio() {
    const total = Number(await contrato.totalMiembros());
    $("total").textContent = total;
    const lista = [];
    for (let i = 0; i < total; i += 500) lista.push(...await contrato.numeros(i, 500));
    $("lista").innerHTML = lista.map(Number).sort((a, b) => a - b).map((n) => `<span>#${n}</span>`).join("");
  },

  async mio() {
    const el = $("mio-contenido"); el.innerHTML = "";
    const [w, n] = await miNumero();
    if (n) {
      el.innerHTML = `<div class="badge centro"><img alt="Badge ${n}" src="${await imagenBadge(n)}"></div>
        <p class="centro">Eres el <b>#${n}</b>.</p>`;
    } else if (w) {
      el.innerHTML = `<p>Este teléfono tiene una llave, pero todavía no tiene número. Pide a un miembro que te invite.</p>`;
    } else {
      el.innerHTML = `<p>Este teléfono todavía no tiene llave. Se crea sola cuando aceptas una invitación.</p>`;
    }
    if (w) {
      el.innerHTML += `<p class="tenue">Tu dirección anónima:<br><code>${w.address}</code></p>
        <button class="secundario" id="ver-frase">Ver mis 12 palabras de respaldo</button><div id="frase"></div>`;
      $("ver-frase").onclick = () => { $("frase").innerHTML = `<div class="frase">${esc(w.mnemonic.phrase)}</div>
        <p class="tenue">Escríbelas en papel y guárdalas. Si pierdes el teléfono, con ellas recuperas tu número. Nunca se las muestres a nadie.</p>`; };
    }
    el.innerHTML += `<details style="margin-top:16px"><summary class="tenue">Recuperar con mis 12 palabras</summary>
      <textarea id="frase-in" rows="3" placeholder="palabra palabra palabra…"></textarea>
      <button class="secundario" id="importar">Recuperar</button></details>
      ${w ? "" : `<button class="secundario" id="crear">Crear una llave (para fundadores)</button>`}`;
    $("importar").onclick = () => { try { importarLlave($("frase-in").value); vistas.mio(); } catch { msg(el, "Esas palabras no son válidas.", "error"); } };
    if ($("crear")) $("crear").onclick = () => { crearLlave(); vistas.mio(); };
  },

  async invitar() {
    const el = $("invitar-contenido"); el.innerHTML = "";
    const [w, n] = await miNumero();
    if (!n) { el.innerHTML = `<p>Solo un miembro con número puede invitar. Abre esta página desde el teléfono donde tienes tu badge.</p>`; return; }
    const crear = async () => {
      const inv = { invitador: n, nonce: ethers.toBigInt(ethers.randomBytes(16)).toString(), vence: Math.floor(Date.now() / 1000) + 7 * 86400 };
      const firma = await w.signTypedData(DOMINIO, TIPOS, inv);
      const enlace = `${base()}#unirse=${b64u.enc({ ...inv, firma })}`;
      window.__ultimoEnlace = enlace;
      el.innerHTML = qr(enlace) + `<p class="centro tenue">Invitación de #${n}</p>
        <button class="secundario" id="copiar">Copiar enlace</button><button id="otra">Crear otra invitación</button>`;
      $("copiar").onclick = () => navigator.clipboard?.writeText(enlace).then(() => msg(el, "Enlace copiado.", "ok"));
      $("otra").onclick = crear;
    };
    await crear();
  },

  async unirse(dato) {
    const el = $("unirse-contenido"); el.innerHTML = "";
    let inv;
    try { inv = b64u.dec(dato); } catch { el.innerHTML = `<p class="msg error">Esta invitación no se puede leer.</p>`; return; }
    if (inv.vence * 1000 < Date.now()) { el.innerHTML = `<p class="msg error">Esta invitación ya venció. Pide una nueva.</p>`; return; }
    const [w0, n0] = await miNumero();
    if (n0) { el.innerHTML = `<p>Este teléfono ya es el <b>#${n0}</b>. Cada persona tiene un solo número.</p>`; return; }
    el.innerHTML = `<p>El miembro <b>#${esc(inv.invitador)}</b> te considera merecedor de un número.</p>
      <p class="tenue">Al aceptar se crea una llave anónima en este teléfono y recibes el siguiente número. No se pide nombre, correo ni ningún dato tuyo. No cuesta nada.</p>
      <button id="aceptar">Aceptar mi número</button>`;
    $("aceptar").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Registrando en la cadena…";
      const w = w0 || crearLlave();
      try {
        const r = await fetch(`${C.patrocinador}/unirse`, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inv: { invitador: inv.invitador, nonce: inv.nonce, vence: inv.vence }, firma: inv.firma, nuevo: w.address }) });
        const res = await r.json();
        if (!r.ok) throw new Error(res.error || "error");
        el.innerHTML = `<div class="badge centro"><img alt="Badge" src="${await imagenBadge(res.numero)}"></div>
          <p class="centro">Bienvenido. Eres el <b>#${res.numero}</b>.</p>
          <p class="tenue">Ahora ve a "Mi número" y guarda tus 12 palabras de respaldo en papel.</p>`;
      } catch (err) {
        e.target.disabled = false; e.target.textContent = "Intentar de nuevo";
        msg(el, `No se pudo registrar: ${err.message}.`, "error");
      }
    };
  },

  async probar() {
    const el = $("probar-contenido"); el.innerHTML = "";
    const [w, n] = await miNumero();
    if (!n) { el.innerHTML = `<p>Este teléfono no tiene número todavía.</p>`; return; }
    const pintar = async () => {
      if (!location.hash.startsWith("#probar")) return clearInterval(vistas._timer);
      const t = Math.floor(Date.now() / 1000);
      const firma = await w.signMessage(`Movimiento #${n} ${t}`);
      const enlace = `${base()}#comprobar=${b64u.enc({ n, t, firma })}`;
      window.__ultimoEnlace = enlace;
      el.innerHTML = qr(enlace) + `<p class="centro">#${n}</p>`;
    };
    clearInterval(vistas._timer); await pintar(); vistas._timer = setInterval(pintar, 20000);
  },

  async comprobar(dato) {
    const el = $("comprobar-contenido"); el.innerHTML = "<p class='tenue'>Consultando la cadena…</p>";
    try {
      const { n, t, firma } = b64u.dec(dato);
      const edad = Math.floor(Date.now() / 1000) - t;
      const firmante = ethers.verifyMessage(`Movimiento #${n} ${t}`, firma);
      const dueño = await contrato.ownerOf(n);
      if (firmante !== dueño) throw new Error(`esta firma no corresponde al dueño del #${n}`);
      if (edad > VALIDEZ_PRUEBA || edad < -30) {
        el.innerHTML = `<p class="msg error">El código es auténtico pero tiene ${edad} segundos. Pide que lo muestren de nuevo en vivo.</p>`; return;
      }
      el.innerHTML = `<div class="badge centro"><img alt="Badge ${n}" src="${await imagenBadge(n)}"></div>
        <p class="centro msg ok">Verificado: esta persona es el <b>#${esc(n)}</b> del movimiento.</p>`;
    } catch (err) {
      el.innerHTML = `<p class="msg error">No verificado: ${esc(err.shortMessage || err.message)}.</p>`;
    }
  },
};

async function ruta() {
  clearInterval(vistas._timer);
  const h = location.hash.slice(1) || "inicio";
  const [v, dato] = h.split("=");
  const vista = vistas[v] ? v : "inicio";
  document.querySelectorAll("section").forEach((s) => s.classList.toggle("activa", s.id === `v-${vista}`));
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("activo", a.dataset.v === vista));
  try { await vistas[vista](dato); } catch (e) { console.error(e); msg($(`v-${vista}`), "No se pudo conectar con la cadena. Intenta más tarde.", "error"); }
}
window.addEventListener("hashchange", ruta);
ruta();
