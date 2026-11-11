/* Movimiento sin nombre: logica de la pagina. Sin servidores propios salvo el patrocinador de gas. */
const C = window.CONFIG;
const ABI = [
  "function totalMiembros() view returns (uint256)",
  "function numeros(uint256 desde, uint256 cantidad) view returns (uint256[])",
  "function numeroDe(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)",
  "function owner() view returns (address)",
  "function pausado() view returns (bool)",
  "function limiteDiario() view returns (uint256)",
  "function siguienteNumero() view returns (uint256)",
  "function recuperaciones(uint256) view returns (address nuevaCuenta, uint256 listo)",
  "function pausar(bool)",
  "function cambiarLimiteDiario(uint256)",
  "function registrarFundador(address,uint256)",
  "function importar(address[],uint256[])",
  "function existe(uint256) view returns (bool)",
  "function proponerRecuperacion(uint256,address)",
  "function cancelarRecuperacion(uint256)",
  "function ejecutarRecuperacion(uint256)",
  "function transferOwnership(address)",
  "error AunNo(uint256 listo)", "error SinRecuperacion()", "error NoAutorizado()", "error NumeroOcupado(uint256)",
  "error YaEsMiembro(address)", "error NumeroInvalido()", "error OwnableUnauthorizedAccount(address)", "error LargosDistintos()",
];
const ERRORES = { AunNo: "todavía no han pasado las 48 horas", SinRecuperacion: "no hay recuperación pendiente para ese número",
  NoAutorizado: "esta billetera no puede hacer eso", NumeroOcupado: "ese número ya tiene dueño", YaEsMiembro: "esa dirección ya tiene un número",
  NumeroInvalido: "número inválido", OwnableUnauthorizedAccount: "solo el guardián puede hacer eso",
  SoloGuardian: "solo el guardián puede hacer eso", OpcionesInvalidas: "una votación necesita entre 2 y 8 opciones",
  CierreInvalido: "la fecha de cierre no es válida", TextoInvalido: "el texto está vacío o es demasiado largo" };
function nombreError(e) {
  if (e?.revert?.name) return e.revert.name;
  // Las billeteras envuelven el error: buscamos los datos del revert en cualquier nivel.
  const datos = JSON.stringify(e, (k, v) => (typeof v === "bigint" ? v.toString() : v)).match(/0x[0-9a-fA-F]{8,}/g) || [];
  for (const d of datos) for (const i of [contrato.interface, comunidad?.interface].filter(Boolean)) { try { const p = i.parseError(d); if (p) return p.name; } catch {} }
}
const error = (e) => ERRORES[nombreError(e)] || e?.shortMessage || e?.reason || e?.message;
const provider = new ethers.JsonRpcProvider(C.rpc, C.chainId, { staticNetwork: true });
const contrato = new ethers.Contract(C.contrato, ABI, provider);
const ABI_COMUNIDAD = [
  "function totalAnuncios() view returns (uint256)",
  "function anuncio(uint256) view returns (string texto, uint64 fecha, bool oculto)",
  "function totalVotaciones() view returns (uint256)",
  "function votacion(uint256) view returns (string pregunta, string[] opciones, uint64 cierre, uint256[] votos)",
  "function yaVoto(uint256, uint256) view returns (bool)",
  "function publicar(string)", "function ocultar(uint256,bool)", "function crearVotacion(string,string[],uint64)",
  "error SoloGuardian()", "error OpcionesInvalidas()", "error CierreInvalido()", "error TextoInvalido()",
];
const comunidad = C.comunidad ? new ethers.Contract(C.comunidad, ABI_COMUNIDAD, provider) : null;
const DOMINIO_VOTO = comunidad && { name: "Movimiento Comunidad", version: "1", chainId: C.chainId, verifyingContract: C.comunidad };
const TIPOS_VOTO = { Voto: [{ name: "votacion", type: "uint256" }, { name: "numero", type: "uint256" }, { name: "opcion", type: "uint256" }] };
const ABI_BONDAD = ["function total() view returns (uint256)", "function delDia(uint256) view returns (uint256)", "function hoy() view returns (uint256)",
  "function yaMarco(uint256,uint256) view returns (bool)"];
const bondadC = C.bondad ? new ethers.Contract(C.bondad, ABI_BONDAD, provider) : null;
const DOMINIO = { name: "Movimiento", version: "1", chainId: C.chainId, verifyingContract: C.contrato };
const TIPOS = { Invitacion: [
  { name: "invitador", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "vence", type: "uint256" }] };
const VALIDEZ_PRUEBA = 90; // segundos
const LOTE = 150;
const MAX_MENSAJE = 160; // caracteres del mensaje de invitacion (debe caber en el codigo QR)
const textoMensaje = (n, nonce, m) => `Mensaje de invitacion #${n} ${nonce}: ${m}`; // miembros antiguos por transaccion

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const b64u = { enc: (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
               dec: (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))) };
const base = () => location.href.split("#")[0];

function qr(texto) {
  const q = qrcode(0, "M"); q.addData(texto); q.make();
  return `<div class="qr">${q.createImgTag(6, 0)}</div>`;
}
function contar(el, n) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || n < 2) { el.textContent = n; return; }
  const t0 = performance.now(), dur = 1400;
  const paso = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(n * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
function msg(el, texto, tipo = "") { el.insertAdjacentHTML("beforeend", `<p class="msg ${tipo}">${esc(texto)}</p>`); }

// ---------- Llave (billetera anonima guardada solo en este telefono) ----------
const LLAVE = "movimiento.llave";
function leerLlave() { try { const f = localStorage.getItem(LLAVE); return f ? ethers.Wallet.fromPhrase(f) : null; } catch { return null; } }
function crearLlave() { const w = ethers.Wallet.createRandom(); localStorage.setItem(LLAVE, w.mnemonic.phrase); return w; }
function importarLlave(frase) { const w = ethers.Wallet.fromPhrase(frase.trim().toLowerCase()); localStorage.setItem(LLAVE, w.mnemonic.phrase); return w; }

const RESPALDO = "movimiento.respaldo";
const respaldoConfirmado = (w) => { try { return localStorage.getItem(RESPALDO) === w.address; } catch { return false; } };
async function avisoRespaldo() {
  const el = $("aviso-respaldo"); if (!el) return;
  try {
    const [w, n] = await miNumero();
    el.hidden = !(n && !respaldoConfirmado(w) && !location.hash.startsWith("#mio"));
  } catch { el.hidden = true; }
}

// Verifica un codigo de "Mostrar mi badge". Devuelve el numero o lanza un error.
async function verificarPrueba(dato) {
  const { n, t, firma } = b64u.dec(dato);
  const firmante = ethers.verifyMessage(`Movimiento #${n} ${t}`, firma);
  const dueño = await contrato.ownerOf(n);
  if (firmante !== dueño) throw new Error(`esta firma no corresponde al dueño del #${n}`);
  const edad = Math.floor(Date.now() / 1000) - t;
  if (edad > VALIDEZ_PRUEBA || edad < -30) { const e = new Error(`el código es auténtico pero tiene ${edad} segundos; pide que lo muestren de nuevo en vivo`); e.viejo = true; throw e; }
  return Number(n);
}

async function miNumero() {
  const w = leerLlave(); if (!w) return [null, 0];
  try { return [w, Number(await contrato.numeroDe(w.address))]; }
  catch { return [w, 0]; } // contrato aun no publicado o sin conexion
}

async function imagenBadge(n) {
  const uri = await contrato.tokenURI(n);
  return JSON.parse(atob(uri.split(",")[1])).image;
}

// ---------- Puente con Safe (billetera compartida): protocolo de mensajes de las Safe Apps ----------
const enSafe = window.parent !== window;
let safeId = 0;
function safe(method, params = undefined, espera = 60000) {
  return new Promise((ok, mal) => {
    const id = `mov-${Date.now()}-${++safeId}`;
    const t = setTimeout(() => { removeEventListener("message", oir); mal(new Error("Safe no respondió")); }, espera);
    function oir(ev) {
      const d = ev.data;
      if (!d || d.id !== id) return;
      clearTimeout(t); removeEventListener("message", oir);
      d.success === false ? mal(new Error(d.error || "Safe rechazó la operación")) : ok(d.data);
    }
    addEventListener("message", oir);
    window.parent.postMessage({ id, method, params, env: { sdkVersion: "9.1.0" } }, "*");
  });
}

// ---------- Vistas ----------
const vistas = {
  async inicio() {
    const total = Number(await contrato.totalMiembros());
    contar($("total"), total);
    const lista = [];
    for (let i = 0; i < total; i += 500) lista.push(...await contrato.numeros(i, 500));
    const orden = lista.map(Number).sort((a, b) => a - b);
    $("lista").innerHTML = orden.map((n, i) => `<span style="animation-delay:${Math.min(i, 40) * 30}ms">#${n}</span>`).join("");
    window.fondo?.miembros(orden);
    pintarComunidad().catch((e) => console.error(e));
    pintarBondad().catch((e) => console.error(e));
    pintarHistoria().catch((e) => console.error(e));
    pintarAvisos();
  },

  async mio() {
    const el = $("mio-contenido"); el.innerHTML = "";
    const [w, n] = await miNumero();
    if (n) {
      el.innerHTML = `<div class="badge centro"><img alt="Badge ${n}" src="${await imagenBadge(n)}"></div>
        <p class="centro">Eres el <b>#${n}</b>.</p>
        ${matchMedia("(display-mode: standalone)").matches ? "" : `<p class="tenue">Consejo: agrega esta página a tu pantalla de inicio (iPhone: compartir → "Agregar a pantalla de inicio"; Android: menú ⋮ → "Instalar app") para que tu llave no se borre.</p>`}`;
    } else if (w) {
      el.innerHTML = `<p>Este teléfono tiene una llave, pero todavía no tiene número. Pide a un miembro que te invite.</p>`;
    } else {
      el.innerHTML = `<p>Este teléfono todavía no tiene llave. Se crea sola cuando aceptas una invitación.</p>`;
    }
    if (w) {
      el.innerHTML += `<p class="tenue">Tu dirección anónima:<br><code>${w.address}</code></p>
        <button class="secundario" id="ver-frase">Ver mis 12 palabras de respaldo</button><div id="frase"></div>`;
    }
    el.innerHTML += `<details style="margin-top:16px"><summary class="tenue">Recuperar con mis 12 palabras</summary>
      <textarea id="frase-in" rows="3" placeholder="palabra palabra palabra…"></textarea>
      <button class="secundario" id="importar">Recuperar</button></details>
      ${w ? "" : `<button class="secundario" id="crear">Crear una llave (para fundadores)</button>`}`;
    $("importar").onclick = () => { try { importarLlave($("frase-in").value); vistas.mio(); } catch { msg(el, "Esas palabras no son válidas.", "error"); } };
    if ($("crear")) $("crear").onclick = () => { crearLlave(); vistas.mio(); };
    // Los manejadores se ponen al final: innerHTML += borra los que se pusieron antes.
    if (w) $("ver-frase").onclick = () => {
      const palabras = w.mnemonic.phrase.split(" ");
      $("frase").innerHTML = `<ol class="palabras">${palabras.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
        <p class="tenue">Escríbelas a mano en papel, en orden, y guárdalo en un lugar seguro. Si pierdes el teléfono, con ellas recuperas tu número. Nunca les tomes foto ni se las muestres a nadie.</p>
        ${n && !respaldoConfirmado(w) ? `<button id="ya-anote">Ya las anoté en papel</button>` : ""}`;
      if ($("ya-anote")) $("ya-anote").onclick = () => {
        const [i, j] = [...ethers.randomBytes(2)].map((b, k) => (b % 6) + k * 6); // una de la 1-6 y otra de la 7-12
        $("frase").innerHTML = `<p>Para comprobar, escribe de memoria o mirando tu papel:</p>
          <label class="tenue">Palabra número ${i + 1}</label><input id="q1" autocomplete="off" autocapitalize="none">
          <label class="tenue">Palabra número ${j + 1}</label><input id="q2" autocomplete="off" autocapitalize="none">
          <button id="q-ok">Comprobar</button><div id="q-msg"></div>`;
        $("q-ok").onclick = () => {
          const ok = $("q1").value.trim().toLowerCase() === palabras[i] && $("q2").value.trim().toLowerCase() === palabras[j];
          if (!ok) return ($("q-msg").innerHTML = `<p class="msg error">No coinciden. Revisa tu papel y vuelve a intentarlo.</p>`);
          try { localStorage.setItem(RESPALDO, w.address); } catch {}
          $("frase").innerHTML = `<p class="msg ok">Perfecto. Tu respaldo está confirmado. Guarda ese papel en un lugar seguro.</p>`;
          avisoRespaldo();
        };
      };
    };
    if (w && n && !respaldoConfirmado(w)) $("ver-frase").insertAdjacentHTML("beforebegin", `<p class="msg error">Todavía no confirmas que anotaste tus 12 palabras. Sin ellas, si pierdes el teléfono, pierdes tu llave.</p>`);
  },

  async invitar() {
    const el = $("invitar-contenido"); el.innerHTML = "";
    const [w, n] = await miNumero();
    if (!n) { el.innerHTML = `<p>Solo un miembro con número puede invitar. Abre esta página desde el teléfono donde tienes tu badge.</p>`; return; }
    const formulario = () => {
      el.innerHTML = `<label class="tenue" for="inv-msj">Unas palabras para quien invitas (opcional)</label>
        <textarea id="inv-msj" rows="3" maxlength="${MAX_MENSAJE}" placeholder="Por ejemplo: Te vi ayudar sin que nadie mirara. Bienvenido."></textarea>
        <p class="tenue derecha"><span id="inv-cuenta">0</span>/${MAX_MENSAJE}</p>
        <button id="inv-crear">Crear invitación</button>`;
      $("inv-msj").oninput = () => ($("inv-cuenta").textContent = $("inv-msj").value.length);
      $("inv-crear").onclick = () => crear($("inv-msj").value.trim().slice(0, MAX_MENSAJE));
    };
    const crear = async (mensaje) => {
      const inv = { invitador: n, nonce: ethers.toBigInt(ethers.randomBytes(16)).toString(), vence: Math.floor(Date.now() / 1000) + 7 * 86400 };
      const firma = await w.signTypedData(DOMINIO, TIPOS, inv);
      const datos = { ...inv, firma };
      if (mensaje) { datos.m = mensaje; datos.fm = await w.signMessage(textoMensaje(n, inv.nonce, mensaje)); }
      const enlace = `${base()}#unirse=${b64u.enc(datos)}`;
      window.__ultimoEnlace = enlace;
      el.innerHTML = qr(enlace) + `<p class="centro tenue">Invitación de #${n}${mensaje ? " · con tu mensaje" : ""}</p>
        <button class="secundario" id="copiar">Copiar enlace</button><button id="otra">Crear otra invitación</button>`;
      $("copiar").onclick = () => navigator.clipboard?.writeText(enlace).then(() => msg(el, "Enlace copiado.", "ok"));
      $("otra").onclick = formulario;
    };
    formulario();
  },

  async unirse(dato) {
    const el = $("unirse-contenido"); el.innerHTML = "";
    let inv;
    try { inv = b64u.dec(dato); } catch { el.innerHTML = `<p class="msg error">Esta invitación no se puede leer.</p>`; return; }
    if (inv.vence * 1000 < Date.now()) { el.innerHTML = `<p class="msg error">Esta invitación ya venció. Pide una nueva.</p>`; return; }
    const [w0, n0] = await miNumero();
    if (n0) { el.innerHTML = `<p>Este teléfono ya es el <b>#${n0}</b>. Cada persona tiene un solo número.</p>`; return; }
    let carta = "";
    if (inv.m && inv.fm) {
      try {
        const autor = ethers.verifyMessage(textoMensaje(inv.invitador, inv.nonce, inv.m), inv.fm);
        if (autor === (await contrato.ownerOf(inv.invitador))) carta = `<blockquote class="carta">${esc(inv.m).replace(/\n/g, "<br>")}<cite>— #${esc(inv.invitador)}</cite></blockquote>`;
      } catch {}
    }
    el.innerHTML = carta + `<p>El miembro <b>#${esc(inv.invitador)}</b> te considera merecedor de un número.</p>
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
          <p class="tenue">Ahora ve a "Mi número" y guarda tus 12 palabras de respaldo en papel.</p>
          <p class="tenue">Y agrega esta página a tu pantalla de inicio (en iPhone: botón compartir → "Agregar a pantalla de inicio"; en Android: menú ⋮ → "Instalar app"). Así tu llave no se borra.</p>`;
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
      const n = await verificarPrueba(dato);
      el.innerHTML = `<div class="badge centro"><img alt="Badge ${n}" src="${await imagenBadge(n)}"></div>
        <p class="centro msg ok">Verificado: esta persona es el <b>#${esc(n)}</b> del movimiento.</p>`;
    } catch (err) {
      el.innerHTML = `<p class="msg error">No verificado: ${esc(err.shortMessage || err.message)}.</p>`;
    }
  },
  // ---------- Escaner dentro de la app (y modo encuentro) ----------
  async escanear() {
    const el = $("escanear-contenido");
    const enc = vistas._encuentro;
    el.innerHTML = `<div id="lector" class="lector"></div>
      <div id="esc-msg"></div>
      <div class="bloque">
        <h3>Modo encuentro</h3>
        <p class="tenue">Para la entrada de una reunión: escanea el badge de cada persona y la página cuenta cuántos miembros distintos llegaron. No se guarda quiénes: al cerrar o terminar, la cuenta desaparece.</p>
        ${enc ? `<div class="contador-enc"><span id="enc-total">${enc.size}</span> miembros verificados</div>
          <button class="secundario" id="enc-fin">Terminar encuentro</button>` : `<button class="secundario" id="enc-ini">Empezar encuentro</button>`}
      </div>`;
    if ($("enc-ini")) $("enc-ini").onclick = () => { vistas._encuentro = new Set(); vistas.escanear(); };
    if ($("enc-fin")) $("enc-fin").onclick = () => {
      const total = vistas._encuentro.size; vistas._encuentro = null; detenerLector();
      vistas.escanear().then(() => msg($("esc-msg"), `Encuentro terminado: ${total} miembros verificados. La lista se borró.`, "ok"));
    };
    if (!window.Html5Qrcode) { await cargarScript("lib/html5-qrcode.min.js"); }
    const out = $("esc-msg");
    let ocupado = false;
    const alLeer = async (texto) => {
      if (ocupado) return; ocupado = true;
      try {
        const i = texto.indexOf("#");
        const hash = i >= 0 ? texto.slice(i) : "";
        const [v, dato] = hash.slice(1).split("=");
        if (!dato || !["comprobar", "unirse", "reclamar"].includes(v)) throw new Error("este código no es del movimiento");
        if (vistas._encuentro && v === "comprobar") {
          const n = await verificarPrueba(dato);
          const nuevo = !vistas._encuentro.has(n); vistas._encuentro.add(n);
          $("enc-total").textContent = vistas._encuentro.size;
          out.innerHTML = `<p class="msg ok">${nuevo ? `#${n} verificado. Bienvenido.` : `#${n} ya estaba contado.`}</p>`;
          if (navigator.vibrate) navigator.vibrate(nuevo ? 80 : [40, 60, 40]);
          await new Promise((r) => setTimeout(r, 1800));
        } else {
          detenerLector(); location.hash = hash; return;
        }
      } catch (e) {
        out.innerHTML = `<p class="msg error">${esc(e.shortMessage || e.message)}</p>`;
        await new Promise((r) => setTimeout(r, 1800));
      }
      ocupado = false;
    };
    try {
      detenerLector();
      vistas._lector = new Html5Qrcode("lector", { verbose: false });
      await vistas._lector.start({ facingMode: "environment" }, { fps: 10, qrbox: (w, h) => { const m = Math.floor(Math.min(w, h) * 0.75); return { width: m, height: m }; } }, alLeer, () => {});
    } catch (e) {
      $("lector").innerHTML = `<p class="msg error centro">No se pudo abrir la cámara. Revisa que la página tenga permiso para usarla.</p>`;
    }
  },

  // ---------- Miembro antiguo: recibe un enlace con su numero y devuelve su direccion al guardian ----------
  async reclamar(dato) {
    const el = $("reclamar-contenido"); el.innerHTML = "";
    const n = Number(dato);
    if (!Number.isInteger(n) || n <= 0) { el.innerHTML = `<p class="msg error">Este enlace no es válido.</p>`; return; }
    const [w0, mio] = await miNumero();
    if (mio) { el.innerHTML = `<p>Este teléfono ya tiene el <b>#${mio}</b>. Cada persona tiene un solo número.</p>`; return; }
    if (await contrato.existe(n)) { el.innerHTML = `<p>El <b>#${n}</b> ya está registrado en la cadena. Si es tuyo y perdiste la llave, avísale al guardián.</p>`; return; }
    const mostrar = (w) => {
      const texto = `Movimiento #${n} ${w.address}`;
      el.innerHTML = `<p>Tu llave está lista. Ahora envía este código a quien te mandó el enlace, respondiendo el mismo mensaje:</p>
        <div class="frase">${esc(texto)}</div>
        <a class="boton" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Responder por WhatsApp</a>
        <button class="secundario" id="r-copiar">Copiar código</button>
        <p class="tenue">Este código no es secreto: solo dice a qué llave va tu número. Cuando el guardián lo registre, verás tu badge en "Mi número". Allí guarda también tus 12 palabras en papel.</p>`;
      $("r-copiar").onclick = () => navigator.clipboard?.writeText(texto).then(() => msg(el, "Código copiado.", "ok"));
    };
    if (w0) return mostrar(w0);
    el.innerHTML = `<p>Eres el <b>#${n}</b> del movimiento. Para dejar tu número registrado para siempre en la cadena, este teléfono necesita una llave anónima.</p>
      <p class="tenue">No se pide nombre, correo ni ningún dato tuyo. No cuesta nada.</p>
      <button id="r-crear">Crear mi llave</button>`;
    $("r-crear").onclick = () => mostrar(crearLlave());
  },

  // ---------- Panel del guardian: se usa desde el navegador de Trust Wallet (o MetaMask) ----------
  async guardian() {
    const el = $("guardian-contenido");
    const leer = async () => {
      const [dueño, pausado, limite, total, sig] = await Promise.all([
        contrato.owner(), contrato.pausado(), contrato.limiteDiario(), contrato.totalMiembros(), contrato.siguienteNumero()]);
      return { dueño, pausado, limite, html: `<p class="tenue">Guardián: <code>${dueño}</code><br>Invitaciones: <b>${pausado ? "PAUSADAS" : "activas"}</b> · Límite por miembro: <b>${limite}</b>/día · Miembros: <b>${total}</b> · Próximo número: <b>${sig}</b></p>` };
    };
    const { dueño, html: estado } = await leer();
    const dueñoEsContrato = (await provider.getCode(dueño)) !== "0x";

    // Modo billetera compartida: la página está abierta como app dentro de Safe.
    if (enSafe) {
      try {
        const info = await safe("getSafeInfo", undefined, 3000);
        if (info.safeAddress.toLowerCase() !== dueño.toLowerCase()) {
          el.innerHTML = `<p class="msg error">Esta Safe no es la guardiana del contrato.</p>`;
          return;
        }
        const ejecutor = { safe: true, enviar: async (nombre, args, destino = contrato) => {
          const data = destino.interface.encodeFunctionData(nombre, args);
          await safe("sendTransactions", { txs: [{ to: destino.target, value: "0", data }] });
        } };
        return panel(ejecutor);
      } catch (e) { /* no es Safe: seguimos con billetera normal */ }
    }

    if (dueñoEsContrato) {
      el.innerHTML = `<p>El guardián es una <b>billetera compartida (Safe)</b>. Para actuar:</p>
        <ol class="tenue"><li>Entra a <b>app.safe.global</b> y conecta tu billetera.</li>
        <li>Ve a <b>Apps → Mis apps → Agregar app personalizada</b> y pega: <code>${esc(base())}</code></li>
        <li>Abre la app "Movimiento sin nombre". Cada acción queda propuesta y se ejecuta cuando firman los demás dueños.</li></ol>`;
      return;
    }
    if (!window.ethereum) {
      el.innerHTML = `<p>Esta sección es solo para guardianes.</p>
        <p class="tenue">Para entrar, abre esta página desde el navegador de la billetera del guardián.</p>`;
      return;
    }
    el.innerHTML = `<p>Esta sección es solo para guardianes.</p><button id="g-conectar">Conectar billetera Guardián</button>`;
    $("g-conectar").onclick = async () => {
      try {
        const bp = new ethers.BrowserProvider(window.ethereum);
        await bp.send("eth_requestAccounts", []);
        try { await bp.send("wallet_switchEthereumChain", [{ chainId: "0x" + C.chainId.toString(16) }]); } catch {}
        const red = await bp.getNetwork();
        if (Number(red.chainId) !== C.chainId) throw new Error("cambia la red de la billetera a Base");
        const firmante = await bp.getSigner();
        const yo = await firmante.getAddress();
        if (yo.toLowerCase() !== dueño.toLowerCase()) throw new Error("esta billetera no es la del guardián");
        const g = contrato.connect(firmante);
        await panel({ safe: false, enviar: async (nombre, args, destino = contrato) => { await (await destino.connect(firmante)[nombre](...args)).wait(); } });
      } catch (e) { msg(el, `No se pudo conectar: ${e.shortMessage || e.message}`, "error"); }
    };

    async function panel(ej, aviso = "") {
      const { pausado: pausadoAhora, limite, html } = await leer();
      el.innerHTML = html + `<p class="msg ok">${ej.safe ? "Conectado como billetera compartida (Safe). Cada acción queda propuesta hasta que firmen los demás dueños." : "Conectado como guardián."}</p>
        <div class="bloque"><h3>Freno de emergencia</h3>
          <button id="g-pausa">${pausadoAhora ? "Reanudar invitaciones" : "Pausar invitaciones"}</button></div>
        <div class="bloque"><h3>Límite de invitaciones por miembro al día</h3>
          <input id="g-limite" type="number" min="0" value="${limite}"><button class="secundario" id="g-limite-btn">Guardar límite</button></div>
        <div class="bloque"><h3>Registrar a un miembro antiguo</h3>
          <input id="g-f-num" type="number" placeholder="Número, por ejemplo 200">
          <input id="g-f-dir" placeholder="Dirección anónima 0x… (la ve en Mi número)">
          <button class="secundario" id="g-f-btn">Registrar</button></div>
        ${comunidad ? `<div class="bloque"><h3>Publicar un anuncio</h3>
          <p class="tenue">Todos lo verán en Inicio, con la garantía de que lo publicó el guardián. Queda en la cadena para siempre (se puede ocultar, no borrar).</p>
          <textarea id="g-a-texto" rows="4" placeholder="Mensaje para todo el movimiento"></textarea>
          <button class="secundario" id="g-a-btn">Publicar anuncio</button>
          <input id="g-a-ocultar" type="number" min="0" placeholder="Número de anuncio a ocultar (0 = el primero)">
          <button class="secundario" id="g-a-ocu-btn">Ocultar ese anuncio</button></div>
        <div class="bloque"><h3>Crear una votación</h3>
          <p class="tenue">Cada número vota una sola vez desde su teléfono, sin pagar nada. Se ve qué número votó, nunca qué persona.</p>
          <input id="g-v-preg" placeholder="Pregunta">
          <textarea id="g-v-ops" rows="3" placeholder="Una opción por línea (de 2 a 8)"></textarea>
          <input id="g-v-dias" type="number" min="1" max="365" value="7" placeholder="Días que estará abierta">
          <button class="secundario" id="g-v-btn">Crear votación</button></div>` : ""}
        <div class="bloque"><h3>Invitar a miembros antiguos</h3>
          <p class="tenue">Una línea por persona: número y su WhatsApp (con código de país, ej. 573001234567) o su correo. La lista no se guarda ni se envía a ningún lado: solo arma los mensajes en esta pantalla.</p>
          <textarea id="g-c-lista" rows="4" placeholder="200, 573001234567&#10;201, alguien@correo.com&#10;202"></textarea>
          <button class="secundario" id="g-c-btn">Preparar invitaciones</button><div id="g-c-out"></div></div>
        <div class="bloque"><h3>Registrar los códigos que te devuelvan</h3>
          <p class="tenue">Pega los códigos tal como llegan, uno por línea ("Movimiento #200 0x…"). Se registran de a ${LOTE} por transacción.</p>
          <textarea id="g-l-lista" rows="4" placeholder="Movimiento #200 0x…"></textarea>
          <button class="secundario" id="g-l-btn">Registrar la lista</button></div>
        <div class="bloque"><h3>Recuperar un número perdido</h3>
          <p class="tenue">La persona crea una llave nueva en su teléfono y te da su dirección. El cambio se aplica 48 horas después; mientras tanto el dueño actual o tú pueden cancelarlo.</p>
          <input id="g-r-num" type="number" placeholder="Número a recuperar">
          <input id="g-r-dir" placeholder="Dirección nueva 0x…">
          <button class="secundario" id="g-r-ver">Ver estado</button>
          <button class="secundario" id="g-r-prop">Proponer recuperación</button>
          <button class="secundario" id="g-r-ejec">Ejecutar (pasadas 48 h)</button>
          <button class="secundario" id="g-r-canc">Cancelar</button></div>
        ${ej.safe ? "" : `<div class="bloque"><h3>Entregar el control a una billetera compartida (Safe)</h3>
          <p class="tenue">Después de esto, esta billetera deja de ser guardiana. Solo la Safe podrá actuar (y podría devolverte el control con sus firmas).</p>
          <input id="g-s-dir" placeholder="Dirección de la Safe 0x…">
          <input id="g-s-dir2" placeholder="Repite la dirección">
          <button class="secundario" id="g-s-btn">Entregar control a la Safe</button></div>`}
        <div id="g-msg"></div>`;
      const out = $("g-msg");
      if (aviso) msg(out, aviso, "ok");
      const tx = async (boton, nombre, args, ok, destino) => {
        boton.disabled = true; const t = boton.textContent; boton.textContent = ej.safe ? "Proponiendo en Safe…" : "Firmando y enviando…";
        try { await ej.enviar(nombre, args, destino); msg(out, ej.safe ? `Propuesta enviada a la Safe. Cuando firmen los demás: ${ok}` : ok, "ok"); }
        catch (e) { msg(out, `Error: ${error(e)}`, "error"); }
        boton.disabled = false; boton.textContent = t;
      };
      const num = (id) => { const n = Number($(id).value); if (!Number.isInteger(n) || n <= 0) throw new Error("número inválido"); return n; };
      const dir = (id) => { const d = $(id).value.trim(); if (!ethers.isAddress(d)) throw new Error("dirección inválida"); return ethers.getAddress(d); };
      const seguro = (f) => async (e) => { try { await f(e.target); } catch (err) { msg(out, err.message, "error"); } };

      $("g-pausa").onclick = seguro(async (b) => {
        b.disabled = true; b.textContent = "Firmando y enviando…";
        const ok = pausadoAhora ? "Invitaciones reanudadas." : "Invitaciones pausadas.";
        try { await ej.enviar("pausar", [!pausadoAhora]); await panel(ej, ej.safe ? `Propuesta enviada a la Safe. Cuando firmen los demás: ${ok}` : ok); }
        catch (e) { msg(out, `Error: ${error(e)}`, "error"); b.disabled = false; }
      });
      $("g-limite-btn").onclick = seguro((b) => { const n = Number($("g-limite").value); return tx(b, "cambiarLimiteDiario", [n], `Límite cambiado a ${n} por día.`); });
      $("g-f-btn").onclick = seguro((b) => { const n = num("g-f-num"), d = dir("g-f-dir"); return tx(b, "registrarFundador", [d, n], `#${n} registrado.`); });
      if (comunidad) {
        $("g-a-btn").onclick = seguro((b) => { const t = $("g-a-texto").value.trim(); if (!t) throw new Error("escribe el anuncio"); return tx(b, "publicar", [t], "Anuncio publicado.", comunidad); });
        $("g-a-ocu-btn").onclick = seguro((b) => { const id = Number($("g-a-ocultar").value); if (!Number.isInteger(id) || id < 0) throw new Error("número de anuncio inválido"); return tx(b, "ocultar", [id, true], `Anuncio ${id} oculto.`, comunidad); });
        $("g-v-btn").onclick = seguro((b) => {
          const p = $("g-v-preg").value.trim(), ops = $("g-v-ops").value.split("\n").map((o) => o.trim()).filter(Boolean), dias = Number($("g-v-dias").value);
          if (!p) throw new Error("escribe la pregunta"); if (ops.length < 2 || ops.length > 8) throw new Error("pon entre 2 y 8 opciones");
          if (!(dias >= 1 && dias <= 365)) throw new Error("los días deben estar entre 1 y 365");
          return tx(b, "crearVotacion", [p, ops, Math.floor(Date.now() / 1000) + Math.round(dias * 86400)], "Votación creada.", comunidad);
        });
      }
      $("g-c-btn").onclick = seguro(async () => {
        const filas = $("g-c-lista").value.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
          const m = l.match(/^#?\s*(\d+)\s*[,;\s]?\s*(.*)$/); if (!m) throw new Error(`no entiendo la línea "${l}"`);
          return { n: Number(m[1]), contacto: m[2].trim() };
        });
        if (!filas.length) throw new Error("la lista está vacía");
        $("g-c-out").innerHTML = filas.map(({ n, contacto }) => {
          const enlace = `${base()}#reclamar=${n}`;
          const texto = `Hola. Eres el #${n} del movimiento. Abre este enlace para dejar tu número registrado para siempre: ${enlace}\nDespués respóndeme con el código que te aparece.`;
          const tel = contacto.replace(/[^\d]/g, "");
          const wa = `https://wa.me/${contacto.includes("@") ? "" : tel}?text=${encodeURIComponent(texto)}`;
          const correo = `mailto:${contacto.includes("@") ? esc(contacto.replace(/[\s?&]/g, "")) : ""}?subject=${encodeURIComponent(`Tu número #${n}`)}&body=${encodeURIComponent(texto)}`;
          return `<div class="fila-inv"><b>#${n}</b> <span class="tenue">${esc(contacto)}</span>
            ${contacto.includes("@") ? "" : `<a class="boton chico" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`}
            ${tel && !contacto.includes("@") ? "" : `<a class="boton chico" href="${correo}">Correo</a>`}</div>`;
        }).join("");
      });
      $("g-l-btn").onclick = seguro(async (b) => {
        const pares = [...$("g-l-lista").value.matchAll(/#\s*(\d+)\D+?(0x[0-9a-fA-F]{40})/g)].map((m) => ({ n: Number(m[1]), d: ethers.getAddress(m[2]) }));
        if (!pares.length) throw new Error("no encontré códigos válidos");
        const vistos = new Set();
        for (const { n, d } of pares) {
          if (vistos.has(n) || vistos.has(d)) throw new Error(`#${n} o su dirección aparece dos veces`); vistos.add(n); vistos.add(d);
          if (await contrato.existe(n)) throw new Error(`el #${n} ya está registrado`);
          if (Number(await contrato.numeroDe(d))) throw new Error(`la dirección del #${n} ya tiene número`);
        }
        b.disabled = true; const t = b.textContent;
        try {
          for (let i = 0; i < pares.length; i += LOTE) {
            const lote = pares.slice(i, i + LOTE);
            b.textContent = `Enviando ${i + 1}–${i + lote.length} de ${pares.length}…`;
            await ej.enviar("importar", [lote.map((p) => p.d), lote.map((p) => p.n)]);
            msg(out, `${ej.safe ? "Propuesto en la Safe" : "Registrados"}: ${lote.map((p) => "#" + p.n).join(", ")}.`, "ok");
          }
        } catch (e) { msg(out, `Error: ${error(e)}. Los lotes anteriores ya quedaron.`, "error"); }
        b.disabled = false; b.textContent = t;
      });
      $("g-r-ver").onclick = seguro(async () => {
        const n = num("g-r-num"); const r = await contrato.recuperaciones(n);
        if (!Number(r.listo)) return msg(out, `#${n}: no hay recuperación pendiente. Dueño actual: ${await contrato.ownerOf(n)}`);
        msg(out, `#${n}: pasa a ${r.nuevaCuenta} a partir del ${new Date(Number(r.listo) * 1000).toLocaleString()}.`);
      });
      $("g-r-prop").onclick = seguro((b) => { const n = num("g-r-num"), d = dir("g-r-dir"); return tx(b, "proponerRecuperacion", [n, d], `Recuperación del #${n} propuesta. Se puede ejecutar en 48 horas.`); });
      $("g-r-ejec").onclick = seguro((b) => { const n = num("g-r-num"); return tx(b, "ejecutarRecuperacion", [n], `#${n} movido a su llave nueva.`); });
      $("g-r-canc").onclick = seguro((b) => { const n = num("g-r-num"); return tx(b, "cancelarRecuperacion", [n], `Recuperación del #${n} cancelada.`); });
      if ($("g-s-btn")) $("g-s-btn").onclick = seguro(async (b) => {
        const d = dir("g-s-dir");
        if (d !== dir("g-s-dir2")) throw new Error("las dos direcciones no coinciden");
        if ((await provider.getCode(d)) === "0x") throw new Error("esa dirección no es una Safe en Base (no es un contrato)");
        await tx(b, "transferOwnership", [d], "Control entregado a la Safe. Desde ahora el panel se usa desde app.safe.global.");
      });
    }
  },
};

function detenerLector() {
  const l = vistas._lector; vistas._lector = null;
  if (l) { try { l.stop().then(() => l.clear()).catch(() => {}); } catch {} }
}
function cargarScript(src) {
  return new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
}

// ---------- Comunidad: anuncios y votaciones (en Inicio) ----------
async function pintarComunidad() {
  const caja = $("comunidad"); if (!caja) return;
  if (!comunidad) { caja.hidden = true; return; }
  const [ta, tv] = (await Promise.all([comunidad.totalAnuncios(), comunidad.totalVotaciones()])).map(Number);
  const anuncios = [];
  for (let i = ta - 1; i >= 0 && anuncios.length < 3; i--) { const a = await comunidad.anuncio(i); if (!a.oculto) anuncios.push({ id: i, texto: a.texto, fecha: a.fecha }); }
  const votaciones = [];
  for (let i = tv - 1; i >= 0 && votaciones.length < 3; i--) votaciones.push({ id: i, ...(await comunidad.votacion(i)).toObject() });
  const [w, n] = await miNumero().catch(() => [null, 0]);
  const ahora = Date.now() / 1000;
  const fecha = (t) => new Date(Number(t) * 1000).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  let html = "";
  if (anuncios.length) html += `<div class="tarjeta"><h2>Anuncios</h2>${anuncios.map((a) => `<article class="anuncio">
      <p>${esc(a.texto).replace(/\n/g, "<br>")}</p><p class="tenue">Anuncio ${a.id} · ${fecha(a.fecha)} · <span class="firmado">publicado por el guardián en la cadena</span></p></article>`).join("")}</div>`;
  for (const v of votaciones) {
    const abierta = Number(v.cierre) > ahora;
    const total = v.votos.reduce((s, x) => s + Number(x), 0);
    const voté = n ? await comunidad.yaVoto(v.id, n) : false;
    const puede = abierta && n && !voté;
    html += `<div class="tarjeta votacion"><p class="etiqueta">${abierta ? "Votación abierta" : "Votación cerrada"}</p><h3>${esc(v.pregunta)}</h3>
      ${v.opciones.map((o, i) => { const pct = total ? Math.round((Number(v.votos[i]) / total) * 100) : 0;
        return puede ? `<button class="secundario opcion" data-v="${v.id}" data-o="${i}">${esc(o)}</button>`
          : `<div class="resultado"><div class="barra" style="width:${pct}%"></div><span>${esc(o)}</span><b>${pct}%</b></div>`; }).join("")}
      <p class="tenue">${total} ${total === 1 ? "voto" : "votos"} · ${abierta ? `cierra el ${fecha(v.cierre)}` : `cerró el ${fecha(v.cierre)}`}${voté ? " · tu número ya votó" : ""}${abierta && !n ? " · solo votan los miembros desde su teléfono" : ""}</p>
      <div class="v-msg"></div></div>`;
  }
  caja.innerHTML = html; caja.hidden = !html;
  caja.querySelectorAll("button.opcion").forEach((b) => b.onclick = async () => {
    const id = Number(b.dataset.v), opcion = Number(b.dataset.o);
    const tarjeta = b.closest(".votacion");
    if (!confirm(`¿Votar "${b.textContent}"? Tu número solo puede votar una vez.`)) return;
    tarjeta.querySelectorAll("button").forEach((x) => (x.disabled = true)); b.textContent = "Enviando voto…";
    try {
      const firma = await w.signTypedData(DOMINIO_VOTO, TIPOS_VOTO, { votacion: id, numero: n, opcion });
      const r = await fetch(`${C.patrocinador}/votar`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votacion: id, numero: n, opcion, firma }) });
      const res = await r.json(); if (!r.ok) throw new Error(res.error || "error");
      await pintarComunidad();
    } catch (e) {
      tarjeta.querySelectorAll("button").forEach((x) => (x.disabled = false));
      tarjeta.querySelector(".v-msg").innerHTML = `<p class="msg error">No se pudo votar: ${esc(e.message)}.</p>`;
    }
  });
}

// ---------- Contador de bondad ----------
const MIS_ACTOS = "movimiento.bondad";
async function pintarBondad() {
  const caja = $("bondad"); if (!caja) return;
  if (!bondadC) { caja.hidden = true; return; }
  const [total, hoy] = await Promise.all([bondadC.total(), bondadC.hoy()]);
  const deHoy = await bondadC.delDia(hoy);
  const [w, n] = await miNumero().catch(() => [null, 0]);
  const ya = n ? await bondadC.yaMarco(n, hoy) : false;
  let mios = 0; try { mios = Number(localStorage.getItem(MIS_ACTOS) || 0); } catch {}
  caja.innerHTML = `<p class="etiqueta">Actos de bondad</p>
    <div class="grande dos" id="bondad-total">${total}</div>
    <p class="tenue centro">${deHoy} hoy · nadie sabe cuáles ni de quién</p>
    ${n ? (ya ? `<p class="centro hecho">✦ Tu acto de hoy ya está contado${mios ? ` · llevas ${mios}` : ""}</p>`
      : `<button id="bondad-btn">Hoy hice un acto de bondad</button>`)
      : `<p class="tenue centro">Cada miembro marca aquí, una vez al día, que hizo algo bueno por alguien. Sin decir qué.</p>`}
    <div id="bondad-msg"></div>`;
  caja.hidden = false;
  if ($("bondad-btn")) $("bondad-btn").onclick = async (e) => {
    const b = e.target; b.disabled = true; b.textContent = "Contando…";
    try {
      const dominio = { name: "Movimiento Bondad", version: "1", chainId: C.chainId, verifyingContract: C.bondad };
      const firma = await w.signTypedData(dominio, { Acto: [{ name: "numero", type: "uint256" }, { name: "dia", type: "uint256" }] }, { numero: n, dia: hoy });
      const r = await fetch(`${C.patrocinador}/bondad`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: n, dia: hoy.toString(), firma }) });
      const res = await r.json(); if (!r.ok) throw new Error(res.error || "error");
      try { localStorage.setItem(MIS_ACTOS, String(mios + 1)); } catch {}
      caja.classList.add("celebra"); setTimeout(() => caja.classList.remove("celebra"), 1600);
      await pintarBondad();
    } catch (err) {
      b.disabled = false; b.textContent = "Hoy hice un acto de bondad";
      $("bondad-msg").innerHTML = `<p class="msg error">No se pudo contar: ${esc(err.message)}.</p>`;
    }
  };
}

// ---------- Historia del movimiento ----------
async function pintarHistoria() {
  const caja = $("historia"); if (!caja) return;
  let datos = [];
  try { datos = await (await fetch(`historia.json?${Date.now()}`)).json(); } catch { return; }
  if (!Array.isArray(datos) || !datos.length) return;
  const W = 320, H = 140, P = 10;
  const max = Math.max(1, ...datos.map((d) => d.miembros));
  const x = (i) => datos.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (datos.length - 1);
  const y = (v) => H - P - (v / max) * (H - 2 * P);
  const puntos = datos.map((d, i) => `${x(i).toFixed(1)},${y(d.miembros).toFixed(1)}`).join(" ");
  const area = `${x(0)},${H - P} ${puntos} ${x(datos.length - 1)},${H - P}`;
  const f = (s) => new Date(s + "T12:00:00Z").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  caja.innerHTML = `<h2>Nuestra historia</h2>
    <svg viewBox="0 0 ${W} ${H}" class="grafica" role="img" aria-label="Miembros a lo largo del tiempo">
      <defs><linearGradient id="g-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b96a" stop-opacity=".35"/><stop offset="1" stop-color="#d9b96a" stop-opacity="0"/></linearGradient></defs>
      ${datos.length > 1 ? `<polygon points="${area}" fill="url(#g-area)"/><polyline points="${puntos}" fill="none" stroke="#e9d49a" stroke-width="2" stroke-linejoin="round"/>` : ""}
      ${datos.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.miembros)}" r="3" fill="#fff6d8"/>`).join("")}
    </svg>
    <div class="ejes tenue"><span>${f(datos[0].fecha)}</span><span>${f(datos[datos.length - 1].fecha)}</span></div>
    <p class="tenue centro">${datos.length === 1 ? "La historia empieza aquí. Cada día se agrega un punto." : `De ${datos[0].miembros} a ${datos[datos.length - 1].miembros} miembros.`}</p>`;
  caja.hidden = false;
}

// ---------- Avisos al telefono (ntfy) ----------
function pintarAvisos() {
  const caja = $("avisos"); if (!caja || !C.avisos) return;
  caja.innerHTML = `<h2>Recibe los avisos</h2>
    <p>Te llega una notificación cuando el guardián publica un anuncio o abre una votación. No se pide ningún dato tuyo.</p>
    <ol class="tenue">
      <li>Instala la app gratuita <b>ntfy</b>: <a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noopener">Android</a> · <a href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener">iPhone</a></li>
      <li>Toca <b>+</b> (suscribirse) y escribe este tema: <code>${esc(C.avisos)}</code></li>
    </ol>
    <button class="secundario" id="avisos-copiar">Copiar el tema</button>
    <a class="boton secundario-a" href="https://ntfy.sh/${encodeURIComponent(C.avisos)}" target="_blank" rel="noopener">O recibirlos en el navegador</a>`;
  caja.hidden = false;
  $("avisos-copiar").onclick = () => navigator.clipboard?.writeText(C.avisos).then(() => ($("avisos-copiar").textContent = "Tema copiado ✓"));
}

async function ruta() {
  clearInterval(vistas._timer);
  detenerLector();
  const h = location.hash.slice(1) || (enSafe ? "guardian" : "inicio");
  const [v, dato] = h.split("=");
  const vista = vistas[v] ? v : "inicio";
  document.body.dataset.vista = vista; scrollTo({ top: 0 });
  document.querySelectorAll("section").forEach((s) => s.classList.toggle("activa", s.id === `v-${vista}`));
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("activo", a.dataset.v === vista));
  avisoRespaldo();
  try { await vistas[vista](dato); } catch (e) { console.error(e); msg($(`v-${vista}`), "No se pudo conectar con la cadena. Intenta más tarde.", "error"); }
}
window.addEventListener("hashchange", ruta);
if ("serviceWorker" in navigator && !enSafe) navigator.serviceWorker.register("sw.js").catch(() => {});
ruta();
