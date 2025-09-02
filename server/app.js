const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const gameEngine = require("./gameEngine");

// Serveur HTTP avec un acces restreint au fichiers statiques du dossier public
const server = http.createServer((req, res) => {
  gameEngine.resetEngine();
  let filePath = path.join(
    __dirname,
    "..",
    "public",
    req.url === "/" ? "lobby.html" : req.url
  );

  if (!filePath.startsWith(path.join(__dirname, "..", "public"))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      const ext = path.extname(filePath);
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

// Serveur WebSocket natif avec la lib WebSocket
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  gameEngine.createGame(ws);
  console.log("Nouvelle connexion WebSocket");

  ws.on("message", (data, isBinary) => {
    // data est un Buffer pour un message texte ; on le convertit
    const text = isBinary ? data : data.toString("utf8");
    console.log("###### brut:", data); // Buffer
    console.log("###### texte:", text); // String

    try {
      const { type, data: payload } = JSON.parse(text);

      // renvoie proprement du JSON (chaîne), pas un Buffer
      ws.send(JSON.stringify({ type, data: payload, echoed: true }));
    } catch (e) {
      console.log("Erreur JSON", e);
      ws.send(JSON.stringify({ type: "error", data: "Message mal formaté" }));
    }
  });

  ws.on("close", () => {
    console.error("connection fermée");
  });
});

// Démarrage du serveur http
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
