import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Starts a self-contained in-process HTTP server serving the production dist folder.
 * Automatically ensures dist/ is built, binds to an ephemeral OS-assigned free port (no collisions),
 * and eliminates net::ERR_CONNECTION_REFUSED.
 */
export async function startLocalServer(preferredPort = 0) {
  // Ensure dist is built
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.log('[local-server] dist/index.html not found. Running npm run build...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execSync(`${npmCmd} run build`, { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  const server = http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1');
      let reqPath = decodeURIComponent(parsedUrl.pathname);

      // Strip query parameters and clean path
      if (reqPath.endsWith('/')) {
        reqPath += 'index.html';
      }

      let filePath = path.join(DIST_DIR, reqPath);

      // SPA fallback: if file does not exist or is a directory without index.html, serve dist/index.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal server error: ${err.message}`);
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      reject(err);
    });

    server.listen(preferredPort, '127.0.0.1', () => {
      const addr = server.address();
      const port = addr.port;
      const url = `http://127.0.0.1:${port}/`;
      console.log(`[local-server] Static server active at ${url}`);

      resolve({
        server,
        port,
        url,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}
