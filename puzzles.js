// Puzzle feature data and helpers.
// The current page can adopt this catalog incrementally without changing game state.
(function () {
  const practicePuzzles = [
    {
      id: "puzzle_1",
      title: "Back-Rank Rook Mate",
      category: "Beginner",
      goal: "White to move: Strike the undefended 8th rank for mate in 1!",
      fen: "6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
      solution: ["b1b8"],
      hint: "Move the rook from b1 to b8 for checkmate."
    },
    {
      id: "puzzle_2",
      title: "Scholar's Touch Mate",
      category: "Beginner",
      goal: "White to move: Deliver checkmate on f7!",
      fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
      solution: ["f3f7"],
      hint: "Capture the f7 pawn with the queen."
    },
    {
      id: "puzzle_3",
      title: "Smothered Knight Strike",
      category: "Beginner",
      goal: "White to move: Deliver a smothered checkmate with your Knight!",
      fen: "6nk/6pp/8/4N3/8/8/5PPP/6K1 w - - 0 1",
      solution: ["e5f7"],
      hint: "Jump the knight from e5 to f7."
    },
    {
      id: "puzzle_4",
      title: "Rook Back-Rank Takeover",
      category: "Beginner",
      goal: "White to move: Force checkmate on the back rank!",
      fen: "3r2k1/1p3ppp/8/8/8/8/1Q3PPP/3R2K1 w - - 0 1",
      solution: ["d1d8"],
      hint: "Capture the rook on d8 with your rook."
    },
    {
      id: "puzzle_5",
      title: "Corridor Rook Mate",
      category: "Beginner",
      goal: "White to move: Strike on c8 for checkmate!",
      fen: "2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1",
      solution: ["c1c8"],
      hint: "Capture the rook on c8 with your rook."
    },
    {
      id: "puzzle_6",
      title: "Trapped King Back-Rank",
      category: "Beginner",
      goal: "White to move: Deliver back-rank mate on f8!",
      fen: "7k/5Rpp/8/8/8/8/6PP/6K1 w - - 0 1",
      solution: ["f7f8"],
      hint: "Move the rook from f7 to f8."
    },
    {
      id: "puzzle_7",
      title: "Queen Battery Infiltration",
      category: "Beginner",
      goal: "White to move: Bring the Queen into the attack!",
      fen: "r1bq1rk1/pppp1ppp/2n5/4p1N1/2B1P3/3P4/PPP2PPP/R2QK2R w KQ - 0 1",
      solution: ["d1h5"],
      hint: "Move the queen from d1 to h5."
    },
    {
      id: "puzzle_8",
      title: "Back-Rank Queen Infiltration",
      category: "Beginner",
      goal: "White to move: Deliver back-rank mate with your Queen!",
      fen: "4r1k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1",
      solution: ["e1e8"],
      hint: "Move the queen from e1 to e8."
    },
    {
      id: "puzzle_9",
      title: "Royal Knight Fork",
      category: "Intermediate",
      goal: "White to move: Fork Black's King and Queen!",
      fen: "r3k2r/ppp2p1p/8/3q4/4N3/8/PPPP1PPP/R3K2R w KQkq - 0 1",
      solution: ["e4f6"],
      hint: "Jump the knight from e4 to f6 with check."
    },
    {
      id: "puzzle_10",
      title: "Winning the Loose Queen",
      category: "Intermediate",
      goal: "White to move: Capture Black's undefended Queen!",
      fen: "r1b1k2r/pppp1ppp/8/4n3/4Pq2/2P5/PPP2PPP/R1BQK2R w KQkq - 0 1",
      solution: ["c1f4"],
      hint: "Move the bishop from c1 to f4 to capture the queen."
    },
    {
      id: "puzzle_11",
      title: "Queen Takes Undefended Bishop",
      category: "Intermediate",
      goal: "White to move: Win material by taking the loose piece!",
      fen: "r4rk1/pp3ppp/3bpn2/8/8/2N2N2/PPP2PPP/3QR1K1 w - - 0 1",
      solution: ["d1d6"],
      hint: "Capture the undefended bishop on d6."
    },
    {
      id: "puzzle_12",
      title: "Queen-Bishop Mate",
      category: "Intermediate",
      goal: "White to move: Use the Bishop battery to deliver mate!",
      fen: "6k1/5ppp/8/7Q/2B5/8/5PPP/6K1 w - - 0 1",
      solution: ["h5f7"],
      hint: "Move the queen from h5 to f7 for mate."
    },
    {
      id: "puzzle_13",
      title: "Rook Capture Win",
      category: "Intermediate",
      goal: "White to move: Win Black's hanging Rook!",
      fen: "8/8/8/8/8/r5k1/8/R6K w - - 0 1",
      solution: ["a1a3"],
      hint: "Capture the rook on a3."
    },
    {
      id: "puzzle_14",
      title: "Knight Fork on c7",
      category: "Intermediate",
      goal: "White to move: Fork Black's King and Queen!",
      fen: "q3k3/2p2ppp/8/1N6/8/8/5PPP/4K3 w - - 0 1",
      solution: ["b5c7"],
      hint: "Jump the knight from b5 to c7 with check."
    },
    {
      id: "puzzle_15",
      title: "Winning Pinned Queen",
      category: "Intermediate",
      goal: "White to move: Win the Black Queen on d4!",
      fen: "r1b1k2r/pppp1ppp/8/8/1b1q4/2N5/PPP2PPP/R1BQR1K1 w kq - 0 1",
      solution: ["d1d4"],
      hint: "Capture the queen on d4 with your queen."
    },
    {
      id: "puzzle_16",
      title: "Central Queen Domination",
      category: "Intermediate",
      goal: "White to move: Centralize your Queen with dual threats!",
      fen: "r1bq1rk1/pppp1ppp/2n5/4P3/1bB1n3/2N2N2/PPP2PPP/R1BQK2R w KQ - 0 1",
      solution: ["d1d5"],
      hint: "Move the queen to d5 to create two threats."
    },
    {
      id: "puzzle_17",
      title: "Anastasia's Mate",
      category: "Advanced",
      goal: "White to move: Use the Knight's cover to deliver checkmate!",
      fen: "6k1/5Np1/8/8/2B5/8/6P1/6KR w - - 0 1",
      solution: ["h1h8"],
      hint: "Move the rook from h1 to h8."
    },
    {
      id: "puzzle_18",
      title: "Back-Rank Rook Exchange Mate",
      category: "Advanced",
      goal: "White to move: Deliver checkmate on the back rank!",
      fen: "4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
      solution: ["e1e8"],
      hint: "Capture the rook on e8 with your rook."
    },
    {
      id: "puzzle_19",
      title: "Kingside Castling & Safety",
      category: "Advanced",
      goal: "White to move: Secure your King and prepare to pin Black's Queen!",
      fen: "r1b1k2r/pp3ppp/2n1p3/2b5/4q3/2P2N2/PP2BPPP/R1BQK2R w KQkq - 0 1",
      solution: ["e1g1"],
      hint: "Castle kingside to move the king to g1."
    },
    {
      id: "puzzle_20",
      title: "Bishop Development & Control",
      category: "Advanced",
      goal: "White to move: Develop your Bishop to control key diagonal squares!",
      fen: "4kb1r/p2n1ppp/4p3/8/3P4/8/PPP2PPP/R1B1K1NR w KQk - 0 1",
      solution: ["c1f4"],
      hint: "Move the bishop from c1 to f4."
    },
    {
      id: "puzzle_21",
      title: "Rook Back-Rank Exchange Mate",
      category: "Advanced",
      goal: "White to move: Capture Black's Rook on d8 for checkmate!",
      fen: "3r2k1/5ppp/8/8/8/8/1Q3PPP/3R2K1 w - - 0 1",
      solution: ["d1d8"],
      hint: "Capture the rook on d8 with your rook."
    },
    {
      id: "puzzle_22",
      title: "Pawn Promotion Queen",
      category: "Advanced",
      goal: "White to move: Promote your passed pawn to a Queen!",
      fen: "8/4P3/8/8/8/8/pk6/R3K3 w - - 0 1",
      solution: ["e7e8"],
      hint: "Push the pawn from e7 to e8 and promote."
    },
    {
      id: "puzzle_23",
      title: "Queen Back-Rank Infiltration",
      category: "Advanced",
      goal: "White to move: Infiltrate e8 with your Queen for checkmate!",
      fen: "6k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1",
      solution: ["e2e8"],
      hint: "Move the queen from e2 to e8."
    },
    {
      id: "puzzle_24",
      title: "Rook Exchange Mate Finale",
      category: "Advanced",
      goal: "White to move: Capture on b8 for back-rank checkmate!",
      fen: "1r4k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
      solution: ["b1b8"],
      hint: "Capture the rook on b8 with your rook."
    }
  ];

  function findPuzzle(id) {
    return practicePuzzles.find((puzzle) => puzzle.id === id) || null;
  }

  function normalizeSolution(solution) {
    if (Array.isArray(solution)) return solution.filter((move) => typeof move === "string");
    if (typeof solution !== "string") return [];
    try {
      const parsed = JSON.parse(solution);
      return Array.isArray(parsed) ? parsed.filter((move) => typeof move === "string") : [];
    } catch (_error) {
      return [];
    }
  }

  window.ChessPuzzles = Object.freeze({
    all: Object.freeze(practicePuzzles),
    find: findPuzzle,
    normalizeSolution
  });
})();
