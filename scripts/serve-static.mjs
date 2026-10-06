import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';

// Development verification only: serves the exported files exactly at /timer/.
const root = path.resolve('out');
const portArgument = process.argv.indexOf('--port');
const port = Number(process.env.PORT ?? (portArgument >= 0 ? process.argv[portArgument + 1] : 3000));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.json': 'application/json' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
    if (pathname === '/timer') { response.writeHead(301, { Location: '/timer/' }); response.end(); return; }
    if (!pathname.startsWith('/timer/')) { response.writeHead(404); response.end('Not found'); return; }
    let file = path.resolve(root, pathname.slice('/timer/'.length));
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, 'index.html');
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(bytes);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Static preview: http://127.0.0.1:${port}/timer/`));
