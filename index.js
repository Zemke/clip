const http = require('http');
const EventEmitter = require("node:events");
const fs = require('fs');
const path = require('path');

function index(res) {
  res.writeHead(200, {'content-type': 'text/html'});
  res.write(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charset="UTF-8"> 
    <title>📎 clip</title>
    <style>
      * {
        margin: 0;
        padding: 0;
      }
      @media (prefers-color-scheme: dark) {
        html, body {
          background: #1b1b1b;
          color: #cdcdcd;
        }
      }
      textarea {
        width: 90%;
        height: 20rem;
        background: #343434;
        color: #cdcdcd;
        padding: 1rem;
        margin: 1rem;
        border: 1px solid #000;
      }
      input[type=file] {
        margin: 1rem;
      }
    </style>
  </head>
  <body>
    <textarea id="txt"></textarea>
    <input type="file" multiple id="files" name="files">
    <script>
      const TXT = document.getElementById("txt");
      window.addEventListener('load', function () {
        const SSE = new EventSource("clip");
        SSE.addEventListener("clip", e => TXT.value = e.data);
      });
      let T = null;
      TXT.addEventListener('input', ev => {
        T != null && clearTimeout(T);
        const body = ev.target.value;
        T = setTimeout(() => fetch('clip', {method: 'POST', body}), 500);
      });

      const F = document.getElementById('files')
      F.addEventListener('change', async e => {
        F.disabled = true;
        const uploads = Array.from(e.target.files).map(async f =>
          await fetch(
            'file',
            {method: 'POST', body: f, headers: {'X-Filename': f.name}}
          ));
        await Promise.all(uploads);
        F.value = null;
        F.disabled = false;
      });
    </script>
  </body>
</html>
  `);
}

function read(req) {
  return new Promise((resolve, reject) => {
    let buff = '';
    req.on('data', chunk => buff += chunk);
    req.on('end', () => resolve(buff));
    req.on('error', err => reject(err));
    return buff;
  });
}

const E = new EventEmitter();
var clip = "";

http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    index(res);
    res.end();
  } else if (req.method === "GET" && req.url === "/clip") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    const write = () => {
      res.write('event: clip' + "\n")
      res.write('data: ' + clip + "\n\n");
    };
    E.on('clip', write);
    write();
  } else if (req.method === "POST" && req.url === "/clip") {
    res.writeHead(200);
    clip = await read(req);
    E.emit('clip');
    res.end();
  } else if (req.method === "POST" && req.url === "/file") {
    const p = path.resolve('files', req.headers['x-filename']);
    const file = fs.createWriteStream(p);
    req.pipe(file);
    req.on('end', () => res.end());
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(8080);

