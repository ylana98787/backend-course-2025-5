const { Command } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const superagent = require('superagent');

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <cache>', 'шлях до директорії кешу')
  .parse(process.argv);

const options = program.opts();

async function ensureCacheDir() {
  try {
    await fs.access(options.cache);
  } catch (error) {
    await fs.mkdir(options.cache, { recursive: true });
    console.log(`Створено директорію кешу: ${options.cache}`);
  }
}

async function startServer() {
  await ensureCacheDir();
  
  const server = http.createServer(async (req, res) => {
    const urlPath = req.url;
    
    const match = urlPath.match(/^\/(\d+)$/);
    if (!match) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Невірний шлях. Використовуйте /{код}');
      return;
    }
    
    const statusCode = match[1];
    const filePath = path.join(options.cache, `${statusCode}.jpg`);
    
    try {
      switch (req.method) {
        case 'GET':
          try {
            // Спроба читати з кешу
            const image = await fs.readFile(filePath);
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(image);
          } catch (cacheError) {
            // Якщо немає в кеші - запит до http.cat
            try {
              const response = await superagent
                .get(`https://http.cat/${statusCode}`)
                .responseType('blob');
              
              // Зберігаємо в кеш
              await fs.writeFile(filePath, response.body);
              
              // Відправляємо клієнту
              res.writeHead(200, { 'Content-Type': 'image/jpeg' });
              res.end(response.body);
            } catch (httpError) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Картинку не знайдено в кеші та на http.cat');
            }
          }
          break;
          
        case 'PUT':
          const chunks = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', async () => {
            const imageData = Buffer.concat(chunks);
            await fs.writeFile(filePath, imageData);
            res.writeHead(201, { 'Content-Type': 'text/plain' });
            res.end('Картинку збережено в кеш');
          });
          break;
          
        case 'DELETE':
          try {
            await fs.access(filePath);
            await fs.unlink(filePath);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Картинку видалено з кешу');
          } catch (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Картинку не знайдено в кеші');
          }
          break;
          
        default:
          res.writeHead(405, { 'Content-Type': 'text/plain' });
          res.end('Метод не дозволений');
      }
    } catch (error) {
      console.error('Помилка сервера:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Внутрішня помилка сервера');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Проксі-сервер запущено на http://${options.host}:${options.port}`);
  });
}

startServer().catch(console.error);