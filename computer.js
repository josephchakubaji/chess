// Computer opponent feature utilities.
(function () {
  const pieceValues = Object.freeze({ p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 });

  function evaluate(position) {
    return position.board().flat().reduce((score, piece) => {
      if (!piece) return score;
      const value = pieceValues[piece.type] || 0;
      return score + value * (piece.color === "b" ? 1 : -1);
    }, 0);
  }

  function minimax(position, depth) {
    if (depth === 0 || position.game_over()) return evaluate(position);
    const moves = position.moves({ verbose: true });
    if (!moves.length) return evaluate(position);

    const scores = moves.map((move) => {
      const next = new Chess(position.fen());
      next.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
      return minimax(next, depth - 1);
    });

    return position.turn() === "b" ? Math.max(...scores) : Math.min(...scores);
  }

  function chooseMove(position, difficulty) {
    const moves = position.moves({ verbose: true });
    if (!moves.length) return null;
    if (difficulty === "easy") return moves[Math.floor(Math.random() * moves.length)];

    const depth = difficulty === "hard" ? 3 : 1;
    let bestScore = -Infinity;
    let bestMoves = [];

    moves.forEach((move) => {
      const test = new Chess(position.fen());
      test.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
      const score = minimax(test, depth - 1);
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    });

    return bestMoves[Math.floor(Math.random() * bestMoves.length)] || null;
  }

  window.ChessComputer = Object.freeze({ evaluate, minimax, chooseMove });
})();
