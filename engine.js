(() => {
  "use strict";

  // Values
  // -1 = empty, 0 = moon, 1 = sun
  const EMPTY = -1;
  const MOON = 0;
  const SUN = 1;

  // You can tune these.
  // "givens" here are targets; the logic-solvable constraint is what really governs difficulty.
  const DIFFICULTY = {
    easy:   { givens: 8, edgeDensity: 0.15 },
    medium: { givens: 6, edgeDensity: 0.12 },
    hard:   { givens:  3, edgeDensity: 0.07 },
  };

  // ---------- utils ----------
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

  function emptyH(n) {
    return Array.from({ length: n }, () => Array.from({ length: n - 1 }, () => null));
  }

  function emptyV(n) {
    return Array.from({ length: n - 1 }, () => Array.from({ length: n }, () => null));
  }

  function opposite(v) {
    return v === SUN ? MOON : v === MOON ? SUN : EMPTY;
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

  function setCell(grid, r, c, val) {
    const cur = grid[r][c];
    if (cur === val) return { ok: true, changed: false };
    if (cur !== EMPTY && cur !== val) return { ok: false, changed: false };
    grid[r][c] = val;
    return { ok: true, changed: true };
  }

  // ---------- core rule checks (NO uniqueness rule) ----------
  function violatesNoTriples(line) {
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
    if (!line.includes(EMPTY) && (suns !== half || moons !== half)) return true;
    return false;
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

  // ---------- backtracking solver (used for generating full solutions and safety checks) ----------
  function candidatesForCell(grid, h, v, r, c) {
    if (grid[r][c] !== EMPTY) return [];
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
    const work = cloneGrid(grid);

    function dfs() {
      if (!isGridValid(work, h, v)) return false;
      const pick = findBestEmptyCell(work, h, v);
      if (!pick) return true;

      const { r, c, opts } = pick;
      shuffle(opts);
      for (const val of opts) {
        work[r][c] = val;
        if (dfs()) return true;
        work[r][c] = EMPTY;
      }
      return false;
    }

    return dfs() ? work : null;
  }

  // ---------- LOGIC-ONLY solver (this is the key for "no hints required") ----------
  // Applies only deterministic deductions; no guessing. If it fills everything -> human-solvable (by our rule set).
  function logicSolve(grid, h, v) {
    const work = cloneGrid(grid);
    const n = work.length;

    function applyAdjacency() {
      let changed = false;

      // Horizontal constraints
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n - 1; c++) {
          const con = h[r][c];
          if (!con) continue;
          const a = work[r][c];
          const b = work[r][c + 1];

          if (a !== EMPTY && b === EMPTY) {
            const val = con === "eq" ? a : opposite(a);
            const res = setCell(work, r, c + 1, val);
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          } else if (a === EMPTY && b !== EMPTY) {
            const val = con === "eq" ? b : opposite(b);
            const res = setCell(work, r, c, val);
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
        }
      }

      // Vertical constraints
      for (let r = 0; r < n - 1; r++) {
        for (let c = 0; c < n; c++) {
          const con = v[r][c];
          if (!con) continue;
          const a = work[r][c];
          const b = work[r + 1][c];

          if (a !== EMPTY && b === EMPTY) {
            const val = con === "eq" ? a : opposite(a);
            const res = setCell(work, r + 1, c, val);
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          } else if (a === EMPTY && b !== EMPTY) {
            const val = con === "eq" ? b : opposite(b);
            const res = setCell(work, r, c, val);
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
        }
      }

      return { ok: true, changed };
    }

    function applyNoTriplesLine(getLine, setAt) {
      // Standard Takuzu deductions:
      // 1) If two same adjacent, ends must be opposite:  _ A A _  => B A A B
      // 2) If two same with gap, middle must be opposite: A _ A => A B A
      let changed = false;

      for (let idx = 0; idx < n; idx++) {
        const line = getLine(idx);

        // Pattern A A _ => A A B, and _ A A => B A A
        for (let i = 0; i + 2 < n; i++) {
          const a = line[i], b = line[i + 1], c = line[i + 2];

          // A A _
          if (a !== EMPTY && a === b && c === EMPTY) {
            const res = setAt(idx, i + 2, opposite(a));
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
          // _ A A
          if (a === EMPTY && b !== EMPTY && b === c) {
            const res = setAt(idx, i, opposite(b));
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
          // A _ A
          if (a !== EMPTY && a === c && b === EMPTY) {
            const res = setAt(idx, i + 1, opposite(a));
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
        }
      }

      return { ok: true, changed };
    }

    function applyHalfRuleLine(getLine, setAt) {
      // If a line already has half of SUN/MOON, fill the rest with the opposite.
      let changed = false;
      const half = n / 2;

      for (let idx = 0; idx < n; idx++) {
        const line = getLine(idx);
        const suns = countVal(line, SUN);
        const moons = countVal(line, MOON);

        if (suns === half) {
          for (let i = 0; i < n; i++) {
            if (line[i] === EMPTY) {
              const res = setAt(idx, i, MOON);
              if (!res.ok) return { ok: false };
              changed ||= res.changed;
            }
          }
        } else if (moons === half) {
          for (let i = 0; i < n; i++) {
            if (line[i] === EMPTY) {
              const res = setAt(idx, i, SUN);
              if (!res.ok) return { ok: false };
              changed ||= res.changed;
            }
          }
        }
      }

      return { ok: true, changed };
    }

    function applyEndPairsHeuristic(getLine, setAt) {
      // This matches your examples and helps “human-feel”:
      // If ends are the same: A _ _ _ _ A  => neighbors must be opposite: A B _ _ B A
      // Also: A _ _ _ A _ => last must be B (because line needs 3/3 and triples pressure)
      // We keep this conservative: only apply when it’s forced by standard constraints.
      let changed = false;

      for (let idx = 0; idx < n; idx++) {
        const line = getLine(idx);
        const first = line[0];
        const last = line[n - 1];

        if (first !== EMPTY && last !== EMPTY && first === last) {
          // neighbors forced opposite to avoid triples and satisfy balance tendencies
          if (line[1] === EMPTY) {
            const res = setAt(idx, 1, opposite(first));
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
          if (line[n - 2] === EMPTY) {
            const res = setAt(idx, n - 2, opposite(first));
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
        }

        // Case: first and (n-2) are same and last empty -> last often forced opposite
        // (Your "M _ _ _ M _" example). We only set if it cannot be the same without breaking validity.
        const pen = line[n - 2];
        if (first !== EMPTY && pen !== EMPTY && first === pen && line[n - 1] === EMPTY) {
          // Try setting last = first; if invalid, force opposite.
          const trial = line.slice();
          trial[n - 1] = first;
          if (violatesNoTriples(trial) || violatesHalfRule(trial)) {
            const res = setAt(idx, n - 1, opposite(first));
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
        }

        // symmetric: last and index 1 same and first empty
        const second = line[1];
        if (last !== EMPTY && second !== EMPTY && last === second && line[0] === EMPTY) {
          const trial = line.slice();
          trial[0] = last;
          if (violatesNoTriples(trial) || violatesHalfRule(trial)) {
            const res = setAt(idx, 0, opposite(last));
            if (!res.ok) return { ok: false };
            changed ||= res.changed;
          }
        }
      }

      return { ok: true, changed };
    }

    function applyAllOnce() {
      let anyChanged = false;

      // 1) adjacency constraints
      const a = applyAdjacency();
      if (!a.ok) return { ok: false };
      anyChanged ||= a.changed;

      // 2) row/col no-triples patterns
      const r1 = applyNoTriplesLine(
        (r) => getRow(work, r),
        (r, c, val) => setCell(work, r, c, val)
      );
      if (!r1.ok) return { ok: false };
      anyChanged ||= r1.changed;

      const c1 = applyNoTriplesLine(
        (c) => getCol(work, c),
        (c, r, val) => setCell(work, r, c, val) // note swapped
      );
      if (!c1.ok) return { ok: false };
      anyChanged ||= c1.changed;

      // 3) half rule fills
      const r2 = applyHalfRuleLine(
        (r) => getRow(work, r),
        (r, c, val) => setCell(work, r, c, val)
      );
      if (!r2.ok) return { ok: false };
      anyChanged ||= r2.changed;

      const c2 = applyHalfRuleLine(
        (c) => getCol(work, c),
        (c, r, val) => setCell(work, r, c, val)
      );
      if (!c2.ok) return { ok: false };
      anyChanged ||= c2.changed;

      // 4) small end-pair heuristics (helps match Tango “feel”)
      const r3 = applyEndPairsHeuristic(
        (r) => getRow(work, r),
        (r, c, val) => setCell(work, r, c, val)
      );
      if (!r3.ok) return { ok: false };
      anyChanged ||= r3.changed;

      const c3 = applyEndPairsHeuristic(
        (c) => getCol(work, c),
        (c, r, val) => setCell(work, r, c, val)
      );
      if (!c3.ok) return { ok: false };
      anyChanged ||= c3.changed;

      // Always keep validity in check
      if (!isGridValid(work, h, v)) return { ok: false };

      return { ok: true, changed: anyChanged };
    }

    // Iterate until stuck
    for (let iter = 0; iter < 500; iter++) {
      const step = applyAllOnce();
      if (!step.ok) return { ok: false, grid: work, stuck: true };
      if (!step.changed) break;
    }

    return { ok: true, grid: work, stuck: work.flat().includes(EMPTY) };
  }

  function logicSolvesCompletely(puzzle, solution, h, v) {
    const res = logicSolve(puzzle, h, v);
    if (!res.ok) return false;
    if (res.grid.flat().includes(EMPTY)) return false;

    // Must match our generated solution (since we build from it)
    const n = solution.length;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (res.grid[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }

  // ---------- constraint generation with "connected feel" ----------
  function allEdges(n) {
    // edges represented as {t:"h"/"v", r, c}
    const edges = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) edges.push({ t: "h", r, c });
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) edges.push({ t: "v", r, c });
    return edges;
  }

  function edgeNeighbors(e, n) {
    // Two edges are "neighbors" if they touch a common cell.
    const touches = [];
    if (e.t === "h") {
      touches.push([e.r, e.c], [e.r, e.c + 1]);
    } else {
      touches.push([e.r, e.c], [e.r + 1, e.c]);
    }

    const neigh = [];

    for (const [rr, cc] of touches) {
      // edges around that cell
      if (cc - 1 >= 0) neigh.push({ t: "h", r: rr, c: cc - 1 });
      if (cc < n - 1) neigh.push({ t: "h", r: rr, c: cc });
      if (rr - 1 >= 0) neigh.push({ t: "v", r: rr - 1, c: cc });
      if (rr < n - 1) neigh.push({ t: "v", r: rr, c: cc });
    }

    // filter within bounds for each type
    const out = [];
    const seen = new Set();
    for (const x of neigh) {
      if (x.t === "h") {
        if (x.r < 0 || x.r >= n || x.c < 0 || x.c >= n - 1) continue;
      } else {
        if (x.r < 0 || x.r >= n - 1 || x.c < 0 || x.c >= n) continue;
      }
      const k = `${x.t}:${x.r}:${x.c}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  }

  function chooseConnectedEdges(n, targetCount) {
    const edges = allEdges(n);
    const byKey = new Map();
    for (const e of edges) byKey.set(`${e.t}:${e.r}:${e.c}`, e);

    // Start from a random seed edge, then grow a frontier (random walk / expansion)
    const seed = edges[randInt(edges.length)];
    const chosen = new Set([`${seed.t}:${seed.r}:${seed.c}`]);
    let frontier = edgeNeighbors(seed, n);

    while (chosen.size < targetCount && frontier.length > 0) {
      // Pick a frontier edge, bias slightly toward continuing connected growth
      const pickIdx = randInt(frontier.length);
      const e = frontier[pickIdx];
      frontier.splice(pickIdx, 1);

      const k = `${e.t}:${e.r}:${e.c}`;
      if (chosen.has(k)) continue;
      chosen.add(k);

      // add its neighbors into frontier
      const neigh = edgeNeighbors(e, n);
      for (const nn of neigh) {
        const kk = `${nn.t}:${nn.r}:${nn.c}`;
        if (!chosen.has(kk)) frontier.push(nn);
      }

      // Occasionally reshuffle frontier so it doesn't become too line-like
      if (frontier.length > 10 && Math.random() < 0.25) shuffle(frontier);
    }

    // If we couldn't reach target (shouldn't happen often), top up randomly
    if (chosen.size < targetCount) {
      shuffle(edges);
      for (const e of edges) {
        if (chosen.size >= targetCount) break;
        chosen.add(`${e.t}:${e.r}:${e.c}`);
      }
    }

    // Convert back to edge objects
    const out = [];
    for (const k of chosen) out.push(byKey.get(k));
    return out;
  }

  function generateConstraintsFromSolution(sol, density) {
    const n = sol.length;
    const h = emptyH(n);
    const v = emptyV(n);

    const totalEdges = (n * (n - 1)) + ((n - 1) * n);
    const target = Math.max(6, Math.floor(totalEdges * density));

    const selected = chooseConnectedEdges(n, target);

    for (const e of selected) {
      if (e.t === "h") {
        const a = sol[e.r][e.c], b = sol[e.r][e.c + 1];
        h[e.r][e.c] = (a === b) ? "eq" : "neq";
      } else {
        const a = sol[e.r][e.c], b = sol[e.r + 1][e.c];
        v[e.r][e.c] = (a === b) ? "eq" : "neq";
      }
    }

    return { h, v };
  }

  // ---------- puzzle generation ----------
  function generateSolution6() {
    const n = 6;
    const blank = createEmptyGrid(n);
    const h = emptyH(n);
    const v = emptyV(n);

    for (let i = 0; i < 400; i++) {
      const sol = solveOne(blank, h, v);
      if (sol) return sol;
    }
    throw new Error("Failed to generate solution after many attempts.");
  }

  function makePuzzleFromSolution(sol, difficultyKey) {
    const n = sol.length;
    const diff = DIFFICULTY[difficultyKey] || DIFFICULTY.medium;

    // Build a connected constraint set (this is what makes sparse givens playable)
    const { h, v } = generateConstraintsFromSolution(sol, diff.edgeDensity);

    // Start with full givens, remove only if logic solver can still complete to the same solution.
    let puzzle = cloneGrid(sol);
    const givenMask = Array.from({ length: n }, () => Array.from({ length: n }, () => true));

    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c]);
    shuffle(cells);

    const targetGivens = diff.givens;

    // Removal loop (logic-solvable gating)
    for (const [r, c] of cells) {
      const currentGivens = givenMask.flat().filter(Boolean).length;
      if (currentGivens <= targetGivens) break;

      const old = puzzle[r][c];
      puzzle[r][c] = EMPTY;
      givenMask[r][c] = false;

      // Must remain logically solvable (no guessing)
      if (!logicSolvesCompletely(puzzle, sol, h, v)) {
        puzzle[r][c] = old;
        givenMask[r][c] = true;
      }
    }

    // Safety: ensure at least solvable by full solver (should be true if logic solved)
    const safety = solveOne(puzzle, h, v);
    if (!safety) {
      // Extremely unlikely; fall back to fewer removals by returning a slightly easier puzzle
      // (Still better than shipping an unsolvable board.)
      return {
        puzzle: cloneGrid(sol),
        solution: sol,
        h,
        v,
        givenMask: Array.from({ length: n }, () => Array.from({ length: n }, () => true)),
      };
    }

    return { puzzle, solution: sol, h, v, givenMask };
  }

  function generatePuzzle(difficultyKey = "medium") {
    // Try multiple times to find a good-quality puzzle meeting the logic gate.
    for (let attempt = 0; attempt < 80; attempt++) {
      const solution = generateSolution6();
      const pack = makePuzzleFromSolution(solution, difficultyKey);

      // Ensure the final puzzle is logically solvable (our main guarantee)
      if (logicSolvesCompletely(pack.puzzle, pack.solution, pack.h, pack.v)) {
        return pack;
      }
    }

    // Fallback: medium if hard is too strict on randomness, etc.
    if (difficultyKey !== "medium") return generatePuzzle("medium");
    throw new Error("Could not generate a logic-solvable puzzle after many attempts.");
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
    // (Optional) handy for debugging, remove if you want:
    // logicSolve,
  };
})();
