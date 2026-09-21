/* ============================================================
   PIXEL ART — sprite disegnati come griglie di pixel (placeholder).
   Ogni sprite è una matrice di caratteri; ogni carattere mappa a
   un colore nella palette. "." = trasparente. Risoluzione alzata
   (più "pixel" per soggetto, ispirazione Binding of Isaac) per un
   look più dettagliato pur restando pixel art marcata.
   ============================================================ */

const Palettes = {
  player: {
    '.': null,
    'O': '#1a1410',
    'H': '#4a2f1c',
    'h': '#30200f',
    'S': '#f2c9a0',
    'C': '#3b6fa8',
    'c': '#28517f',
    'P': '#3a3a42',
    'p': '#26262c',
    'W': '#5c3a24'
  },
  house: {
    '.': null,
    'R': '#8a3b2b',
    'r': '#6e2c20',
    'h': '#c9705a',
    't': '#5c2a1e',
    'W': '#d9a05c',
    'w': '#c1873f',
    'D': '#4b2e1a',
    'Y': '#bfe3ef',
    'O': '#241a12'
  },
  cat: {
    '.': null,
    'O': '#1a1410',
    'F': '#c97a3a',
    'f': '#a85f28',
    'B': '#f2d9b3',
    'E': '#1a1410',
    'N': '#e08a9a',
    'P': '#e08a9a'
  },
  pc: {
    '.': null,
    'C': '#e4e4e4',
    'c': '#b8b8b8',
    'S': '#6fd0e0',
    's': '#3fa9bd',
    'K': '#333333'
  },
  person: {
    '.': null,
    'O': '#1a1410',
    'H': '#5a3a2a',
    'S': '#e0b090',
    'C': '#7a9e6e',
    'c': '#5c7d52'
  },
  chicken: {
    '.': null,
    'O': '#1a1410',
    'W': '#f7f2e8',
    'w': '#dcd3bf',
    'R': '#c94b3f',
    'Y': '#e0a83c',
    'K': '#8a5a34'
  }
};

const Sprites = {
  // ---------------- Player (chibi, top-down) ----------------
  player: [
    '......OOOO......',
    '.....OHHHHO.....',
    '....OHHHHHHO....',
    '....OHhhhHHO....',
    '...OHHHHHHHHO...',
    '...OSSSSSSSSO...',
    '...OSSOSSOSSO...',
    '...OSSSSSSSSO...',
    '...OOSSSSSSOO...',
    '..OOCCCCCCCCOO..',
    '.OCCCCCCCCCCCCO.',
    '.OCCcCCCCCcCCO.',
    '.OCCCCCCCCCCCCO.',
    '.OCCCCCCCCCCCCO.',
    '..OPPPPPPPPPPO..',
    '..OPP.OOOO.PPO..',
    '..OPP.OOOO.PPO..',
    '..OWWO..OOWWO...',
    '..OWW......WWO..',
    '...OO......OO...'
  ],

  // ---------------- Casa (esterno) — tetto largo, a sbalzo sui muri ----------------
  house: [
    '...........hhr...........',
    '..........RRrrr..........',
    '.........RRRrrrr.........',
    '........RRRRrrrrr........',
    '.......RRRRRrrrrrr.......',
    '......RRRRRRrrrrrrr......',
    '.....RRRRRRRrrrrrrrr.....',
    '....RRRRRRRRrrrrrrrrr....',
    '...RRRRRRRRRrrrrrrrrrr...',
    '..RRRRRRRRRRrrrrrrrrrrr..',
    '.RRRRRRRRRRRrrrrrrrrrrrr.',
    'RRRRRRRRRRRRrrrrrrrrrrrrr',
    'ttttttttttttttttttttttttt',
    '..WWWWWWWWWWWWWWWWWWWWW..',
    '..WWWWWYYYYWWWWWYYYYWWW..',
    '..WWWWWYYYYWWWWWYYYYWWW..',
    '..WWWWWYYYYWWWWWYYYYWWW..',
    '..WWWWWwwwwWWWWWwwwwWWW..',
    '..WWWWWWWWWWWWWWWWWWWWW..',
    '..WWWWWWWDDDDDDWWWWWWWW..',
    '..WWWWWWWDDDDDDWWWWWWWW..',
    '..WWWWWWWDDDYDDWWWWWWWW..',
    '..OOOOOOOOOOOOOOOOOOOOO..'
  ],

  // ---------------- PC da scrivania ----------------
  pc: [
    '.CCCCCCCCCCC.',
    'CCCCCCCCCCCCC',
    'CssssssssssC',
    'CSSSSSSSSSSC',
    'CSsSSSSsSSSC',
    'CSSSSSSSSSSC',
    'CCCCCCCCCCCC',
    '.....KK......',
    '....KKKK.....',
    '...KKKKKK....'
  ],

  // ---------------- Persona (ricordo) ----------------
  person: [
    '.....OOO.....',
    '....OHHHO....',
    '...OHHHHHO...',
    '...OSSSSSO...',
    '...OSOSOSO...',
    '...OSSSSSO...',
    '..OOSSSSOO...',
    '.OOCCCCCCOO..',
    'OCCCCCCCCCCO.',
    'OCCcCCCCcCO..',
    'OCCCCCCCCCCO.',
    '.OCC....CCO..',
    '.OOO....OOO..'
  ],

  // ---------------- Gallina (esperienza agricola) ----------------
  chicken: [
    '....RR......',
    '...RWWR.....',
    '..WWWWWY....',
    '.WWWWWWWY...',
    'OWWOWWWWW...',
    'OWWWWWWWWW..',
    '.WWWWwWWWW..',
    '.WRWWWWWRW..',
    '..W......W..',
    '..KK....KK..'
  ],

  // Cesta di legno su cui sta la gallina
  crate: [
    'KKKKKKKKKKKK',
    'K..........K',
    'K.KKKKKKKK.K',
    'K..........K',
    'KKKKKKKKKKKK'
  ],

  // ---------------- Gatto — seduto ai piedi della quercia ----------------
  // Piccolo e semplice apposta (più piccolo del giocatore), per essere
  // riconoscibile a colpo d'occhio: orecchie a punta, occhi, pancia chiara.
  cat_awake: [
    '..O.......O..',
    '.OOO.....OOO.',
    '.FPF.....FPF.',
    '.OOOOOOOOOOO.',
    '.OFFFFFFFFFO.',
    '.OFFEFFFEFFO.',
    '.OFFFFNFFFFO.',
    'OFFFFFFFFFFFO',
    'OFFFFBBBFFFFO',
    'OFFFFBBBFFFFO',
    '..OOO...OOO..'
  ],
  // Addormentato, acciambellato — profilo basso
  cat_asleep: [
    '.............',
    '...O.....O...',
    '..FFF...FFF..',
    '.OOOOOOOOOOO.',
    '.OFFFFFFFFFO.',
    '.OFFFEFFEFFO.',
    'OFFFFFFFFFFFO',
    'OFFFFBBBFFFFO',
    '.OOOOOOOOOOO.'
  ]
};

// Ogni sprite+palette viene disegnato UNA volta su un piccolo canvas
// "offscreen" a risoluzione nativa (1 cella = 1 pixel del canvas), poi
// riusato con drawImage() per ingrandirlo. Disegnare invece tanti
// fillRect() adiacenti direttamente sul canvas principale, sotto uno
// zoom non intero (es. il 1.7x dello zoom di dialogo) o con lo scaling
// del device, produce sottili linee/griglia tra un "pixel" e l'altro
// (ogni rettangolo viene anti-aliasato per conto suo). Un unico
// drawImage() è invece un solo blit senza cuciture.
const _spriteCanvasCache = {};
function getSpriteCanvas(spriteName, paletteName) {
  const key = spriteName + '|' + paletteName;
  const cached = _spriteCanvasCache[key];
  if (cached) return cached;
  const rows = Sprites[spriteName];
  const palette = Palettes[paletteName];
  if (!rows) return null;
  const w = rows[0].length;
  const h = rows.length;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = false;
  for (let r = 0; r < h; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const color = palette[row[c]];
      if (!color) continue;
      octx.fillStyle = color;
      octx.fillRect(c, r, 1, 1);
    }
  }
  _spriteCanvasCache[key] = off;
  return off;
}

function drawSprite(ctx, spriteName, paletteName, x, y, pixelSize, flip) {
  const off = getSpriteCanvas(spriteName, paletteName);
  if (!off) return;
  const w = off.width * pixelSize;
  const h = off.height * pixelSize;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(off, 0, 0, w, h);
  } else {
    ctx.drawImage(off, x, y, w, h);
  }
  ctx.restore();
}

function spriteSize(spriteName, pixelSize) {
  const rows = Sprites[spriteName];
  return { w: rows[0].length * pixelSize, h: rows.length * pixelSize };
}
