/* Idiomas: la página se escribe en español y este archivo la traduce al vuelo (inglés y portugués).
   Cada fila: [español, inglés, portugués]. {n} = un número, {x} = cualquier texto (que también se traduce si se puede). */
(function () {
  const FRASES = [
    // Cabecera, inicio y pestañas
    ["Movimiento sin nombre", "Nameless Movement", "Movimento sem nome"],
    ["Movimiento", "Movement", "Movimento"],
    ["Que todo el que se acerque a ti…", "May everyone who comes near you…", "Que todo aquele que se aproximar de você…"],
    ["sin nombre", "without a name", "sem nome"],
    ["La revolución silenciosa. Aquí no hay nombres, hay números.", "The silent revolution. Here there are no names, only numbers.", "A revolução silenciosa. Aqui não há nomes, há números."],
    ["Todavía no confirmas tus 12 palabras de respaldo.", "You haven't confirmed your 12 backup words yet.", "Você ainda não confirmou suas 12 palavras de backup."],
    ["Hazlo ahora →", "Do it now →", "Faça agora →"],
    ["Somos", "We are", "Somos"],
    ["miembros registrados para siempre en la cadena", "members registered forever on the chain", "membros registrados para sempre na cadeia"],
    ["Un movimiento de personas con bondad en el corazón que se reconocen por un número, no por un nombre.", "A movement of people with kindness in their hearts who know each other by a number, not by a name.", "Um movimento de pessoas com bondade no coração que se reconhecem por um número, não por um nome."],
    ["Qué es", "What it is", "O que é"],
    ["Cada miembro tiene un número que es suyo para siempre. Sin nombres, fotos, correos ni datos personales. Solo números, en una cadena pública que nadie puede borrar ni alterar.", "Every member has a number that is theirs forever. No names, photos, emails or personal data. Only numbers, on a public chain that nobody can erase or alter.", "Cada membro tem um número que é seu para sempre. Sem nomes, fotos, e-mails nem dados pessoais. Só números, numa cadeia pública que ninguém pode apagar nem alterar."],
    ["Cómo se entra", "How you join", "Como se entra"],
    ["Nadie se inscribe solo. Un miembro te invita en persona con un código. Al escanearlo recibes el siguiente número, que no se puede vender, regalar ni transferir. Es tuyo.", "Nobody signs up alone. A member invites you in person with a code. When you scan it you get the next number, which cannot be sold, given away or transferred. It is yours.", "Ninguém se inscreve sozinho. Um membro convida você pessoalmente com um código. Ao escaneá-lo você recebe o próximo número, que não pode ser vendido, dado nem transferido. É seu."],
    ["Cómo nos reconocemos", "How we recognize each other", "Como nos reconhecemos"],
    ["Pide a quien dice ser miembro que te muestre su badge y escanéalo. La página te dice si de verdad es ese número. El código cambia cada 20 segundos: una foto no sirve.", "Ask anyone who says they are a member to show you their badge, and scan it. The page tells you whether they really are that number. The code changes every 20 seconds: a photo won't work.", "Peça a quem diz ser membro que mostre o badge e escaneie. A página diz se é mesmo esse número. O código muda a cada 20 segundos: uma foto não serve."],
    ["Lo que no es", "What it is not", "O que não é"],
    ["No es una criptomoneda ni una inversión. No se vende nada y no cuesta nada. No se guarda ningún dato tuyo. El registro y el código son abiertos: cualquiera puede revisarlos.", "It is not a cryptocurrency or an investment. Nothing is sold and it costs nothing. No data about you is stored. The registry and the code are open: anyone can review them.", "Não é uma criptomoeda nem um investimento. Nada é vendido e não custa nada. Nenhum dado seu é guardado. O registro e o código são abertos: qualquer um pode revisá-los."],
    ["Los números", "The numbers", "Os números"],
    ["Leer el manual del miembro", "Read the member manual (in Spanish)", "Ler o manual do membro (em espanhol)"],
    ["Manual del miembro", "Member manual (ES)", "Manual do membro (ES)"],
    ["Manual del guardián", "Guardian manual (ES)", "Manual do guardião (ES)"],
    ["Inicio", "Home", "Início"],
    ["Mi número", "My number", "Meu número"],
    ["Escanear", "Scan", "Escanear"],
    ["Invitar", "Invite", "Convidar"],
    ["Mi badge", "My badge", "Meu badge"],
    ["Secciones", "Sections", "Seções"],
    ["Sello del movimiento", "Seal of the movement", "Selo do movimento"],
    ["Invitar a alguien", "Invite someone", "Convidar alguém"],
    ["Si conoces a alguien con bondad en el corazón, muéstrale este código. Al escanearlo recibe el siguiente número. Cada código sirve para una sola persona y vence en 7 días.", "If you know someone with kindness in their heart, show them this code. When they scan it they get the next number. Each code works for one person only and expires in 7 days.", "Se você conhece alguém com bondade no coração, mostre este código. Ao escaneá-lo a pessoa recebe o próximo número. Cada código serve para uma só pessoa e vence em 7 dias."],
    ["Has sido invitado", "You have been invited", "Você foi convidado"],
    ["Mostrar mi badge", "Show my badge", "Mostrar meu badge"],
    ["Quien quiera comprobar que eres miembro escanea este código con la cámara de su teléfono. Cambia cada 20 segundos, así que una foto vieja no sirve.", "Whoever wants to check that you are a member scans this code with their phone camera. It changes every 20 seconds, so an old photo won't work.", "Quem quiser comprovar que você é membro escaneia este código com a câmera do celular. Ele muda a cada 20 segundos, então uma foto antiga não serve."],
    ["Comprobación", "Verification", "Verificação"],
    ["Apunta la cámara al código de un badge, una invitación o un enlace del movimiento.", "Point the camera at a badge code, an invitation or a link from the movement.", "Aponte a câmera para o código de um badge, um convite ou um link do movimento."],
    ["Tu número de siempre", "Your lifelong number", "Seu número de sempre"],
    ["Panel del guardián", "Guardian panel", "Painel do guardião"],

    // Mi número
    ["Eres el", "You are", "Você é o"],
    ["Consejo: agrega esta página a tu pantalla de inicio (iPhone: compartir → \"Agregar a pantalla de inicio\"; Android: menú ⋮ → \"Instalar app\") para que tu llave no se borre.", "Tip: add this page to your home screen (iPhone: share → \"Add to Home Screen\"; Android: menu ⋮ → \"Install app\") so your key is not erased.", "Dica: adicione esta página à tela inicial (iPhone: compartilhar → \"Adicionar à Tela de Início\"; Android: menu ⋮ → \"Instalar app\") para que sua chave não seja apagada."],
    ["Este teléfono tiene una llave, pero todavía no tiene número. Pide a un miembro que te invite.", "This phone has a key but no number yet. Ask a member to invite you.", "Este celular tem uma chave, mas ainda não tem número. Peça a um membro que convide você."],
    ["Este teléfono todavía no tiene llave. Se crea sola cuando aceptas una invitación.", "This phone has no key yet. It is created automatically when you accept an invitation.", "Este celular ainda não tem chave. Ela é criada sozinha quando você aceita um convite."],
    ["Tu dirección anónima:", "Your anonymous address:", "Seu endereço anônimo:"],
    ["Ver mis 12 palabras de respaldo", "See my 12 backup words", "Ver minhas 12 palavras de backup"],
    ["Recuperar con mis 12 palabras", "Recover with my 12 words", "Recuperar com minhas 12 palavras"],
    ["palabra palabra palabra…", "word word word…", "palavra palavra palavra…"],
    ["Recuperar", "Recover", "Recuperar"],
    ["Crear una llave (para fundadores)", "Create a key (for founders)", "Criar uma chave (para fundadores)"],
    ["Esas palabras no son válidas.", "Those words are not valid.", "Essas palavras não são válidas."],
    ["Escríbelas a mano en papel, en orden, y guárdalo en un lugar seguro. Si pierdes el teléfono, con ellas recuperas tu número. Nunca les tomes foto ni se las muestres a nadie.", "Write them by hand on paper, in order, and keep it somewhere safe. If you lose your phone, they get your number back. Never take a photo of them or show them to anyone.", "Escreva-as à mão em papel, em ordem, e guarde num lugar seguro. Se perder o celular, com elas você recupera seu número. Nunca tire foto nem mostre a ninguém."],
    ["Ya las anoté en papel", "I wrote them on paper", "Já anotei no papel"],
    ["Para comprobar, escribe de memoria o mirando tu papel:", "To check, type from memory or from your paper:", "Para comprovar, escreva de memória ou olhando seu papel:"],
    ["Palabra número {n}", "Word number {n}", "Palavra número {n}"],
    ["Comprobar", "Check", "Comprovar"],
    ["No coinciden. Revisa tu papel y vuelve a intentarlo.", "They don't match. Check your paper and try again.", "Não coincidem. Confira seu papel e tente de novo."],
    ["Perfecto. Tu respaldo está confirmado. Guarda ese papel en un lugar seguro.", "Perfect. Your backup is confirmed. Keep that paper somewhere safe.", "Perfeito. Seu backup está confirmado. Guarde esse papel num lugar seguro."],
    ["Todavía no confirmas que anotaste tus 12 palabras. Sin ellas, si pierdes el teléfono, pierdes tu llave.", "You haven't confirmed that you wrote down your 12 words. Without them, if you lose your phone, you lose your key.", "Você ainda não confirmou que anotou suas 12 palavras. Sem elas, se perder o celular, perde sua chave."],

    // Invitar
    ["Solo un miembro con número puede invitar. Abre esta página desde el teléfono donde tienes tu badge.", "Only a member with a number can invite. Open this page on the phone that holds your badge.", "Só um membro com número pode convidar. Abra esta página no celular onde está seu badge."],
    ["Unas palabras para quien invitas (opcional)", "A few words for the person you invite (optional)", "Algumas palavras para quem você convida (opcional)"],
    ["Por ejemplo: Te vi ayudar sin que nadie mirara. Bienvenido.", "For example: I saw you help when no one was looking. Welcome.", "Por exemplo: Vi você ajudar sem ninguém olhar. Bem-vindo."],
    ["Crear invitación", "Create invitation", "Criar convite"],
    ["Invitación de #{n} · con tu mensaje", "Invitation from #{n} · with your message", "Convite de #{n} · com sua mensagem"],
    ["Invitación de #{n}", "Invitation from #{n}", "Convite de #{n}"],
    ["Copiar enlace", "Copy link", "Copiar link"],
    ["Crear otra invitación", "Create another invitation", "Criar outro convite"],
    ["Enlace copiado.", "Link copied.", "Link copiado."],

    // Unirse
    ["Esta invitación no se puede leer.", "This invitation can't be read.", "Este convite não pode ser lido."],
    ["Esta invitación ya venció. Pide una nueva.", "This invitation has expired. Ask for a new one.", "Este convite já venceu. Peça um novo."],
    ["Este teléfono ya es el", "This phone is already", "Este celular já é o"],
    [". Cada persona tiene un solo número.", ". Each person has only one number.", ". Cada pessoa tem um só número."],
    ["El miembro", "Member", "O membro"],
    ["te considera merecedor de un número.", "considers you worthy of a number.", "considera você merecedor de um número."],
    ["Al aceptar se crea una llave anónima en este teléfono y recibes el siguiente número. No se pide nombre, correo ni ningún dato tuyo. No cuesta nada.", "When you accept, an anonymous key is created on this phone and you get the next number. No name, email or any data about you is asked for. It costs nothing.", "Ao aceitar, uma chave anônima é criada neste celular e você recebe o próximo número. Não se pede nome, e-mail nem nenhum dado seu. Não custa nada."],
    ["Aceptar mi número", "Accept my number", "Aceitar meu número"],
    ["Registrando en la cadena…", "Registering on the chain…", "Registrando na cadeia…"],
    ["Bienvenido. Eres el", "Welcome. You are", "Bem-vindo. Você é o"],
    ["Ahora ve a \"Mi número\" y guarda tus 12 palabras de respaldo en papel.", "Now go to \"My number\" and write your 12 backup words on paper.", "Agora vá em \"Meu número\" e guarde suas 12 palavras de backup no papel."],
    ["Y agrega esta página a tu pantalla de inicio (en iPhone: botón compartir → \"Agregar a pantalla de inicio\"; en Android: menú ⋮ → \"Instalar app\"). Así tu llave no se borra.", "And add this page to your home screen (iPhone: share button → \"Add to Home Screen\"; Android: menu ⋮ → \"Install app\"). That way your key is not erased.", "E adicione esta página à tela inicial (no iPhone: botão compartilhar → \"Adicionar à Tela de Início\"; no Android: menu ⋮ → \"Instalar app\"). Assim sua chave não é apagada."],
    ["Intentar de nuevo", "Try again", "Tentar de novo"],
    ["No se pudo registrar: {x}.", "Could not register: {x}.", "Não foi possível registrar: {x}."],

    // Badge y comprobación
    ["Este teléfono no tiene número todavía.", "This phone doesn't have a number yet.", "Este celular ainda não tem número."],
    ["Consultando la cadena…", "Checking the chain…", "Consultando a cadeia…"],
    ["Verificado: esta persona es el", "Verified: this person is", "Verificado: esta pessoa é o"],
    ["del movimiento.", "of the movement.", "do movimento."],
    ["No verificado: {x}.", "Not verified: {x}.", "Não verificado: {x}."],
    ["esta firma no corresponde al dueño del #{n}", "this signature does not belong to the owner of #{n}", "esta assinatura não corresponde ao dono do #{n}"],
    ["el código es auténtico pero tiene {n} segundos; pide que lo muestren de nuevo en vivo", "the code is genuine but it is {n} seconds old; ask them to show it again live", "o código é autêntico mas tem {n} segundos; peça que mostrem de novo ao vivo"],

    // Escáner y encuentro
    ["Modo encuentro", "Meeting mode", "Modo encontro"],
    ["Para la entrada de una reunión: escanea el badge de cada persona y la página cuenta cuántos miembros distintos llegaron. No se guarda quiénes: al cerrar o terminar, la cuenta desaparece.", "For the door of a gathering: scan each person's badge and the page counts how many different members arrived. Who they are is not saved: when you close or finish, the count disappears.", "Para a entrada de uma reunião: escaneie o badge de cada pessoa e a página conta quantos membros diferentes chegaram. Não se guarda quem: ao fechar ou terminar, a contagem desaparece."],
    ["miembros verificados", "members verified", "membros verificados"],
    ["Terminar encuentro", "End meeting", "Encerrar encontro"],
    ["Empezar encuentro", "Start meeting", "Começar encontro"],
    ["Encuentro terminado: {n} miembros verificados. La lista se borró.", "Meeting ended: {n} members verified. The list was erased.", "Encontro encerrado: {n} membros verificados. A lista foi apagada."],
    ["este código no es del movimiento", "this code is not from the movement", "este código não é do movimento"],
    ["#{n} verificado. Bienvenido.", "#{n} verified. Welcome.", "#{n} verificado. Bem-vindo."],
    ["#{n} ya estaba contado.", "#{n} was already counted.", "#{n} já estava contado."],
    ["No se pudo abrir la cámara. Revisa que la página tenga permiso para usarla.", "Could not open the camera. Check that the page has permission to use it.", "Não foi possível abrir a câmera. Verifique se a página tem permissão para usá-la."],

    // Miembro antiguo
    ["Este enlace no es válido.", "This link is not valid.", "Este link não é válido."],
    ["Este teléfono ya tiene el", "This phone already has", "Este celular já tem o"],
    ["El", "Number", "O"],
    ["ya está registrado en la cadena. Si es tuyo y perdiste la llave, avísale al guardián.", "is already registered on the chain. If it is yours and you lost the key, tell the guardian.", "já está registrado na cadeia. Se é seu e você perdeu a chave, avise o guardião."],
    ["Tu llave está lista. Ahora envía este código a quien te mandó el enlace, respondiendo el mismo mensaje:", "Your key is ready. Now send this code to whoever sent you the link, replying to the same message:", "Sua chave está pronta. Agora envie este código a quem mandou o link, respondendo à mesma mensagem:"],
    ["Responder por WhatsApp", "Reply on WhatsApp", "Responder pelo WhatsApp"],
    ["Copiar código", "Copy code", "Copiar código"],
    ["Este código no es secreto: solo dice a qué llave va tu número. Cuando el guardián lo registre, verás tu badge en \"Mi número\". Allí guarda también tus 12 palabras en papel.", "This code is not secret: it only says which key your number goes to. Once the guardian registers it, you'll see your badge in \"My number\". There, also write your 12 words on paper.", "Este código não é secreto: só diz para qual chave vai seu número. Quando o guardião registrar, você verá seu badge em \"Meu número\". Lá, guarde também suas 12 palavras no papel."],
    ["Código copiado.", "Code copied.", "Código copiado."],
    ["del movimiento. Para dejar tu número registrado para siempre en la cadena, este teléfono necesita una llave anónima.", "of the movement. To register your number forever on the chain, this phone needs an anonymous key.", "do movimento. Para deixar seu número registrado para sempre na cadeia, este celular precisa de uma chave anônima."],
    ["No se pide nombre, correo ni ningún dato tuyo. No cuesta nada.", "No name, email or any data about you is asked for. It costs nothing.", "Não se pede nome, e-mail nem nenhum dado seu. Não custa nada."],
    ["Crear mi llave", "Create my key", "Criar minha chave"],

    // Anuncios y votaciones
    ["Anuncios", "Announcements", "Anúncios"],
    ["Anuncio {n} · {x} ·", "Announcement {n} · {x} ·", "Anúncio {n} · {x} ·"],
    ["publicado por el guardián en la cadena", "published by the guardian on the chain", "publicado pelo guardião na cadeia"],
    ["Votación abierta", "Open vote", "Votação aberta"],
    ["Votación cerrada", "Closed vote", "Votação encerrada"],
    ["{n} voto", "{n} vote", "{n} voto"],
    ["{n} votos", "{n} votes", "{n} votos"],
    ["cierra el {x}", "closes {x}", "fecha em {x}"],
    ["cerró el {x}", "closed {x}", "fechou em {x}"],
    ["tu número ya votó", "your number already voted", "seu número já votou"],
    ["solo votan los miembros desde su teléfono", "only members vote, from their phones", "só os membros votam, pelo celular"],
    ["¿Votar \"{x}\"? Tu número solo puede votar una vez.", "Vote \"{x}\"? Your number can only vote once.", "Votar \"{x}\"? Seu número só pode votar uma vez."],
    ["Enviando voto…", "Sending vote…", "Enviando voto…"],
    ["No se pudo votar: {x}.", "Could not vote: {x}.", "Não foi possível votar: {x}."],

    // Bondad
    ["Actos de bondad", "Acts of kindness", "Atos de bondade"],
    ["{n} hoy · nadie sabe cuáles ni de quién", "{n} today · no one knows which or by whom", "{n} hoje · ninguém sabe quais nem de quem"],
    ["✦ Tu acto de hoy ya está contado · llevas {n}", "✦ Your act for today is counted · {n} so far", "✦ Seu ato de hoje já foi contado · você já tem {n}"],
    ["✦ Tu acto de hoy ya está contado", "✦ Your act for today is counted", "✦ Seu ato de hoje já foi contado"],
    ["Hoy hice un acto de bondad", "Today I did an act of kindness", "Hoje fiz um ato de bondade"],
    ["Cada miembro marca aquí, una vez al día, que hizo algo bueno por alguien. Sin decir qué.", "Once a day, each member marks here that they did something good for someone. Without saying what.", "Cada membro marca aqui, uma vez por dia, que fez algo bom por alguém. Sem dizer o quê."],
    ["Contando…", "Counting…", "Contando…"],
    ["No se pudo contar: {x}.", "Could not count it: {x}.", "Não foi possível contar: {x}."],

    // Historia y avisos
    ["Nuestra historia", "Our story", "Nossa história"],
    ["Miembros a lo largo del tiempo", "Members over time", "Membros ao longo do tempo"],
    ["La historia empieza aquí. Cada día se agrega un punto.", "The story starts here. A point is added every day.", "A história começa aqui. A cada dia se acrescenta um ponto."],
    ["De {n} a {n} miembros.", "From {n} to {n} members.", "De {n} a {n} membros."],
    ["Recibe los avisos", "Get the notices", "Receba os avisos"],
    ["Te llega una notificación cuando el guardián publica un anuncio o abre una votación. No se pide ningún dato tuyo.", "You get a notification when the guardian publishes an announcement or opens a vote. No data about you is asked for.", "Você recebe uma notificação quando o guardião publica um anúncio ou abre uma votação. Não se pede nenhum dado seu."],
    ["Instala la app gratuita", "Install the free app", "Instale o app gratuito"],
    ["Toca", "Tap", "Toque em"],
    ["(suscribirse) y escribe este tema:", "(subscribe) and type this topic:", "(inscrever-se) e escreva este tópico:"],
    ["Copiar el tema", "Copy the topic", "Copiar o tópico"],
    ["O recibirlos en el navegador", "Or get them in the browser", "Ou receber no navegador"],
    ["Tema copiado ✓", "Topic copied ✓", "Tópico copiado ✓"],
    ["No se pudo conectar con la cadena. Intenta más tarde.", "Could not connect to the chain. Try again later.", "Não foi possível conectar com a cadeia. Tente mais tarde."],

    // Mensajes del patrocinador de gas
    ["la fecha del teléfono no coincide, revisa la hora", "the phone's date doesn't match, check the time", "a data do celular não coincide, confira a hora"],
    ["tu número ya marcó su acto de hoy", "your number already marked today's act", "seu número já marcou o ato de hoje"],
    ["la votación ya cerró", "the vote has closed", "a votação já fechou"],
    ["esa opción no existe", "that option doesn't exist", "essa opção não existe"],
    ["este número ya votó", "this number already voted", "este número já votou"],
    ["esta invitación ya se usó", "this invitation was already used", "este convite já foi usado"],
    ["esta invitación venció", "this invitation expired", "este convite venceu"],
    ["la invitación no es de un miembro", "the invitation is not from a member", "o convite não é de um membro"],
    ["esta llave ya tiene número", "this key already has a number", "esta chave já tem número"],
    ["las invitaciones están pausadas por ahora", "invitations are paused for now", "os convites estão pausados por enquanto"],
    ["este miembro ya invitó a muchas personas hoy, prueba mañana", "this member already invited many people today, try tomorrow", "este membro já convidou muitas pessoas hoje, tente amanhã"],
    ["Failed to fetch", "the gas sponsor didn't answer; wait a minute and try again", "o patrocinador de gás não respondeu; espere um minuto e tente de novo"],
  ];

  const IDIOMAS = ["es", "en", "pt"];
  const LOCALES = { es: "es", en: "en", pt: "pt-BR" };
  const COL = { en: 1, pt: 2 };
  const limpiar = (s) => s.replace(/\s+/g, " ").trim();
  const exactas = new Map(), patrones = [];
  for (const f of FRASES) {
    const clave = limpiar(f[0]);
    if (!/\{[nx]\}/.test(clave)) { exactas.set(clave, f); continue; }
    const tipos = [];
    const re = clave.split(/(\{[nx]\})/).map((p) => {
      if (p === "{n}") { tipos.push("n"); return "([#\\d.,:\\-–]+)"; }
      if (p === "{x}") { tipos.push("x"); return "([\\s\\S]+?)"; }
      return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
    patrones.push({ re: new RegExp(`^${re}$`), tipos, f });
  }

  let idioma = "es";
  try { idioma = localStorage.getItem("movimiento.idioma") || ""; } catch {}
  if (!IDIOMAS.includes(idioma)) { const nav = (navigator.language || "es").slice(0, 2).toLowerCase(); idioma = IDIOMAS.includes(nav) ? nav : "es"; }

  function traducir(texto, lang = idioma) {
    if (lang === "es") return null;
    const c = limpiar(texto); if (!c) return null;
    const f = exactas.get(c); if (f) return f[COL[lang]];
    for (const p of patrones) {
      const m = c.match(p.re); if (!m) continue;
      let i = 0;
      return p.f[COL[lang]].replace(/\{[nx]\}/g, () => { const v = m[++i]; return p.tipos[i - 1] === "x" ? (traducir(v, lang) ?? v) : v; });
    }
    return null;
  }

  const NO_ATTR = "[translate=no],#guardian-contenido,.idiomas";
  const NO = `script,style,code,textarea,.palabras,.frase,.numeros,#total,#bondad-total,${NO_ATTR}`;
  const textos = new WeakMap();   // nodo de texto -> { es, out }
  const attrs = new WeakMap();    // elemento -> { atributo: { es, out } }
  const ATRIBUTOS = ["placeholder", "aria-label", "alt", "title"];

  function nodoTexto(n) {
    const p = n.parentElement; if (!p || p.closest(NO)) return;
    const v = n.nodeValue, r = textos.get(n);
    const es = r && v === r.out ? r.es : v;
    const t = traducir(es);
    const out = t == null ? es : es.match(/^\s*/)[0] + t + es.match(/\s*$/)[0];
    textos.set(n, { es, out });
    if (out !== v) n.nodeValue = out;
  }
  function atributos(el) {
    if (el.closest(NO_ATTR)) return;
    let m = attrs.get(el);
    for (const a of ATRIBUTOS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a); if (!m) attrs.set(el, (m = {}));
      const r = m[a], es = r && v === r.out ? r.es : v;
      const out = traducir(es) ?? es;
      m[a] = { es, out };
      if (out !== v) el.setAttribute(a, out);
    }
  }
  function recorrer(raiz) {
    if (raiz.nodeType === 3) return nodoTexto(raiz);
    if (raiz.nodeType !== 1) return;
    atributos(raiz);
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? nodoTexto(n) : atributos(n);
  }

  function aplicar() {
    document.documentElement.lang = idioma;
    document.title = traducir("Movimiento sin nombre") || "Movimiento sin nombre";
    recorrer(document.body);
    document.querySelectorAll(".idiomas button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.l === idioma));
  }

  function selector() {
    const cab = document.querySelector(".cabecera"); if (!cab || cab.querySelector(".idiomas")) return;
    const d = document.createElement("div"); d.className = "idiomas"; d.setAttribute("role", "group"); d.setAttribute("aria-label", "Idioma / Language");
    d.innerHTML = IDIOMAS.map((l) => `<button type="button" data-l="${l}" lang="${l}">${l.toUpperCase()}</button>`).join("");
    d.onclick = (e) => {
      const l = e.target.closest("button")?.dataset.l; if (!l || l === idioma) return;
      idioma = l; try { localStorage.setItem("movimiento.idioma", l); } catch {}
      aplicar();
      window.dispatchEvent(new HashChangeEvent("hashchange")); // vuelve a pintar la vista (fechas en el idioma nuevo)
    };
    cab.prepend(d);
  }

  window.i18n = { t: (s) => traducir(s) ?? s, locale: () => LOCALES[idioma], idioma: () => idioma };
  selector(); aplicar();
  new MutationObserver((cambios) => {
    for (const c of cambios) {
      if (c.type === "characterData") nodoTexto(c.target);
      else if (c.type === "attributes") atributos(c.target);
      else c.addedNodes.forEach(recorrer);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
})();
