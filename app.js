// ======================
// UTIL
// ======================
function rInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normText(s) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // toglie accenti
    .replace(/^(il|lo|la|l'|i|gli|le)\s+/i, "")       // articoli
    .replace(/\s+/g, " ");                            // spazi
}

function showScreen(name) {
  const screens = ["home","arte","mat","tec","geo","geog"];
  screens.forEach(s => {
    const id =
      s === "home" ? "screenHome" :
      s === "arte" ? "screenArte" :
      s === "mat"  ? "screenMat"  :
      s === "tec"  ? "screenTec"  :
      s === "geo"  ? "screenGeo"  :
      "screenGeog";
    const el = document.getElementById(id);
    if (el) el.style.display = (name === s) ? "block" : "none";
    document.getElementById("screenMus").style.display = (name === "mus") ? "block" : "none";
  });
}

// shuffle (per arte)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  return (op.img ? `img:${op.img}` : `idx:${i}`);
}

function updateArtInfo() {
  const info = document.getElementById("artInfo");
  if (!info) return;
  info.textContent = `Selezionati: ${selectedIds.size} su ${opere.length}`;
}

function renderArtList() {
  const list = document.getElementById("artList");
  const q = normArte(document.getElementById("artSearch").value);
  if (!list) return;

  list.innerHTML = "";

  opere.forEach((op, i) => {
    const id = operaId(op, i);
    const titoloPrincipale = op.titolo ?? (Array.isArray(op.titoli) ? op.titoli[0] : "Senza titolo");
    const artista = op.artista ?? "";

    const hay = normArte(`${titoloPrincipale} ${artista}`);
    if (q && !hay.includes(q)) return;

    const row = document.createElement("div");
    row.className = "artRow";
    row.dataset.id = id;

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
    t2.textContent = artista ? artista : "Artista sconosciuto";

    meta.appendChild(t1);
    meta.appendChild(t2);

    row.appendChild(cb);
    row.appendChild(meta);

    row.addEventListener("click", (ev) => {
      ev.preventDefault();
      const newVal = !selectedIds.has(id);
      if (newVal) selectedIds.add(id); else selectedIds.delete(id);
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

  if (pool.length === 0) {
    document.getElementById("out").textContent = "Seleziona almeno 1 quadro e premi Applica.";
    mazzo = [];
    idx = 0;
    corrente = null;
    const imgEl = document.getElementById("artImg");
    if (imgEl) imgEl.removeAttribute("src");
    return false;
  }

  mazzo = shuffle([...pool]);
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
  const r = await fetch("data.json");
  opere = await r.json();

  if (!Array.isArray(opere) || opere.length === 0) {
    document.getElementById("out").textContent = "data.json è vuoto o non valido.";
    return;
  }

  selectedIds = new Set(opere.map((op, i) => operaId(op, i)));
  renderArtList();
  buildArteDeckFromSelection();
  nextArte();
}

function nextArte() {
  if (!mazzo.length) return;

  if (idx >= mazzo.length) {
    mazzo = shuffle([...mazzo]);
    idx = 0;
  }

  corrente = mazzo[idx];
  idx++;

  const imgEl = document.getElementById("artImg");
  imgEl.onerror = () => {
    document.getElementById("out").textContent =
      "Immagine non trovata, salto: " + (corrente?.img ?? "(senza path)");
    setTimeout(nextArte, 100);
  };

  // IMPORTANTISSIMO: nel tuo data.json l'img deve essere tipo "img/gioconda.jpg"
  imgEl.src = corrente.img;

  document.getElementById("out").textContent = "";
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
// MATEMATICA (DIFFICILE: MONOMI + RADICI + FRAZIONI + POTENZE)
// Risultato finale: un monomio in x (es: 6x^4, -3/2x^2, 5x, 12)
// ======================
let soluzioneMath = { coef: 0, exp: 0 }; // coef * x^exp

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

// monomio come frazione * x^exp
function mono(num, den, exp) {
  const f = fracNorm(num, den);
  return { num: f.num, den: f.den, exp };
}

function monoMul(a, b) {
  return mono(a.num * b.num, a.den * b.den, a.exp + b.exp);
}

function monoDiv(a, b) {
  return mono(a.num * b.den, a.den * b.num, a.exp - b.exp);
}

function monoPow(a, k) {
  // k intero >=0
  return mono(a.num ** k, a.den ** k, a.exp * k);
}

function monoToFloat(m) {
  return (m.num / m.den);
}

function monoToAnswer(m) {
  // forma leggibile: -3/2x^2, 5x, 12
  const num = m.num, den = m.den, e = m.exp;

  let cStr = "";
  if (den === 1) cStr = `${num}`;
  else cStr = `${num}/${den}`;

  if (e === 0) return cStr;

  // coefficienti 1 e -1: scrivi solo x...
  if (num === 1 && den === 1) cStr = "";
  if (num === -1 && den === 1) cStr = "-";

  if (e === 1) return `${cStr}x`;
  return `${cStr}x^${e}`;
}

// parser risposta utente: accetta 6x^4, -3/2x^2, 1.5x, x^3, -x, 12
function parseUserMonomial(s) {
  if (!s) return null;
  s = s.toLowerCase().trim();
  s = s.replace(/\s+/g, "");

  // sostituisci eventuale simbolo × o ·
  s = s.replace(/[×·]/g, "*");

  // se contiene x
  const hasX = s.includes("x");
  let coefStr = "";
  let exp = 0;

  if (!hasX) {
    // solo numero
    coefStr = s;
    exp = 0;
  } else {
    // split su x
    const parts = s.split("x");
    coefStr = parts[0]; // prima della x
    const after = parts[1] ?? "";

    // coefficiente
    if (coefStr === "" || coefStr === "+") coefStr = "1";
    if (coefStr === "-") coefStr = "-1";

    // esponente
    if (after === "") exp = 1;
    else if (after.startsWith("^")) {
      exp = parseInt(after.slice(1), 10);
      if (!Number.isFinite(exp)) return null;
    } else {
      // roba strana
      return null;
    }
  }

  // coefficiente può essere frazione o decimale
  let num = 0, den = 1;

  if (coefStr.includes("/")) {
    const [a, b] = coefStr.split("/");
    num = parseInt(a, 10);
    den = parseInt(b, 10);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    const f = fracNorm(num, den);
    num = f.num; den = f.den;
  } else {
    // decimale -> trasformo in frazione (semplice)
    const val = Number(coefStr.replace(",", "."));
    if (!Number.isFinite(val)) return null;

    // porta a frazione con max 3 decimali
    const scaled = Math.round(val * 1000);
    const f = fracNorm(scaled, 1000);
    num = f.num; den = f.den;
  }

  return { num, den, exp };
}

// confronto con tolleranza (anche se scrivi 0.001 diverso)
function sameMonomial(user, sol) {
  if (!user) return false;
  if (user.exp !== sol.exp) return false;

  // confronto coefficienti come float con piccola tolleranza
  const u = user.num / user.den;
  const s = sol.num / sol.den;
  return Math.abs(u - s) < 1e-6;
}

// genera problemi “quasi mai uguali”
function nuovaEspressione() {
  // scegli un template difficile
  const tipo = rInt(1, 18);
  let expr = "";
  let sol = mono(1, 1, 0);

  // helper casual
  const c = () => rInt(2, 12);          // coeff
  const e = () => rInt(1, 5);           // exp
  const sq = (n) => n * n;

  // creo monomi random “puliti”
  const M = (coef, exp) => mono(coef, 1, exp);

  switch (tipo) {

    // 1) (ax^m · bx^n) / (cx^k)
    case 1: {
      const a = c(), b = c(), cc = c();
      const m = e(), n = e(), k = rInt(1, 4);
      expr = `( ${a}x^${m} · ${b}x^${n} ) ÷ ( ${cc}x^${k} )`;
      sol = monoMul(M(a, m), M(b, n));
      sol = monoDiv(sol, M(cc, k));
      break;
    }

    // 2) (ax^m / bx^n) · (cx^k)
    case 2: {
      const a = c(), b = c(), cc = c();
      const m = e(), n = rInt(1, 4), k = e();
      expr = `( ${a}x^${m} ÷ ${b}x^${n} ) · ( ${cc}x^${k} )`;
      sol = monoDiv(M(a, m), M(b, n));
      sol = monoMul(sol, M(cc, k));
      break;
    }

    // 3) ((ax^m)^2 · (bx^n)) / (cx^k)
    case 3: {
      const a = c(), b = c(), cc = c();
      const m = rInt(1, 4), n = e(), k = rInt(1, 4);
      expr = `( (${a}x^${m})^2 · ${b}x^${n} ) ÷ ( ${cc}x^${k} )`;
      sol = monoPow(M(a, m), 2);
      sol = monoMul(sol, M(b, n));
      sol = monoDiv(sol, M(cc, k));
      break;
    }

    // 4) √(p^2 x^(2n)) · (ax^m)  (radice perfetta)
    case 4: {
      const p = c();
      const n = rInt(1, 4);
      const a = c(), m = e();
      expr = `√(${sq(p)}x^${2*n}) · (${a}x^${m})`;
      sol = monoMul(M(p, n), M(a, m));
      break;
    }

    // 5) (ax^m + bx^m) · cx^k   (somma di monomi simili -> ancora monomio)
    case 5: {
      const a = c(), b = c(), cc = c();
      const m = e(), k = e();
      expr = `( ${a}x^${m} + ${b}x^${m} ) · ${cc}x^${k}`;
      const sumCoef = a + b;
      sol = monoMul(M(sumCoef, m), M(cc, k));
      break;
    }

    // 6) (ax^m − bx^m) ÷ cx^k
    case 6: {
      const a = rInt(10, 30), b = rInt(2, 9), cc = c();
      const m = e(), k = rInt(1, 4);
      expr = `( ${a}x^${m} − ${b}x^${m} ) ÷ ${cc}x^${k}`;
      const diffCoef = a - b;
      sol = monoDiv(M(diffCoef, m), M(cc, k));
      break;
    }

    // 7) (ax^m · bx^n) / ( (cx^k)^2 )
    case 7: {
      const a = c(), b = c(), cc = c();
      const m = e(), n = e(), k = rInt(1, 4);
      expr = `( ${a}x^${m} · ${b}x^${n} ) ÷ ( (${cc}x^${k})^2 )`;
      sol = monoDiv(monoMul(M(a,m), M(b,n)), monoPow(M(cc,k), 2));
      break;
    }

    // 8) (ax^m / b) · (cx^n / d)  (frazioni)
    case 8: {
      const a = c(), b = rInt(2, 9), cc = c(), d = rInt(2, 9);
      const m = e(), n = e();
      expr = `( ${a}x^${m} ÷ ${b} ) · ( ${cc}x^${n} ÷ ${d} )`;
      sol = monoMul(mono(a, b, m), mono(cc, d, n));
      break;
    }

    // 9) (a/b x^m) ÷ (c/d x^n)
    case 9: {
      const a = c(), b = rInt(2, 9), cc = c(), d = rInt(2, 9);
      const m = e(), n = e();
      expr = `( (${a}/${b})x^${m} ) ÷ ( (${cc}/${d})x^${n} )`;
      sol = monoDiv(mono(a,b,m), mono(cc,d,n));
      break;
    }

    // 10) (ax^m)^3 ÷ (bx^n)
    case 10: {
      const a = c(), b = c();
      const m = rInt(1, 3), n = e();
      expr = `( ${a}x^${m} )^3 ÷ ( ${b}x^${n} )`;
      sol = monoDiv(monoPow(M(a,m), 3), M(b,n));
      break;
    }

    // 11) √( (a^2) ) · x^m  -> solo coeff * x^m
    case 11: {
      const a = c(), m = e();
      expr = `√(${a*a}) · x^${m}`;
      sol = M(a, m);
      break;
    }

    // 12) (ax^m)(bx^n) + (cx^(m+n))  -> somma di simili dopo prodotto
    case 12: {
      const a = c(), b = c(), cc = c();
      const m = e(), n = e();
      expr = `( ${a}x^${m} · ${b}x^${n} ) + ( ${cc}x^${m+n} )`;
      const prodCoef = a*b;
      const sumCoef = prodCoef + cc;
      sol = M(sumCoef, m+n);
      break;
    }

    // 13) (ax^m)(bx^n) − (cx^(m+n))
    case 13: {
      const a = c(), b = c(), cc = c();
      const m = e(), n = e();
      expr = `( ${a}x^${m} · ${b}x^${n} ) − ( ${cc}x^${m+n} )`;
      const prodCoef = a*b;
      const diffCoef = prodCoef - cc;
      sol = M(diffCoef, m+n);
      break;
    }

    // 14) ( (ax^m + bx^m) / c ) · x^k
    case 14: {
      const a = c(), b = c(), cc = rInt(2, 9);
      const m = e(), k = e();
      expr = `( (${a}x^${m} + ${b}x^${m}) ÷ ${cc} ) · x^${k}`;
      sol = monoMul(mono(a+b, cc, m), M(1, k));
      break;
    }

    // 15) (ax^m) / (b x^n) / (c x^k)
    case 15: {
      const a = c(), b = c(), cc = c();
      const m = e(), n = e(), k = e();
      expr = `${a}x^${m} ÷ ${b}x^${n} ÷ ${cc}x^${k}`;
      sol = monoDiv(M(a,m), M(b,n));
      sol = monoDiv(sol, M(cc,k));
      break;
    }

    // 16) (ax^m)^2 + (bx^(2m))  -> simili
    case 16: {
      const a = c(), b = c();
      const m = rInt(1, 4);
      expr = `( ${a}x^${m} )^2 + ${b}x^${2*m}`;
      const coef = a*a + b;
      sol = M(coef, 2*m);
      break;
    }

    // 17) √( (p^2) ) · (a/b x^m)
    case 17: {
      const p = c();
      const a = c(), b = rInt(2, 9), m = e();
      expr = `√(${p*p}) · ( (${a}/${b})x^${m} )`;
      sol = monoMul(M(p,0), mono(a,b,m));
      break;
    }

    // 18) (ax^m)(bx^n) / (cx^(m+n-1))  -> risultato x^1
    case 18: {
      const a = c(), b = c(), cc = c();
      const m = e(), n = e();
      const k = m+n-1;
      expr = `( ${a}x^${m} · ${b}x^${n} ) ÷ ( ${cc}x^${k} )`;
      sol = monoDiv(monoMul(M(a,m), M(b,n)), M(cc,k));
      break;
    }
  }

  // normalizza risultato finale
  soluzioneMath = sol;

  document.getElementById("mathExpr").textContent = expr;
  document.getElementById("mathAns").value = "";
  document.getElementById("mathOut").textContent =
    "Scrivi il risultato semplificato come monomio (es: 6x^4, -3/2x^2, 5x, 12).";
}

function checkMath() {
  const raw = document.getElementById("mathAns").value;
  const user = parseUserMonomial(raw);

  if (!user) {
    document.getElementById("mathOut").textContent =
      "Inserisci una risposta valida (es: 6x^4, -3/2x^2, 5x, 12).";
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
    case 1:
      testo = `Un quadrato ha lato ${l} cm.\nQual è la sua area?`;
      sol = l * l;
      break;
    case 2:
      testo = `Un quadrato ha lato ${l} cm.\nQual è il suo perimetro?`;
      sol = l * 4;
      break;
    case 3:
      testo = `Un rettangolo ha base ${b} cm e altezza ${h} cm.\nQual è la sua area?`;
      sol = b * h;
      break;
    case 4: {
      const area = Math.round((b * h) * 2) / 2;
      testo = `Un rettangolo ha area ${area} cm² e altezza ${h} cm.\nQual è la base?`;
      sol = b;
      break;
    }
    case 5:
      testo = `Un parallelogramma ha base ${b} cm e altezza ${h} cm.\nQual è la sua area?`;
      sol = b * h;
      break;
    case 6:
      testo = `Un rombo ha diagonali ${d1} cm e ${d2} cm.\nQual è la sua area?`;
      sol = (d1 * d2) / 2;
      break;
    case 7:
      testo = `Un triangolo ha base ${b} cm e altezza ${h} cm.\nQual è la sua area?`;
      sol = (b * h) / 2;
      break;
    case 8:
      testo = `Un cerchio ha raggio ${r} cm.\nQual è la sua area? (usa π = 3.14)`;
      sol = pi * r * r;
      break;
    case 9:
      testo = `Un cerchio ha raggio ${r} cm.\nQual è la sua circonferenza? (usa π = 3.14)`;
      sol = 2 * pi * r;
      break;
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

  // tolleranza: se sbagli di 0.9 o meno è ok
  if (Math.abs(n - soluzioneGeo) <= 0.9) {
    document.getElementById("geoOut").textContent = "✅ Corretto!";
  } else {
    document.getElementById("geoOut").textContent = `❌ Sbagliato\nRisultato corretto: ${soluzioneGeo}`;
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

  if (missing === 0) {         // manca I
    V = rInt(6, 24);
    R = rInt(2, 30);
    I = V / R;
    soluzioneTec = I; unitaTec = "A";
  } else if (missing === 1) {  // manca V
    R = rInt(2, 30);
    const num = rInt(1, 30), den = rInt(2, 10);
    I = num / den;
    V = I * R;
    soluzioneTec = V; unitaTec = "V";
  } else {                      // manca R
    V = rInt(6, 24);
    const num = rInt(1, 30), den = rInt(2, 10);
    I = num / den;
    R = V / I;
    soluzioneTec = R; unitaTec = "Ω";
  }

  const Vshow = (V !== undefined) ? Number(V.toFixed(2)) : null;
  const Ishow = (I !== undefined) ? Number(I.toFixed(2)) : null;
  const Rshow = (R !== undefined) ? Number(R.toFixed(2)) : null;

  let testo = "";
  const tipoTxt = (circuitType === 0) ? "SERIE" : "PARALLELO";
  testo += `Circuito con 2 lampadine (${tipoTxt}).\n\n`;

  if (missing === 0) {
    testo += `Dati:\n- V = ${Vshow} V\n- R = ${Rshow} Ω\n\nDOMANDA: Qual è I (A)?`;
  } else if (missing === 1) {
    testo += `Dati:\n- I = ${Ishow} A\n- R = ${Rshow} Ω\n\nDOMANDA: Qual è V (V)?`;
  } else {
    testo += `Dati:\n- V = ${Vshow} V\n- I = ${Ishow} A\n\nDOMANDA: Qual è R (Ω)?`;
  }

  document.getElementById("tecAns").value = "";
  document.getElementById("tecOut").textContent = "";
  document.getElementById("tecText").textContent = testo;
}

function checkTec() {
  const raw = document.getElementById("tecAns").value.trim().replace(",", ".");
  const num = parseFloat(raw);

  if (Number.isNaN(num)) {
    document.getElementById("tecOut").textContent = "Inserisci un numero valido.";
    return;
  }

  if (Math.abs(num - soluzioneTec) < 0.05) {
    document.getElementById("tecOut").textContent = `✅ Corretto!`;
  } else {
    document.getElementById("tecOut").textContent =
      `❌ Sbagliato\nRisposta corretta: ${soluzioneTec.toFixed(2)} ${unitaTec}`;
  }
}
// ======================
// MUSICA
// ======================
let brani = [];
let branoCorrente = null;

function normMus(t){
  return (t ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g,"");
}

async function caricaMusica(){
  const r = await fetch("music.json");
  brani = await r.json();
}

function nuovoBrano(){
  if (!brani.length) return;

  branoCorrente = brani[Math.floor(Math.random() * brani.length)];

  const player = document.getElementById("musicPlayer");
  player.src = branoCorrente.file;
  player.play();

  document.getElementById("musTitolo").value = "";
  document.getElementById("musAutore").value = "";
  document.getElementById("musStrumenti").value = "";
  document.getElementById("musFilm").value = "";
  document.getElementById("musOut").textContent = "";
}

function checkMusica(){
  if (!branoCorrente) return;

  const t = normMus(document.getElementById("musTitolo").value);
  const a = normMus(document.getElementById("musAutore").value);
  const f = normMus(document.getElementById("musFilm").value);

  const strUser = document.getElementById("musStrumenti").value
    .toLowerCase()
    .split(",")
    .map(s => s.trim());

  let punti = 0;

  if (t && normMus(branoCorrente.titolo).includes(t)) punti++;
  if (a && normMus(branoCorrente.autore).includes(a)) punti++;

  const strumentiOk = strUser.filter(s =>
    branoCorrente.strumenti.some(x => x.toLowerCase().includes(s))
  );
  if (strumentiOk.length > 0) punti++;

  if (f && normMus(branoCorrente.film).includes(f)) punti++;

  document.getElementById("musOut").textContent =
    `Punteggio: ${punti}/4\n` +
    `Titolo: ${branoCorrente.titolo}\n` +
    `Autore: ${branoCorrente.autore}\n` +
    `Strumenti: ${branoCorrente.strumenti.join(", ")}\n` +
    `Film: ${branoCorrente.film}`;
  let brani = [
  {
    file: "audio/brano1.mp3",
    titolo: ["brano 1"],
    autore: ["autore 1"],
    strumenti: ["pianoforte"],      // puoi mettere più strumenti separati da virgola
    film: ["nessuno"]               // oppure ["Titanic"] ecc.
  },
  {
    file: "audio/brano2.mp3",
    titolo: ["brano 2"],
    autore: ["autore 2"],
    strumenti: ["violino", "orchestra"],
    film: ["nessuno"]
  }
];

let musCorrente = null;

function normTxt(s){
  return (s ?? "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g," ");
}

function pickRandom(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

function nuovoBranoMus(){
  musCorrente = pickRandom(brani);

  const player = document.getElementById("player");
  const out = document.getElementById("musOut");

  out.textContent = "Premi Play e poi rispondi.";

  // reset input
  document.getElementById("musTitolo").value = "";
  document.getElementById("musAutore").value = "";
  document.getElementById("musStrumenti").value = "";
  document.getElementById("musFilm").value = "";

  // carica audio
  player.src = musCorrente.file;
  player.load();

  // debug se non si carica
  player.onerror = () => {
    out.textContent = "❌ Audio non trovato o non supportato: " + musCorrente.file +
      "\nControlla che esista su GitHub e che il nome sia uguale (maiuscole/minuscole).";
  };
}

function playMus(){
  const player = document.getElementById("player");
  player.play().catch(err=>{
    document.getElementById("musOut").textContent =
      "⚠️ Il browser ha bloccato la riproduzione automatica.\nPremi Play sul player (o riprova).";
  });
}

function checkMus(){
  if(!musCorrente) return;

  const t = normTxt(document.getElementById("musTitolo").value);
  const a = normTxt(document.getElementById("musAutore").value);
  const s = normTxt(document.getElementById("musStrumenti").value);
  const f = normTxt(document.getElementById("musFilm").value);

  const okTit = musCorrente.titolo.some(x => normTxt(x) === t || normTxt(x).includes(t) || t.includes(normTxt(x)));
  const okAut = musCorrente.autore.some(x => normTxt(x) === a || normTxt(x).includes(a) || a.includes(normTxt(x)));

  // strumenti: basta che scrivi almeno 1 strumento corretto
  const okStr = musCorrente.strumenti.some(x => s.includes(normTxt(x)));

  // film: accetta vuoto se "nessuno"
  const filmSol = musCorrente.film.map(normTxt);
  const okFilm = (f === "" && filmSol.includes("nessuno")) || filmSol.some(x => x === f || x.includes(f) || f.includes(x));

  const punti = (okTit?1:0)+(okAut?1:0)+(okStr?1:0)+(okFilm?1:0);

  document.getElementById("musOut").textContent =
    `Punteggio: ${punti}/4\n`+
    `Titolo: ${musCorrente.titolo.join(" / ")}\n`+
    `Autore: ${musCorrente.autore.join(" / ")}\n`+
    `Strumenti: ${musCorrente.strumenti.join(", ")}\n`+
    `Film: ${musCorrente.film.join(" / ")}`;
}
// ======================
// GEOGRAFIA (Africa) - SOLO Stato ↔ Capitale
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

let geogCurrent = null; // { question, answer }

function nuovaDomandaGeog() {
  const item = AFRICA[rInt(0, AFRICA.length - 1)];
  const dir = rInt(0, 1); // 0: stato->capitale, 1: capitale->stato

  if (dir === 0) {
    geogCurrent = {
      question: `Qual è la capitale di: ${item.country}?`,
      answer: item.capital
    };
  } else {
    geogCurrent = {
      question: `Di che Stato è capitale: ${item.capital}?`,
      answer: item.country
    };
  }

  document.getElementById("geogText").textContent = geogCurrent.question;
  document.getElementById("geogAns").value = "";
  document.getElementById("geogOut").textContent = "";
}

function checkGeog() {
  if (!geogCurrent) return;

  const ans = normText(document.getElementById("geogAns").value);
  const sol = normText(geogCurrent.answer);

  if (!ans) {
    document.getElementById("geogOut").textContent = "Scrivi una risposta.";
    return;
  }

  const ok = (ans === sol) || sol.includes(ans) || ans.includes(sol);

  if (ok) {
    document.getElementById("geogOut").textContent = "✅ Corretto!";
  } else {
    document.getElementById("geogOut").textContent = `❌ Sbagliato\nRisposta corretta: ${geogCurrent.answer}`;
  }
}

// ======================
// CALCOLATRICI (funzioni comuni)
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
    el.value = eval(el.value);
  } catch {
    el.value = "Errore";
  }
}

// ======================
// EVENTI
// ======================
document.addEventListener("DOMContentLoaded", () => {
  showScreen("home");

  // HOME -> schermate
  document.getElementById("goArte").addEventListener("click", () => {
    showScreen("arte");
    if (!opere.length) caricaArte();
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
  document.getElementById("goMus").addEventListener("click", () => {
  showScreen("mus");
  nuovoBrano();
});

document.getElementById("backHomeMus").addEventListener("click", () => showScreen("home"));
document.getElementById("btnNewMus").addEventListener("click", nuovoBrano);
document.getElementById("btnCheckMus").addEventListener("click", checkMusica);

caricaMusica()
  // back
  document.getElementById("backHomeArte").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeMat").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeTec").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeGeo").addEventListener("click", () => showScreen("home"));
  document.getElementById("backHomeGeog").addEventListener("click", () => showScreen("home"));

  // ARTE bottoni
  document.getElementById("btnStart").addEventListener("click", nextArte);
  document.getElementById("btnNext").addEventListener("click", nextArte);
  document.getElementById("btnCheck").addEventListener("click", checkArte);

  // ARTE filtri
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

  // Carica arte all'avvio (così è pronta)
  caricaArte();
});





