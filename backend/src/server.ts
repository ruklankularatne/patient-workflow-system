import 'dotenv/config';
import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app';

const port = Number(process.env.PORT || 8080);
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'hello', message: 'connected' }));
});

server.listen(port, () => {
  console.log(`API listening on :${port}`);
});
