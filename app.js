// ======================
// UTIL
// ======================
function rInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
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
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // toglie accenti
    .replace(/^(il|lo|la|l'|i|gli|le)\s+/i, "")      // articoli
    .replace(/\s+/g, " ");                           // spazi
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
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  const target = document.getElementById(map[name]);
  if (target) target.style.display = "block";
}

// ======================
// CALCOLATRICI
// ======================
function calcAppend(displayId, v) {
  const el = document.getElementById(displayId);
  if (!el) return;
  el.value += v;
}
function calcClear(displayId) {
  const el = document.getElementById(displayId);
  if (!el) return;
  el.value = "";
}
function calcEq(displayId) {
  const el = document.getElementById(displayId);
  if (!el) return;
  try {
    // eval su input controllato dai bottoni
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
  const info = document.getElementById("artInfo");
  if (!info) return;
  info.textContent = `Selezionati: ${selectedIds.size} su ${opere.length}`;
}

function renderArtList() {
  const list = document.getElementById("artList");
  const qEl = document.getElementById("artSearch");
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

  const out = document.getElementById("out");
  const imgEl = document.getElementById("artImg");

  if (!pool.length) {
    if (out) out.textContent = "Seleziona almeno 1 quadro e premi Applica.";
    mazzo = [];
    idx = 0;
    corrente = null;
    if (imgEl) imgEl.removeAttribute("src");
    return false;
  }

  mazzo = shuffle(pool);
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
  const out = document.getElementById("out");
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
  } catch (e) {
    if (out) out.textContent = "Errore caricamento data.json (controlla che sia nel repo).";
  }
}

function nextArte() {
  if (!mazzo.length) return;

  if (idx >= mazzo.length) {
    mazzo = shuffle(mazzo);
    idx = 0;
  }

  corrente = mazzo[idx++];
  const imgEl = document.getElementById("artImg");
  const out = document.getElementById("out");

  if (!imgEl) return;

  imgEl.onerror = () => {
    if (out) out.textContent =
      "Immagine non trovata: " + (corrente?.img ?? "(manca path)") +
      "\nControlla che esista la cartella img/ su GitHub e che il nome file combaci (maiuscole/minuscole).";
  };

  // nel tuo data.json deve essere tipo: "img/gioconda.jpg"
  imgEl.src = corrente.img;

  if (out) out.textContent = "";
  document.getElementById("inTitolo").value = "";
  document.getElementById("inArtista").value = "";
  document.getElementById("inData").value = "";
}

function checkArte() {
  if (!corrente) return;

  const t = document.getElementById("inTitolo").value;
  const a = document.getElementById("inArtista").value;
  const d = document.getElementById("inData").value;

  let punti = 0;
  const listaTitoli = Array.isArray(corrente.titoli) ? corrente.titoli : [corrente.titolo];

  if (titoloOK(t, listaTitoli)) punti++;
  if (artistaOK(a, corrente.artista)) punti++;
  if (normArte(d) === normArte(corrente.data)) punti++;

  document.getElementById("out").textContent =
    `Punteggio: ${punti}/3\n` +
    `Titoli accettati: ${listaTitoli.join(" / ")}\n` +
    `Artista: ${corrente.artista}\n` +
    `Data: ${corrente.data}`;
}

// ======================
// MATEMATICA (MONOMI)
// ======================
let soluzioneMath = null; // {num, den, exp}

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
function mono(num, den, exp) {
  const f = fracNorm(num, den);
  return { num: f.num, den: f.den, exp };
}
function monoMul(a, b) { return mono(a.num * b.num, a.den * b.den, a.exp + b.exp); }
function monoDiv(a, b) { return mono(a.num * b.den, a.den * b.num, a.exp - b.exp); }
function monoPow(a, k) { return mono(a.num ** k, a.den ** k, a.exp * k); }

function monoToAnswer(m) {
  const { num, den, exp } = m;
  let cStr = (den === 1) ? `${num}` : `${num}/${den}`;
  if (exp === 0) return cStr;

  if (num === 1 && den === 1) cStr = "";
  if (num === -1 && den === 1) cStr = "-";

  if (exp === 1) return `${cStr}x`;
  return `${cStr}x^${exp}`;
}

function parseUserMonomial(s) {
  if (!s) return null;
  s = s.toLowerCase().trim().replace(/\s+/g, "");
  if (!s) return null;

  const hasX = s.includes("x");
  let coefStr = "";
  let exp = 0;

  if (!hasX) {
    coefStr = s;
    exp = 0;
  } else {
    const parts = s.split("x");
    coefStr = parts[0];
    const after = parts[1] ?? "";

    if (coefStr === "" || coefStr === "+") coefStr = "1";
    if (coefStr === "-") coefStr = "-1";

    if (after === "") exp = 1;
    else if (after.startsWith("^")) {
      exp = parseInt(after.slice(1), 10);
      if (!Number.isFinite(exp)) return null;
    } else return null;
  }

  let num = 0, den = 1;

  if (coefStr.includes("/")) {
    const [a, b] = coefStr.split("/");
    num = parseInt(a, 10);
    den = parseInt(b, 10);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    const f = fracNorm(num, den);
    num = f.num; den = f.den;
  } else {
    const val = Number(coefStr.replace(",", "."));
    if (!Number.isFinite(val)) return null;
    const scaled = Math.round(val * 1000);
    const f = fracNorm(scaled, 1000);
    num = f.num; den = f.den;
  }

  return { num, den, exp };
}

function sameMonomial(user, sol) {
  if (!user || !sol) return false;
  if (user.exp !== sol.exp) return false;
  const u = user.num / user.den;
  const s = sol.num / sol.den;
  return Math.abs(u - s) < 1e-6;
}

function nuovaEspressione() {
  const tipo = rInt(1, 12);
  const c = () => rInt(2, 12);
  const e = () => rInt(1, 6);
  const M = (coef, exp) => mono(coef, 1, exp);

  let expr = "";
  let sol = mono(1, 1, 0);

  switch (tipo) {
    case 1: {
      const a=c(), b=c(), cc=c();
      const m=e(), n=e(), k=rInt(1,4);
      expr = `( ${a}x^${m} · ${b}x^${n} ) ÷ ( ${cc}x^${k} )`;
      sol = monoDiv(monoMul(M(a,m), M(b,n)), M(cc,k));
      break;
    }
    case 2: {
      const a=c(), b=c(), cc=c();
      const m=e(), n=rInt(1,4), k=e();
      expr = `( ${a}x^${m} ÷ ${b}x^${n} ) · ( ${cc}x^${k} )`;
      sol = monoMul(monoDiv(M(a,m), M(b,n)), M(cc,k));
      break;
    }
    case 3: {
      const a=c(), b=c(), cc=c();
      const m=rInt(1,4), n=e(), k=rInt(1,4);
      expr = `( (${a}x^${m})^2 · ${b}x^${n} ) ÷ ( ${cc}x^${k} )`;
      sol = monoDiv(monoMul(monoPow(M(a,m),2), M(b,n)), M(cc,k));
      break;
    }
    case 4: {
      const p=c(), n=rInt(1,4), a=c(), m=e();
      expr = `√(${p*p}x^${2*n}) · (${a}x^${m})`;
      sol = monoMul(M(p,n), M(a,m));
      break;
    }
    case 5: {
      const a=c(), b=c(), cc=c();
      const m=e(), k=e();
      expr = `( ${a}x^${m} + ${b}x^${m} ) · ${cc}x^${k}`;
      sol = monoMul(M(a+b, m), M(cc,k));
      break;
    }
    case 6: {
      const a=rInt(10,40), b=rInt(2,12), cc=c();
      const m=e(), k=rInt(1,4);
      expr = `( ${a}x^${m} − ${b}x^${m} ) ÷ ${cc}x^${k}`;
      sol = monoDiv(M(a-b, m), M(cc,k));
      break;
    }
    case 7: {
      const a=c(), b=c(), cc=c();
      const m=e(), n=e(), k=rInt(1,4);
      expr = `( ${a}x^${m} · ${b}x^${n} ) ÷ ( (${cc}x^${k})^2 )`;
      sol = monoDiv(monoMul(M(a,m), M(b,n)), monoPow(M(cc,k),2));
      break;
    }
    case 8: {
      const a=c(), b=rInt(2,9), cc=c(), d=rInt(2,9);
      const m=e(), n=e();
      expr = `( ${a}x^${m} ÷ ${b} ) · ( ${cc}x^${n} ÷ ${d} )`;
      sol = monoMul(mono(a,b,m), mono(cc,d,n));
      break;
    }
    case 9: {
      const a=c(), b=rInt(2,9), cc=c(), d=rInt(2,9);
      const m=e(), n=e();
      expr = `( (${a}/${b})x^${m} ) ÷ ( (${cc}/${d})x^${n} )`;
      sol = monoDiv(mono(a,b,m), mono(cc,d,n));
      break;
    }
    case 10: {
      const a=c(), b=c();
      const m=rInt(1,3), n=e();
      expr = `( ${a}x^${m} )^3 ÷ ( ${b}x^${n} )`;
      sol = monoDiv(monoPow(M(a,m),3), M(b,n));
      break;
    }
    case 11: {
      const a=c(), m=e();
      expr = `√(${a*a}) · x^${m}`;
      sol = M(a,m);
      break;
    }
    case 12: {
      const a=c(), b=c(), cc=c();
      const m=e(), n=e();
      expr = `( ${a}x^${m} · ${b}x^${n} ) + ( ${cc}x^${m+n} )`;
      sol = M(a*b + cc, m+n);
      break;
    }
  }

  soluzioneMath = sol;
  document.getElementById("mathExpr").textContent = expr;
  document.getElementById("mathAns").value = "";
  document.getElementById("mathOut").textContent =
    "Scrivi il monomio semplificato (es: 6x^4, -3/2x^2, 5x, 12).";
}

function checkMath() {
  const user = parseUserMonomial(document.getElementById("mathAns").value);
  if (!user) {
    document.getElementById("mathOut").textContent =
      "Risposta non valida. Esempi: 6x^4, -3/2x^2, 5x, 12.";
    return;
  }
  if (sameMonomial(user, soluzioneMath)) {
    document.getElementById("mathOut").textContent = "✅ Corretto!";
  } else {
    document.getElementById("mathOut").textContent =
      `❌ Sbagliato\nRisposta corretta: ${monoToAnswer(soluzioneMath)}`;
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
  document.getElementById("geoText").textContent = testo;
  document.getElementById("geoAns").value = "";
  document.getElementById("geoOut").textContent = "";
}

function checkGeo() {
  const raw = document.getElementById("geoAns").value.trim().replace(",", ".");
  const n = parseFloat(raw);
  if (Number.isNaN(n)) {
    document.getElementById("geoOut").textContent = "Inserisci un numero valido.";
    return;
  }
  if (Math.abs(n - soluzioneGeo) <= 0.9) {
    document.getElementById("geoOut").textContent = "✅ Corretto!";
  } else {
    document.getElementById("geoOut").textContent =
      `❌ Sbagliato\nRisultato corretto: ${soluzioneGeo}`;
  }
}

// ======================
// TECNOLOGIA (Ohm)
// ======================
let soluzioneTec = 0;
let unitaTec = "A";

function nuovoProblemaTec() {
  const circuitType = rInt(0, 1);
  const tecImg = document.getElementById("tecImg");
  if (tecImg) tecImg.src = (circuitType === 0) ? "img/serie.png" : "img/parallelo.png";

  const missing = rInt(0, 2);
  let V, I, R;

  if (missing === 0) {
    V = rInt(6, 24);
    R = rInt(2, 30);
    I = V / R;
    soluzioneTec = I; unitaTec = "A";
  } else if (missing === 1) {
    R = rInt(2, 30);
    const num = rInt(1, 30), den = rInt(2, 10);
    I = num / den;
    V = I * R;
    soluzioneTec = V; unitaTec = "V";
  } else {
    V = rInt(6, 24);
    const num = rInt(1, 30), den = rInt(2, 10);
    I = num / den;
    R = V / I;
    soluzioneTec = R; unitaTec = "Ω";
  }

  const Vshow = Number(V.toFixed(2));
  const Ishow = Number(I.toFixed(2));
  const Rshow = Number(R.toFixed(2));

  const tipoTxt = (circuitType === 0) ? "SERIE" : "PARALLELO";
  let testo = `Circuito con 2 lampadine (${tipoTxt}).\n\n`;

  if (missing === 0) testo += `Dati:\n- V = ${Vshow} V\n- R = ${Rshow} Ω\n\nDOMANDA: Qual è I (A)?`;
  if (missing === 1) testo += `Dati:\n- I = ${Ishow} A\n- R = ${Rshow} Ω\n\nDOMANDA: Qual è V (V)?`;
  if (missing === 2) testo += `Dati:\n- V = ${Vshow} V\n- I = ${Ishow} A\n\nDOMANDA: Qual è R (Ω)?`;

  document.getElementById("tecText").textContent = testo;
  document.getElementById("tecAns").value = "";
  document.getElementById("tecOut").textContent = "";
}

function checkTec() {
  const raw = document.getElementById("tecAns").value.trim().replace(",", ".");
  const n = parseFloat(raw);
  if (Number.isNaN(n)) {
    document.getElementById("tecOut").textContent = "Inserisci un numero valido.";
    return;
  }
  if (Math.abs(n - soluzioneTec) < 0.05) {
    document.getElementById("tecOut").textContent = "✅ Corretto!";
  } else {
    document.getElementById("tecOut").textContent =
      `❌ Sbagliato\nRisposta corretta: ${soluzioneTec.toFixed(2)} ${unitaTec}`;
  }
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
  const dir = rInt(0, 1); // 0: stato->capitale, 1: capitale->stato

  if (dir === 0) {
    geogCurrent = { q: `Qual è la capitale di: ${item.country}?`, a: item.capital };
  } else {
    geogCurrent = { q: `Di che Stato è capitale: ${item.capital}?`, a: item.country };
  }

  document.getElementById("geogText").textContent = geogCurrent.q;
  document.getElementById("geogAns").value = "";
  document.getElementById("geogOut").textContent = "";
}

function checkGeog() {
  if (!geogCurrent) return;
  const ans = normText(document.getElementById("geogAns").value);
  const sol = normText(geogCurrent.a);

  if (!ans) {
    document.getElementById("geogOut").textContent = "Scrivi una risposta.";
    return;
  }

  const ok = (ans === sol) || sol.includes(ans) || ans.includes(sol);
  document.getElementById("geogOut").textContent = ok
    ? "✅ Corretto!"
    : `❌ Sbagliato\nRisposta corretta: ${geogCurrent.a}`;
}

// ======================
// MUSICA
// ======================
let brani = [];
let branoCorrente = null;

async function caricaMusica() {
  const out = document.getElementById("musOut");
  try {
    const r = await fetch("music.json", { cache: "no-store" });
    brani = await r.json();
    if (!Array.isArray(brani)) brani = [];
  } catch {
    brani = [];
    if (out) out.textContent = "❌ music.json non trovato o non valido.";
  }
}

function nuovoBranoMus() {
  const out = document.getElementById("musOut");
  const player = document.getElementById("musicPlayer");

  if (!brani.length) {
    out.textContent = "❌ music.json è vuoto oppure non si carica.";
    return;
  }

  branoCorrente = brani[Math.floor(Math.random() * brani.length)];

  // reset input
  document.getElementById("musTitolo").value = "";
  document.getElementById("musAutore").value = "";
  document.getElementById("musStrumenti").value = "";
  document.getElementById("musFilm").value = "";

  // carica audio
  player.src = branoCorrente.file; // es: "audio/take_five.mp3"
  player.load();

  out.textContent = "Premi Play e poi rispondi.";

  player.onerror = () => {
    out.textContent =
      "❌ Audio non trovato o non supportato: " + branoCorrente.file +
      "\nControlla che il file esista su GitHub e che il nome sia IDENTICO (maiuscole/minuscole).";
  };
}

function playMus() {
  const out = document.getElementById("musOut");
  const player = document.getElementById("musicPlayer");
  player.play().catch(() => {
    out.textContent =
      "⚠️ Il browser ha bloccato la riproduzione automatica.\nPremi Play direttamente nel player audio (sotto).";
  });
}

function checkMus() {
  const out = document.getElementById("musOut");
  if (!branoCorrente) {
    out.textContent = "Premi “Nuovo brano” prima.";
    return;
  }

  const t = normText(document.getElementById("musTitolo").value);
  const a = normText(document.getElementById("musAutore").value);
  const f = normText(document.getElementById("musFilm").value);

  const userStr = document.getElementById("musStrumenti").value
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

  // strumenti: basta indovinarne almeno 1
  const okStr = userStr.length > 0 && userStr.some(s => {
    const ns = normText(s);
    return solStr.some(x => x.includes(ns) || ns.includes(x));
  });

  // film: se la soluzione è "non c'e" / "non c’è" accetta anche vuoto
  const filmIsNone = (solFilm.includes("non c") || solFilm.includes("nessun"));
  const okFilm = filmIsNone
    ? (f === "" || f.includes("non") || f.includes("ness"))
    : (f && (solFilm.includes(f) || f.includes(solFilm)));

  const punti = (okTit ? 1 : 0) + (okAut ? 1 : 0) + (okStr ? 1 : 0) + (okFilm ? 1 : 0);

  out.textContent =
    `Punteggio: ${punti}/4\n` +
    `Titolo: ${branoCorrente.titolo}\n` +
    `Autore: ${branoCorrente.autore}\n` +
    `Strumenti: ${(branoCorrente.strumenti || []).join(", ")}\n` +
    `Film: ${branoCorrente.film}`;
}

// ======================
// EVENTI
// ======================
document.addEventListener("DOMContentLoaded", () => {
  showScreen("home");
  bindCalculators();

  // HOME -> schermate
  document.getElementById("goArte").addEventListener("click", async () => {
    showScreen("arte");
    if (!opere.length) await caricaArte();
  });

  document.getElementById("goMat").addEventListener("click", () => {
    showScreen("mat");
    nuovaEspressione();
  });

  document.getElementById("goTec").addEventListener("click", () => {
    showScreen("tec");
    nuovoProblemaTec();
  });

  document.getElementById("goGeo").addEventListener("click", () => {
    showScreen("geo");
    nuovoProblemaGeo();
  });

  document.getElementById("goGeog").addEventListener("click", () => {
    showScreen("geog");
    nuovaDomandaGeog();
  });

  document.getElementById("goMus").addEventListener("click", async () => {
    showScreen("mus");
    if (!brani.length) await caricaMusica();
    nuovoBranoMus();
  });

  // back
  document.getElementById("backHomeArte").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeMat").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeTec").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeGeo").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeGeog").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeMus").addEventListener("click", () => showScreen("home"));

  // ARTE
  document.getElementById("btnStart").addEventListener("click", nextArte);
  document.getElementById("btnNext").addEventListener("click", nextArte);
  document.getElementById("btnCheck").addEventListener("click", checkArte);
  document.getElementById("artSearch").addEventListener("input", renderArtList);
  document.getElementById("artSelAll").addEventListener("click", () => {
    selectedIds = new Set(opere.map((op, i) => operaId(op, i)));
    renderArtList();
  });
  document.getElementById("artSelNone").addEventListener("click", () => {
    selectedIds = new Set();
    renderArtList();
  });
  document.getElementById("artApply").addEventListener("click", () => {
    const ok = buildArteDeckFromSelection();
    if (ok) nextArte();
  });

  // MAT
  document.getElementById("btnNewMath").addEventListener("click", nuovaEspressione);
  document.getElementById("btnCheckMath").addEventListener("click", checkMath);

  // TEC
  document.getElementById("btnNewTec").addEventListener("click", nuovoProblemaTec);
  document.getElementById("btnCheckTec").addEventListener("click", checkTec);

  // GEO
  document.getElementById("btnNewGeo").addEventListener("click", nuovoProblemaGeo);
  document.getElementById("btnCheckGeo").addEventListener("click", checkGeo);

  // GEOG
  document.getElementById("btnNewGeog").addEventListener("click", nuovaDomandaGeog);
  document.getElementById("btnCheckGeog").addEventListener("click", checkGeog);

  // MUS
  document.getElementById("btnNewMus").addEventListener("click", nuovoBranoMus);
  document.getElementById("btnPlayMus").addEventListener("click", playMus);
  document.getElementById("btnCheckMus").addEventListener("click", checkMus);
});
