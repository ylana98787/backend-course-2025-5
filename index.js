#!/usr/bin/env node

const http = require('http');
const { program } = require('commander');
const fs = require('fs').promises;
const path = require('path');

// Оголошуємо обов'язкові опції
program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port', (v) => parseInt(v, 10))
  .requiredOption('-c, --cache <cacheDir>', 'cache directory path');

program.parse(process.argv);

const { host, port, cache: cacheDir } = program.opts();

// Створюємо кеш-директорію, якщо її немає
async function ensureCacheDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    // можемо вивести підтвердження
    console.log(`Cache directory ready: ${dir}`);
  } catch (err) {
    console.error('Не вдалося створити cache directory:', err);
    process.exit(1);
  }
}

// Простий HTTP сервер — поки що відповідає 404 для всього.
// (У наступних частинах доповнимо логіку GET/PUT/DELETE)
async function startServer() {
  await ensureCacheDir(cacheDir);

  const server = http.createServer((req, res) => {
    // Наразі просто відповідаємо, щоб перевірити що server працює.
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not implemented yet (Part 1 OK)');
  });

  server.listen(port, host, () => {
    console.log(`Server listening on ${host}:${port}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

startServer().catch(err => {
  console.error('Fatal error on startup:', err);
  process.exit(1);
});
