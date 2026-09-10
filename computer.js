// Computer opponent feature utilities.
(function () {
  const PAWN_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
  ];
  const KNIGHT_PST = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ];
  const BISHOP_PST = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  5,  0,  0,  5,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ];
  const ROOK_PST = [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0
  ];
  const QUEEN_PST = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ];

  function evaluate(position, depth = 0) {
    if (position.in_checkmate()) {
      return position.turn() === "b" ? -(100000 + depth * 100) : (100000 + depth * 100);
    }
    if (position.in_draw()) return 0;

    const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    let score = 0;
    let whiteKingSq = null;
    let blackKingSq = null;

    const board = position.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (!piece) continue;
        const base = pieceValues[piece.type] || 0;
        let pst = 0;
        const idx = piece.color === "b" ? r * 8 + f : (7 - r) * 8 + f;
        if (piece.type === "p") pst = PAWN_PST[idx];
        else if (piece.type === "n") pst = KNIGHT_PST[idx];
        else if (piece.type === "b") pst = BISHOP_PST[idx];
        else if (piece.type === "r") pst = ROOK_PST[idx];
        else if (piece.type === "q") pst = QUEEN_PST[idx];
        else if (piece.type === "k") {
          if (piece.color === "w") whiteKingSq = { r, f };
          else blackKingSq = { r, f };
        }
        const totalVal = base + pst;
        score += piece.color === "b" ? totalVal : -totalVal;
      }
    }

    if (whiteKingSq && blackKingSq) {
      const whiteDistCenter = Math.abs(whiteKingSq.r - 3.5) + Math.abs(whiteKingSq.f - 3.5);
      score += whiteDistCenter * 15;
    }

    if (position.in_check()) {
      score += position.turn() === "b" ? -50 : 50;
    }

    return score;
  }

  function minimax(position, depth, alpha, beta, isMaximizing) {
    if (position.game_over() || depth === 0) {
      return evaluate(position, depth);
    }

    const legalMoves = position.moves({ verbose: true });
    if (!legalMoves.length) return evaluate(position, depth);

    legalMoves.sort((a, b) => {
      const aScore = (a.san && a.san.includes("+") ? 500 : 0) + (a.captured ? 200 : 0);
      const bScore = (b.san && b.san.includes("+") ? 500 : 0) + (b.captured ? 200 : 0);
      return bScore - aScore;
    });

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of legalMoves) {
        const next = new Chess(position.fen());
        next.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
        const ev = minimax(next, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of legalMoves) {
        const next = new Chess(position.fen());
        next.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
        const ev = minimax(next, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function chooseMove(position, difficulty) {
    const moves = position.moves({ verbose: true });
    if (!moves.length) return null;

    // Instant checkmate: if any legal move checkmates immediately, choose it!
    for (const move of moves) {
      const test = new Chess(position.fen());
      test.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
      if (test.in_checkmate()) return move;
    }

    if (difficulty === "easy") {
      const checksOrCaps = moves.filter((m) => m.captured || (m.san && m.san.includes("+")));
      if (checksOrCaps.length && Math.random() < 0.6) {
        return checksOrCaps[Math.floor(Math.random() * checksOrCaps.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }

    const depth = difficulty === "hard" ? 3 : 2;
    let bestScore = -Infinity;
    let bestMoves = [];

    moves.sort((a, b) => {
      const aPriority = (a.captured ? 10 : 0) + (a.san && a.san.includes("+") ? 20 : 0);
      const bPriority = (b.captured ? 10 : 0) + (b.san && b.san.includes("+") ? 20 : 0);
      return bPriority - aPriority;
    });

    for (const move of moves) {
      const test = new Chess(position.fen());
      test.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
      const score = minimax(test, depth - 1, -Infinity, Infinity, false);
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
  }

  window.ChessComputer = Object.freeze({ evaluate, minimax, chooseMove });
})();
