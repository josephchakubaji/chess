export class DailyPuzzleSourceError extends Error {
  readonly status: 422 | 502;

  constructor(message: string, status: 422 | 502) {
    super(message);
    this.name = "DailyPuzzleSourceError";
    this.status = status;
  }
}

export async function fetchDailyPuzzleRow(date: string) {
  const sourceResponse = await fetch("https://lichess.org/api/puzzle/daily", {
    headers: { Accept: "application/json" },
  });
  if (!sourceResponse.ok) {
    throw new DailyPuzzleSourceError("Unable to fetch today's puzzle", 502);
  }

  const sourceData = await sourceResponse.json();
  const sourcePuzzle = sourceData?.puzzle;
  const solution = sourcePuzzle?.solution;
  if (
    !sourcePuzzle?.id || !sourcePuzzle?.fen || !Array.isArray(solution) ||
    solution.length < 4 || solution.length > 6 ||
    solution.some((move) => typeof move !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))
  ) {
    throw new DailyPuzzleSourceError("Today's source puzzle is not a 2-3 move line", 422);
  }

  const themes = Array.isArray(sourcePuzzle.themes)
    ? sourcePuzzle.themes.filter((theme) => typeof theme === "string")
    : [];
  const themeTitle = themes[0]
    ? themes[0].replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())
    : "Tactical Challenge";
  const moveCount = Math.ceil(solution.length / 2);

  return {
    date,
    puzzle_id: `daily_${date}_${sourcePuzzle.id}`,
    source_puzzle_id: sourcePuzzle.id,
    title: `Daily: ${themeTitle}`,
    category: "Advanced",
    goal: `Find the best line in ${moveCount} moves.`,
    fen: sourcePuzzle.fen,
    solution,
    hint: "Look for forcing checks, captures, and threats. Calculate the full line.",
    rating: sourcePuzzle.rating || null,
    themes,
    source: "lichess",
  };
}
