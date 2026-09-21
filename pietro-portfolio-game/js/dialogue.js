/* ============================================================
   DIALOGUE — casella di testo in stile GDR 2D con effetto
   "macchina da scrivere". Uso:
     Dialogue.start(speakerName, [ "riga 1", "riga 2", ... ], onClose)
     Dialogue.advance()  -> chiamato quando il giocatore preme E/Invio
     Dialogue.isOpen()   -> per bloccare il movimento mentre parla
   ============================================================ */

const Dialogue = (() => {
  let el, nameEl, textEl, hintEl;
  let lines = [];
  let lineIndex = 0;
  let charIndex = 0;
  let typing = false;
  let typeTimer = 0;
  let speaker = '';
  let onCloseCb = null;
  const TYPE_SPEED = 22; // caratteri al secondo

  function init() {
    el = document.getElementById('dialogue-box');
    nameEl = document.getElementById('dialogue-name');
    textEl = document.getElementById('dialogue-text');
    hintEl = document.getElementById('dialogue-hint');
  }

  function start(speakerName, textLines, onClose) {
    if (!el) init();
    speaker = speakerName;
    lines = textLines;
    lineIndex = 0;
    charIndex = 0;
    typing = true;
    typeTimer = 0;
    onCloseCb = onClose || null;
    el.classList.remove('hidden');
    nameEl.textContent = speaker;
    textEl.textContent = '';
    hintEl.textContent = '';
  }

  function isOpen() {
    return el && !el.classList.contains('hidden');
  }

  function currentLineComplete() {
    return charIndex >= lines[lineIndex].length;
  }

  // chiamato ogni frame con deltaTime in secondi
  function update(dt) {
    if (!isOpen() || !typing) return;
    typeTimer += dt;
    const charsToShow = Math.floor(typeTimer * TYPE_SPEED);
    if (charsToShow > charIndex) {
      charIndex = Math.min(charsToShow, lines[lineIndex].length);
      textEl.textContent = lines[lineIndex].slice(0, charIndex);
      if (currentLineComplete()) {
        typing = false;
        hintEl.textContent = (lineIndex < lines.length - 1) ? '▼ E per continuare' : '▼ E per chiudere';
      }
    }
  }

  // chiamato quando il giocatore preme il tasto interazione
  function advance() {
    if (!isOpen()) return;
    if (typing) {
      // salta subito a fine riga
      charIndex = lines[lineIndex].length;
      textEl.textContent = lines[lineIndex];
      typing = false;
      hintEl.textContent = (lineIndex < lines.length - 1) ? '▼ E per continuare' : '▼ E per chiudere';
      return;
    }
    lineIndex++;
    if (lineIndex >= lines.length) {
      close();
      return;
    }
    charIndex = 0;
    typeTimer = 0;
    typing = true;
    textEl.textContent = '';
    hintEl.textContent = '';
  }

  function close() {
    el.classList.add('hidden');
    const cb = onCloseCb;
    onCloseCb = null;
    if (cb) cb();
  }

  return { start, advance, update, isOpen, close };
})();
