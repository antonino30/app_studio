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
// MATEMATICA
// ======================
let soluzioneMath = null;

function nuovaEspressione() {
  const tipo = rInt(1, 12);
  let expr = "";
  let result = 0;

  switch (tipo) {
    case 1: {
      const a = rInt(6, 18), b = rInt(2, 12);
      const c = rInt(3, 10), d = rInt(2, 9);
      expr = `(${a} − ${b}) · (${c} + ${d})`;
      result = (a - b) * (c + d);
      break;
    }
    case 2: {
      const a = rInt(2, 9), b = rInt(2, 9);
      const c = rInt(2, 8);
      expr = `(${a}/${b}) · ${c}`;
      result = (a / b) * c;
      break;
    }
    case 3: {
      const a = rInt(10, 30), b = rInt(2, 9), c = rInt(2, 9);
      expr = `${a} − (${b} · ${c})`;
      result = a - (b * c);
      break;
    }
    case 4: {
      const a = rInt(2, 12), b = rInt(2, 12), c = rInt(2, 6);
      expr = `(${a} + ${b}) ÷ ${c}`;
      result = (a + b) / c;
      break;
    }
    case 5: {
      const x = rInt(3, 15);
      const y = rInt(2, 12);
      expr = `√(${x * x}) + ${y}`;
      result = x + y;
      break;
    }
    case 6: {
      const a = rInt(2, 10), b = rInt(2, 10);
      expr = `(${a} + ${b})²`;
      result = (a + b) ** 2;
      break;
    }
    case 7: {
      const a = rInt(10, 40), b = rInt(2, 9), c = rInt(2, 9);
      const d = rInt(2, 8);
      expr = `(${a} − (${b} + ${c})) · ${d}`;
      result = (a - (b + c)) * d;
      break;
    }
    case 8: {
      const a = rInt(1, 9), b = rInt(2, 10);
      const c = rInt(1, 9), d = rInt(2, 10);
      expr = `(${a}/${b}) ÷ (${c}/${d})`;
      result = (a / b) / (c / d);
      break;
    }
    case 9: {
      const a = rInt(2, 9), b = rInt(2, 9), c = rInt(2, 9);
      expr = `(${a} + ${b}) · (${c} − ${a}) + ${b}`;
      result = (a + b) * (c - a) + b;
      break;
    }
    case 10: {
      const a = rInt(2, 8), b = rInt(2, 8);
      const c = rInt(2, 8), d = rInt(2, 8);
      expr = `(${a} · ${b}) + (${c} · ${d})`;
      result = (a * b) + (c * d);
      break;
    }
    case 11: {
      const a = rInt(8, 20), b = rInt(2, 9);
      const c = rInt(2, 8), d = rInt(2, 10);
      expr = `(${a} ÷ ${b}) + (${c} · ${d})`;
      result = (a / b) + (c * d);
      break;
    }
    case 12: {
      const a = rInt(5, 20), b = rInt(1, 12);
      const c = rInt(10, 25), d = rInt(1, 9);
      expr = `((${a} + ${b}) ÷ (${c} − ${d}))`;
      result = (a + b) / (c - d);
      break;
    }
  }

  soluzioneMath = result;
  document.getElementById("mathExpr").textContent = expr;
  document.getElementById("mathAns").value = "";
  document.getElementById("mathOut").textContent = "Scrivi il risultato finale (virgola o punto).";
}

function checkMath() {
  const raw = document.getElementById("mathAns").value.trim().replace(",", ".");
  const num = parseFloat(raw);

  if (Number.isNaN(num)) {
    document.getElementById("mathOut").textContent = "Inserisci un numero valido.";
    return;
  }

  if (Math.abs(num - soluzioneMath) < 1e-9) {
    document.getElementById("mathOut").textContent = "✅ Corretto!";
  } else {
    document.getElementById("mathOut").textContent = `❌ Sbagliato\nRisultato corretto: ${soluzioneMath}`;
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

  // Musica placeholder
  document.getElementById("goMus").addEventListener("click", () => {
    document.getElementById("homeMsg").textContent = "Musica (in costruzione)";
  });

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
