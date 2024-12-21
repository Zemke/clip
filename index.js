const http = require('http');
const EventEmitter = require("node:events");
const fs = require('fs');
const path = require('path');
const url = require('url');

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
      .container {
        margin: 2rem 1rem;
      }
      .textarea-wrapper {
        display: flex;
      }
      textarea {
        flex: 1;
        height: 15rem;
        padding: 1rem;
        border: 1px solid #000;
      }
      input[type=file] {
        margin: 1rem 0;
      }
      #files-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
      }
      a.file {
        padding: .1rem .1rem 0 0;
        color: black;
        max-width: 8rem;
        font-size: 1rem;
        word-wrap: anywhere;
        font-variant: all-petite-caps;
      }
      a.file img {
        max-width: 100%;
      }
      @media (prefers-color-scheme: dark) {
        html, body {
          background: #1b1b1b;
          color: #cdcdcd;
        }
        a.file {
          color: white;
        }
        textarea {
          color: #cdcdcd;
          background: #343434;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="textarea-wrapper">
        <textarea id="txt"></textarea>
      </div>
      <input type="file" multiple id="files" name="files">
      <div id="files-list">
      </div>
    </div>
    <script>
      const U = window.location.href.replace(/\\/$/, "");

      const TXT = document.getElementById("txt");
      window.addEventListener('load', function () {
        const SSE = new EventSource(U + "/clip");
        SSE.addEventListener("clip", e => TXT.value = e.data);
      });
      let T = null;
      TXT.addEventListener('input', ev => {
        T != null && clearTimeout(T);
        const body = ev.target.value;
        T = setTimeout(
          () => fetch(U  + '/clip', {method: 'POST', body}),
          500);
      });

      async function fetchFiles() {
        const L = document.getElementById('files-list');
        (await fetch(U + '/files', {method: 'GET'})
          .then(res => res.json()))
          .forEach(f => {
            if (document.getElementById(f) != null) {
              return;
            }
            const wrap = document.createElement("a");
            wrap.href = U + "/file?kill=1&q=" + f;
            wrap.target = "_blank";
            wrap.id = f;
            wrap.classList.add('file');
            if ((/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(f)) {
              const img = document.createElement("img");
              img.src = U + "/file?q=" + f;
              wrap.appendChild(img);
            } else {
              const n = document.createTextNode(f);
              wrap.appendChild(n);
            }
            L.prepend(wrap);
          });
      };
      fetchFiles();

      const F = document.getElementById('files')
      F.addEventListener('change', async e => {
        F.disabled = true;
        const uploads = Array.from(e.target.files).map(async f =>
          await fetch(
            U + '/file',
            {method: 'POST', body: f, headers: {'X-Filename': f.name}}
          ));
        await Promise.all(uploads);
        F.value = null;
        F.disabled = false;
        fetchFiles();
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
const MAX = 5;
E.setMaxListeners(MAX);
var clip = "";

http.createServer(async (req, res) => {
  const U = url.parse(req.url, true);
  if (req.method === "GET" && U.pathname === "/") {
    index(res);
    res.end();
  } else if (req.method === "GET" && U.pathname === "/clip") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    const write = () => {
      res.write('event: clip' + "\n")
      res.write('data: ' + clip + "\n\n");
    };
    if (E.listenerCount('clip') === MAX) {
      E.removeListener('clip', E.listeners('clip')[0]);
    }
    E.addListener('clip', write);
    write();
  } else if (req.method === "POST" && U.pathname === "/clip") {
    res.writeHead(200);
    clip = await read(req);
    E.emit('clip');
    res.end();
  } else if (req.method === "POST" && U.pathname === "/file") {
    const p = path.resolve('files', req.headers['x-filename']);
    const file = fs.createWriteStream(p);
    req.pipe(file);
    req.on('end', () => res.end());
  } else if (req.method === "GET" && U.pathname === "/files") {
    res.writeHead(200, {'content-type': 'application/json'});
    const filesList = fs.readdirSync(path.resolve('files')).filter(f => !f.startsWith('.'));
    res.write(JSON.stringify(filesList));
    res.end();
  } else if (req.method === "GET" && U.pathname === "/file") {
    const f = path.resolve('files', U.query.q);
    try {
      res.write(fs.readFileSync(f));
      res.end();
      if (U.query.kill === '1') {
        setTimeout(() => fs.unlinkSync(f), 10_000);
      }
    } catch {
      res.writeHead(404);
      res.end();
    }
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(8000);

