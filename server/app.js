const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');



// Serveur HTTP avec un acces restreint au fichiers statiques du dossier public 
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, '..', 'public', req.url === '/' ? 'lobby.html' : req.url);

  if (!filePath.startsWith(path.join(__dirname, '..', 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }



  fs.readFile(filePath, (err, data) => {

    if (err) {
      res.writeHead(404);
      res.end('Not found');

    } else {
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
      }[ext] || 'text/plain';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });

});


// Démarrage du serveur http
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

