const http = require('http');

http.createServer((req, res) => {
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
    </style>
  </head>
  <body>
    <textarea id="txt"></textarea>
    <script>
      const txt = document.getElementById("txt");
      console.log(txt);
      let T = null;
      txt.addEventListener('input', ev => {
        T != null && clearTimeout(T);
        T = setTimeout(async () => {
          const res = await fetch('input', {method: 'POST'});
        }, 2000);
      });
    </script>
  </body>
</html>
  `);
  res.end();
}).listen(8080);


