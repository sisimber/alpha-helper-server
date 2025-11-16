const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const wss = new WebSocket.Server({ noServer: true });

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Все endpoint-ы БЕЗ проверки ключей
app.post('/api', (req, res) => {
  const { operator_id, action } = req.query;
  
  console.log(`📨 Request: ${action} from operator ${operator_id}`);
  
  // ВСЕГДА разрешаем
  res.json({
    success: true,
    data: { 
      processed: true, 
      action: action,
      stats: {
        invites_sent: Math.floor(Math.random() * 10),
        likes_processed: Math.floor(Math.random() * 5)
      }
    },
    sid: uuidv4(),
    wss_url: `wss://${req.get('host')}/ws`,
    auth: uuidv4(),
    operator_id: operator_id
  });
});

app.post('/', (req, res) => {
  const { operator_id } = req.query;
  
  console.log(`🚀 Init for operator ${operator_id}`);
  
  // ВСЕГДА разрешаем
  res.json({
    success: true,
    sid: uuidv4(),
    wss_url: `wss://${req.get('host')}/ws`,
    auth: uuidv4(),
    status: "approved",
    operator_id: operator_id
  });
});

// WebSocket
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket connected');
  
  ws.send(JSON.stringify({
    type: 'WELCOME', 
    message: 'Connected to Alpha Helper'
  }));
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Alpha Helper Server (NO KEYS) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔓 Access: OPEN (no keys required)`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
