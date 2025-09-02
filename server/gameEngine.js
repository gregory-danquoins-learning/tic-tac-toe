// genere un ID unique
const { randomUUID } = require("crypto");

const games = new Map(); // id => { id, player1, player2, status }

function resetEngine() {
  games.clear();
}

// Utilisateurs associés à leurs sockets
const clients = new Map(); // ws => gameId

function createGame(ws) {
  console.log("####fffffff####", ws);

  const id = randomUUID();
  console.log(id);

  const game = {
    id,
    player1: ws,
    player2: null,
    status: "waiting", // ou 'full'
  };

  games.set(id, game);
  clients.set(ws, id);

  ws.send(
    JSON.stringify({
      type: "game_created",
      data: { id },
    })
  );

  broadcastAvailableGames();
}

function sendAvailableGames(ws) {
  const available = Array.from(games.values())
    .filter((game) => game.status === "waiting")
    .map((game) => ({ id: game.id }));

  ws.send(
    JSON.stringify({
      type: "games_list",
      data: available,
    })
  );
}

function joinGame(ws, id) {
  const game = games.get(id);

  if (!game || game.status !== "waiting") {
    ws.send(
      JSON.stringify({
        type: "error",
        data: "Partie introuvable ou déjà commencée",
      })
    );
    return;
  }

  game.player2 = ws;
  game.status = "full";
  clients.set(ws, id);

  // Informer les deux joueurs que la partie démarre
  [game.player1, game.player2].forEach((socket, index) => {
    socket.send(
      JSON.stringify({
        type: "start_game",
        data: {
          id: game.id,
          player: index === 0 ? "X" : "O",
        },
      })
    );
  });

  broadcastAvailableGames();
}

function broadcastAvailableGames() {
  const available = Array.from(games.values())
    .filter((game) => game.status === "waiting")
    .map((game) => ({ id: game.id }));

  for (const ws of clients.keys()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: "games_list",
          data: available,
        })
      );
    }
  }
}

function removePlayer(ws) {
  const gameId = clients.get(ws);
  if (!gameId) return;

  const game = games.get(gameId);

  if (!game) return;

  if (game.player1 === ws || game.player2 === ws) {
    games.delete(gameId);
    clients.delete(ws);
    if (game.player1 && game.player1 !== ws) clients.delete(game.player1);
    if (game.player2 && game.player2 !== ws) clients.delete(game.player2);
  }

  broadcastAvailableGames();
}

module.exports = {
  resetEngine,
  createGame,
  sendAvailableGames,
  joinGame,
  removePlayer,
};
