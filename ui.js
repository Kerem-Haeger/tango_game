(() => {
  "use strict";

  const {
    EMPTY, MOON, SUN,
    generatePuzzle,
    isGridValid,
    isSolved
  } = window.TangoEngine;

    const boardEl = document.getElementById("board");
    const timerEl = document.getElementById("timer");
    const statusEl = document.getElementById("status");

    const newBtn = document.getElementById("newPuzzle");
    const hintBtn = document.getElementById("hint");
    const undoBtn = document.getElementById("undo");
    const diffSel = document.getElementById("difficulty");

    const winOverlay = document.getElementById("winOverlay");
    const winTimeEl = document.getElementById("winTime");
    const winNewBtn = document.getElementById("winNew");

let gameLocked = false;

  const state = {
    n: 6,
    puzzle: null,
    solution: null,
    h: null,
    v: null,
    givenMask: null,
    // undo stack of moves: {r,c,prev,next}
    undo: [],
    // timer
    seconds: 0,
    timerId: null,
    running: false,
  };

  function showWin() {
  gameLocked = true;
  stopTimer();

  const m = Math.floor(state.seconds / 60);
  const s = state.seconds % 60;
  winTimeEl.textContent = `Time: ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  winOverlay.classList.remove("hidden");
}

function hideWin() {
  gameLocked = false;
  winOverlay.classList.add("hidden");
}


  function getBoardMetrics() {
  // Reads --cell and --gap from CSS
  const styles = getComputedStyle(boardEl);
  const cell = parseFloat(styles.getPropertyValue("--cell"));
  const gap = parseFloat(styles.getPropertyValue("--gap"));
  const pad = 12; // matches .board padding in CSS (12px)
  return { cell, gap, pad };
}

function addConstraintMarker(x, y, type) {
  const el = document.createElement("div");
  el.className = `constraint ${type}`;
  el.textContent = type === "eq" ? "=" : "×";
  el.style.left = `${x - 11}px`; // center (22px marker)
  el.style.top = `${y - 11}px`;
  boardEl.appendChild(el);
}

let validationTimer = null;

function scheduleValidation() {
  if (validationTimer) clearTimeout(validationTimer);
  validationTimer = setTimeout(() => {
    markInvalids();
    checkWin();
  }, 1000);
}


function renderConstraints() {
  const n = state.n;
  const { cell, gap, pad } = getBoardMetrics();

  // Horizontal constraints (between c and c+1)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n - 1; c++) {
      const con = state.h?.[r]?.[c];
      if (!con) continue;

      // center point between two cells
      const x =
        pad + c * (cell + gap) + cell + gap / 2;
      const y =
        pad + r * (cell + gap) + cell / 2;

      addConstraintMarker(x, y, con);
    }
  }

  // Vertical constraints (between r and r+1)
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n; c++) {
      const con = state.v?.[r]?.[c];
      if (!con) continue;

      const x =
        pad + c * (cell + gap) + cell / 2;
      const y =
        pad + r * (cell + gap) + cell + gap / 2;

      addConstraintMarker(x, y, con);
    }
  }
}


  function pad2(x) {
    return String(x).padStart(2, "0");
  }

  function setStatus(text) {
    statusEl.textContent = text || "";
  }

  function setTimerText() {
    const m = Math.floor(state.seconds / 60);
    const s = state.seconds % 60;
    timerEl.textContent = `${pad2(m)}:${pad2(s)}`;
  }

  function startTimer() {
    stopTimer();
    state.running = true;
    state.timerId = setInterval(() => {
      state.seconds++;
      setTimerText();
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
    state.running = false;
  }

  function resetTimer() {
    state.seconds = 0;
    setTimerText();
  }

  function renderSymbol(cellEl, val) {
  cellEl.innerHTML = "";

  if (val === EMPTY) return;

  const s = document.createElement("div");
  s.className = "symbol " + (val === SUN ? "sun" : "moon");
  cellEl.appendChild(s);
}

  function nextCycle(val) {
    // 1 click = sun, 2 clicks = moon, 3 clicks = clear
    if (val === EMPTY) return SUN;
    if (val === SUN) return MOON;
    return EMPTY;
  }

  function render() {
    const n = state.n;
    boardEl.innerHTML = "";

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);

        if (state.givenMask?.[r]?.[c]) cell.classList.add("given");

        renderSymbol(cell, state.puzzle[r][c]);
        boardEl.appendChild(cell);
      }
    }

    // mark invalid cells lightly (optional, but helps)
    markInvalids();

    undoBtn.disabled = state.undo.length === 0;
  }

  function markInvalids() {
    // Simple: if grid invalid, we mark cells that are non-empty and "suspicious"
    // Keep it minimal: just toggle a global status and avoid complex per-cell blame.
    const ok = isGridValid(state.puzzle, state.h, state.v);
    setStatus(ok ? "" : "Invalid placement");

    // Clear all invalid flags first
    for (const el of boardEl.querySelectorAll(".cell")) el.classList.remove("invalid");
    if (ok) return;

    // Minimal heuristic: mark all non-given filled cells as invalid when invalid.
    // (Keeps UI simple; later you can pinpoint exact violating cells.)
    for (const el of boardEl.querySelectorAll(".cell")) {
      const r = Number(el.dataset.r);
      const c = Number(el.dataset.c);
      if (!state.givenMask[r][c] && state.puzzle[r][c] !== EMPTY) {
        el.classList.add("invalid");
      }
    }
  }

  function checkWin() {
  if (isSolved(state.puzzle, state.h, state.v)) {
    showWin();
  }
}

  function applyMove(r, c, nextVal) {
    const prev = state.puzzle[r][c];
    if (prev === nextVal) return;

    state.puzzle[r][c] = nextVal;
    state.undo.push({ r, c, prev, next: nextVal });

    // update cell text only (fast)
    const cellEl = boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (cellEl) renderSymbol(cellEl, nextVal);

    undoBtn.disabled = state.undo.length === 0;
    scheduleValidation();
  }

  function onCellTap(e) {
    if (gameLocked) return;
    const cell = e.target.closest(".cell");
    if (!cell) return;

    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);

    // can't edit givens
    if (state.givenMask[r][c]) return;

    // start timer on first interaction
    if (!state.running) startTimer();

    const cur = state.puzzle[r][c];
    const next = nextCycle(cur);
    applyMove(r, c, next);
  }

  function undo() {
    if (gameLocked) return;
    const last = state.undo.pop();
    if (!last) return;

    state.puzzle[last.r][last.c] = last.prev;

    const cellEl = boardEl.querySelector(`.cell[data-r="${last.r}"][data-c="${last.c}"]`);
    if (cellEl) renderSymbol(cellEl, last.prev);

    undoBtn.disabled = state.undo.length === 0;
    scheduleValidation();
  }

  function hint() {
    // fill one incorrect/empty non-given cell with correct value
    if (gameLocked) return;
    const n = state.n;

    // start timer on hint (counts as interaction)
    if (!state.running) startTimer();

    // find candidates
    const candidates = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (state.givenMask[r][c]) continue;
        const cur = state.puzzle[r][c];
        const sol = state.solution[r][c];
        if (cur !== sol) candidates.push([r, c]);
      }
    }

    if (candidates.length === 0) {
      setStatus("No hint needed");
      return;
    }

    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    applyMove(r, c, state.solution[r][c]);
    setStatus("Hint applied");
  }

  function newPuzzle() {
    hideWin();
    const diff = diffSel.value;
    const pack = generatePuzzle(diff);

    state.puzzle = pack.puzzle;
    state.solution = pack.solution;
    state.h = pack.h;
    state.v = pack.v;
    state.givenMask = pack.givenMask;
    state.undo = [];

    stopTimer();
    resetTimer();
    setStatus("");

    render();
    renderConstraints();
  }

  // Wire up
  boardEl.addEventListener("click", onCellTap);
  newBtn.addEventListener("click", newPuzzle);
  hintBtn.addEventListener("click", hint);
  undoBtn.addEventListener("click", undo);
  winNewBtn.addEventListener("click", () => {
  newPuzzle();
});

  // Start
  newPuzzle();
})();
