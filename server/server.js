const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const gameEngine = require("./gameEngine");

const server = http.createServer((req, res) => {
  const publicDir = path.join(__dirname, "..", "public");
  let filePath = path.join(publicDir, req.url === "/" ? "login.html" : req.url);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  //fs.readFile est une fonction asynchrone de node qui lit le contenu d’un fichier
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      //Recupere l'extension
      const ext = path.extname(filePath);
      // Si l’extension n’est pas dans la liste, on renvoie "text/plain"
      // Pas de media donc limité au html/css/js
      const contentType =
        {
          ".html": "text/html",
          ".css": "text/css",
          ".js": "application/javascript",
        }[ext] || "text/plain";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
});

const wss = new WebSocket.Server({ server });
// liste des connexion
// prenom + socket
const clients = new Map();

// envois et maj de la liste des parties disponibles
function gameList() {
  const list = gameEngine.getAvailableGames();
  const msg = JSON.stringify({ type: "game_list", data: list });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("✅ Connexion WebSocket");

  ws.on("message", (data, isBinary) => {
    const text = isBinary ? data : data.toString("utf8");

    try {
      const { type, data: payload } = JSON.parse(text);

      if (type === "login" || type === "lobby_join") {
        clients.set(ws, payload.name);
        ws.send(
          JSON.stringify({
            type: "game_list",
            data: gameEngine.getAvailableGames(),
          })
        );
      }

      if (type === "create_game") {
        gameEngine.createGame(ws, payload.name);
        gameList();
      }

      if (type === "join_game") {
        const result = gameEngine.joinGame(payload.gameId, ws, payload.name);

        if (result.error) {
          ws.send(JSON.stringify({ type: "error", data: result.error }));
        } else {
          ws.send(JSON.stringify({ type: "joined", data: result.id }));
        }

        gameList();
      }

      if (type === "play") {
        gameEngine.playMove(payload.gameId, ws, payload.row, payload.col);
      }
    } catch (err) {
      console.log("❌ Erreur JSON", err);
      ws.send(JSON.stringify({ type: "error", data: "Message mal formaté" }));
    }
  });

  ws.on("close", () => {
    const name = clients.get(ws);
    console.log(`🔌 Déconnexion de ${name}`);
    clients.delete(ws);
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
