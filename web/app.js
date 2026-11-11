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
  NumeroInvalido: "número inválido", OwnableUnauthorizedAccount: "solo el guardián puede hacer eso" };
function nombreError(e) {
  if (e?.revert?.name) return e.revert.name;
  // Las billeteras envuelven el error: buscamos los datos del revert en cualquier nivel.
  const datos = JSON.stringify(e, (k, v) => (typeof v === "bigint" ? v.toString() : v)).match(/0x[0-9a-fA-F]{8,}/g) || [];
  for (const d of datos) { try { const p = contrato.interface.parseError(d); if (p) return p.name; } catch {} }
}
const error = (e) => ERRORES[nombreError(e)] || e?.shortMessage || e?.reason || e?.message;
const provider = new ethers.JsonRpcProvider(C.rpc, C.chainId, { staticNetwork: true });
const contrato = new ethers.Contract(C.contrato, ABI, provider);
const DOMINIO = { name: "Movimiento", version: "1", chainId: C.chainId, verifyingContract: C.contrato };
const TIPOS = { Invitacion: [
  { name: "invitador", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "vence", type: "uint256" }] };
const VALIDEZ_PRUEBA = 90; // segundos
const LOTE = 150; // miembros antiguos por transaccion

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const b64u = { enc: (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
               dec: (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))) };
const base = () => location.href.split("#")[0];

function qr(texto) {
  const q = qrcode(0, "M"); q.addData(texto); q.make();
  return `<div class="qr">${q.createImgTag(6, 0)}</div>`;
}
function msg(el, texto, tipo = "") { el.insertAdjacentHTML("beforeend", `<p class="msg ${tipo}">${esc(texto)}</p>`); }

// ---------- Llave (billetera anonima guardada solo en este telefono) ----------
const LLAVE = "movimiento.llave";
function leerLlave() { try { const f = localStorage.getItem(LLAVE); return f ? ethers.Wallet.fromPhrase(f) : null; } catch { return null; } }
function crearLlave() { const w = ethers.Wallet.createRandom(); localStorage.setItem(LLAVE, w.mnemonic.phrase); return w; }
function importarLlave(frase) { const w = ethers.Wallet.fromPhrase(frase.trim().toLowerCase()); localStorage.setItem(LLAVE, w.mnemonic.phrase); return w; }

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
    if (w) $("ver-frase").onclick = () => { $("frase").innerHTML = `<div class="frase">${esc(w.mnemonic.phrase)}</div>
        <p class="tenue">Escríbelas en papel y guárdalas. Si pierdes el teléfono, con ellas recuperas tu número. Nunca se las muestres a nadie.</p>`; };
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
        const ejecutor = { safe: true, enviar: async (nombre, args) => {
          const data = contrato.interface.encodeFunctionData(nombre, args);
          await safe("sendTransactions", { txs: [{ to: C.contrato, value: "0", data }] });
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
        await panel({ safe: false, enviar: async (nombre, args) => { await (await g[nombre](...args)).wait(); } });
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
      const tx = async (boton, nombre, args, ok) => {
        boton.disabled = true; const t = boton.textContent; boton.textContent = ej.safe ? "Proponiendo en Safe…" : "Firmando y enviando…";
        try { await ej.enviar(nombre, args); msg(out, ej.safe ? `Propuesta enviada a la Safe. Cuando firmen los demás: ${ok}` : ok, "ok"); }
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

async function ruta() {
  clearInterval(vistas._timer);
  const h = location.hash.slice(1) || (enSafe ? "guardian" : "inicio");
  const [v, dato] = h.split("=");
  const vista = vistas[v] ? v : "inicio";
  document.querySelectorAll("section").forEach((s) => s.classList.toggle("activa", s.id === `v-${vista}`));
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("activo", a.dataset.v === vista));
  try { await vistas[vista](dato); } catch (e) { console.error(e); msg($(`v-${vista}`), "No se pudo conectar con la cadena. Intenta más tarde.", "error"); }
}
window.addEventListener("hashchange", ruta);
if ("serviceWorker" in navigator && !enSafe) navigator.serviceWorker.register("sw.js").catch(() => {});
ruta();
