// ======================
// UTIL
// ======================
function rInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleCopy(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normText(s) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^(il|lo|la|l'|i|gli|le)\s+/i, "")
    .replace(/\s+/g, " ");
}

function safeGet(id) {
  return document.getElementById(id);
}

function onClick(id, fn) {
  const el = safeGet(id);
  if (!el) return;
  el.addEventListener("click", fn);
}

function showScreen(name) {
  const map = {
    home: "screenHome",
    arte: "screenArte",
    mat:  "screenMat",
    tec:  "screenTec",
    geo:  "screenGeo",
    geog: "screenGeog",
    mus:  "screenMus",
  };

  Object.values(map).forEach(id => {
    const el = safeGet(id);
    if (el) el.style.display = "none";
  });

  const target = safeGet(map[name]);
  if (target) target.style.display = "block";
}

// ======================
// CALCOLATRICI
// ======================
function calcAppend(displayId, v) {
  const el = safeGet(displayId);
  if (!el) return;
  el.value += v;
}
function calcClear(displayId) {
  const el = safeGet(displayId);
  if (!el) return;
  el.value = "";
}
function calcEq(displayId) {
  const el = safeGet(displayId);
  if (!el) return;
  try {
    // eslint-disable-next-line no-eval
    el.value = eval(el.value);
  } catch {
    el.value = "Errore";
  }
}

function bindCalculators() {
  document.querySelectorAll("button[data-calc]").forEach(btn => {
    btn.addEventListener("click", () => {
      const which = btn.dataset.calc; // mat / tec / geo
      const act = btn.dataset.act;    // clear / eq
      const v = btn.dataset.v;

      const displayId =
        which === "mat" ? "calcMat" :
        which === "tec" ? "calcTec" :
        "calcGeo";

      if (act === "clear") return calcClear(displayId);
      if (act === "eq") return calcEq(displayId);
      if (v !== undefined) return calcAppend(displayId, v);
    });
  });
}

// ======================
// ARTE
// ======================
let opere = [];
let corrente = null;
let mazzo = [];
let idx = 0;
let selectedIds = new Set();

function normArte(t) {
  return (t ?? "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/^(la|il|lo|l'|i|gli|le)\s+/i, "")
    .replace(/\s+/g, "");
}

function operaId(op, i) {
  return op.img ? `img:${op.img}` : `idx:${i}`;
}

function updateArtInfo() {
  const info = safeGet("artInfo");
  if (!info) return;
  info.textContent = `Selezionati: ${selectedIds.size} su ${opere.length}`;
}

function renderArtList() {
  const list = safeGet("artList");
  const qEl = safeGet("artSearch");
  if (!list || !qEl) return;

  const q = normArte(qEl.value);
  list.innerHTML = "";

  opere.forEach((op, i) => {
    const id = operaId(op, i);
    const titoloPrincipale =
      op.titolo ?? (Array.isArray(op.titoli) ? op.titoli[0] : "Senza titolo");
    const artista = op.artista ?? "";

    const hay = normArte(`${titoloPrincipale} ${artista}`);
    if (q && !hay.includes(q)) return;

    const row = document.createElement("div");
    row.className = "artRow";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selectedIds.has(id);
    cb.tabIndex = -1;
    cb.style.pointerEvents = "none";

    const meta = document.createElement("div");
    meta.className = "artMeta";

    const t1 = document.createElement("div");
    t1.className = "artTitle";
    t1.textContent = titoloPrincipale;

    const t2 = document.createElement("div");
    t2.className = "artSub";
    t2.textContent = artista || "Artista sconosciuto";

    meta.appendChild(t1);
    meta.appendChild(t2);

    row.appendChild(cb);
    row.appendChild(meta);

    row.addEventListener("click", () => {
      const newVal = !selectedIds.has(id);
      if (newVal) selectedIds.add(id);
      else selectedIds.delete(id);
      cb.checked = newVal;
      row.classList.toggle("isSelected", newVal);
      updateArtInfo();
    });

    row.classList.toggle("isSelected", selectedIds.has(id));
    list.appendChild(row);
  });

  updateArtInfo();
}

function buildArteDeckFromSelection() {
  const pool = opere
    .map((op, i) => ({ op, id: operaId(op, i) }))
    .filter(x => selectedIds.has(x.id))
    .map(x => x.op);

  const out = safeGet("out");
  const imgEl = safeGet("artImg");

  if (!pool.length) {
    if (out) out.textContent = "Seleziona almeno 1 quadro e premi Applica.";
    mazzo = [];
    idx = 0;
    corrente = null;
    if (imgEl) imgEl.removeAttribute("src");
    return false;
  }

  mazzo = shuffleCopy(pool);
  idx = 0;
  return true;
}

function titoloOK(risposta, listaTitoli) {
  const r = normArte(risposta);
  return listaTitoli.some(t => {
    const s = normArte(t);
    return r === s || s.includes(r) || r.includes(s);
  });
}

function artistaOK(risposta, soluzione) {
  const r = normArte(risposta);
  const s = normArte(soluzione);
  return r === s || s.includes(r) || r.includes(s);
}

async function caricaArte() {
  const out = safeGet("out");
  try {
    const r = await fetch("data.json", { cache: "no-store" });
    opere = await r.json();

    if (!Array.isArray(opere) || opere.length === 0) {
      if (out) out.textContent = "data.json è vuoto o non valido.";
      return;
    }

    selectedIds = new Set(opere.map((op, i) => operaId(op, i)));
    renderArtList();
    buildArteDeckFromSelection();
    nextArte();
  } catch {
    if (out) out.textContent = "Errore caricamento data.json (controlla che sia nel repo).";
  }
}

function boostArtImageSize() {
  const img = safeGet("artImg");
  if (!img) return;
  img.style.width = "100%";
  img.style.maxHeight = "65vh";
  img.style.objectFit = "contain";
}

function nextArte() {
  if (!mazzo.length) return;

  if (idx >= mazzo.length) {
    mazzo = shuffleCopy(mazzo);
    idx = 0;
  }

  corrente = mazzo[idx++];
  const imgEl = safeGet("artImg");
  const out = safeGet("out");
  if (!imgEl) return;

  imgEl.onerror = () => {
    if (out) out.textContent =
      "Immagine non trovata: " + (corrente?.img ?? "(manca path)") +
      "\nControlla cartella img/ e nome file (maiuscole/minuscole).";
  };

  imgEl.src = corrente.img;
  boostArtImageSize();

  if (out) out.textContent = "";
  if (safeGet("inTitolo")) safeGet("inTitolo").value = "";
  if (safeGet("inArtista")) safeGet("inArtista").value = "";
  if (safeGet("inData")) safeGet("inData").value = "";
}

function checkArte() {
  if (!corrente) return;

  const t = safeGet("inTitolo")?.value ?? "";
  const a = safeGet("inArtista")?.value ?? "";
  const d = safeGet("inData")?.value ?? "";

  let punti = 0;
  const listaTitoli = Array.isArray(corrente.titoli) ? corrente.titoli : [corrente.titolo];

  if (titoloOK(t, listaTitoli)) punti++;
  if (artistaOK(a, corrente.artista)) punti++;
  if (normArte(d) === normArte(corrente.data)) punti++;

  safeGet("out").textContent =
    `Punteggio: ${punti}/3\n` +
    `Titoli accettati: ${listaTitoli.join(" / ")}\n` +
    `Artista: ${corrente.artista}\n` +
    `Data: ${corrente.data}`;
}

// ======================
// MATEMATICA (POLINOMI da lista: math.json) (casuale senza ripetizioni)
// ======================
let MATH_BANK = [];
let currentMath = null;
let mathDeck = [];
let mathIdx = 0;
let soluzionePoly = null;

// ---- Razionali (frazioni) ----
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function fracNorm(num, den) {
  if (den < 0) { den = -den; num = -num; }
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}
function rat(num, den = 1) {
  const f = fracNorm(num, den);
  return { num: f.num, den: f.den };
}
function ratIsZero(r) { return r.num === 0; }
function ratAdd(a, b) { return rat(a.num * b.den + b.num * a.den, a.den * b.den); }
function ratSub(a, b) { return rat(a.num * b.den - b.num * a.den, a.den * b.den); }
function ratEq(a, b) { return a.num === b.num && a.den === b.den; }

// ---- Polinomi: Map(exp -> razionale) ----
function polyEmpty() { return new Map(); }
function polyFromTerms(terms) {
  const p = polyEmpty();
  for (const t of terms) {
    const e = t.exp;
    const c = t.coef;
    p.set(e, p.has(e) ? ratAdd(p.get(e), c) : { ...c });
    if (ratIsZero(p.get(e))) p.delete(e);
  }
  return p;
}

function parseRational(str) {
  if (!str) return null;
  str = str.trim();
  if (!str) return null;

  if (str.includes("/")) {
    const [a, b] = str.split("/");
    const num = parseInt(a, 10);
    const den = parseInt(b, 10);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return rat(num, den);
  }

  const val = Number(str.replace(",", "."));
  if (!Number.isFinite(val)) return null;
  const scaled = Math.round(val * 1000);
  return rat(scaled, 1000);
}

function parsePolynomial(input) {
  if (!input) return null;
  let s = input.toLowerCase().trim();
  if (!s) return null;

  s = s.replace(/\s+/g, "");
  s = s.replace(/\*/g, "");

  // niente parentesi nella risposta: solo termini
  if (!/^[0-9x+\-^\/\.,]+$/.test(s)) return null;

  const parts = s.match(/[+\-]?[^+\-]+/g);
  if (!parts) return null;

  const terms = [];

  for (let part of parts) {
    let sign = 1;
    if (part[0] === "+") part = part.slice(1);
    else if (part[0] === "-") { sign = -1; part = part.slice(1); }

    if (!part) return null;

    const hasX = part.includes("x");
    let coefStr = "";
    let exp = 0;

    if (!hasX) {
      coefStr = part;
      exp = 0;
    } else {
      const [beforeX, afterX = ""] = part.split("x");
      coefStr = beforeX;

      if (coefStr === "") coefStr = "1";

      if (afterX === "") exp = 1;
      else if (afterX.startsWith("^")) {
        exp = parseInt(afterX.slice(1), 10);
        if (!Number.isFinite(exp)) return null;
      } else return null;
    }

    const coef = parseRational(coefStr);
    if (!coef) return null;

    terms.push({ coef: rat(coef.num * sign, coef.den), exp });
  }

  return polyFromTerms(terms);
}

function samePolynomial(a, b) {
  if (!a || !b) return false;
  const exps = new Set([...a.keys(), ...b.keys()]);
  for (const e of exps) {
    const ca = a.get(e) || rat(0, 1);
    const cb = b.get(e) || rat(0, 1);
    if (!ratEq(ca, cb)) return false;
  }
  return true;
}

function buildMathDeck() {
  mathDeck = shuffleCopy(MATH_BANK);
  mathIdx = 0;
}

async function caricaMathBank() {
  const out = safeGet("mathOut");
  try {
    const r = await fetch("math.json", { cache: "no-store" });
    MATH_BANK = await r.json();

    if (!Array.isArray(MATH_BANK) || MATH_BANK.length === 0) {
      MATH_BANK = [];
      mathDeck = [];
      mathIdx = 0;
      if (out) out.textContent = "❌ math.json è vuoto o non valido.";
      return false;
    }

    buildMathDeck();
    return true;
  } catch {
    MATH_BANK = [];
    mathDeck = [];
    mathIdx = 0;
    if (out) out.textContent = "❌ math.json non trovato o non valido.";
    return false;
  }
}

function nuovaEspressione() {
  const out = safeGet("mathOut");

  if (!MATH_BANK.length) {
    if (out) out.textContent = "Carico gli esercizi...";
    caricaMathBank().then(ok => { if (ok) nuovaEspressione(); });
    return;
  }

  if (!mathDeck.length || mathIdx >= mathDeck.length) {
    buildMathDeck();
  }

  currentMath = mathDeck[mathIdx++];

  const q = (currentMath.q ?? "").toString();
  const a = (currentMath.a ?? "").toString();

  const parsedSol = parsePolynomial(a);
  if (!parsedSol) {
    safeGet("mathExpr").textContent = q || "(esercizio senza testo)";
    safeGet("mathOut").textContent =
      "⚠️ Questo esercizio ha una soluzione (a) non valida in math.json.\n" +
      "Correggi la voce 'a' (es: 3x^2-2x+1).";
    soluzionePoly = null;
    safeGet("mathAns").value = "";
    return;
  }

  soluzionePoly = parsedSol;
  safeGet("mathExpr").textContent = q;
  safeGet("mathAns").value = "";
  safeGet("mathOut").textContent =
    `Esercizio ${mathIdx}/${mathDeck.length}\n` +
    "Scrivi il polinomio semplificato (es: 3x^2-2x+1, -x^3+x-5, 1/2x^2+3/4x-2).";
}

function checkMath() {
  const out = safeGet("mathOut");

  if (!soluzionePoly) {
    if (out) out.textContent = "⚠️ Nessuna soluzione valida per questo esercizio (controlla math.json).";
    return;
  }

  const user = parsePolynomial(safeGet("mathAns").value);
  if (!user) {
    if (out) out.textContent =
      "Risposta non valida.\n" +
      "Esempi: 3x^2-2x+1, -x^3+x-5, 1/2x^2+3/4x-2.\n" +
      "Usa x e x^n, niente parentesi nella risposta.";
    return;
  }

  if (samePolynomial(user, soluzionePoly)) {
    out.textContent = "✅ Corretto!";
  } else {
    out.textContent =
      `❌ Sbagliato\nRisposta corretta: ${currentMath.a}`;
  }
}

// ======================
// GEOMETRIA
// ======================
let soluzioneGeo = 0;

function rnd05(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 2) / 2;
}

function nuovoProblemaGeo() {
  const tipo = rInt(1, 9);
  let testo = "";
  let sol = 0;

  const b = rnd05(4, 20);
  const h = rnd05(4, 20);
  const l = rnd05(4, 20);
  const r = rnd05(3, 15);
  const d1 = rnd05(4, 20);
  const d2 = rnd05(4, 20);
  const pi = 3.14;

  switch (tipo) {
    case 1: testo = `Un quadrato ha lato ${l} cm.\nQual è la sua area?`; sol = l*l; break;
    case 2: testo = `Un quadrato ha lato ${l} cm.\nQual è il suo perimetro?`; sol = 4*l; break;
    case 3: testo = `Un rettangolo ha base ${b} cm e altezza ${h} cm.\nQual è la sua area?`; sol = b*h; break;
    case 4: {
      const area = Math.round((b*h)*2)/2;
      testo = `Un rettangolo ha area ${area} cm² e altezza ${h} cm.\nQual è la base?`;
      sol = b;
      break;
    }
    case 5: testo = `Un parallelogramma ha base ${b} cm e altezza ${h} cm.\nQual è la sua area?`; sol = b*h; break;
    case 6: testo = `Un rombo ha diagonali ${d1} cm e ${d2} cm.\nQual è la sua area?`; sol = (d1*d2)/2; break;
    case 7: testo = `Un triangolo ha base ${b} cm e altezza ${h} cm.\nQual è la sua area?`; sol = (b*h)/2; break;
    case 8: testo = `Un cerchio ha raggio ${r} cm.\nQual è la sua area? (usa π = 3.14)`; sol = pi*r*r; break;
    case 9: testo = `Un cerchio ha raggio ${r} cm.\nQual è la sua circonferenza? (usa π = 3.14)`; sol = 2*pi*r; break;
  }

  soluzioneGeo = Math.round(sol * 2) / 2;
  safeGet("geoText").textContent = testo;
  safeGet("geoAns").value = "";
  safeGet("geoOut").textContent = "";
}

function checkGeo() {
  const raw = safeGet("geoAns").value.trim().replace(",", ".");
  const n = parseFloat(raw);
  if (Number.isNaN(n)) {
    safeGet("geoOut").textContent = "Inserisci un numero valido.";
    return;
  }
  if (Math.abs(n - soluzioneGeo) <= 0.9) {
    safeGet("geoOut").textContent = "✅ Corretto!";
  } else {
    safeGet("geoOut").textContent =
      `❌ Sbagliato\nRisultato corretto: ${soluzioneGeo}`;
  }
}

// ======================
// TECNOLOGIA (Ohm: mostra SOLO 2 dati su 3)
// ======================
let soluzioneTec = 0;
let unitaTec = "";

function nuovoProblemaTec() {
  const tecImg = document.getElementById("tecImg");
  if (tecImg) tecImg.src = "img/circuito_semplice.png";

  const missing = rInt(0, 2);

  let Vshow = "?";
  let Ishow = "?";
  let Rshow = "?";

  let V, I, R;

  if (missing === 0) {
    V = rInt(6, 24);
    R = rInt(2, 30);
    I = V / R;

    Vshow = V.toFixed(2);
    Rshow = R.toFixed(2);

    soluzioneTec = I;
    unitaTec = "A";
  } else if (missing === 1) {
    R = rInt(2, 30);
    I = rInt(1, 20) / rInt(2, 10);
    V = I * R;

    Ishow = I.toFixed(2);
    Rshow = R.toFixed(2);

    soluzioneTec = V;
    unitaTec = "V";
  } else {
    V = rInt(6, 24);
    I = rInt(1, 20) / rInt(2, 10);
    R = V / I;

    Vshow = V.toFixed(2);
    Ishow = I.toFixed(2);

    soluzioneTec = R;
    unitaTec = "Ω";
  }

  const testo =
`DATI:
- V = ${Vshow} V
- I = ${Ishow} A
- R = ${Rshow} Ω

DOMANDA:
Trova il valore mancante.`;

  document.getElementById("tecText").textContent = testo;
  document.getElementById("tecAns").value = "";
  document.getElementById("tecOut").textContent = "";
}

function checkTec() {
  const out = document.getElementById("tecOut");
  const raw = document.getElementById("tecAns").value.trim().replace(",", ".");
  const ans = parseFloat(raw);

  if (Number.isNaN(ans)) {
    out.textContent = "Inserisci un numero valido.";
    return;
  }

  const ok = Math.abs(ans - soluzioneTec) <= 0.1;

  out.textContent = ok
    ? `✅ Corretto! (${soluzioneTec.toFixed(2)} ${unitaTec})`
    : `❌ Sbagliato. Risultato corretto: ${soluzioneTec.toFixed(2)} ${unitaTec}`;
}

// ======================
// GEOGRAFIA (Africa: Stato ↔ Capitale)
// ======================
const AFRICA = [
  { country: "Algeria", capital: "Algeri" },
  { country: "Angola", capital: "Luanda" },
  { country: "Egitto", capital: "Il Cairo" },
  { country: "Etiopia", capital: "Addis Abeba" },
  { country: "Kenya", capital: "Nairobi" },
  { country: "Marocco", capital: "Rabat" },
  { country: "Nigeria", capital: "Abuja" },
  { country: "Senegal", capital: "Dakar" },
  { country: "Tunisia", capital: "Tunisi" },
  { country: "Uganda", capital: "Kampala" },
  { country: "Tanzania", capital: "Dodoma" },
  { country: "Ghana", capital: "Accra" },
  { country: "Sudafrica", capital: "Pretoria" },
];

let geogCurrent = null;

function nuovaDomandaGeog() {
  const item = AFRICA[rInt(0, AFRICA.length - 1)];
  const dir = rInt(0, 1);

  geogCurrent = (dir === 0)
    ? { q: `Qual è la capitale di: ${item.country}?`, a: item.capital }
    : { q: `Di che Stato è capitale: ${item.capital}?`, a: item.country };

  safeGet("geogText").textContent = geogCurrent.q;
  safeGet("geogAns").value = "";
  safeGet("geogOut").textContent = "";
}

function checkGeog() {
  if (!geogCurrent) return;
  const ans = normText(safeGet("geogAns").value);
  const sol = normText(geogCurrent.a);

  if (!ans) {
    safeGet("geogOut").textContent = "Scrivi una risposta.";
    return;
  }

  const ok = (ans === sol) || sol.includes(ans) || ans.includes(sol);
  safeGet("geogOut").textContent = ok
    ? "✅ Corretto!"
    : `❌ Sbagliato\nRisposta corretta: ${geogCurrent.a}`;
}

// ======================
// MUSICA (Selezione + ricerca + deck senza ripetizioni)
// ======================
let brani = [];
let branoCorrente = null;

// selezione
let musSelectedIds = new Set();

// deck
let musDeck = [];
let musIdx = 0;

function branoId(b, i) {
  return b.file ? `file:${b.file}` : `idx:${i}`;
}

function updateMusInfo() {
  const info = safeGet("musInfo");
  if (!info) return;
  info.textContent = `Selezionati: ${musSelectedIds.size} su ${brani.length}`;
}

function renderMusList() {
  const list = safeGet("musList");
  const qEl = safeGet("musSearch");
  if (!list || !qEl) return;

  const q = normText(qEl.value).replace(/\s+/g, "");
  list.innerHTML = "";

  brani.forEach((b, i) => {
    const id = branoId(b, i);
    const titolo = b.titolo ?? "Senza titolo";
    const autore = b.autore ?? "";

    const hay = normText(`${titolo} ${autore}`).replace(/\s+/g, "");
    if (q && !hay.includes(q)) return;

    const row = document.createElement("div");
    row.className = "artRow";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = musSelectedIds.has(id);
    cb.tabIndex = -1;
    cb.style.pointerEvents = "none";

    const meta = document.createElement("div");
    meta.className = "artMeta";

    const t1 = document.createElement("div");
    t1.className = "artTitle";
    t1.textContent = titolo;

    const t2 = document.createElement("div");
    t2.className = "artSub";
    t2.textContent = autore || "Autore sconosciuto";

    meta.appendChild(t1);
    meta.appendChild(t2);

    row.appendChild(cb);
    row.appendChild(meta);

    row.addEventListener("click", () => {
      const newVal = !musSelectedIds.has(id);
      if (newVal) musSelectedIds.add(id);
      else musSelectedIds.delete(id);
      cb.checked = newVal;
      row.classList.toggle("isSelected", newVal);
      updateMusInfo();
    });

    row.classList.toggle("isSelected", musSelectedIds.has(id));
    list.appendChild(row);
  });

  updateMusInfo();
}

function buildMusicDeckFromSelection() {
  const pool = brani
    .map((b, i) => ({ b, id: branoId(b, i) }))
    .filter(x => musSelectedIds.has(x.id))
    .map(x => x.b);

  const out = safeGet("musOut");
  if (!pool.length) {
    if (out) out.textContent = "Seleziona almeno 1 brano e premi Applica.";
    musDeck = [];
    musIdx = 0;
    branoCorrente = null;
    return false;
  }

  musDeck = shuffleCopy(pool);
  musIdx = 0;
  return true;
}

async function caricaMusica() {
  const out = safeGet("musOut");
  try {
    const r = await fetch("music.json", { cache: "no-store" });
    brani = await r.json();
    if (!Array.isArray(brani)) brani = [];

    if (!brani.length) {
      if (out) out.textContent = "❌ music.json è vuoto o non valido.";
      musSelectedIds = new Set();
      musDeck = [];
      musIdx = 0;
      return;
    }

    musSelectedIds = new Set(brani.map((b, i) => branoId(b, i)));
    renderMusList();
    buildMusicDeckFromSelection();
  } catch {
    brani = [];
    musSelectedIds = new Set();
    musDeck = [];
    musIdx = 0;
    if (out) out.textContent = "❌ music.json non trovato o non valido.";
  }
}

function nextBranoMus() {
  const out = safeGet("musOut");
  const player = safeGet("musicPlayer");
  if (!player) return;

  if (!brani.length) {
    if (out) out.textContent = "❌ music.json è vuoto oppure non si carica.";
    return;
  }

  if (!musDeck.length) {
    const ok = buildMusicDeckFromSelection();
    if (!ok) return;
  }

  if (musIdx >= musDeck.length) {
    musDeck = shuffleCopy(musDeck);
    musIdx = 0;
  }

  branoCorrente = musDeck[musIdx++];

  if (safeGet("musTitolo")) safeGet("musTitolo").value = "";
  if (safeGet("musAutore")) safeGet("musAutore").value = "";
  if (safeGet("musStrumenti")) safeGet("musStrumenti").value = "";
  if (safeGet("musFilm")) safeGet("musFilm").value = "";

  player.src = branoCorrente.file;
  player.load();

  if (out) out.textContent = "Premi Play e poi rispondi.";

  player.onerror = () => {
    if (out) out.textContent =
      "❌ Audio non trovato: " + branoCorrente.file +
      "\nControlla che esista su GitHub e che il nome sia IDENTICO (maiuscole/minuscole).";
  };
}

function playMus() {
  const out = safeGet("musOut");
  const player = safeGet("musicPlayer");
  if (!player) return;

  player.play().catch(() => {
    if (out) out.textContent =
      "⚠️ Il browser ha bloccato l'autoplay.\nPremi Play direttamente nel player audio.";
  });
}

function checkMus() {
  const out = safeGet("musOut");
  if (!branoCorrente) {
    if (out) out.textContent = "Premi “Nuovo brano” prima.";
    return;
  }

  const t = normText(safeGet("musTitolo")?.value ?? "");
  const a = normText(safeGet("musAutore")?.value ?? "");
  const f = normText(safeGet("musFilm")?.value ?? "");

  const userStr = (safeGet("musStrumenti")?.value ?? "")
    .toLowerCase()
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  const solTit = normText(branoCorrente.titolo);
  const solAut = normText(branoCorrente.autore);
  const solFilm = normText(branoCorrente.film);
  const solStr = (branoCorrente.strumenti || []).map(x => normText(x));

  const okTit = t && (solTit.includes(t) || t.includes(solTit));
  const okAut = a && (solAut.includes(a) || a.includes(solAut));

  const okStr = userStr.length > 0 && userStr.some(s => {
    const ns = normText(s);
    return solStr.some(x => x.includes(ns) || ns.includes(x));
  });

  const filmIsNone = (solFilm.includes("non c") || solFilm.includes("nessun"));
  const okFilm = filmIsNone
    ? (f === "" || f.includes("non") || f.includes("ness"))
    : (f && (solFilm.includes(f) || f.includes(solFilm)));

  const punti = (okTit ? 1 : 0) + (okAut ? 1 : 0) + (okStr ? 1 : 0) + (okFilm ? 1 : 0);

  if (out) out.textContent =
    `Punteggio: ${punti}/4\n` +
    `Titolo: ${branoCorrente.titolo}\n` +
    `Autore: ${branoCorrente.autore}\n` +
    `Strumenti: ${(branoCorrente.strumenti || []).join(", ")}\n` +
    `Film: ${branoCorrente.film}`;
}

// ======================
// EVENTI (BIND BOTTONI)
// ======================
document.addEventListener("DOMContentLoaded", () => {
  showScreen("home");
  bindCalculators();
  boostArtImageSize();

  // HOME
  onClick("goArte", async () => {
    showScreen("arte");
    if (!opere.length) await caricaArte();
  });

  onClick("goMat", async () => {
    showScreen("mat");
    if (!MATH_BANK.length) await caricaMathBank();
    nuovaEspressione();
  });

  onClick("goTec", () => {
    showScreen("tec");
    nuovoProblemaTec();
  });

  onClick("goGeo", () => {
    showScreen("geo");
    nuovoProblemaGeo();
  });

  onClick("goGeog", () => {
    showScreen("geog");
    nuovaDomandaGeog();
  });

  onClick("goMus", async () => {
    showScreen("mus");
    if (!brani.length) await caricaMusica();
    nextBranoMus();
  });

  // BACK
  onClick("backHomeArte", () => showScreen("home"));
  onClick("backHomeMat",  () => showScreen("home"));
  onClick("backHomeTec",  () => showScreen("home"));
  onClick("backHomeGeo",  () => showScreen("home"));
  onClick("backHomeGeog", () => showScreen("home"));
  onClick("backHomeMus",  () => showScreen("home"));

  // ARTE
  onClick("btnStart", nextArte);
  onClick("btnNext",  nextArte);
  onClick("btnCheck", checkArte);

  const artSearch = safeGet("artSearch");
  if (artSearch) artSearch.addEventListener("input", renderArtList);

  onClick("artSelAll", () => {
    selectedIds = new Set(opere.map((op, i) => operaId(op, i)));
    renderArtList();
  });

  onClick("artSelNone", () => {
    selectedIds = new Set();
    renderArtList();
  });

  onClick("artApply", () => {
    const ok = buildArteDeckFromSelection();
    if (ok) nextArte();
  });

  // MAT
  onClick("btnNewMath",   nuovaEspressione);
  onClick("btnCheckMath", checkMath);

  // TEC
  onClick("btnNewTec",   nuovoProblemaTec);
  onClick("btnCheckTec", checkTec);

  // GEO
  onClick("btnNewGeo",   nuovoProblemaGeo);
  onClick("btnCheckGeo", checkGeo);

  // GEOG
  onClick("btnNewGeog",   nuovaDomandaGeog);
  onClick("btnCheckGeog", checkGeog);

  // MUS
  onClick("btnNewMus",   nextBranoMus);
  onClick("btnPlayMus",  playMus);
  onClick("btnCheckMus", checkMus);

  const musSearch = safeGet("musSearch");
  if (musSearch) musSearch.addEventListener("input", renderMusList);

  onClick("musSelAll", () => {
    musSelectedIds = new Set(brani.map((b, i) => branoId(b, i)));
    renderMusList();
  });

  onClick("musSelNone", () => {
    musSelectedIds = new Set();
    renderMusList();
  });

  onClick("musApply", () => {
    const ok = buildMusicDeckFromSelection();
    if (ok) nextBranoMus();
  });
});
