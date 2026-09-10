const SUPABASE_URL = "https://yaauwnvcjjetdybeixfr.supabase.co";
const SUPABASE_KEY = "sb_publishable_POH2JdWG0JMCzEkt9lhrPg_SmLG0Y1I";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const symbols = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔" };
const chess = new Chess();
const $ = (id) => document.getElementById(id);

let currentPuzzleFilter = "all";

const PUZZLES = [
  // ==================== BEGINNER (1-Move & Simple 2-Move) ====================
  {
    id: "puzzle_1",
    title: "Back-Rank Rook Mate",
    category: "Beginner",
    goal: "White to move: Strike the undefended 8th rank for mate in 1!",
    fen: "6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
    solution: ["b1b8"],
    hint: "Black's King is trapped behind its pawns. Move your Rook from b1 to b8!"
  },
  {
    id: "puzzle_2",
    title: "Scholar's Touch Mate",
    category: "Beginner",
    goal: "White to move: Deliver checkmate on f7!",
    fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
    solution: ["f3f7"],
    hint: "The f7 pawn is defended only by the King. Capture f7 with your Queen!"
  },
  {
    id: "puzzle_3",
    title: "Smothered Knight Strike",
    category: "Beginner",
    goal: "White to move: Deliver a smothered checkmate with your Knight!",
    fen: "6nk/6pp/8/4N3/8/8/5PPP/6K1 w - - 0 1",
    solution: ["e5f7"],
    hint: "Black's King on h8 is boxed in by its own pieces. Jump your Knight from e5 to f7!"
  },
  {
    id: "puzzle_4",
    title: "Rook Back-Rank Takeover",
    category: "Beginner",
    goal: "White to move: Force checkmate on the back rank!",
    fen: "3r2k1/1p3ppp/8/8/8/8/1Q3PPP/3R2K1 w - - 0 1",
    solution: ["d1d8"],
    hint: "Capture Black's Rook on d8 with your Rook on d1 for checkmate!"
  },
  {
    id: "puzzle_5",
    title: "Corridor Rook Mate",
    category: "Beginner",
    goal: "White to move: Strike on c8 for checkmate!",
    fen: "2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1",
    solution: ["c1c8"],
    hint: "Capture the Rook on c8 with your Rook for back-rank checkmate!"
  },
  {
    id: "puzzle_6",
    title: "Trapped King Back-Rank",
    category: "Beginner",
    goal: "White to move: Deliver back-rank mate on f8!",
    fen: "7k/5Rpp/8/8/8/8/6PP/6K1 w - - 0 1",
    solution: ["f7f8"],
    hint: "Slide your Rook from f7 to f8 — Black's King is trapped behind its pawns!"
  },
  {
    id: "puzzle_7",
    title: "Queen Battery Infiltration",
    category: "Beginner",
    goal: "White to move: Bring the Queen into the attack!",
    fen: "r1bq1rk1/pppp1ppp/2n5/4p1N1/2B1P3/3P4/PPP2PPP/R2QK2R w KQ - 0 1",
    solution: ["d1h5"],
    hint: "Move your Queen to h5 to create overwhelming threats against h7 and f7!"
  },
  {
    id: "puzzle_8",
    title: "Back-Rank Queen Infiltration",
    category: "Beginner",
    goal: "White to move: Deliver back-rank mate with your Queen!",
    fen: "4r1k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1",
    solution: ["e1e8"],
    hint: "Infiltrate Black's 8th rank! Push your Queen from e1 to e8 for checkmate."
  },

  // ==================== INTERMEDIATE (Tactical Forks, Pins, Discoveries) ====================
  {
    id: "puzzle_9",
    title: "Royal Knight Fork",
    category: "Intermediate",
    goal: "White to move: Fork Black's King and Queen!",
    fen: "r3k2r/ppp2p1p/8/3q4/4N3/8/PPPP1PPP/R3K2R w KQkq - 0 1",
    solution: ["e4f6"],
    hint: "Jump your Knight to f6 to check the King and attack the d5 Queen. The usual g-pawn capture is not available!"
  },
  {
    id: "puzzle_10",
    title: "Winning the Loose Queen",
    category: "Intermediate",
    goal: "White to move: Capture Black's undefended Queen!",
    fen: "r1b1k2r/pppp1ppp/8/4n3/4Pq2/2P5/PPP2PPP/R1BQK2R w KQkq - 0 1",
    solution: ["c1f4"],
    hint: "Use your dark-squared Bishop on c1 to capture the exposed Black Queen on f4!"
  },
  {
    id: "puzzle_11",
    title: "Queen Takes Undefended Bishop",
    category: "Intermediate",
    goal: "White to move: Win material by taking the loose piece!",
    fen: "r4rk1/pp3ppp/3bpn2/8/8/2N2N2/PPP2PPP/3QR1K1 w - - 0 1",
    solution: ["d1d6"],
    hint: "Black left the Bishop on d6 undefended. Snatch it with your Queen!"
  },
  {
    id: "puzzle_12",
    title: "Queen-Bishop Mate",
    category: "Intermediate",
    goal: "White to move: Use the Bishop battery to deliver mate!",
    fen: "6k1/5ppp/8/7Q/2B5/8/5PPP/6K1 w - - 0 1",
    solution: ["h5f7"],
    hint: "Your Bishop on c4 protects f7. Capture on f7 with your Queen for checkmate!"
  },
  {
    id: "puzzle_13",
    title: "Rook Capture Win",
    category: "Intermediate",
    goal: "White to move: Win Black's hanging Rook!",
    fen: "8/8/8/8/8/r5k1/8/R6K w - - 0 1",
    solution: ["a1a3"],
    hint: "Capture Black's undefended Rook on a3 with your Rook on a1!"
  },
  {
    id: "puzzle_14",
    title: "Knight Fork on c7",
    category: "Intermediate",
    goal: "White to move: Fork Black's King and Queen!",
    fen: "q3k3/2p2ppp/8/1N6/8/8/5PPP/4K3 w - - 0 1",
    solution: ["b5c7"],
    hint: "Hop your Knight to c7 with check. It attacks the King on e8 and the Queen on a8."
  },
  {
    id: "puzzle_15",
    title: "Winning Pinned Queen",
    category: "Intermediate",
    goal: "White to move: Win the Black Queen on d4!",
    fen: "r1b1k2r/pppp1ppp/8/8/1b1q4/2N5/PPP2PPP/R1BQR1K1 w kq - 0 1",
    solution: ["d1d4"],
    hint: "Capture Black's undefended Queen on d4 directly with your Queen!"
  },
  {
    id: "puzzle_16",
    title: "Central Queen Domination",
    category: "Intermediate",
    goal: "White to move: Centralize your Queen with dual threats!",
    fen: "r1bq1rk1/pppp1ppp/2n5/4P3/1bB1n3/2N2N2/PPP2PPP/R1BQK2R w KQ - 0 1",
    solution: ["d1d5"],
    hint: "Centralize your Queen to d5 to attack the knight on e4 and threaten f7!"
  },

  // ==================== ADVANCED (Multi-Move, Master Attacks & Defenses) ====================
  {
    id: "puzzle_17",
    title: "Anastasia's Mate",
    category: "Advanced",
    goal: "White to move: Use the Knight's cover to deliver checkmate!",
    fen: "6k1/5Np1/8/8/2B5/8/6P1/6KR w - - 0 1",
    solution: ["h1h8"],
    hint: "Send the Rook to h8. The Knight on f7 protects the mating square."
  },
  {
    id: "puzzle_18",
    title: "Back-Rank Rook Exchange Mate",
    category: "Advanced",
    goal: "White to move: Deliver checkmate on the back rank!",
    fen: "4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    solution: ["e1e8"],
    hint: "Take Black's Rook on e8 with checkmate!"
  },
  {
    id: "puzzle_19",
    title: "Kingside Castling & Safety",
    category: "Advanced",
    goal: "White to move: Secure your King and prepare to pin Black's Queen!",
    fen: "r1b1k2r/pp3ppp/2n1p3/2b5/4q3/2P2N2/PP2BPPP/R1BQK2R w KQkq - 0 1",
    solution: ["e1g1"],
    hint: "Castle your King to safety on g1, opening up the e-file for Re1!"
  },
  {
    id: "puzzle_20",
    title: "Bishop Development & Control",
    category: "Advanced",
    goal: "White to move: Develop your Bishop to control key diagonal squares!",
    fen: "4kb1r/p2n1ppp/4p3/8/3P4/8/PPP2PPP/R1B1K1NR w KQk - 0 1",
    solution: ["c1f4"],
    hint: "Bring your dark-squared Bishop to f4 to restrict Black's movement!"
  },
  {
    id: "puzzle_21",
    title: "Rook Back-Rank Exchange Mate",
    category: "Advanced",
    goal: "White to move: Capture Black's Rook on d8 for checkmate!",
    fen: "3r2k1/5ppp/8/8/8/8/1Q3PPP/3R2K1 w - - 0 1",
    solution: ["d1d8"],
    hint: "Your Rook on d1 can capture Black's Rook on d8 directly for back-rank checkmate!"
  },
  {
    id: "puzzle_22",
    title: "Pawn Promotion Queen",
    category: "Advanced",
    goal: "White to move: Promote your passed pawn to a Queen!",
    fen: "8/4P3/8/8/8/8/pk6/R3K3 w - - 0 1",
    solution: ["e7e8"],
    hint: "Push your e7 pawn to e8 to promote to a Queen and win!"
  },
  {
    id: "puzzle_23",
    title: "Queen Back-Rank Infiltration",
    category: "Advanced",
    goal: "White to move: Infiltrate e8 with your Queen for checkmate!",
    fen: "6k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1",
    solution: ["e2e8"],
    hint: "Fly your Queen from e2 to e8 to deliver checkmate!"
  },
  {
    id: "puzzle_24",
    title: "Rook Exchange Mate Finale",
    category: "Advanced",
    goal: "White to move: Capture on b8 for back-rank checkmate!",
    fen: "1r4k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
    solution: ["b1b8"],
    hint: "Capture Black's Rook on b8 with your Rook on b1 to finish the game with checkmate!"
  }
];

const board = $("board"), status = $("status"), error = $("roomError");
const start = $("startScreen"), playerMode = $("playerModeScreen"), computer = $("computerScreen"), timed = $("timedScreen"), dailyPuzzleScreen = $("dailyPuzzleScreen"), puzzleScreen = $("puzzleScreen"), room = $("roomScreen"), lobby = $("lobbyScreen"), game = $("gameScreen");
const codeDisplay = $("roomCodeDisplay"), connection = $("connectionStatus"), lobbyError = $("lobbyError"), lobbyPlayers = $("lobbyPlayers"), startPrivate = $("startPrivateBtn"), undo = $("undoBtn");
const moveHistoryBody = $("moveHistoryBody"), replayBtn = $("replayBtn");
const reviewPanel = $("reviewPanel"), reviewSummary = $("reviewSummary"), reviewControls = $("reviewControls"), reviewStep = $("reviewStep"), alternativeMoves = $("alternativeMoves");
const reviewStartBtn = $("reviewStartBtn"), reviewPrevBtn = $("reviewPrevBtn"), reviewNextBtn = $("reviewNextBtn"), reviewEndBtn = $("reviewEndBtn");
const roomLinkInput = $("roomLinkInput"), copyRoomLinkBtn = $("copyRoomLinkBtn"), copyStatus = $("copyStatus"), shareRoom = $("shareRoom");
const topClock = $("topClock"), bottomClock = $("bottomClock");

const files = ["a", "b", "c", "d", "e", "f", "g", "h"], ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

let selected = null, lastMove = null, moveHistory = [], replaying = false, replayBoardFlipped = false;
let reviewMode = false, reviewMoves = [], reviewPly = 0, reviewLiveFen = null, reviewLiveLastMove = null, reviewSummaryText = "", reviewVariationText = "";
let channel = null, privateRoom = false, computerMode = false, timedMode = false, puzzleMode = false, thinking = false;
let difficulty = "medium", selectedTimeControl = "5+0", color = null, host = false, started = false;
let undoStack = []; // Unlimited undo move stack
let modalShownForGame = false;
let showMoveHints = localStorage.getItem("chess_show_move_hints") !== "false";

let currentPuzzleIndex = 0, currentPuzzleStep = 0;
let currentPuzzlePage = "practice";
let solvedPuzzles = JSON.parse(localStorage.getItem("chess_solved_puzzles") || "[]");

let clockIncrement = 0, clockMs = { w: 300000, b: 300000 }, clockTimer = null, clockLastTick = 0, clockExpired = false;
const id = crypto.randomUUID();
const ACTIVE_SCREEN_KEY = "chess_active_screen";
const GAME_STATE_KEY = "chess_game_state";

function show(screen) {
  [start, playerMode, computer, timed, dailyPuzzleScreen, puzzleScreen, room, lobby, game].forEach((item) => item.classList.add("hidden"));
  screen.classList.remove("hidden");
  saveAppState(screen.id);
}

function showToast(message) {
  const existing = document.querySelector(".toast-message");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ==================== APP STATE PERSISTENCE ====================
const LOCAL_STORAGE_KEY = "chess_app_state";

function saveAppState(gameId = "default") {
  try {
    const payload = {
      gameId: gameId,
      fen: chess.fen(),
      turn: chess.turn(),
      color: color,
      moveHistory: moveHistory,
      lastMove: lastMove,
      clockMs: clockMs,
      computerMode: computerMode,
      difficulty: difficulty,
      timedMode: timedMode,
      puzzleMode: puzzleMode,
      currentPuzzleIndex: currentPuzzleIndex,
      currentPuzzleStep: currentPuzzleStep,
      currentPuzzlePage: currentPuzzlePage,
      dailyPuzzle: dailyPuzzle,
      activePuzzle: activePuzzle,
      timestamp: Date.now()
    };

    // 1. Save locally to localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));

  } catch (err) {
    console.warn("Could not save app state to storage:", err);
  }
}

function restoreAppState() {
  try {
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!rawData) return false;

    const saved = JSON.parse(rawData);

    // Only restore if the saved state is recent (less than 24 hours old)
    if (Date.now() - saved.timestamp > 86400000) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return false;
    }

    chess.load(saved.fen);
    moveHistory = saved.moveHistory || [];
    lastMove = saved.lastMove || null;
    clockMs = saved.clockMs || clockMs;
    computerMode = saved.computerMode || false;
    difficulty = saved.difficulty || "medium";
    timedMode = saved.timedMode || false;
    color = saved.color || "w";
    currentPuzzleIndex = Number.isInteger(saved.currentPuzzleIndex) ? saved.currentPuzzleIndex : currentPuzzleIndex;
    currentPuzzleStep = Number.isInteger(saved.currentPuzzleStep) ? saved.currentPuzzleStep : currentPuzzleStep;
    currentPuzzlePage = saved.currentPuzzlePage === "daily" ? "daily" : currentPuzzlePage;
    dailyPuzzle = saved.dailyPuzzle || dailyPuzzle;
    activePuzzle = saved.activePuzzle || (currentPuzzleIndex === -1 ? dailyPuzzle : null);

    draw();
    return true;
  } catch (err) {
    console.warn("Failed to restore app state:", err);
    return false;
  }
}

// ==================== UPDATED MOVE HANDLER ====================
function makeMove(moveObj) {
  const movingSide = chess.turn();

  // Save current position state to Undo Stack
  undoStack.push({
    fen: chess.fen(),
    lastMove: lastMove ? { ...lastMove } : null,
    clockMs: { ...clockMs }
  });

  const executedMove = chess.move(moveObj);
  if (!executedMove) return false;

  lastMove = { from: executedMove.from, to: executedMove.to };
  moveHistory.push(executedMove);

  handleClockAfterMove(movingSide);

  if (puzzleMode) {
    verifyPuzzleMove(executedMove);
  } else {
    draw();

    // Explicitly persist app state here
    saveAppState(typeof game !== "undefined" ? game.id : "default");

    if (privateRoom && channel) {
      channel.send({
        type: "broadcast",
        event: "move",
        payload: { move: moveObj, fen: chess.fen(), clockMs }
      });
    }

    if (computerMode && chess.turn() === "b" && !chess.game_over()) {
      setTimeout(computerMove, 300);
    }
  }
  return true;
}
function restoreGameState() {
  const raw = localStorage.getItem(GAME_STATE_KEY);
  if (!raw) return false;

  try {
    const saved = JSON.parse(raw);
    if (!saved || !saved.fen || saved.privateRoom) return false;

    stopClock();
    hideGameOverModal();
    modalShownForGame = false;
    privateRoom = false;
    computerMode = Boolean(saved.computerMode);
    timedMode = Boolean(saved.timedMode);
    puzzleMode = Boolean(saved.puzzleMode);
    thinking = false;
    difficulty = saved.difficulty || difficulty;
    selectedTimeControl = saved.selectedTimeControl || selectedTimeControl;
    color = saved.color || null;
    clockMs = saved.clockMs || clockMs;
    clockExpired = Boolean(saved.clockExpired);
    lastMove = saved.lastMove || null;
    moveHistory = Array.isArray(saved.moveHistory) ? saved.moveHistory : [];
    undoStack = Array.isArray(saved.undoStack) ? saved.undoStack : [];
    currentPuzzleIndex = Number.isInteger(saved.currentPuzzleIndex) ? saved.currentPuzzleIndex : currentPuzzleIndex;
    currentPuzzleStep = Number.isInteger(saved.currentPuzzleStep) ? saved.currentPuzzleStep : currentPuzzleStep;
    currentPuzzlePage = saved.currentPuzzlePage === "daily" ? "daily" : "practice";
    dailyPuzzle = saved.dailyPuzzle || dailyPuzzle;
    activePuzzle = saved.activePuzzle || (currentPuzzleIndex === -1 ? dailyPuzzle : null);
    selected = null;
    replaying = false;

    if (!chess.load(saved.fen)) return false;

    $("standardControls").classList.toggle("hidden", puzzleMode);
    $("puzzleControls").classList.toggle("hidden", !puzzleMode);
    $("nextPuzzleBtn").classList.add("hidden");

    if (puzzleMode) {
      const puzzle = currentPuzzleIndex === -1 ? dailyPuzzle : PUZZLES[currentPuzzleIndex];
      codeDisplay.textContent = currentPuzzleIndex === -1 ? "DAILY PUZZLE" : `PUZZLE #${currentPuzzleIndex + 1}`;
      connection.textContent = puzzle ? `${currentPuzzleIndex === -1 ? "Daily Challenge" : `Puzzle #${currentPuzzleIndex + 1}`}: ${puzzle.title}` : "Puzzle";
    } else if (computerMode) {
      codeDisplay.textContent = "COMPUTER";
      connection.textContent = timedMode ? `Computer: ${difficulty} (${selectedTimeControl})` : `Computer: ${difficulty}`;
    } else {
      codeDisplay.textContent = "LOCAL";
      connection.textContent = timedMode ? `Pass & Play (${selectedTimeControl})` : "Pass & Play";
    }

    draw();
    show(game);
    if (timedMode && !clockExpired && !chess.game_over()) startClock();
    if (computerMode && chess.turn() === "b" && !chess.game_over() && !clockExpired) computerMove();
    return true;
  } catch (e) {
    localStorage.removeItem(GAME_STATE_KEY);
    return false;
  }
}

function syncMoveHintsToggles() {
  document.querySelectorAll(".move-hints-input").forEach((input) => {
    input.checked = showMoveHints;
    input.onchange = (e) => {
      showMoveHints = e.target.checked;
      localStorage.setItem("chess_show_move_hints", showMoveHints);
      document.querySelectorAll(".move-hints-input").forEach((i) => (i.checked = showMoveHints));
      draw();
    };
  });
}

function showGameOverModal(titleText, messageText) {
  if ($("modalTitle")) $("modalTitle").textContent = titleText;
  if ($("modalMessage")) $("modalMessage").textContent = messageText;
  if ($("modalNewGameBtn")) $("modalNewGameBtn").textContent = puzzleMode ? (currentPuzzleIndex === -1 ? "Replay Daily" : "Next Puzzle") : "New Game";
  if ($("gameOverModal")) $("gameOverModal").classList.remove("hidden");
}

function hideGameOverModal() {
  if ($("gameOverModal")) $("gameOverModal").classList.add("hidden");
}

let dailyPuzzle = null;
let activePuzzle = null;
let dailyTimerInterval = null;
let archivedDailyPuzzles = [];
let dailyArchiveLoaded = false;
const DAILY_PUZZLE_CACHE_KEY = "chess_daily_api_puzzle";
const DAILY_PUZZLE_API = "https://lichess.org/api/puzzle/daily";
const DAILY_PUZZLE_TABLE = "daily_puzzles";
const DAILY_FALLBACKS = [
  {
    id: "generated_daily_rank_pin",
    title: "Daily: Rank Pin",
    category: "Intermediate",
    goal: "White to move: Use the pinned back rank for mate.",
    fen: "6k1/5ppp/8/8/8/8/6PP/4R1K1 w - - 0 1",
    solution: ["e1e8"],
    hint: "The rook can invade the eighth rank."
  },
  {
    id: "generated_daily_corner_net",
    title: "Daily: Corner Net",
    category: "Intermediate",
    goal: "Black to move: Finish the cornered king.",
    fen: "7k/6pp/8/8/8/8/5qPP/6K1 b - - 0 1",
    solution: ["f2e1"],
    hint: "Bring the queen to the first rank."
  },
  {
    id: "generated_daily_queen_lift",
    title: "Daily: Queen Lift",
    category: "Advanced",
    goal: "White to move: Land the queen where the king has no escape.",
    fen: "6k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1",
    solution: ["d1d8"],
    hint: "The open file points straight at the back rank."
  }
];

function buildDailyFallback(todayKey, offset = 0) {
  let hash = 0;
  for (let i = 0; i < todayKey.length; i++) {
    hash = (hash << 5) - hash + todayKey.charCodeAt(i);
    hash |= 0;
  }
  const fallback = DAILY_FALLBACKS[(Math.abs(hash) + offset) % DAILY_FALLBACKS.length];
  return {
    ...fallback,
    id: `fallback_${todayKey}_${fallback.id}`,
    isDaily: true,
    source: "local-fallback",
    date: todayKey
  };
}

function getDailyPuzzle() {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (!dailyPuzzle || dailyPuzzle.date !== todayKey) {
    dailyPuzzle = getCachedDailyPuzzle(todayKey) || buildDailyFallback(todayKey);
    if (dailyPuzzle.source === "lichess-api") {
      saveDailyPuzzleToSupabase(dailyPuzzle);
    }
    fetchOnlineDailyPuzzle(todayKey);
  }
  return dailyPuzzle;
}

function nextUtcMidnightMs() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

function getCachedDailyPuzzle(todayKey) {
  try {
    const cached = JSON.parse(localStorage.getItem(DAILY_PUZZLE_CACHE_KEY) || "null");
    if (
      cached &&
      cached.date === todayKey &&
      cached.expiresAt > Date.now() &&
      cached.puzzle &&
      cached.puzzle.source === "lichess-api"
    ) {
      return {
        ...cached.puzzle,
        solution: normalizeStoredPuzzleSolution(cached.puzzle.fen, cached.puzzle.solution)
      };
    }
  } catch (e) {
    console.log("Daily puzzle cache ignored:", e);
  }
  return null;
}

function cacheDailyPuzzle(puzzle, todayKey) {
  localStorage.setItem(DAILY_PUZZLE_CACHE_KEY, JSON.stringify({
    date: todayKey,
    expiresAt: nextUtcMidnightMs(),
    puzzle
  }));
}

function normalizePuzzleSolution(solution) {
  if (Array.isArray(solution)) return solution.filter((move) => typeof move === "string" && move.trim());
  if (typeof solution === "string") {
    try {
      const parsed = JSON.parse(solution);
      return Array.isArray(parsed) ? parsed.filter((move) => typeof move === "string" && move.trim()) : [];
    } catch (_e) {
      return [];
    }
  }
  return [];
}

function normalizeStoredPuzzleSolution(fen, solution) {
  const moves = normalizePuzzleSolution(solution);
  if (!fen || moves.length < 2) return moves;

  try {
    const position = new Chess();
    if (!position.load(fen)) return moves;
    const firstMove = moves[0];
    const parsedMove = firstMove.length >= 4
      ? position.move({
        from: firstMove.slice(0, 2),
        to: firstMove.slice(2, 4),
        promotion: firstMove[4] || "q"
      })
      : position.move(firstMove);

    if (!parsedMove) {
      const nextMove = moves[1];
      const nextPosition = new Chess();
      if (nextPosition.load(fen)) {
        const nextParsedMove = nextMove.length >= 4
          ? nextPosition.move({
            from: nextMove.slice(0, 2),
            to: nextMove.slice(2, 4),
            promotion: nextMove[4] || "q"
          })
          : nextPosition.move(nextMove);
        if (nextParsedMove) return moves.slice(1);
      }
    }
  } catch (_e) {
    // Keep the stored solution unchanged if it cannot be inspected.
  }

  return moves;
}

function rowToDailyPuzzle(row) {
  return {
    id: row.puzzle_id || `daily_${row.date}`,
    sourcePuzzleId: row.source_puzzle_id,
    title: row.title,
    category: row.category || "Advanced",
    goal: row.goal,
    fen: row.fen,
    solution: normalizeStoredPuzzleSolution(row.fen, row.solution),
    hint: row.hint || "Find the forcing tactical move.",
    rating: row.rating,
    themes: row.themes || [],
    isDaily: true,
    source: row.source || "supabase",
    date: row.date
  };
}

async function saveDailyPuzzleToSupabase(puzzle) {
  if (!puzzle || puzzle.source !== "lichess-api") return;

  try {
    const row = {
      date: puzzle.date,
      puzzle_id: puzzle.id || `lichess_daily_${puzzle.date}`,
      source_puzzle_id: puzzle.sourcePuzzleId || null,
      title: puzzle.title || "Daily Tactical Shot",
      category: puzzle.category || "Advanced",
      goal: puzzle.goal || "Find the best move!",
      fen: puzzle.fen,
      solution: puzzle.solution || [],
      hint: puzzle.hint || null,
      rating: puzzle.rating || null,
      themes: puzzle.themes || [],
      source: "lichess-api",
    };

    const { data, error } = await supabaseClient
      .from("daily_puzzles")
      .upsert([row], { onConflict: "date" })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23505" || error.status === 409 || String(error.message || "").includes("duplicate")) {
        return;
      }
      console.log("Daily puzzle save error:", error.message);
      return;
    }

    if (data) {
      const savedPuzzle = rowToDailyPuzzle(data);
      const viewingArchivedPuzzle = puzzleMode && currentPuzzleIndex === -1 && dailyPuzzle && dailyPuzzle.date !== savedPuzzle.date;
      if (savedPuzzle.date === puzzle.date && !viewingArchivedPuzzle) {
        dailyPuzzle = savedPuzzle;
        cacheDailyPuzzle(savedPuzzle, savedPuzzle.date);
        renderDailyPuzzleBanner();
      }
      dailyArchiveLoaded = false;
      loadArchivedDailyPuzzles();
    }
  } catch (e) {
    console.log("Daily puzzle save failed:", e);
  }
}

async function loadArchivedDailyPuzzles(force = false) {
  const archiveGrid = $("dailyArchiveGrid");
  if (!archiveGrid) return;
  if (dailyArchiveLoaded && !force) {
    renderDailyArchive();
    return;
  }

  archiveGrid.innerHTML = '<p class="daily-archive-empty">Loading saved daily puzzles...</p>';

  try {
    // Purge any previously seeded practice puzzles from daily_puzzles table if permitted
    try {
      await supabaseClient
        .from(DAILY_PUZZLE_TABLE)
        .delete()
        .neq("source", "lichess-api");
    } catch (_cleanupErr) {
      // Silently ignore if client delete policy is not yet executed
    }

    let { data, error } = await supabaseClient
      .from(DAILY_PUZZLE_TABLE)
      .select("date,puzzle_id,source_puzzle_id,title,category,goal,fen,solution,hint,rating,themes,source")
      .eq("source", "lichess-api")
      .order("date", { ascending: false })
      .limit(60);
    if (error) throw error;

    archivedDailyPuzzles = (data || []).map(rowToDailyPuzzle);
    dailyArchiveLoaded = true;
    const todayKey = new Date().toISOString().slice(0, 10);
    const savedToday = archivedDailyPuzzles.find((p) => p.date === todayKey);
    if (savedToday && dailyPuzzle?.source !== "lichess-api") {
      dailyPuzzle = savedToday;
      cacheDailyPuzzle(savedToday, todayKey);
      renderDailyPuzzleBanner();
    }
    renderDailyArchive();
  } catch (e) {
    archiveGrid.innerHTML = '<p class="daily-archive-empty">Daily archive table is not ready yet.</p>';
    console.log("Daily puzzle archive load failed:", e);
  }
}

function renderDailyArchive() {
  const archiveGrid = $("dailyArchiveGrid");
  if (!archiveGrid) return;
  const puzzles = archivedDailyPuzzles;

  if (!puzzles.length) {
    archiveGrid.innerHTML = '<p class="daily-archive-empty">No daily puzzles saved yet.</p>';
    return;
  }

  archiveGrid.innerHTML = "";
  puzzles.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "daily-archive-card";
    const date = document.createElement("span");
    date.className = "daily-archive-date";
    date.textContent = p.date;
    const title = document.createElement("strong");
    title.textContent = p.title;
    const goal = document.createElement("small");
    goal.textContent = p.goal;
    card.append(date, title, goal);
    card.onclick = () => loadCustomPuzzle(p);
    archiveGrid.appendChild(card);
  });
}

function getDailyInitialFen(data) {
  if (data?.puzzle?.fen) return data.puzzle.fen;
  if (data?.game?.fen) return data.game.fen;
  if (!data?.game?.pgn) return null;

  try {
    const tempChess = new Chess();
    const loaded = tempChess.load_pgn(data.game.pgn, { sloppy: true });
    return loaded ? tempChess.fen() : null;
  } catch (e) {
    console.log("Daily puzzle PGN could not be converted to FEN:", e);
    return null;
  }
}

async function fetchOnlineDailyPuzzle(todayKey) {
  try {
    const res = await fetch(DAILY_PUZZLE_API);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.puzzle && data.puzzle.solution && data.game) {
      const p = data.puzzle;
      const initialFen = getDailyInitialFen(data);
      if (!initialFen) return;
      const fullSolution = p.solution;

      let tempChess = new Chess();
      const loaded = tempChess.load(initialFen);
      let playerFen = initialFen;
      let playerSolution = fullSolution;

      if (loaded && fullSolution.length > 1) {
        const setupMoveStr = fullSolution[0];
        let setupMove = null;
        if (setupMoveStr.length >= 4) {
          setupMove = tempChess.move({
            from: setupMoveStr.slice(0, 2),
            to: setupMoveStr.slice(2, 4),
            promotion: setupMoveStr[4] || "q"
          });
        }
        if (!setupMove) {
          setupMove = tempChess.move(setupMoveStr);
        }
        if (setupMove) {
          playerFen = tempChess.fen();
          playerSolution = fullSolution.slice(1);
        }
      }

      const cleanFen = playerFen.split(" ").slice(0, 4).join(" ") + " 0 1";

      const fetchedPuzzle = {
        id: `lichess_daily_${todayKey}_${p.id || "api"}`,
        sourcePuzzleId: p.id,
        title: `Daily: ${p.themes && p.themes[0] ? p.themes[0].replace(/([A-Z])/g, ' $1') : 'Tactical Shot'}`,
        category: "Advanced",
        goal: `${cleanFen.split(" ")[1] === "w" ? "White" : "Black"} to move: Find the best tactical move!`,
        fen: cleanFen,
        solution: playerSolution,
        hint: `Daily puzzle rating: ${p.rating || 1500}. Focus on the strongest tactical forcing move!`,
        rating: p.rating || null,
        themes: p.themes || [],
        isDaily: true,
        source: "lichess-api",
        date: todayKey
      };
      cacheDailyPuzzle(fetchedPuzzle, todayKey);
      const viewingArchivedPuzzle = puzzleMode && currentPuzzleIndex === -1 && dailyPuzzle && dailyPuzzle.date !== todayKey;
      if (!viewingArchivedPuzzle) {
        dailyPuzzle = fetchedPuzzle;
        renderDailyPuzzleBanner();
      }
      saveDailyPuzzleToSupabase(fetchedPuzzle);
    }
  } catch (e) {
    console.log("Using local daily puzzle fallback:", e);
  }
}

function updateDailyTimer() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = tomorrow - now;

  // If the day has rolled over, clear cached daily puzzle to fetch the new 24h puzzle
  const todayKey = now.toISOString().slice(0, 10);
  if (dailyPuzzle && dailyPuzzle.date !== todayKey) {
    dailyPuzzle = null;
    renderDailyPuzzleBanner();
  }

  const hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
  const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
  const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
  const timerEl = $("dailyTimer");
  if (timerEl) {
    timerEl.textContent = `Next in: ${hours}:${mins}:${secs}`;
  }
}

function renderDailyPuzzleBanner() {
  const p = getDailyPuzzle();
  if (!p) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  const isSolved = solvedPuzzles.includes(p.id) || solvedPuzzles.includes(`daily_${todayKey}`);

  $("dailyTitle").textContent = p.title;
  $("dailyDesc").textContent = `${p.goal} (${p.category} tier)`;
  const playBtn = $("playDailyBtn");
  if (playBtn) {
    playBtn.textContent = isSolved ? "Solved! Replay 🎯" : "Play Today's Puzzle 🎯";
    playBtn.onclick = () => loadCustomPuzzle(p);
  }
  loadArchivedDailyPuzzles();
}

function loadCustomPuzzle(puzzle) {
  currentPuzzleIndex = -1;
  currentPuzzleStep = 0;
  currentPuzzlePage = "daily";
  activePuzzle = puzzle;

  stopClock();
  hideGameOverModal();
  modalShownForGame = false;
  privateRoom = false;
  computerMode = false;
  timedMode = false;
  thinking = false;
  clockExpired = false;
  puzzleMode = true;
  color = puzzle.fen.split(" ")[1] || "w";

  $("standardControls").classList.add("hidden");
  $("puzzleControls").classList.remove("hidden");
  $("nextPuzzleBtn").classList.add("hidden");
  $("puzzleListBtn").textContent = "Daily Puzzle";

  codeDisplay.textContent = `⭐ DAILY PUZZLE`;
  connection.textContent = `Daily Challenge: ${puzzle.title}`;

  chess.reset();
  const loaded = chess.load(puzzle.fen);
  if (!loaded) {
    console.error("Daily Puzzle FEN failed to load:", puzzle.fen);
    status.textContent = "Error: daily puzzle could not be loaded.";
  }

  lastMove = null;
  moveHistory = [];
  undoStack = [];
  selected = null;

  draw();
  if (loaded) status.textContent = puzzle.goal;
  show(game);
}

function renderPuzzleGrid() {
  const total = PUZZLES.length;
  const solved = PUZZLES.filter((p) => solvedPuzzles.includes(p.id)).length;
  const beginnerSolved = PUZZLES.filter(p => p.category === "Beginner" && solvedPuzzles.includes(p.id)).length;
  const intermediateSolved = PUZZLES.filter(p => p.category === "Intermediate" && solvedPuzzles.includes(p.id)).length;
  const advancedSolved = PUZZLES.filter(p => p.category === "Advanced" && solvedPuzzles.includes(p.id)).length;

  $("puzzleScoreDisplay").textContent = `Solved: ${solved} / ${total}`;

  // Update tab labels with counts
  document.querySelectorAll(".puzzle-tab").forEach((tab) => {
    const diff = tab.dataset.difficulty;
    if (diff === "all") tab.textContent = `All (${total})`;
    else if (diff === "Beginner") tab.textContent = `Beginner (${beginnerSolved}/8)`;
    else if (diff === "Intermediate") tab.textContent = `Intermediate (${intermediateSolved}/8)`;
    else if (diff === "Advanced") tab.textContent = `Advanced (${advancedSolved}/8)`;

    tab.classList.toggle("active", diff === currentPuzzleFilter);
    tab.onclick = () => {
      currentPuzzleFilter = diff;
      renderPuzzleGrid();
    };
  });

  const grid = $("puzzleGrid");
  grid.innerHTML = "";

  const visiblePuzzles = PUZZLES.map((p, idx) => ({ ...p, originalIndex: idx })).filter(
    (p) => currentPuzzleFilter === "all" || p.category === currentPuzzleFilter
  );

  visiblePuzzles.forEach((p) => {
    const isSolved = solvedPuzzles.includes(p.id);
    const card = document.createElement("div");
    card.className = `puzzle-card ${isSolved ? "solved" : ""}`;
    card.innerHTML = `
      <div>
        <div class="puzzle-card-header">
          <span class="puzzle-badge ${p.category.toLowerCase()}">${p.category}</span>
          ${isSolved ? '<span class="solved-tag">Solved ✓</span>' : ''}
        </div>
        <h3 class="puzzle-card-title">#${p.originalIndex + 1} ${p.title}</h3>
        <p class="puzzle-card-desc">${p.goal}</p>
      </div>
    `;
    card.onclick = () => loadPuzzle(p.originalIndex);
    grid.appendChild(card);
  });
}

function loadPuzzle(idx) {
  currentPuzzleIndex = idx;
  currentPuzzleStep = 0;
  currentPuzzlePage = "practice";
  activePuzzle = null;
  const puzzle = PUZZLES[idx];

  stopClock();
  hideGameOverModal();
  modalShownForGame = false;
  privateRoom = false;
  computerMode = false;
  timedMode = false;
  thinking = false;        // reset so clicks aren't blocked after computer mode
  clockExpired = false;    // reset so clicks aren't blocked after a timed game timeout
  puzzleMode = true;
  color = puzzle.fen.split(" ")[1] || "w";

  $("standardControls").classList.add("hidden");
  $("puzzleControls").classList.remove("hidden");
  $("nextPuzzleBtn").classList.add("hidden");
  $("puzzleListBtn").textContent = "Practice Puzzles";

  codeDisplay.textContent = `PUZZLE #${idx + 1}`;
  connection.textContent = `Puzzle #${idx + 1}: ${puzzle.title}`;

  // Reset board to clean state before loading the custom FEN.
  // chess.load() returns false if the FEN is invalid — we log it and bail.
  chess.reset();
  const loaded = chess.load(puzzle.fen);
  if (!loaded) {
    console.error("Puzzle FEN failed to load:", puzzle.fen);
    status.textContent = "Error: puzzle could not be loaded. Please try another.";
  }

  lastMove = null;
  moveHistory = [];
  undoStack = [];
  selected = null;

  draw();
  if (loaded) status.textContent = puzzle.goal;
  show(game);
}

function setClock(tc) {
  selectedTimeControl = tc;
  if (!tc || tc === "unlimited") {
    timedMode = false;
    clockIncrement = 0;
    clockMs = { w: 0, b: 0 };
    clockExpired = false;
    stopClock();
    return;
  }
  timedMode = true;
  const parts = tc.split("+");
  const mins = Number(parts[0]) || 5;
  const inc = Number(parts[1]) || 0;
  clockIncrement = inc * 1000;
  clockMs = { w: mins * 60000, b: mins * 60000 };
  clockExpired = false;
}

function stopClock() {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

function startClock() {
  stopClock();
  if (!timedMode || clockExpired || chess.game_over() || replaying) return;

  clockLastTick = Date.now();
  clockTimer = setInterval(() => {
    if (replaying || clockExpired || chess.game_over()) return;
    const now = Date.now();
    const delta = now - clockLastTick;
    clockLastTick = now;

    const turn = chess.turn();
    clockMs[turn] -= delta;

    if (clockMs[turn] <= 0) {
      clockMs[turn] = 0;
      clockExpired = true;
      stopClock();
      selected = null;
      const loser = turn === "w" ? "White" : "Black";
      const winner = turn === "w" ? "Black" : "White";
      const msg = `${loser} ran out of time! ${winner} wins.`;
      status.textContent = msg;

      if (privateRoom && channel) {
        channel.send({ type: "broadcast", event: "timeout", payload: { loser, winner } });
      }
      draw();
      if (!modalShownForGame) {
        modalShownForGame = true;
        showGameOverModal("Time Out!", msg);
      }
      return;
    }
    renderClocks();
  }, 50);
}

function formatClock(milliseconds) {
  const safeMs = Math.max(0, milliseconds);
  if (safeMs < 10000) {
    const sec = Math.floor(safeMs / 1000);
    const tenths = Math.floor((safeMs % 1000) / 100);
    return `00:0${sec}.${tenths}`;
  }
  const total = Math.ceil(safeMs / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function renderClocks() {
  const isFlipped = board.classList.contains("flipped");
  const topColor = isFlipped ? "w" : "b";
  const bottomColor = isFlipped ? "b" : "w";

  topClock.classList.remove("hidden");
  bottomClock.classList.remove("hidden");

  if (!timedMode) {
    topClock.textContent = "∞";
    bottomClock.textContent = "∞";
    topClock.classList.remove("active", "low-time");
    bottomClock.classList.remove("active", "low-time");
    return;
  }

  topClock.textContent = formatClock(clockMs[topColor]);
  bottomClock.textContent = formatClock(clockMs[bottomColor]);

  const activeTurn = chess.turn();
  const isActive = !clockExpired && !replaying && !chess.game_over();

  topClock.classList.toggle("active", isActive && activeTurn === topColor);
  bottomClock.classList.toggle("active", isActive && activeTurn === bottomColor);

  topClock.classList.toggle("low-time", isActive && activeTurn === topColor && clockMs[topColor] < 10000);
  bottomClock.classList.toggle("low-time", isActive && activeTurn === bottomColor && clockMs[bottomColor] < 10000);
}

function renderPlayerBars() {
  const isFlipped = board.classList.contains("flipped");
  const topColor = isFlipped ? "w" : "b";
  const bottomColor = isFlipped ? "b" : "w";

  function getTitle(col) {
    if (puzzleMode) {
      return col === color ? "You (Puzzle)" : "Target";
    }
    if (computerMode) {
      return col === "b" ? `Computer (${difficulty})` : "You";
    }
    if (privateRoom) {
      if (col === color) return "You";
      return "Opponent";
    }
    return col === "w" ? "White" : "Black";
  }

  $("topPlayerName").textContent = getTitle(topColor);
  $("bottomPlayerName").textContent = getTitle(bottomColor);

  $("topAvatar").textContent = topColor === "w" ? "♔" : "♚";
  $("bottomAvatar").textContent = bottomColor === "w" ? "♔" : "♚";

  renderCapturedPieces(topColor, bottomColor);
}

function renderCapturedPieces(topColor, bottomColor) {
  const initial = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const current = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

  chess.board().forEach((row) => {
    row.forEach((sq) => {
      if (sq) current[sq.color][sq.type]++;
    });
  });

  const capturedByWhite = [];
  let whiteScore = 0;
  const capturedByBlack = [];
  let blackScore = 0;

  const pointVals = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const pieceOrder = ["q", "r", "b", "n", "p"];

  pieceOrder.forEach((type) => {
    const missingBlack = initial[type] - current.b[type];
    for (let i = 0; i < missingBlack; i++) {
      capturedByWhite.push(symbols[type.toUpperCase()]);
      whiteScore += pointVals[type];
    }
    const missingWhite = initial[type] - current.w[type];
    for (let i = 0; i < missingWhite; i++) {
      capturedByBlack.push(symbols[type]);
      blackScore += pointVals[type];
    }
  });

  const diffW = whiteScore - blackScore;
  const diffB = blackScore - whiteScore;

  const formatCapturedHtml = (pieces, diff) => {
    let str = pieces.join("");
    if (diff > 0) str += `<span class="material-diff">+${diff}</span>`;
    return str;
  };

  $("topCaptured").innerHTML = formatCapturedHtml(topColor === "w" ? capturedByWhite : capturedByBlack, topColor === "w" ? diffW : diffB);
  $("bottomCaptured").innerHTML = formatCapturedHtml(bottomColor === "w" ? capturedByWhite : capturedByBlack, bottomColor === "w" ? diffW : diffB);
}

function draw() {
  document.querySelectorAll(".square").forEach((square) => {
    square.querySelectorAll(".piece").forEach((piece) => piece.remove());
    square.classList.remove("selected", "highlighted", "last-move");
  });

  chess.board().forEach((row, r) => row.forEach((piece, f) => {
    if (!piece) return;
    const el = $(files[f] + ranks[r]);
    const span = document.createElement("span");
    span.className = `piece ${piece.color}`;
    span.textContent = symbols[piece.color === "w" ? piece.type.toUpperCase() : piece.type];
    el.appendChild(span);
  }));

  if (lastMove) {
    $(lastMove.from)?.classList.add("last-move");
    $(lastMove.to)?.classList.add("last-move");
  }

  if (selected && showMoveHints) {
    chess.moves({ square: selected, verbose: true }).forEach((move) => {
      $(move.to)?.classList.add("highlighted");
    });
  }

  if (!puzzleMode) {
    if (clockExpired) {
      // Status already handled on timeout
    } else if (chess.game_over()) {
      if (chess.in_checkmate()) {
        const winner = chess.turn() === "w" ? "Black" : "White";
        status.textContent = `Checkmate! ${winner} wins.`;
        if (!modalShownForGame) {
          modalShownForGame = true;
          showGameOverModal("Checkmate!", `Game over! ${winner} wins by checkmate.`);
        }
      } else if (chess.in_draw()) {
        let drawReason = "The game ended in a draw.";
        if (chess.in_threefold_repetition()) {
          drawReason = "Draw by Threefold Repetition! The exact same position / moves occurred 3 times.";
        } else if (chess.in_stalemate()) {
          drawReason = "Draw by Stalemate! The player has no legal moves and is not in check.";
        } else if (chess.insufficient_material()) {
          drawReason = "Draw by Insufficient Material! Neither player has enough pieces to deliver checkmate.";
        } else {
          drawReason = "Draw by 50-Move Rule! 50 moves played without a pawn move or capture.";
        }
        status.textContent = `Game Over: ${drawReason}`;
        if (!modalShownForGame) {
          modalShownForGame = true;
          showGameOverModal("Game Drawn! 🤝", drawReason);
        }
      }
    } else {
      status.textContent = `${chess.turn() === "w" ? "White" : "Black"}'s turn${chess.in_check() ? " (Check!)" : ""}`;
    }
  }

  const shouldFlip = replaying ? replayBoardFlipped : puzzleMode ? color === "b" : privateRoom ? color === "b" : !computerMode && chess.turn() === "b";
  board.classList.toggle("flipped", shouldFlip);

  moveHistoryBody.innerHTML = moveHistory.length ? moveHistory.reduce((rows, move, index) => {
    if (index % 2 === 0) {
      const moveNum = Math.floor(index / 2) + 1;
      const whiteMove = move;
      const blackMove = moveHistory[index + 1] || "";
      rows.push(`<tr data-ply="${index}" class="move-row" style="cursor: pointer;"><td>${moveNum}</td><td class="move-cell">${whiteMove}</td><td class="move-cell">${blackMove}</td></tr>`);
    }
    return rows;
  }, []).join("") : '<tr><td colspan="3">No moves yet</td></tr>';

  // Add click handlers to move rows for review navigation
  document.querySelectorAll(".move-row").forEach((row) => {
    row.style.transition = "background-color 0.2s";
    row.onmouseover = () => { if (!reviewMode) return; row.style.backgroundColor = "rgba(200, 200, 200, 0.2)"; };
    row.onmouseout = () => { row.style.backgroundColor = ""; };
    row.onclick = () => {
      if (!reviewMode && moveHistory.length > 0) enterReviewMode();
      if (reviewMode) {
        const ply = parseInt(row.dataset.ply);
        // Get clicked move cell
        const cells = row.querySelectorAll(".move-cell");
        if (event.target === cells[0]) {
          // White move clicked
          applyReviewPosition(ply + 1);
        } else if (event.target === cells[1]) {
          // Black move clicked
          applyReviewPosition(ply + 2);
        } else {
          applyReviewPosition(ply + 1);
        }
      }
    };
  });

  replayBtn.disabled = replaying || moveHistory.length === 0;
  if (replayBtn) {
    replayBtn.disabled = moveHistory.length === 0;
    replayBtn.textContent = reviewMode ? "Return to final board" : "Review game";
  }

  if (privateRoom) {
    undo.classList.add("hidden");
  } else if (!puzzleMode) {
    undo.classList.remove("hidden");
    undo.disabled = undoStack.length === 0 || thinking || replaying;
  }

  renderClocks();
  renderPlayerBars();
  updateReviewPanel();
  if (!game.classList.contains("hidden")) saveAppState(game.id);
}

function buildBoard() {
  board.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const square = document.createElement("div");
      square.className = `square ${(r + f) % 2 ? "dark" : "light"}`;
      square.id = files[f] + ranks[r];

      if (r === 7 || r === 0) {
        const fileLabel = document.createElement("span");
        fileLabel.className = `coordinate file-coordinate ${r === 0 ? "file-top" : "file-bottom"}`;
        fileLabel.textContent = files[f];
        square.appendChild(fileLabel);
      }
      if (f === 0 || f === 7) {
        const rankLabel = document.createElement("span");
        rankLabel.className = `coordinate rank-coordinate ${f === 7 ? "rank-right" : "rank-left"}`;
        rankLabel.textContent = ranks[r];
        square.appendChild(rankLabel);
      }

      square.onclick = () => clickSquare(square.id);
      board.appendChild(square);
    }
  }
  draw();
}

function isPromotionMove(from, to) {
  const piece = chess.get(from);
  if (!piece || piece.type !== "p") return false;
  if ((piece.color === "w" && to[1] !== "8") || (piece.color === "b" && to[1] !== "1")) return false;
  return chess.moves({ square: from, verbose: true }).some((move) => move.to === to && (move.promotion || (move.flags && move.flags.includes("p"))));
}

function getPromotionChoice(from, to) {
  if (!isPromotionMove(from, to)) return Promise.resolve("q");

  return new Promise((resolve) => {
    const modal = $("promotionModal");
    const options = document.querySelectorAll("#promotionOptions .promotion-option");
    if (!modal || options.length === 0) {
      resolve("q");
      return;
    }

    const choose = (event) => {
      const promotion = event.currentTarget.dataset.promotion || "q";
      options.forEach((button) => button.removeEventListener("click", choose));
      modal.classList.add("hidden");
      resolve(promotion);
    };

    options.forEach((button) => button.addEventListener("click", choose));
    modal.classList.remove("hidden");
  });
}

async function clickSquare(square) {
  // Allow review mode to click and navigate
  if (reviewMode) {
    if (selected === square) {
      selected = null;
      draw();
      return;
    }

    // In review mode, try to play alternative move
    if (selected) {
      const moves = chess.moves({ square: selected, verbose: true });
      const clickedMove = moves.find(m => m.to === square);
      if (clickedMove) {
        playReviewAlternative(clickedMove);
        selected = null;
        return;
      }
    }

    // Show legal moves for inspection
    const piece = chess.get(square);
    if (piece) {
      selected = square;
      draw();
      $(square).classList.add("selected");
      chess.moves({ square, verbose: true }).forEach((move) => {
        $(move.to)?.classList.add("highlighted");
      });
    }
    return;
  }

  if (!puzzleMode && (chess.game_over() || clockExpired || (computerMode && chess.turn() !== "w"))) return;
  if (thinking || replaying) return;

  if (selected) {
    if (selected === square) {
      selected = null;
      draw();
      return;
    }

    if (!puzzleMode) {
      // Save snapshot for unlimited undo BEFORE move
      undoStack.push({
        fen: chess.fen(),
        lastMove: lastMove ? { ...lastMove } : null,
        clockMs: { ...clockMs },
        moveHistory: [...moveHistory]
      });
    }

    const promotion = await getPromotionChoice(selected, square);
    const move = chess.move({ from: selected, to: square, promotion });

    if (move) {
      if (puzzleMode) {
        const puzzle = currentPuzzleIndex === -1 ? activePuzzle || dailyPuzzle : PUZZLES[currentPuzzleIndex];
        const targetSolution = puzzle && puzzle.solution ? puzzle.solution[currentPuzzleStep] : null;
        const expected = targetSolution ? targetSolution.toLowerCase().replace(/[\+#x=\s]/g, "") : "";
        const uci = (move.from + move.to + (move.promotion || "")).toLowerCase();
        const uciNoProm = (move.from + move.to).toLowerCase();
        const sanClean = (move.san || "").toLowerCase().replace(/[\+#x=\s]/g, "");
        const isMatch = expected ? ((uci === expected) || (uciNoProm === expected) || (sanClean === expected) || (expected.length >= 4 && expected.startsWith(uciNoProm))) : chess.in_checkmate();

        if (isMatch) {
          currentPuzzleStep++;
          selected = null;
          lastMove = { from: move.from, to: move.to };
          moveHistory.push(chess.history().slice(-1)[0]);
          draw();

          if (currentPuzzleStep >= puzzle.solution.length || chess.in_checkmate()) {
            // Puzzle Solved!
            if (!solvedPuzzles.includes(puzzle.id)) {
              solvedPuzzles.push(puzzle.id);
              localStorage.setItem("chess_solved_puzzles", JSON.stringify(solvedPuzzles));
            }
            $("nextPuzzleBtn").classList.toggle("hidden", currentPuzzleIndex === -1);
            showToast("Puzzle Solved! 🎉 Great job!");
            showGameOverModal("Puzzle Solved! 🎉", `Fantastic! You successfully solved "${puzzle.title}".`);
          } else {
            // Multi-move puzzle: play the opponent's counter-move automatically
            const oppMoveStr = puzzle.solution[currentPuzzleStep];
            if (oppMoveStr) {
              showToast("Good move! Keep going...");
              thinking = true;
              setTimeout(() => {
                let oppMove = null;
                const cleanOpp = oppMoveStr.trim();
                if (cleanOpp.length >= 4 && cleanOpp[0] >= 'a' && cleanOpp[0] <= 'h') {
                  oppMove = chess.move({
                    from: cleanOpp.slice(0, 2),
                    to: cleanOpp.slice(2, 4),
                    promotion: cleanOpp[4] || "q"
                  });
                }
                if (!oppMove) {
                  oppMove = chess.move(cleanOpp);
                }
                if (oppMove) {
                  currentPuzzleStep++;
                  lastMove = { from: oppMove.from, to: oppMove.to };
                  moveHistory.push(chess.history().slice(-1)[0]);
                }
                thinking = false;
                draw();
                if (currentPuzzleStep >= puzzle.solution.length || chess.in_checkmate()) {
                  if (!solvedPuzzles.includes(puzzle.id)) {
                    solvedPuzzles.push(puzzle.id);
                    localStorage.setItem("chess_solved_puzzles", JSON.stringify(solvedPuzzles));
                  }
                  $("nextPuzzleBtn").classList.toggle("hidden", currentPuzzleIndex === -1);
                  showGameOverModal("Puzzle Solved! 🎉", `Fantastic! You successfully solved "${puzzle.title}".`);
                }
              }, 500);
            }
          }
        } else {
          // Incorrect Move in Puzzle
          chess.undo();
          selected = null;
          draw();
          showToast("Incorrect move! Try again ❌");
        }
        return;
      }

      if (timedMode) clockMs[move.color] += clockIncrement;
      selected = null;
      lastMove = { from: move.from, to: move.to };
      moveHistory.push(chess.history().slice(-1)[0]);

      if (privateRoom) {
        await channel.send({
          type: "broadcast",
          event: "move",
          payload: { fen: chess.fen(), from: move.from, to: move.to, history: moveHistory, clockMs }
        });
      }

      draw();
      if (timedMode) startClock();
      if (computerMode && !chess.game_over()) computerMove();
      return;
    } else {
      // Invalid move: if clicking another of your own pieces, switch selection directly
      const clickedPiece = chess.get(square);
      const canSwitch = clickedPiece && (puzzleMode ? clickedPiece.color === chess.turn() : clickedPiece.color === chess.turn() && (!privateRoom || clickedPiece.color === color));
      if (canSwitch) {
        if (!puzzleMode) undoStack.pop();
        selected = square;
        draw();
        $(square).classList.add("selected");
        if (showMoveHints) {
          chess.moves({ square, verbose: true }).forEach((m) => {
            $(m.to)?.classList.add("highlighted");
          });
        }
        return;
      }
      if (!puzzleMode) undoStack.pop();
    }
  }

  const piece = chess.get(square);
  const canSelect = piece && (puzzleMode ? piece.color === chess.turn() : piece.color === chess.turn() && (!privateRoom || piece.color === color));
  if (canSelect) {
    selected = square;
    draw();
    $(square).classList.add("selected");
    if (showMoveHints) {
      chess.moves({ square, verbose: true }).forEach((move) => {
        $(move.to)?.classList.add("highlighted");
      });
    }
  } else {
    selected = null;
    draw();
  }
}

function startLocal(tc = selectedTimeControl) {
  stopClock();
  hideGameOverModal();
  modalShownForGame = false;
  privateRoom = false;
  computerMode = false;
  puzzleMode = false;
  thinking = false;
  color = null;
  codeDisplay.textContent = "LOCAL";

  $("standardControls").classList.remove("hidden");
  $("puzzleControls").classList.add("hidden");

  setClock(tc);
  connection.textContent = timedMode ? `Pass & Play (${selectedTimeControl})` : "Pass & Play";

  chess.reset();
  lastMove = null;
  moveHistory = [];
  undoStack = [];
  selected = null;
  draw();
  show(game);
  if (timedMode) startClock();
}

function startComputer(level = difficulty, tc = selectedTimeControl) {
  stopClock();
  hideGameOverModal();
  modalShownForGame = false;
  privateRoom = false;
  computerMode = true;
  puzzleMode = false;
  thinking = false;
  difficulty = level;
  color = "w";
  codeDisplay.textContent = "COMPUTER";

  $("standardControls").classList.remove("hidden");
  $("puzzleControls").classList.add("hidden");

  setClock(tc);
  connection.textContent = timedMode ? `Computer: ${level} (${selectedTimeControl})` : `Computer: ${level}`;

  chess.reset();
  lastMove = null;
  moveHistory = [];
  undoStack = [];
  selected = null;
  draw();
  show(game);
  if (timedMode) startClock();
}

function evaluate(position) {
  const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  return position.board().flat().reduce((score, p) => p ? score + values[p.type] * (p.color === "b" ? 1 : -1) : score, 0);
}

function chooseComputerMove() {
  const moves = chess.moves({ verbose: true });
  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMoves = [];
  let bestScore = -Infinity;
  const depth = difficulty === "hard" ? 3 : 1;
  moves.forEach((move) => {
    const test = new Chess(chess.fen());
    test.move({ from: move.from, to: move.to, promotion: "q" });
    const score = minimax(test, depth - 1);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  });
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function minimax(position, depth) {
  if (depth === 0 || position.game_over()) return evaluate(position);
  const moves = position.moves({ verbose: true });
  const scores = moves.map((move) => {
    const next = new Chess(position.fen());
    next.move({ from: move.from, to: move.to, promotion: "q" });
    return minimax(next, depth - 1);
  });
  return position.turn() === "b" ? Math.max(...scores) : Math.min(...scores);
}

function computerMove() {
  thinking = true;
  connection.textContent = "Computer is thinking...";
  setTimeout(() => {
    if (!computerMode || chess.game_over() || clockExpired) return;

    // Save snapshot for unlimited undo BEFORE computer move
    undoStack.push({
      fen: chess.fen(),
      lastMove: lastMove ? { ...lastMove } : null,
      clockMs: { ...clockMs },
      moveHistory: [...moveHistory]
    });

    const move = chooseComputerMove();
    if (!move) {
      undoStack.pop();
      return;
    }
    chess.move({ from: move.from, to: move.to, promotion: "q" });
    if (timedMode) clockMs.b += clockIncrement;
    lastMove = { from: move.from, to: move.to };
    moveHistory.push(chess.history().slice(-1)[0]);
    thinking = false;
    connection.textContent = timedMode ? `Computer: ${difficulty} (${selectedTimeControl})` : `Computer: ${difficulty}`;
    draw();
    if (timedMode) startClock();
  }, 300);
}

function undoTurn() {
  if (thinking || undoStack.length === 0 || replaying || puzzleMode) return;

  let targetState = null;
  if (computerMode) {
    // Pop computer move + human move
    if (undoStack.length >= 2) {
      undoStack.pop();
      targetState = undoStack.pop();
    } else if (undoStack.length === 1) {
      targetState = undoStack.pop();
    }
  } else {
    // Pop 1 move for Pass & Play
    targetState = undoStack.pop();
  }

  if (targetState) {
    chess.load(targetState.fen);
    lastMove = targetState.lastMove;
    clockMs = { ...targetState.clockMs };
    moveHistory = [...targetState.moveHistory];
    clockExpired = false;
    selected = null;
    hideGameOverModal();
    modalShownForGame = false;
    draw();
    if (timedMode && !chess.game_over()) startClock();
  }
}

function getGameSummaryText() {
  const moveCount = Math.ceil(moveHistory.length / 2);
  let result = "Game in progress.";
  if (clockExpired) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    result = `${winner} won on time.`;
  } else if (chess.in_checkmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    result = `${winner} won by checkmate.`;
  } else if (chess.in_stalemate()) {
    result = "Draw by stalemate.";
  } else if (chess.in_threefold_repetition()) {
    result = "Draw by threefold repetition.";
  } else if (chess.insufficient_material()) {
    result = "Draw by insufficient material.";
  } else if (chess.in_draw()) {
    result = "Draw by rule.";
  }
  return `${result} Total moves: ${moveCount}. Review any move below and compare other legal moves available at that position.`;
}

function buildGameSummaryHtml() {
  const moveCount = Math.ceil(moveHistory.length / 2);
  let result = "Game in progress";
  let resultClass = "in-progress";
  let resultIcon = "\u231B";

  if (clockExpired) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    result = `${winner} won on time (timeout)`;
    resultClass = "won-on-time";
    resultIcon = "\u23F1\uFE0F";
  } else if (chess.in_checkmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    result = `${winner} won by checkmate`;
    resultClass = "won-checkmate";
    resultIcon = "\u265A";
  } else if (chess.in_stalemate()) {
    result = "Draw by stalemate";
    resultClass = "draw";
    resultIcon = "\uD83E\uDD1F";
  } else if (chess.in_threefold_repetition()) {
    result = "Draw by threefold repetition";
    resultClass = "draw";
    resultIcon = "\uD83E\uDD1F";
  } else if (chess.insufficient_material()) {
    result = "Draw by insufficient material";
    resultClass = "draw";
    resultIcon = "\uD83E\uDD1F";
  } else if (chess.in_draw()) {
    result = "Draw by rule";
    resultClass = "draw";
    resultIcon = "\uD83E\uDD1F";
  }

  return `
    <div style="padding: 12px; background: #f9f9f9; border-radius: 4px; margin-bottom: 12px;">
      <div style="font-size: 0.9em; color: #666; margin-bottom: 4px;">GAME SUMMARY</div>
      <div style="font-weight: bold; font-size: 1.1em; margin-bottom: 8px;">${resultIcon} ${result}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em;">
        <div style="color: #666;">Total moves: <strong>${moveCount}</strong></div>
        <div style="color: #666;">Moves to review: <strong>${moveHistory.length}</strong></div>
      </div>
    </div>
  `;
}

function applyReviewPosition(targetPly) {
  const replayChess = new Chess();
  let applied = 0;
  let appliedMove = null;
  for (let i = 0; i < targetPly && i < reviewMoves.length; i++) {
    const move = replayChess.move(reviewMoves[i]);
    if (!move) break;
    appliedMove = move;
    applied++;
  }

  reviewPly = applied;
  reviewVariationText = "";
  chess.load(replayChess.fen());
  lastMove = appliedMove ? { from: appliedMove.from, to: appliedMove.to } : null;
  selected = null;
  draw();
}

function enterReviewMode() {
  if (moveHistory.length === 0) {
    connection.textContent = "Play at least one move before starting replay.";
    return;
  }

  reviewLiveFen = chess.fen();
  reviewLiveLastMove = lastMove ? { ...lastMove } : null;
  reviewMoves = [...moveHistory];
  reviewSummaryText = getGameSummaryText();
  reviewPly = reviewMoves.length;
  replayBoardFlipped = board.classList.contains("flipped");
  reviewMode = true;
  replaying = true;
  if (timedMode) stopClock();

  board.classList.add("replaying");
  applyReviewPosition(reviewPly);
}

function exitReviewMode() {
  if (reviewLiveFen) chess.load(reviewLiveFen);
  lastMove = reviewLiveLastMove;
  reviewMode = false;
  replaying = false;
  reviewVariationText = "";
  board.classList.remove("replaying");
  if (timedMode && !clockExpired && !chess.game_over()) startClock();
  draw();
}

function playReviewAlternative(move) {
  const applied = chess.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
  if (!applied) return;
  lastMove = { from: applied.from, to: applied.to };
  const moveNum = Math.ceil(reviewPly / 2);
  const moveColor = reviewPly % 2 === 0 ? "White" : "Black";
  reviewVariationText = `Variation on move ${moveNum} (${moveColor}): ${applied.san}`;
  selected = null;
  draw();
}

function jumpToMove(moveIndex) {
  // moveIndex is 0-based move number (0 = move 1 white, 1 = move 1 black, 2 = move 2 white, etc.)
  if (!reviewMode) enterReviewMode();
  applyReviewPosition(moveIndex + 1);
}

function renderAlternativeMoves() {
  if (!alternativeMoves) return;
  alternativeMoves.innerHTML = "";
  if (!reviewMode) {
    alternativeMoves.innerHTML = `<p style="color: #999; font-size: 0.9em; margin: 0;">Start review to inspect legal alternatives.</p>`;
    return;
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    alternativeMoves.innerHTML = `<p style="color: #999; font-size: 0.9em; margin: 0;">No legal moves from this position.</p>`;
    return;
  }

  const isPlayedMove = reviewPly > 0 && reviewPly <= reviewMoves.length;
  const playedMoveText = isPlayedMove ? `(${reviewMoves[reviewPly - 1]})` : "";

  const header = document.createElement("div");
  header.style.cssText = "font-size: 0.85em; color: #666; margin-bottom: 6px; font-weight: bold;";
  header.textContent = `${moves.length} legal move${moves.length !== 1 ? "s" : ""} available`;
  alternativeMoves.appendChild(header);

  moves.slice(0, 12).forEach((move) => {
    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = `
      margin: 2px; padding: 4px 8px; border: 1px solid #ccc; 
      border-radius: 3px; background: #f5f5f5; cursor: pointer; font-size: 0.9em;
    `;
    const isPlayedMove = reviewPly > 0 && reviewPly <= reviewMoves.length && reviewMoves[reviewPly - 1] === move.san;
    if (isPlayedMove) {
      button.style.cssText += `background: #e8f5e9; border-color: #4caf50; font-weight: bold; color: #2e7d32;`;
      button.textContent = `✓ ${move.san}`;
    } else {
      button.textContent = move.san;
    }
    button.onmouseover = () => { button.style.backgroundColor = "#e0e0e0"; };
    button.onmouseout = () => { button.style.backgroundColor = isPlayedMove ? "#e8f5e9" : "#f5f5f5"; };
    button.onclick = () => playReviewAlternative(move);
    alternativeMoves.appendChild(button);
  });

  if (moves.length > 12) {
    const more = document.createElement("div");
    more.style.cssText = "font-size: 0.8em; color: #999; margin-top: 4px;";
    more.textContent = `+${moves.length - 12} more moves...`;
    alternativeMoves.appendChild(more);
  }
}

function updateReviewPanel() {
  if (!reviewPanel) return;
  const canReview = !puzzleMode && moveHistory.length > 0 && (reviewMode || chess.game_over() || clockExpired);
  reviewPanel.classList.toggle("hidden", !canReview);
  reviewControls?.classList.toggle("hidden", !reviewMode);
  if (!canReview) return;

  // Show summary or variation
  const summaryHtml = reviewMode && reviewPly > 0 ? buildGameSummaryHtml() : buildGameSummaryHtml();
  const variationText = reviewVariationText || getGameSummaryText();
  if (reviewSummary) {
    if (reviewMode && reviewPly > 0) {
      reviewSummary.innerHTML = summaryHtml;
    } else {
      reviewSummary.innerHTML = `<div style="padding: 12px; background: #f9f9f9; border-radius: 4px;">${summaryHtml.split('\n').slice(1).join('\n')}`;
    }
  }

  // Update move counter
  if (reviewStep) {
    if (reviewMode) {
      const moveNum = Math.ceil(reviewPly / 2);
      const moveColor = reviewPly % 2 === 0 ? "White" : "Black";
      reviewStep.textContent = reviewPly === 0 ? "Starting position" : `Move ${moveNum} (${moveColor}) - Ply ${reviewPly}/${reviewMoves.length}`;
    } else {
      reviewStep.textContent = `Final position - ${moveHistory.length} ply played`;
    }
  }

  // Disable/enable buttons
  if (reviewStartBtn) reviewStartBtn.disabled = !reviewMode || reviewPly === 0;
  if (reviewPrevBtn) reviewPrevBtn.disabled = !reviewMode || reviewPly === 0;
  if (reviewNextBtn) reviewNextBtn.disabled = !reviewMode || reviewPly >= reviewMoves.length;
  if (reviewEndBtn) reviewEndBtn.disabled = !reviewMode || reviewPly >= reviewMoves.length;

  if (reviewMode) {
    status.textContent = `Reviewing move ${Math.ceil(reviewPly / 2)} (${reviewPly % 2 === 0 ? "White" : "Black"} to move)${chess.in_check() ? " (Check!)" : ""}`;
  }
  renderAlternativeMoves();
}

function watchReplay() {
  if (reviewMode) {
    exitReviewMode();
  } else {
    enterReviewMode();
  }
}

function players() {
  return channel ? Object.values(channel.presenceState()).flat() : [];
}

function updateLobby() {
  const list = players();
  const connectedCount = list.length;
  if (connectedCount >= 2) {
    lobbyPlayers.textContent = "Both players connected! Select sides or click Start Game.";
    startPrivate.classList.toggle("hidden", !host);
    startPrivate.disabled = false;
  } else {
    lobbyPlayers.textContent = `Waiting for opponent... (${connectedCount}/2 connected)`;
    startPrivate.classList.add("hidden");
    startPrivate.disabled = true;
  }
  document.querySelectorAll(".side-option").forEach((button) => {
    button.disabled = false;
    button.classList.toggle("selected", color === button.dataset.color);
    button.setAttribute("aria-pressed", color === button.dataset.color ? "true" : "false");
  });
}

async function selectSide(next) {
  const opponent = players().find((p) => p.playerId !== id);
  if (opponent?.color === next) {
    lobbyError.textContent = "Your opponent has already chosen that side.";
    return;
  }
  color = next;
  lobbyError.textContent = "";
  updateLobby();
  try {
    const result = await channel.track({ playerId: id, color });
    if (result?.error) {
      lobbyError.textContent = "Could not save your side. Please try again.";
    }
  } catch (trackError) {
    lobbyError.textContent = "Connection delayed. Your side will retry automatically.";
  }
}

function enterGame(tc = selectedTimeControl) {
  started = true;
  hideGameOverModal();
  modalShownForGame = false;
  puzzleMode = false;
  $("standardControls").classList.remove("hidden");
  $("puzzleControls").classList.add("hidden");
  setClock(tc);
  connection.textContent = timedMode ? `Connected as ${color === "w" ? "White" : "Black"} (${tc})` : `Connected as ${color === "w" ? "White" : "Black"}`;
  chess.reset();
  lastMove = null;
  moveHistory = [];
  undoStack = [];
  selected = null;
  draw();
  show(game);
  if (timedMode) startClock();
}

async function leavePrivate(notify = false) {
  stopClock();
  hideGameOverModal();
  modalShownForGame = false;
  timedMode = false;
  puzzleMode = false;
  if (channel) {
    if (notify) await channel.send({ type: "broadcast", event: "player-left" });
    await channel.unsubscribe();
    channel = null;
  }
  privateRoom = false;
  started = false;
  color = null;
  clearRoomLink();
  show(start);
}

function updateRoomLink(code) {
  const link = new URL(window.location.href);
  link.search = `?room=${encodeURIComponent(code)}`;
  roomLinkInput.value = link.href;
}

function clearRoomLink() {
  const link = new URL(window.location.href);
  link.search = "";
  window.history.replaceState({}, "", link.href);
}

async function joinPrivate(code, isHost) {
  stopClock();
  hideGameOverModal();
  modalShownForGame = false;
  privateRoom = true;
  computerMode = false;
  puzzleMode = false;
  host = isHost;
  started = false;
  color = null;
  codeDisplay.textContent = code;
  $("lobbyCodeDisplay").textContent = code;
  updateRoomLink(code);
  shareRoom.classList.toggle("hidden", !isHost);
  copyStatus.textContent = "";

  $("lobbyTimeControlGroup").style.display = isHost ? "block" : "none";

  show(lobby);

  channel = supabaseClient.channel(`chess-room-${code}`, {
    config: { presence: { key: id }, broadcast: { self: true } },
  });

  channel
    .on("presence", { event: "sync" }, updateLobby)
    .on("presence", { event: "leave" }, function (presence) {
      if (presence.key !== id && started) {
        alert("Your opponent left the game.");
        leavePrivate();
      } else {
        updateLobby();
      }
    })
    .on("broadcast", { event: "player-left" }, function () {
      if (started) {
        alert("Your opponent left the game.");
        leavePrivate();
      }
    })
    .on("broadcast", { event: "start" }, function (message) {
      const assignedColor = message.payload.colors[id] || (host ? "w" : "b");
      color = assignedColor;
      if (message.payload.variant) {
        state.variant = message.payload.variant;
        document.querySelectorAll(".variant-select").forEach((el) => {
          el.value = state.variant;
        });
      }
      enterGame(message.payload.timeControl || selectedTimeControl);
    })
    .on("broadcast", { event: "move" }, function (message) {
      chess.load(message.payload.fen);
      lastMove = message.payload.from ? { from: message.payload.from, to: message.payload.to } : null;
      moveHistory = message.payload.history || [];
      if (message.payload.clockMs) clockMs = { ...message.payload.clockMs };
      draw();
      if (timedMode) startClock();
    })
    .on("broadcast", { event: "timeout" }, function (message) {
      clockExpired = true;
      stopClock();
      const msg = `${message.payload.loser} ran out of time! ${message.payload.winner} wins.`;
      status.textContent = msg;
      renderClocks();
      if (!modalShownForGame) {
        modalShownForGame = true;
        showGameOverModal("Time Out!", msg);
      }
    })
    .on("broadcast", { event: "new-game" }, function () {
      started = false;
      color = null;
      chess.reset();
      lastMove = null;
      moveHistory = [];
      hideGameOverModal();
      modalShownForGame = false;
      show(lobby);
      channel.track({ playerId: id, color: null });
      updateLobby();
    });

  channel.subscribe(async function (state) {
    if (state !== "SUBSCRIBED") return;
    if (players().length >= 2) {
      lobbyError.textContent = "This room already has two players.";
      await leavePrivate();
      return;
    }
    await channel.track({ playerId: id, color: null });
    updateLobby();
  });
}

async function joinRoomFromLink() {
  const code = new URLSearchParams(window.location.search).get("room");
  if (!code || !/^[A-Z0-9]{6}$/i.test(code)) return;
  await joinPrivate(code.toUpperCase(), false);
}

function setupPills(containerId, callback) {
  const pills = document.querySelectorAll(`#${containerId} .pill-btn`);
  pills.forEach((pill) => {
    pill.onclick = () => {
      pills.forEach((p) => p.classList.remove("selected"));
      pill.classList.add("selected");
      if (callback) callback(pill.dataset.time);
    };
  });
}

setupPills("timedControlPills", (tc) => { selectedTimeControl = tc; });
setupPills("playerTimeControlPills", (tc) => { selectedTimeControl = tc; });
setupPills("computerTimeControlPills", (tc) => { selectedTimeControl = tc; });
setupPills("lobbyTimeControlPills", (tc) => { selectedTimeControl = tc; });

document.querySelectorAll(".difficulty-option").forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll(".difficulty-option").forEach((b) => b.classList.remove("selected"));
    button.classList.add("selected");
    difficulty = button.dataset.difficulty;
  };
});

$("computerModeBtn").onclick = () => show(computer);
$("playerModeBtn").onclick = () => show(playerMode);
$("timedModeBtn").onclick = () => {
  selectedTimeControl = "3+2";
  const pills = document.querySelectorAll("#timedControlPills .pill-btn");
  pills.forEach((p) => p.classList.toggle("selected", p.dataset.time === "3+2"));
  show(timed);
};
$("dailyChallengeBtn").onclick = () => {
  renderDailyPuzzleBanner();
  updateDailyTimer();
  if (!dailyTimerInterval) {
    dailyTimerInterval = setInterval(updateDailyTimer, 1000);
  }
  show(dailyPuzzleScreen);
};
$("refreshDailyArchiveBtn").onclick = () => loadArchivedDailyPuzzles(true);

$("puzzleModeBtn").onclick = () => {
  renderPuzzleGrid();
  show(puzzleScreen);
};

$("backToStartBtn").onclick = () => show(start);
$("backToStartBtnTop").onclick = () => show(start);
$("backFromComputerBtn").onclick = () => show(start);
$("backFromComputerBtnTop").onclick = () => show(start);
$("backFromTimedBtn").onclick = () => show(start);
$("backFromTimedBtnTop").onclick = () => show(start);
$("backFromDailyPuzzleBtn").onclick = () => show(start);
$("backFromDailyPuzzleBtnTop").onclick = () => show(start);
$("backFromPuzzleBtn").onclick = () => show(start);
$("backFromPuzzleBtnTop").onclick = () => show(start);

$("startComputerBtn").onclick = () => startComputer(difficulty, selectedTimeControl);
$("localModeBtn").onclick = () => startLocal(selectedTimeControl);
$("privateModeBtn").onclick = () => show(room);

$("timedVsComputerBtn").onclick = () => startComputer(difficulty, selectedTimeControl);
$("timedVsLocalBtn").onclick = () => startLocal(selectedTimeControl);
$("timedVsPrivateBtn").onclick = () => show(room);

$("undoBtn").onclick = undoTurn;
replayBtn.addEventListener("click", watchReplay);
if (reviewStartBtn) reviewStartBtn.onclick = () => applyReviewPosition(0);
if (reviewPrevBtn) reviewPrevBtn.onclick = () => applyReviewPosition(Math.max(0, reviewPly - 1));
if (reviewNextBtn) reviewNextBtn.onclick = () => applyReviewPosition(Math.min(reviewMoves.length, reviewPly + 1));
if (reviewEndBtn) reviewEndBtn.onclick = () => applyReviewPosition(reviewMoves.length);

function getPuzzleHint(puzzle) {
  const hint = puzzle.hint || "Look for the strongest forcing move.";
  const targetSolution = puzzle.solution && puzzle.solution[currentPuzzleStep];
  if (!targetSolution || targetSolution.length < 4) return hint;

  const from = targetSolution.slice(0, 2);
  const to = targetSolution.slice(2, 4);
  const piece = chess.get(from);
  if (!piece) return hint;

  const pieceNames = { p: "pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King" };
  const legalMove = chess.moves({ square: from, verbose: true }).find((move) => move.to === to);
  const captureText = legalMove?.captured ? ` to capture the ${pieceNames[legalMove.captured]}` : "";
  return `${hint} Start by moving your ${pieceNames[piece.type]} from ${from} to ${to}${captureText}.`;
}

$("hintBtn").onclick = () => {
  const puzzle = currentPuzzleIndex === -1 ? activePuzzle || dailyPuzzle : PUZZLES[currentPuzzleIndex];
  if (puzzle) showToast(`💡 Hint: ${getPuzzleHint(puzzle)}`);
};

$("retryPuzzleBtn").onclick = () => {
  if (currentPuzzleIndex === -1) {
    if (activePuzzle) loadCustomPuzzle(activePuzzle);
    else showToast("This daily puzzle is no longer loaded. Please select it again from the archive.");
  } else {
    loadPuzzle(currentPuzzleIndex);
  }
};

$("nextPuzzleBtn").onclick = () => {
  const nextIdx = currentPuzzleIndex === -1 ? 0 : (currentPuzzleIndex + 1) % PUZZLES.length;
  loadPuzzle(nextIdx);
};

$("puzzleListBtn").onclick = () => {
  if (currentPuzzlePage === "daily" || currentPuzzleIndex === -1) {
    renderDailyPuzzleBanner();
    show(dailyPuzzleScreen);
  } else {
    renderPuzzleGrid();
    show(puzzleScreen);
  }
};

$("resetPuzzlesProgressBtn").onclick = () => {
  if (confirm("Are you sure you want to reset your puzzle progress?")) {
    const practiceIds = new Set(PUZZLES.map((p) => p.id));
    solvedPuzzles = solvedPuzzles.filter((id) => !practiceIds.has(id));
    localStorage.setItem("chess_solved_puzzles", JSON.stringify(solvedPuzzles));
    renderPuzzleGrid();
  }
};

$("modalNewGameBtn").onclick = () => {
  hideGameOverModal();
  if (puzzleMode) {
    if (currentPuzzleIndex === -1 && activePuzzle) {
      loadCustomPuzzle(activePuzzle);
    } else {
      const nextIdx = (currentPuzzleIndex + 1) % PUZZLES.length;
      loadPuzzle(nextIdx);
    }
  } else {
    $("resetBtn").click();
  }
};

$("modalCloseBtn").onclick = () => {
  hideGameOverModal();
};

document.querySelectorAll(".side-option").forEach((button) => button.onclick = () => selectSide(button.dataset.color));

$("createRoomBtn").onclick = async () => {
  error.textContent = "";
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  joinPrivate(code, true);
};

$("joinRoomPanel").onsubmit = async (e) => {
  e.preventDefault();
  error.textContent = "";
  const inputCode = $("roomInput").value.trim().toUpperCase();
  if (!inputCode || inputCode.length !== 6) {
    error.textContent = "Please enter a valid 6-character room code.";
    return;
  }
  joinPrivate(inputCode, false);
};

copyRoomLinkBtn.onclick = async () => {
  if (!roomLinkInput.value) return;
  await navigator.clipboard.writeText(roomLinkInput.value);
  copyStatus.textContent = "Link copied. Send it to your opponent.";
};

startPrivate.onclick = async () => {
  const list = players();
  if (list.length < 2) {
    lobbyError.textContent = "Cannot start game: Waiting for an opponent to join!";
    return;
  }
  lobbyError.textContent = "";

  const hostPlayer = list.find((p) => p.playerId === id) || { playerId: id, color: color };
  const guestPlayer = list.find((p) => p.playerId !== id);

  let hostColor = hostPlayer.color || color || "w";
  let guestColor = guestPlayer ? guestPlayer.color : (hostColor === "w" ? "b" : "w");
  if (hostColor === guestColor) {
    guestColor = hostColor === "w" ? "b" : "w";
  }

  const colors = {
    [id]: hostColor
  };
  if (guestPlayer) {
    colors[guestPlayer.playerId] = guestColor;
  }

  if (channel) {
    try {
      await channel.send({
        type: "broadcast",
        event: "start",
        payload: { colors, timeControl: selectedTimeControl, variant: state.variant || "standard" }
      });
    } catch (e) {
      console.log("Broadcast error:", e);
    }
  }
};

$("showJoinBtn").onclick = () => {
  $("createRoomPanel").classList.add("hidden");
  $("joinRoomPanel").classList.remove("hidden");
  $("roomInput").focus();
};

$("backBtn").onclick = () => show(start);
$("backBtnTop").onclick = () => show(start);
$("leaveLobbyBtn").onclick = () => leavePrivate();
$("leaveLobbyBtnTop").onclick = () => leavePrivate();
$("leaveBtn").onclick = () => leaveBtnClick();

function leaveBtnClick() {
  if (puzzleMode) {
    if (currentPuzzlePage === "daily" || currentPuzzleIndex === -1) {
      renderDailyPuzzleBanner();
      show(dailyPuzzleScreen);
    } else {
      renderPuzzleGrid();
      show(puzzleScreen);
    }
  } else if (privateRoom) {
    leavePrivate(true);
  } else {
    show(start);
  }
}

$("homeLogoBtn").onclick = async () => {
  const wasInGame = !game.classList.contains("hidden");
  if (privateRoom) {
    await leavePrivate(wasInGame);
    return;
  }
  stopClock();
  hideGameOverModal();
  show(start);
};

$("resetBtn").onclick = async () => {
  if (privateRoom) {
    await channel.send({ type: "broadcast", event: "new-game" });
    started = false;
    color = null;
    moveHistory = [];
    hideGameOverModal();
    modalShownForGame = false;
    show(lobby);
    await channel.track({ playerId: id, color: null });
    updateLobby();
    return;
  }
  stopClock();
  hideGameOverModal();
  modalShownForGame = false;
  if (timedMode) setClock(selectedTimeControl);
  chess.reset();
  lastMove = null;
  moveHistory = [];
  undoStack = [];
  thinking = false;
  draw();
  if (timedMode) startClock();
};

window.addEventListener("pagehide", () => channel && supabaseClient.removeChannel(channel));

syncMoveHintsToggles();
buildBoard();
restoreAppState();
joinRoomFromLink();
updateDailyTimer();
if (!dailyTimerInterval) {
  dailyTimerInterval = setInterval(updateDailyTimer, 1000);
}
