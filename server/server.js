const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const USER_TOKENS = {
  "demo_key_12345": {
    type: "single_operator",
    assigned_operator: null,
    status: "active",
    created_at: new Date().toISOString(),
    violation_attempts: 0,
    usage_history: []
  }
};

const wss = new WebSocket.Server({ noServer: true });

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    active_tokens: Object.keys(USER_TOKENS).length
  });
});

app.post('/api', (req, res) => {
  const { user_token, operator_id, action, payload_hash } = req.query;
  
  console.log(`📨 Request: ${action} from operator ${operator_id}`);
  
  if (!USER_TOKENS[user_token]) {
    return res.status(403).json({
      error: "INVALID_TOKEN",
      message: "Неверный ключ доступа"
    });
  }
  
  const token = USER_TOKENS[user_token];
  
  if (token.status === "blocked") {
    return res.status(403).json({
      error: "KEY_BLOCKED",
      message: "Ключ заблокирован за нарушение правил",
      reason: token.block_reason,
      blocked_at: token.blocked_at
    });
  }
  
  if (token.assigned_operator && token.assigned_operator !== operator_id) {
    token.status = "blocked";
    token.violation_attempts += 1;
    token.blocked_at = new Date().toISOString();
    token.block_reason = `Обнаружено использование на multiple операторах: ${token.assigned_operator} и ${operator_id}`;
    
    console.log(`🚨 KEY BLOCKED: ${user_token} - ${token.block_reason}`);
    
    return res.status(403).json({
      error: "KEY_BLOCKED",
      message: "Ключ заблокирован за попытку использования на multiple операторах",
      details: `Ключ привязан к оператору: ${token.assigned_operator}`,
      permanent: true
    });
  }
  
  if (!token.assigned_operator) {
    token.assigned_operator = operator_id;
    token.usage_history.push({
      operator_id: operator_id,
      first_used: new Date().toISOString(),
      ip: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    console.log(`✅ Key ${user_token} assigned to operator ${operator_id}`);
  }
  
  try {
    const result = {
      processed: true,
      action: action,
      operator: operator_id,
      timestamp: new Date().toISOString(),
      stats: {
        invites_sent: Math.floor(Math.random() * 10),
        likes_processed: Math.floor(Math.random() * 5)
      }
    };
    
    res.json({
      success: true,
      data: result,
      sid: uuidv4(),
      wss_url: `wss://${req.get('host')}/ws`,
      auth: uuidv4(),
      operator_assigned: token.assigned_operator
    });
    
  } catch (error) {
    res.status(500).json({
      error: "PROCESSING_ERROR", 
      message: error.message
    });
  }
});

function processBotAction(action, payload, operatorId) {
  console.log(`🤖 Processing ${action} for operator ${operatorId}`);
  return {
    processed: true,
    action: action,
    operator: operatorId,
    timestamp: new Date().toISOString()
  };
}

const server = app.listen(PORT, () => {
  console.log(`🚀 Custom Alpha Helper Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Demo token: demo_key_12345`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
