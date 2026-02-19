(() => {
  "use strict";

  // Values
  // -1 = empty, 0 = moon, 1 = sun
  const EMPTY = -1;
  const MOON = 0;
  const SUN = 1;

  const DIFFICULTY = {
    easy: { givens: 22 },
    medium: { givens: 16 },
    hard: { givens: 12 },
  };

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function cloneGrid(grid) {
    return grid.map((row) => row.slice());
  }

  function createEmptyGrid(n = 6) {
    return Array.from({ length: n }, () => Array.from({ length: n }, () => EMPTY));
  }

  function inBounds(n, r, c) {
    return r >= 0 && r < n && c >= 0 && c < n;
  }

  // ---------- RULE CHECKS (NO uniqueness rule) ----------

  function violatesNoTriples(line) {
    // line: array of -1/0/1
    for (let i = 0; i + 2 < line.length; i++) {
      const a = line[i], b = line[i + 1], c = line[i + 2];
      if (a !== EMPTY && a === b && b === c) return true;
    }
    return false;
  }

  function countVal(line, v) {
    let k = 0;
    for (const x of line) if (x === v) k++;
    return k;
  }

  function violatesHalfRule(line) {
    const n = line.length;
    const half = n / 2;
    const suns = countVal(line, SUN);
    const moons = countVal(line, MOON);
    if (suns > half || moons > half) return true;
    // If complete, must be exactly half
    if (!line.includes(EMPTY) && (suns !== half || moons !== half)) return true;
    return false;
  }

  function getRow(grid, r) {
    return grid[r];
  }

  function getCol(grid, c) {
    const n = grid.length;
    const col = new Array(n);
    for (let r = 0; r < n; r++) col[r] = grid[r][c];
    return col;
  }

  // adjacency constraints: h[r][c] between (r,c) and (r,c+1), v[r][c] between (r,c) and (r+1,c)
  // value: null | "eq" | "neq"
  function violatesAdjacency(grid, h, v) {
    const n = grid.length;

    // horizontal
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n - 1; c++) {
        const con = h[r][c];
        if (!con) continue;
        const a = grid[r][c];
        const b = grid[r][c + 1];
        if (a === EMPTY || b === EMPTY) continue;
        if (con === "eq" && a !== b) return true;
        if (con === "neq" && a === b) return true;
      }
    }

    // vertical
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n; c++) {
        const con = v[r][c];
        if (!con) continue;
        const a = grid[r][c];
        const b = grid[r + 1][c];
        if (a === EMPTY || b === EMPTY) continue;
        if (con === "eq" && a !== b) return true;
        if (con === "neq" && a === b) return true;
      }
    }

    return false;
  }

  function isGridValid(grid, h, v) {
    const n = grid.length;

    if (violatesAdjacency(grid, h, v)) return false;

    for (let r = 0; r < n; r++) {
      const row = getRow(grid, r);
      if (violatesNoTriples(row) || violatesHalfRule(row)) return false;
    }
    for (let c = 0; c < n; c++) {
      const col = getCol(grid, c);
      if (violatesNoTriples(col) || violatesHalfRule(col)) return false;
    }
    return true;
  }

  function isSolved(grid, h, v) {
    if (!isGridValid(grid, h, v)) return false;
    for (const row of grid) if (row.includes(EMPTY)) return false;
    return true;
  }

  // ---------- SOLVER (backtracking + simple propagation) ----------

  function candidatesForCell(grid, h, v, r, c) {
    const cur = grid[r][c];
    if (cur !== EMPTY) return [];

    const opts = [SUN, MOON];
    const out = [];

    for (const val of opts) {
      grid[r][c] = val;
      if (isGridValid(grid, h, v)) out.push(val);
      grid[r][c] = EMPTY;
    }
    return out;
  }

  function findBestEmptyCell(grid, h, v) {
    const n = grid.length;
    let best = null;
    let bestOpts = null;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] !== EMPTY) continue;
        const opts = candidatesForCell(grid, h, v, r, c);
        if (opts.length === 0) return { r, c, opts };
        if (!best || opts.length < bestOpts.length) {
          best = { r, c };
          bestOpts = opts;
          if (opts.length === 1) return { r, c, opts };
        }
      }
    }
    if (!best) return null;
    return { r: best.r, c: best.c, opts: bestOpts };
  }

  function solveOne(grid, h, v) {
    // Returns solved grid or null (does not mutate input)
    const work = cloneGrid(grid);

    function dfs() {
      if (!isGridValid(work, h, v)) return false;
      const pick = findBestEmptyCell(work, h, v);
      if (!pick) return true; // no empties

      const { r, c, opts } = pick;
      // Randomize to generate varied solutions
      shuffle(opts);

      for (const val of opts) {
        work[r][c] = val;
        if (dfs()) return true;
        work[r][c] = EMPTY;
      }
      return false;
    }

    const ok = dfs();
    return ok ? work : null;
  }

  // ---------- CONSTRAINT GENERATION (optional, light) ----------
  function emptyH(n) {
    return Array.from({ length: n }, () => Array.from({ length: n - 1 }, () => null));
  }
  function emptyV(n) {
    return Array.from({ length: n - 1 }, () => Array.from({ length: n }, () => null));
  }

  function generateConstraintsFromSolution(sol, density = 0.22) {
    // density: how many adjacency constraints to include (0..1)
    const n = sol.length;
    const h = emptyH(n);
    const v = emptyV(n);

    // Collect all adjacency edges
    const edges = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) edges.push(["h", r, c]);
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) edges.push(["v", r, c]);

    shuffle(edges);

    const target = Math.floor(edges.length * density);
    for (let i = 0; i < target; i++) {
      const [t, r, c] = edges[i];
      if (t === "h") {
        const a = sol[r][c], b = sol[r][c + 1];
        h[r][c] = (a === b) ? "eq" : "neq";
      } else {
        const a = sol[r][c], b = sol[r + 1][c];
        v[r][c] = (a === b) ? "eq" : "neq";
      }
    }

    return { h, v };
  }

  // ---------- PUZZLE GENERATION ----------
  function generateSolution6() {
    const n = 6;
    // start empty; solve with random choices
    const blank = createEmptyGrid(n);
    // no constraints at solution-gen stage (we'll derive them after)
    const h = emptyH(n);
    const v = emptyV(n);

    // Try a few times (randomness)
    for (let i = 0; i < 200; i++) {
      const sol = solveOne(blank, h, v);
      if (sol) return sol;
    }
    throw new Error("Failed to generate solution after many attempts.");
  }

  function makePuzzleFromSolution(sol, difficultyKey) {
    const n = sol.length;
    const diff = DIFFICULTY[difficultyKey] || DIFFICULTY.medium;

    // Derive constraints (light)
    const density = difficultyKey === "easy" ? 0.26 : difficultyKey === "hard" ? 0.18 : 0.22;
    const { h, v } = generateConstraintsFromSolution(sol, density);

    // Start with full givens, then remove down to target
    let puzzle = cloneGrid(sol);
    const givenMask = Array.from({ length: n }, () => Array.from({ length: n }, () => true));

    // cells to potentially clear
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c]);
    shuffle(cells);

    const targetGivens = diff.givens;

    for (const [r, c] of cells) {
      // stop if at target
      const currentGivens = givenMask.flat().filter(Boolean).length;
      if (currentGivens <= targetGivens) break;

      // try removing
      const old = puzzle[r][c];
      puzzle[r][c] = EMPTY;
      givenMask[r][c] = false;

      // quick solvability check (not uniqueness): can we still solve?
      const test = solveOne(puzzle, h, v);
      if (!test) {
        // revert
        puzzle[r][c] = old;
        givenMask[r][c] = true;
      }
    }

    return { puzzle, solution: sol, h, v, givenMask };
  }

  function generatePuzzle(difficultyKey = "medium") {
    const solution = generateSolution6();
    return makePuzzleFromSolution(solution, difficultyKey);
  }

  // Expose engine
  window.TangoEngine = {
    EMPTY,
    MOON,
    SUN,
    generatePuzzle,
    solveOne,
    isGridValid,
    isSolved,
  };
})();
