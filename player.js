// Player-to-player feature utilities.
(function () {
  const modes = Object.freeze({
    local: "local",
    private: "private"
  });

  function createLocalState(timeControl) {
    return {
      mode: modes.local,
      privateRoom: false,
      computerMode: false,
      puzzleMode: false,
      timeControl: timeControl || "unlimited",
      variant: "standard",
      color: null
    };
  }

  function createPrivateState(roomCode, isHost) {
    return {
      mode: modes.private,
      privateRoom: true,
      computerMode: false,
      puzzleMode: false,
      roomCode: String(roomCode || "").toUpperCase(),
      host: Boolean(isHost),
      variant: "standard",
      color: null
    };
  }

  function isPlayerMode(state) {
    return state?.mode === modes.local || state?.mode === modes.private;
  }

  window.ChessPlayer = Object.freeze({
    modes,
    createLocalState,
    createPrivateState,
    isPlayerMode
  });
})();
