const games = new Map();

function generateGameId() {
  return "G" + Math.floor(1000 + Math.random() * 9000);
}

function createGame(ws, playerName) {
  const id = generateGameId();
  const game = {
    id,
    players: [], // sockets des joueurs
    names: [], // noms a affiché
    creator: { ws, name: playerName }, // créateur en attente
    board: [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ],
    turn: 0, // 0 ou 1
    status: "waiting", // waiting | playing | finished
    winner: null, // "egality" | 0 | 1 | null
  };

  games.set(id, game);
  return game;
}

function joinGame(gameId, ws, playerName) {
  const game = games.get(gameId);
  if (!game) return { error: "Partie introuvable." };
  if (game.status === "finished") return { error: "Partie terminée." };

  // Quand le joueur est redirigé dans la partie, un nouveau WebSocket est ouvert pour le jeux
  if (game.creator && game.creator.name === playerName) {
    game.creator.ws = ws;
  }

  // Ajouter le créateur en joueur actif
  if (game.creator) {
    game.players.push(game.creator.ws);
    game.names.push(game.creator.name);
    game.creator = null;
  }

  //si le joueur est déjà dans la partie, on remplace son socket
  const existingIndex = game.names.indexOf(playerName);
  if (existingIndex !== -1) {
    game.players[existingIndex] = ws; // remplace l'ancien socket par le nouveau
  } else {
    // Sinon, on l'ajoute si la partie n'est pas pleine
    if (game.players.length >= 2) {
      return { error: "Partie pleine." };
    }
    game.players.push(ws);
    game.names.push(playerName);
  }

  // Démarrer si on a 2 joueurs
  if (game.players.length === 2) {
    game.status = "playing";

    game.players.forEach((playerWs, index) => {
      try {
        playerWs.send(
          JSON.stringify({
            type: "start_game",
            data: {
              gameId,
              board: game.board,
              yourTurn: index === game.turn,
              symbol: index === 0 ? "X" : "O",
              opponent: game.names[1 - index],
            },
          })
        );
      } catch {}
    });
  } else {
    game.status = "waiting";
  }

  return game;
}

function playMove(gameId, ws, row, col) {
  const game = games.get(gameId);
  if (!game || game.status !== "playing") return;

  const playerIndex = game.players.indexOf(ws);
  if (playerIndex !== game.turn) return;

  // bornes + case libre
  if (row < 0 || row > 2 || col < 0 || col > 2) return;
  if (game.board[row][col] !== "") return;

  const symbol = playerIndex === 0 ? "X" : "O";
  game.board[row][col] = symbol;

  const result = checkWinner(game.board);

  if (result === symbol) {
    game.status = "finished";
    game.winner = playerIndex;
  } else if (result === "egality") {
    game.status = "finished";
    game.winner = "egality";
  } else {
    game.turn = 1 - game.turn;
  }

  //  update / game_over
  game.players.forEach((playerWs, index) => {
    const payload = {
      type: game.status === "finished" ? "game_over" : "update",
      data: {
        board: game.board,
        lastMove: { row, col, symbol },
        yourTurn: game.status === "playing" ? index === game.turn : false,
        currentPlayer: game.status === "playing" ? game.names[game.turn] : null,
      },
    };

    if (game.status === "finished") {
      payload.data.winner =
        game.winner === "egality" ? "egality" : game.names[game.winner];
    }

    try {
      playerWs.send(JSON.stringify(payload));
    } catch {}
  });
}

function checkWinner(board) {
  const lines = [
    // lignes
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],
    // colonnes
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],
    // diagonales
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]],
  ];

  for (const line of lines) {
    if (line[0] && line[0] === line[1] && line[0] === line[2]) {
      return line[0]; // "X" ou "O"
    }
  }

  const isFull = board.flat().every((e) => e !== "");
  if (isFull) return "egality";

  return null;
}

//Liste des parties dans le lobby.

function getAvailableGames() {
  const list = [];
  for (const [id, game] of games) {
    const hasRoom = game.players.length < 2;
    const notFinished = game.status !== "finished";
    if (hasRoom && notFinished) {
      list.push({
        id,
        creator: game.creator ? game.creator.name : game.names[0] || "???",
      });
    }
  }
  return list;
}

module.exports = {
  createGame,
  joinGame,
  playMove,
  getAvailableGames,
};
