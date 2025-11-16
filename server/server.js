const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const wss = new WebSocket.Server({ noServer: true });

// ==================== СИСТЕМА БЕЗ КЛЮЧЕЙ ====================
const OPERATOR_SESSIONS = {};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    active_sessions: Object.keys(OPERATOR_SESSIONS).length
  });
});

// Основной endpoint для расширения
app.post('/api', (req, res) => {
  const { operator_id, action, payload_hash } = req.query;
  
  console.log(`📨 Request: ${action} from operator ${operator_id}`);
  
  // АВТОМАТИЧЕСКИ РАЗРЕШАЕМ ВСЕМ - БЕЗ ПРОВЕРКИ КЛЮЧЕЙ
  if (!operator_id) {
    return res.status(400).json({
      error: "MISSING_OPERATOR_ID",
      message: "Operator ID is required"
    });
  }
  
  // Создаем или обновляем сессию оператора
  if (!OPERATOR_SESSIONS[operator_id]) {
    OPERATOR_SESSIONS[operator_id] = {
      operator_id: operator_id,
      first_seen: new Date().toISOString(),
      last_active: new Date().toISOString(),
      requests_count: 0
    };
  }
  
  OPERATOR_SESSIONS[operator_id].last_active = new Date().toISOString();
  OPERATOR_SESSIONS[operator_id].requests_count += 1;
  
  // Обработка действий бота
  try {
    const result = processBotAction(action, req.body, operator_id);
    
    res.json({
      success: true,
      data: result,
      sid: uuidv4(),
      wss_url: `wss://${req.get('host')}/ws`,
      auth: uuidv4(),
      operator_id: operator_id
    });
    
  } catch (error) {
    res.status(500).json({
      error: "PROCESSING_ERROR",
      message: error.message
    });
  }
});

// Endpoint для инициализации
app.post('/', (req, res) => {
  const { operator_id } = req.query;
  
  console.log(`🚀 Init request for operator ${operator_id}`);
  
  // АВТОМАТИЧЕСКИ РАЗРЕШАЕМ
  res.json({
    success: true,
    sid: uuidv4(),
    wss_url: `wss://${req.get('host')}/ws`,
    auth: uuidv4(),
    status: "approved",
    operator_id: operator_id
  });
});

// WebSocket для реального времени
function broadcastToAdmins(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket connected');
  
  ws.send(JSON.stringify({
    type: 'WELCOME',
    message: 'Connected to Alpha Helper'
  }));
});

// ==================== ЗАГЛУШКА ДЛЯ ЛОГИКИ ====================

function processBotAction(action, payload, operatorId) {
  console.log(`🤖 Processing ${action} for operator ${operatorId}`);
  
  return {
    processed: true,
    action: action,
    operator: operatorId,
    timestamp: new Date().toISOString(),
    // Имитация ответа от оригинального сервера
    stats: {
      invites_sent: Math.floor(Math.random() * 10),
      likes_processed: Math.floor(Math.random() * 5)
    }
  };
}

// ==================== ЗАПУСК СЕРВЕРА ====================

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
