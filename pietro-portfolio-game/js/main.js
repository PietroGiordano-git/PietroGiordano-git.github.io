/* ============================================================
   MOTORE DI GIOCO — Canvas 2D puro, nessuna libreria esterna.
   Camera FISSA: l'intera scena (prato o casa) sta sempre in un
   solo schermo 320x180 — niente scroll, montagne visibili da
   subito. Durante i dialoghi la visuale fa un piccolo zoom sul
   giocatore e su chi/cosa sta parlando.
   ============================================================ */

// ---------- Risoluzione interna (pixel art nitida) ----------
const VIEW_W = 320;
const VIEW_H = 180;
const GRASS_TOP = 50;

// Il "mondo" coincide sempre con la visuale: nessuna scena è più
// grande dello schermo, quindi la camera non deve mai scorrere.
const WORLD_W = VIEW_W;
const WORLD_H = VIEW_H;
let currentScene = 'prato';

const canvas = document.getElementById('game-canvas');
const gameWrap = document.getElementById('game-wrap');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
  const useScale = window.innerWidth < VIEW_W || window.innerHeight < VIEW_H
    ? Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)
    : scale;
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  canvas.style.width = (VIEW_W * useScale) + 'px';
  canvas.style.height = (VIEW_H * useScale) + 'px';
}
window.addEventListener('resize', resize);
resize();

// ---------- Input ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key.toLowerCase() === 'e' || e.key === 'Enter') handleInteractKey();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// touch dpad
const touchState = { up:false, down:false, left:false, right:false };
document.querySelectorAll('#touch-dpad button').forEach(btn => {
  const dir = btn.getAttribute('data-dir');
  const set = (v) => (e) => { e.preventDefault(); touchState[dir] = v; };
  btn.addEventListener('touchstart', set(true), { passive:false });
  btn.addEventListener('touchend', set(false), { passive:false });
  btn.addEventListener('touchcancel', set(false), { passive:false });
  btn.addEventListener('mousedown', set(true));
  btn.addEventListener('mouseup', set(false));
  btn.addEventListener('mouseleave', set(false));
});
document.getElementById('touch-interact').addEventListener('touchstart', (e) => { e.preventDefault(); handleInteractKey(); }, { passive:false });
document.getElementById('touch-interact').addEventListener('click', () => handleInteractKey());

// ---------- Dialogo attivo + interlocutore (per lo zoom) ----------
let activeSpeaker = null; // { x, y } in coordinate di mondo

function handleInteractKey() {
  Audio8bit.start();
  if (Dialogue.isOpen()) {
    Dialogue.advance();
    Audio8bit.blip();
    return;
  }
  const target = nearestInteractable();
  if (target && target.onInteract) {
    activeSpeaker = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
    target.onInteract();
    Audio8bit.blip();
  }
}

// Il primo tasto/tocco qualsiasi sblocca l'audio (i browser richiedono
// un gesto dell'utente prima di poter riprodurre suoni).
window.addEventListener('keydown', () => Audio8bit.start(), { once: true });
window.addEventListener('touchstart', () => Audio8bit.start(), { once: true });
window.addEventListener('mousedown', () => Audio8bit.start(), { once: true });

document.getElementById('mute-toggle').addEventListener('click', (e) => {
  Audio8bit.start();
  const muted = Audio8bit.toggleMute();
  e.currentTarget.textContent = muted ? '🔇' : '🔊';
});

// ---------- CV testuale (toggle) ----------
document.getElementById('cv-toggle').addEventListener('click', () => {
  document.getElementById('cv-panel').classList.remove('hidden');
});
document.getElementById('cv-close').addEventListener('click', () => {
  document.getElementById('cv-panel').classList.add('hidden');
});

// ---------- Player ----------
const player = {
  x: 150,
  y: 150,
  w: 17 * 2,
  h: 20 * 2,
  speed: 62, // unità mondo al secondo
  facing: 'down',
  moving: false,
  animTimer: 0,
  animFrame: 0
};

// ---------- Quercia (scena PRATO) ----------
const TREE_X = 66, TREE_BASE_Y = 158;

// ---------- Gatto — sonnecchia ai piedi della quercia ----------
const CAT_X = TREE_X + 26, CAT_GROUND_Y = TREE_BASE_Y + 2;
const CAT_ALERT_RADIUS = 48;
let catAwake = false;
let catDialogueActive = false;

// ---------- Casa (esterno, scena PRATO) ----------
// Il rettangolo di collisione/disegno segue le dimensioni reali dello
// sprite (23x21 celle): il muro solido combacia con le pareti disegnate
// e la porta è un piccolo trigger separato, posizionato esattamente
// dove la porta è disegnata — non più l'intera sagoma della casa.
const HOUSE_X = 185, HOUSE_Y = 45, HOUSE_PIXEL = 5;
// Lo sprite è largo 25 colonne: il tetto (righe 0-11) copre l'intera
// larghezza e sporge di 2 colonne su ciascun lato rispetto ai muri
// (righe 13-22), che restano larghi 21 colonne come prima — così il
// tetto è visibilmente più largo dei muri, con una vera gronda a sbalzo.
const HOUSE_EXT_W = 25 * HOUSE_PIXEL, HOUSE_EXT_H = 23 * HOUSE_PIXEL;
const HOUSE_WALL_INSET = 2 * HOUSE_PIXEL;
const HOUSE_WALL_W = 21 * HOUSE_PIXEL;
// Le pareti (righe 13-22 dello sprite) iniziano sotto il tetto.
const HOUSE_WALL_TOP = HOUSE_Y + 13 * HOUSE_PIXEL;
const houseExtWallRect = { x: HOUSE_X + HOUSE_WALL_INSET, y: HOUSE_WALL_TOP, w: HOUSE_WALL_W, h: HOUSE_EXT_H - 13 * HOUSE_PIXEL };
// La porta (righe 19-21, colonne 9-14 dello sprite largo, spostata di
// +2 colonne rispetto a prima per via del nuovo inset dei muri).
const houseDoorRect = { x: HOUSE_X + 9 * HOUSE_PIXEL, y: HOUSE_Y + 19 * HOUSE_PIXEL, w: 6 * HOUSE_PIXEL, h: 3 * HOUSE_PIXEL };

// ---------- Oggetti interagibili — scena PRATO ----------
const pratoInteractables = [
  {
    // Hitbox = solo il tronco (dove serve la collisione): la chioma
    // sopra la testa del giocatore non blocca il passaggio.
    id: 'tree',
    x: TREE_X - 7, y: TREE_BASE_Y - 36, w: 14, h: 36,
    solid: true,
    promptRadius: 40,
    label: 'Quercia'
  },
  {
    // Il gatto sonnecchia accanto al tronco: hitbox ritagliata sulla
    // sagoma del nuovo sprite (13x11 a pixelSize 2 = 26x22).
    id: 'cat',
    x: CAT_X - 13, y: CAT_GROUND_Y - 22, w: 26, h: 22,
    solid: true,
    promptRadius: 34,
    label: 'Gatto',
    onInteract() {
      catDialogueActive = true;
      Dialogue.start('Gatto', [
        '*Un gatto sonnecchiava all’ombra della quercia, ma apre un occhio e si stiracchia.* Da qui si vede tutto il percorso di Pietro.',
        'A luglio 2025 si è diplomato all’ITIS Mario Del Pozzo di Cuneo: Tecnico Superiore in Informatica, specializzazione Robotica Smart.',
        'Tra le materie: programmazione in C, C++, Python e Java, basi di dati SQL, sistemi e reti, automazione e robotica industriale, microcontrollori e sistemi embedded.',
        'Ma la parte più bella sono stati i progetti PCTO, fatti sul campo.',
        'Con NAOChallenge ha costruito “HumaNAO” (2023): un robot NAO che assisteva gli utenti alla ricarica di veicoli elettrici.',
        'L’anno dopo, “NAOutfit” (2024): stesso robot, stavolta a dare consigli di abbigliamento sportivo ai clienti.',
        'Con GameAbility 2025 è nato D.R.O.N.E.: un drone pilotato con segnali cerebrali, pensato per il monitoraggio sanitario.',
        'E con Delibread, sempre nel 2025, un team ha sviluppato una piattaforma web per la gestione digitale di panifici e negozi al dettaglio.',
        'In mezzo, anche un corso di sicurezza sul lavoro e uno STEM Training Course.',
        '*Il gatto sbadiglia, si struscia contro il tronco e torna ad accoccolarsi.*'
      ], () => { catDialogueActive = false; });
    }
  },
  {
    // Solo per il disegno: la casa vista da fuori. Non blocca né si
    // interagisce con l'intera sagoma — se ne occupano houseExtWallRect
    // (collisione) e 'house-door' (trigger), entrambi ritagliati sulla
    // forma reale dello sprite.
    id: 'house-body',
    x: HOUSE_X, y: HOUSE_Y, w: HOUSE_EXT_W, h: HOUSE_EXT_H,
    solid: false,
    promptRadius: 70,
    label: 'Casa',
    sprite: 'house', pixelSize: HOUSE_PIXEL
  },
  {
    // Trigger d'ingresso: combacia esattamente con la porta disegnata,
    // non con l'intera casa — così si entra solo avvicinandosi alla porta.
    id: 'house-door',
    x: houseDoorRect.x, y: houseDoorRect.y, w: houseDoorRect.w, h: houseDoorRect.h,
    solid: false,
    promptRadius: 24,
    sprite: null,
    label: 'Casa',
    onInteract() {
      Dialogue.start('Casa', ['Entri in casa...'], () => enterHouse());
    }
  }
];

// ---------- Casa interna: pareti solide + porta ----------
const HOUSE_WT = 14;
const HOUSE_DOOR_X0 = 140, HOUSE_DOOR_X1 = 180;
const houseWallRects = [
  { x: 0, y: 0, w: VIEW_W, h: HOUSE_WT },                                    // nord
  { x: 0, y: VIEW_H - HOUSE_WT, w: HOUSE_DOOR_X0, h: HOUSE_WT },              // sud, sinistra della porta
  { x: HOUSE_DOOR_X1, y: VIEW_H - HOUSE_WT, w: VIEW_W - HOUSE_DOOR_X1, h: HOUSE_WT }, // sud, destra della porta
  { x: 0, y: 0, w: HOUSE_WT, h: VIEW_H },                                    // ovest
  { x: VIEW_W - HOUSE_WT, y: 0, w: HOUSE_WT, h: VIEW_H }                     // est
];
const pratoWallRects = [
  { x: 0, y: 0, w: VIEW_W, h: 50 }, // non si cammina dentro le montagne/cielo
  houseExtWallRect                 // pareti della casa vista da fuori
];
let currentWallRects = pratoWallRects;

// ---------- Oggetti interagibili — scena CASA ----------
const houseInteractables = [
  {
    id: 'pc',
    x: 40, y: 40, w: 13 * 3, h: 10 * 3,
    solid: true,
    promptRadius: 32,
    label: 'PC',
    sprite: 'pc', pixelSize: 3,
    onInteract() {
      Dialogue.start('PC', [
        'Lo schermo si accende: è pieno di finestre aperte su siti in lavorazione.',
        'Pietro è tirocinante Web Designer da Gem Communication — tirocinio tuttora in corso.',
        'Sviluppa siti con WordPress ed Elementor, monta video con CapCut e cura la grafica editoriale con Canva.',
        'Si occupa anche di assistenza tecnica sui siti dei clienti.',
        'Di mezzo ci sono gestione di CMS, editing multimediale e parecchio problem solving quotidiano.'
      ]);
    }
  },
  {
    id: 'person',
    x: 225, y: 34, w: 13 * 3, h: 13 * 3,
    solid: true,
    promptRadius: 34,
    label: 'Ricordo',
    sprite: 'person', pixelSize: 3,
    onInteract() {
      Dialogue.start('Ricordo', [
        'Una figura familiare sorride: è il ricordo dell’estate 2025.',
        'Da giugno a settembre, a Morra del Villar (CN), Pietro ha lavorato come assistente familiare a una persona disabile.',
        'Aiuto diretto nella vita quotidiana — igiene personale, alimentazione — insieme a passeggiate e attività all’aria aperta.',
        'Anche la gestione dei farmaci prescritti, con monitoraggio degli effetti e relativa documentazione.',
        'E supporto negli esercizi fisici e di riabilitazione, per mantenere la mobilità della persona assistita.',
        'Da questa esperienza: affidabilità, empatia, e la capacità di restare lucido in situazioni delicate.'
      ]);
    }
  },
  {
    id: 'animal',
    x: 230, y: 115, w: 12 * 3, h: 5 * 3, // ingombro della cesta, la gallina sta sopra
    solid: true,
    promptRadius: 34,
    label: 'Gallina',
    sprite: 'chicken', pixelSize: 3,
    onInteract() {
      Dialogue.start('Gallina', [
        '*Coccodè!* Una gallina, la stessa protagonista delle giornate passate a raccogliere uova.',
        'Prima tappa: Uova Tavernola, a Roccabruna (CN), estate 2022 — raccolta e movimentazione delle uova, gestione dei capannoni, cura del benessere degli animali.',
        'Poi Monastero nel 2023 e Pratavecchia nel 2024: raccolta della frutta e potatura di alberi e viti, sempre nel rispetto delle norme igienico-sanitarie.',
        'Stagioni diverse, stesso spirito: lavoro di squadra, rispetto dei tempi e adattabilità, anche quando il lavoro fisico si fa duro.'
      ]);
    }
  },
  {
    id: 'exit-door',
    x: HOUSE_DOOR_X0, y: VIEW_H - HOUSE_WT - 4, w: HOUSE_DOOR_X1 - HOUSE_DOOR_X0, h: HOUSE_WT + 8,
    solid: false,
    promptRadius: 30,
    sprite: null,
    label: 'Uscita',
    onInteract() {
      Dialogue.start('Uscita', ['Torni fuori, nel prato...'], () => enterPrato());
    }
  }
];

let interactables = pratoInteractables;

function enterHouse() {
  Audio8bit.doorChime();
  currentScene = 'house';
  interactables = houseInteractables;
  currentWallRects = houseWallRects;
  player.x = 160;
  player.y = 148;
  player.facing = 'up';
}

function enterPrato() {
  Audio8bit.doorChime();
  currentScene = 'prato';
  interactables = pratoInteractables;
  currentWallRects = pratoWallRects;
  player.x = HOUSE_X + HOUSE_EXT_W / 2;
  player.y = HOUSE_Y + HOUSE_EXT_H + 8;
  player.facing = 'down';
}

function nearestInteractable() {
  let best = null, bestDist = Infinity;
  for (const obj of interactables) {
    const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
    const dx = (player.x) - cx, dy = (player.y) - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < obj.promptRadius && dist < bestDist) { best = obj; bestDist = dist; }
  }
  return best;
}

// ---------- Texture erba (chiazze di base + fili in primo piano) ----------
function hash01(x, y) {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

// Chiazze morbide sul terreno (sotto tutto, danno profondità senza il
// pattern "a pallini" troppo regolare/finto di prima).
function grassPatch(wx, wy) {
  const n = hash01(Math.floor(wx / 6), Math.floor(wy / 6));
  if (n < 0.16) return '#4f8f42';
  if (n < 0.30) return '#6fb85a';
  if (n < 0.36) return '#3f7d3a';
  return null;
}

// Fili d'erba in primo piano: fanno parte dell'ordinamento per
// profondità, quindi quelli davanti al giocatore (più a sud) coprono
// le gambe, dando l'effetto "leggermente 3D" di camminare nell'erba.
function buildGrassBlades() {
  const blades = [];
  for (let gx = 4; gx < VIEW_W; gx += 8) {
    for (let gy = GRASS_TOP + 6; gy < VIEW_H; gy += 8) {
      const n = hash01(gx, gy);
      if (n < 0.58) continue;
      const jitterX = Math.round(((n * 997) % 5) - 2);
      const jitterY = Math.round(((n * 613) % 5) - 2);
      const shadeRoll = (n * 37) % 1;
      const color = shadeRoll < 0.4 ? '#3f7d3a' : (shadeRoll < 0.75 ? '#6fb85a' : '#8fc76b');
      const tall = shadeRoll > 0.8;
      blades.push({ x: gx + jitterX, y: gy + jitterY, color, tall });
    }
  }
  return blades;
}
const grassBlades = buildGrassBlades();

function drawGrassBlade(b) {
  ctx.fillStyle = b.color;
  const h1 = b.tall ? 7 : 5;
  const h2 = b.tall ? 6 : 4;
  ctx.fillRect(b.x, b.y - h1, 2, h1);
  ctx.fillRect(b.x + 3, b.y - h2, 2, h2);
}

// ---------- Montagne (sagoma fissa, sempre visibile) ----------
function drawMountainLayer(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function buildRidge(baseY, amplitude, step, seed, closeY) {
  const pts = [[0, closeY]];
  for (let x = 0; x <= VIEW_W; x += step) {
    const n = Math.sin((x + seed) * 0.02) * amplitude + Math.sin((x + seed) * 0.06) * amplitude * 0.4;
    pts.push([x, baseY - Math.abs(n)]);
  }
  pts.push([VIEW_W, closeY]);
  return pts;
}

const ridgeFar = buildRidge(28, 14, 16, 11, 58);
const ridgeNear = buildRidge(38, 12, 20, 77, 58);

// ---------- Zoom durante i dialoghi ----------
let zoom = 1;
const zoomFocal = { x: VIEW_W / 2, y: VIEW_H / 2 };
function updateZoom(dt) {
  let target = 1;
  if (Dialogue.isOpen() && activeSpeaker) {
    target = 1.7;
    const tx = (player.x + activeSpeaker.x) / 2;
    const ty = (player.y - player.h / 2 + activeSpeaker.y) / 2;
    zoomFocal.x += (tx - zoomFocal.x) * Math.min(1, dt * 8);
    zoomFocal.y += (ty - zoomFocal.y) * Math.min(1, dt * 8);
  } else {
    zoomFocal.x += (VIEW_W / 2 - zoomFocal.x) * Math.min(1, dt * 8);
    zoomFocal.y += (VIEW_H / 2 - zoomFocal.y) * Math.min(1, dt * 8);
  }
  zoom += (target - zoom) * Math.min(1, dt * 5);
}

// ---------- Collisioni ----------
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function tryMove(dx, dy, dt) {
  const step = player.speed * dt;
  let nx = player.x + dx * step;
  let ny = player.y + dy * step;

  const halfW = player.w / 2, footH = 10;
  nx = clamp(nx, halfW, WORLD_W - halfW);
  ny = clamp(ny, footH, WORLD_H - footH);

  const blockedAt = (testX, testY) => {
    const px = testX - halfW, py = testY - footH;
    const pw = player.w, ph = footH * 2;
    for (const obj of interactables) {
      if (!obj.solid) continue;
      if (rectsOverlap(px, py, pw, ph, obj.x, obj.y + obj.h * 0.5, obj.w, obj.h * 0.5)) return true;
    }
    for (const w of currentWallRects) {
      if (rectsOverlap(px, py, pw, ph, w.x, w.y, w.w, w.h)) return true;
    }
    return false;
  };

  if (!blockedAt(nx, player.y)) player.x = nx;
  if (!blockedAt(player.x, ny)) player.y = ny;
}

// ---------- Loop ----------
let lastTime = performance.now();

function update(dt) {
  Dialogue.update(dt);

  const blocked = Dialogue.isOpen();
  let dx = 0, dy = 0;
  if (!blocked) {
    if (keys['arrowleft'] || keys['a'] || touchState.left) dx -= 1;
    if (keys['arrowright'] || keys['d'] || touchState.right) dx += 1;
    if (keys['arrowup'] || keys['w'] || touchState.up) dy -= 1;
    if (keys['arrowdown'] || keys['s'] || touchState.down) dy += 1;
  }

  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) {
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    if (Math.abs(dx) > Math.abs(dy)) player.facing = dx > 0 ? 'right' : 'left';
    else player.facing = dy > 0 ? 'down' : 'up';
    tryMove(dx, dy, dt);

    player.animTimer += dt;
    if (player.animTimer > 0.18) {
      player.animTimer = 0;
      player.animFrame = 1 - player.animFrame;
      if (player.animFrame === 1) Audio8bit.footstep();
    }
  } else {
    player.animFrame = 0;
  }

  // Gatto: si sveglia quando ti avvicini alla quercia
  if (currentScene === 'prato') {
    const dxC = player.x - CAT_X, dyC = player.y - CAT_GROUND_Y;
    catAwake = Math.hypot(dxC, dyC) < CAT_ALERT_RADIUS;
  }

  updateZoom(dt);

  // Indicatore sopra l'oggetto più vicino: mostra il nome, con "!"
  // davanti quando l'oggetto è anche interagibile (premendo E succede
  // qualcosa), senza "!" se è solo un'etichetta informativa.
  const hint = document.getElementById('interact-hint');
  const target = blocked ? null : nearestInteractable();
  if (target) {
    const screenX = target.x + target.w / 2;
    const screenY = target.y;
    const scaleFactor = canvas.clientWidth / VIEW_W;
    // Il canvas è centrato nel wrapper (può avere bande nere ai lati/sopra),
    // quindi serve l'offset reale del canvas rispetto al contenitore.
    const wrapRect = gameWrap.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const offsetX = canvasRect.left - wrapRect.left;
    const offsetY = canvasRect.top - wrapRect.top;
    hint.style.left = (offsetX + screenX * scaleFactor) + 'px';
    hint.style.top = (offsetY + screenY * scaleFactor) + 'px';
    hint.textContent = target.onInteract ? ('! ' + (target.label || '')) : (target.label || '');
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#bfe8f2');
  grad.addColorStop(0.6, '#eaf6ea');
  grad.addColorStop(1, '#eaf6ea');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawGrass() {
  ctx.fillStyle = '#5a9c4a';
  ctx.fillRect(0, GRASS_TOP, WORLD_W, WORLD_H - GRASS_TOP);

  // chiazze morbide di tono, a blocchi di 6px: meno "a pallini" e più naturali
  for (let wx = 0; wx < WORLD_W; wx += 6) {
    for (let wy = GRASS_TOP; wy < WORLD_H; wy += 6) {
      const c = grassPatch(wx, wy);
      if (c) { ctx.fillStyle = c; ctx.fillRect(wx, wy, 6, 6); }
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
}

// ---------- Quercia procedurale + gatto ----------
function drawPixelCircle(cx, cy, radius, pixelSize, color, jitterEdge) {
  for (let y = -radius; y <= radius; y += pixelSize) {
    for (let x = -radius; x <= radius; x += pixelSize) {
      const d = Math.sqrt(x * x + y * y);
      if (d > radius) continue;
      if (jitterEdge && d > radius - pixelSize * 1.5) {
        const h = hash01(cx + x, cy + y);
        if (h < 0.35) continue;
      }
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(cx + x), Math.round(cy + y), pixelSize, pixelSize);
    }
  }
}

function drawOakTree(x, groundY) {
  // tronco
  ctx.fillStyle = '#4a2e18';
  ctx.fillRect(x - 7, groundY - 36, 14, 36);
  ctx.fillStyle = '#5c3a20';
  ctx.fillRect(x - 7, groundY - 36, 8, 36);
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(x - 3, groundY - 10, 3, 10);
  ctx.fillRect(x + 2, groundY - 16, 3, 16);

  // chioma — cerchi pixelati sovrapposti, ispirata a una quercia tondeggiante
  drawPixelCircle(x - 2, groundY - 56, 32, 4, '#356b30', true);
  drawPixelCircle(x - 16, groundY - 62, 22, 4, '#3f7d3a', true);
  drawPixelCircle(x + 16, groundY - 60, 22, 4, '#3f7d3a', true);
  drawPixelCircle(x, groundY - 72, 20, 4, '#4a8f42', true);
  drawPixelCircle(x - 6, groundY - 80, 14, 4, '#5fa650', true);
}

function drawTree() {
  drawOakTree(TREE_X, TREE_BASE_Y);
}

// Gatto disegnato con uno sprite a griglia di pixel dedicato (come
// gallina/persona/PC), non più con forme procedurali: più leggibile a
// colpo d'occhio e con una dimensione fissa e prevedibile, chiaramente
// più piccola del giocatore. Dorme accoccolato finché non ti avvicini
// alla quercia, poi si sveglia e si mette seduto.
const CAT_PIXEL = 2;
function drawCatEntry() {
  const spriteName = catAwake ? 'cat_awake' : 'cat_asleep';
  const size = spriteSize(spriteName, CAT_PIXEL);
  const flip = player.x < CAT_X;
  drawSprite(ctx, spriteName, 'cat', CAT_X - size.w / 2, CAT_GROUND_Y - size.h, CAT_PIXEL, flip);
}

function drawChickenOnCrate(o) {
  drawSprite(ctx, 'crate', 'chicken', o.x, o.y, 3, false);
  const cSize = spriteSize('chicken', 3);
  drawSprite(ctx, 'chicken', 'chicken', o.x + (o.w - cSize.w) / 2, o.y - cSize.h + 6, 3, false);
}

function drawHouseInterior() {
  // pavimento in legno
  ctx.fillStyle = '#a9784f';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  for (let y = HOUSE_WT + 10; y < WORLD_H - HOUSE_WT; y += 12) {
    ctx.beginPath();
    ctx.moveTo(HOUSE_WT, y);
    ctx.lineTo(WORLD_W - HOUSE_WT, y);
    ctx.stroke();
  }

  // tappeto centrale
  const rugW = 90, rugH = 46;
  ctx.fillStyle = '#c9575f';
  ctx.fillRect(WORLD_W / 2 - rugW / 2, WORLD_H / 2 - rugH / 2, rugW, rugH);
  ctx.strokeStyle = '#8a3b41';
  ctx.strokeRect(WORLD_W / 2 - rugW / 2, WORLD_H / 2 - rugH / 2, rugW, rugH);

  // pareti solide e visibili
  ctx.fillStyle = '#e8d9b8';
  ctx.fillRect(0, 0, VIEW_W, HOUSE_WT); // nord
  ctx.fillRect(0, VIEW_H - HOUSE_WT, HOUSE_DOOR_X0, HOUSE_WT); // sud sx
  ctx.fillRect(HOUSE_DOOR_X1, VIEW_H - HOUSE_WT, VIEW_W - HOUSE_DOOR_X1, HOUSE_WT); // sud dx
  ctx.fillRect(0, 0, HOUSE_WT, VIEW_H); // ovest
  ctx.fillRect(VIEW_W - HOUSE_WT, 0, HOUSE_WT, VIEW_H); // est

  // profondità/ombra sul bordo interno delle pareti
  ctx.fillStyle = '#c7b28c';
  ctx.fillRect(0, HOUSE_WT - 3, VIEW_W, 3);
  ctx.fillRect(0, VIEW_H - HOUSE_WT, HOUSE_DOOR_X0, 3);
  ctx.fillRect(HOUSE_DOOR_X1, VIEW_H - HOUSE_WT, VIEW_W - HOUSE_DOOR_X1, 3);
  ctx.fillRect(HOUSE_WT - 3, 0, 3, VIEW_H);
  ctx.fillRect(VIEW_W - HOUSE_WT, 0, 3, VIEW_H);

  // soglia della porta — si intravede il prato fuori: porta verso l'esterno
  ctx.fillStyle = '#5a9c4a';
  ctx.fillRect(HOUSE_DOOR_X0, VIEW_H - HOUSE_WT, HOUSE_DOOR_X1 - HOUSE_DOOR_X0, HOUSE_WT);
  ctx.fillStyle = '#4a2e18';
  ctx.fillRect(HOUSE_DOOR_X0 - 3, VIEW_H - HOUSE_WT - 2, 3, HOUSE_WT + 2); // stipite sx
  ctx.fillRect(HOUSE_DOOR_X1, VIEW_H - HOUSE_WT - 2, 3, HOUSE_WT + 2); // stipite dx

  // finestra con vista sulle montagne
  const winX = 140, winW = 40, winY = 0, winH = HOUSE_WT;
  ctx.fillStyle = '#bfe3ef';
  ctx.fillRect(winX, winY, winW, winH);
  ctx.fillStyle = '#8fa9c9';
  ctx.beginPath();
  ctx.moveTo(winX, winY + winH);
  ctx.lineTo(winX + 10, winY + 3);
  ctx.lineTo(winX + 18, winY + winH);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(winX + 16, winY + winH);
  ctx.lineTo(winX + 28, winY + 2);
  ctx.lineTo(winX + winW, winY + winH);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(winX, winY, winW, winH);
}

function draw() {
  ctx.save();
  ctx.fillStyle = '#10141c';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.translate(VIEW_W / 2, VIEW_H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-zoomFocal.x, -zoomFocal.y);

  if (currentScene === 'prato') {
    drawSky();
    drawMountainLayer(ridgeFar, '#8fa9c9');
    drawMountainLayer(ridgeNear, '#6f8fb5');
    drawGrass();
  } else {
    drawHouseInterior();
  }

  const drawables = [];
  for (const o of interactables) {
    if (o.id === 'tree') {
      drawables.push({ y: TREE_BASE_Y, draw: drawTree });
    } else if (o.id === 'cat') {
      drawables.push({ y: CAT_GROUND_Y, draw: drawCatEntry });
    } else if (o.id === 'animal') {
      drawables.push({ y: o.y + o.h, draw: () => drawChickenOnCrate(o) });
    } else if (o.sprite) {
      drawables.push({ y: o.y + o.h, draw: () => drawSprite(ctx, o.sprite, o.sprite, o.x, o.y, o.pixelSize, false) });
    }
  }
  drawables.push({ y: player.y, draw: drawPlayer });
  if (currentScene === 'prato') {
    for (const b of grassBlades) drawables.push({ y: b.y, draw: () => drawGrassBlade(b) });
  }
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();

  ctx.restore();
}

function drawPlayer() {
  const flip = player.facing === 'left';
  const bob = player.moving && player.animFrame === 1 ? -1 : 0;
  drawSprite(ctx, 'player', 'player', player.x - player.w / 2, player.y - player.h + bob, 2, flip);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Il suggerimento comandi sparisce da solo dopo qualche secondo
setTimeout(() => {
  const hintEl = document.getElementById('loading-hint');
  if (hintEl) hintEl.classList.add('fade-out');
}, 7000);

// ---------- Dialogo di benvenuto ----------
window.addEventListener('load', () => {
  setTimeout(() => {
    activeSpeaker = null;
    Dialogue.start('Pietro', [
      'Ciao! Benvenuto/a nel mio portfolio interattivo.',
      'Muoviti con le frecce o WASD, esplora il prato.',
      'C’è una quercia e una casa: avvicinati e premi E per scoprire di più su di me!'
    ]);
  }, 400);
});
