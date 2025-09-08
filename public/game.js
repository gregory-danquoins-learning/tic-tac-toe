// Récupération du nom du joueur depuis le localStorage.
const playerName = localStorage.getItem("username");
if (!playerName) window.location.href = "/login.html";


const gameId = localStorage.getItem("gameId");
if (!gameId) window.location.href = "/lobby.html";

// Variables globales pour la partie
let socket;      // La connexion WebSocket avec le serveur
let symbol;      // Le symbole du joueur ("X" ou "O")
let yourTurn = false; // Indique si c’est au joueur actuel de jouer

// Affichage du nom du joueur dans la page
document.getElementById("playerName").textContent = playerName;

// Fonction qui crée le plateau de jeu (3x3)
// Elle reçoit l’état actuel du board (tableau 2D).
function createBoard(board) {
  const container = document.getElementById("board");
  container.innerHTML = ""; // On vide l’ancien plateau

  // Double boucle pour parcourir les lignes et colonnes
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = document.createElement("div"); // Création d’une case
      cell.className = "cell"; // Style CSS appliqué
      cell.dataset.row = row;  // Sauvegarde la position (ligne)
      cell.dataset.col = col;  // Sauvegarde la position (colonne)
      cell.textContent = board[row][col]; // Affiche "X", "O" ou vide

      // Si la case est vide, on autorise le clic pour jouer
      if (board[row][col] === "") {
        cell.addEventListener("click", () => play(row, col));
      }

      container.appendChild(cell); // Ajout de la case dans le plateau
    }
  }
}

// Met à jour le texte de statut 
function updateStatus(text) {
  document.getElementById("status").textContent = text;
}

// Fonction déclenchée quand un joueur clique sur une case
function play(row, col) {
  // On bloque si ce n’est pas notre tour
  if (!yourTurn) return;

  // On envoie la position jouée au server 
  socket.send(JSON.stringify({
    type: "play",
    data: { gameId, row, col }
  }));

  // On passe la main à l’adversaire
  yourTurn = false;
}

// Connexion au server 
function connectWebSocket() {
  socket = new WebSocket(`ws://${location.host}`);

  // Quand la connexion est ouverte, on informe le serveur qu’on rejoint une partie
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ 
      type: "join_game", 
      data: { name: playerName, gameId } 
    }));
  });

  // Réception de messages du serveur
  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);

    // Début de la partie : on reçoit le symbole, l’adversaire et  plateau
    if (msg.type === "start_game") {
      symbol = msg.data.symbol;
      document.getElementById("opponentName").textContent = msg.data.opponent;
      yourTurn = msg.data.yourTurn;
      document.getElementById("turnInfo").textContent = yourTurn
        ? "C'est votre tour"
        : "Tour de l'adversaire";
      createBoard(msg.data.board);
    }

    // Mise à jour du plateau 
    if (msg.type === "update") {
      yourTurn = msg.data.yourTurn;
      document.getElementById("turnInfo").textContent = yourTurn
        ? "C'est votre tour"
        : "Tour de l'adversaire";
      createBoard(msg.data.board);
    }

    // Fin de partie : affichage du résultat
    if (msg.type === "game_over") {
      createBoard(msg.data.board);
      if (msg.data.winner === "egality") {
        updateStatus("Match nul !");
      } else if (msg.data.winner === playerName) {
        updateStatus("🎉 Vous avez gagné !");
      } else {
        updateStatus("😞 Vous avez perdu !");
      }
      yourTurn = false;
      document.getElementById("turnInfo").textContent = "Partie terminée";
    }
  });

  // Si la connexion se coupe ,on affiche un message
  socket.addEventListener("close", () => {
    updateStatus("Connexion perdue");
  });
}

// Fonction pour quitter la partie 
function goBack() {
  localStorage.removeItem("gameId");
  window.location.href = "/lobby.html"; 
}

// Connexion au serveur dès le chargement 
connectWebSocket();
