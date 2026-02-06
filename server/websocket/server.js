import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { db } from '../db/client.js';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET must be set in production');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      maxPayload: 102400, // 100KB limit to prevent memory exhaustion
    });
    this.channels = new Map(); // channel -> Set of clients
    this.clients = new Map(); // client -> Set of channels

    this.setup();
  }

  setup() {
    this.wss.on('connection', async (ws, req) => {
      console.log('WebSocket client connected');

      // Authenticate client
      const token = this.extractToken(req);
      let user = null;

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          user = await db.collection('users').findOne(
            { id: decoded.userId, active: true },
            { projection: { id: 1, email: 1, full_name: 1 } }
          );
        } catch (error) {
          console.error('WebSocket auth error:', error);
        }
      }

      const client = {
        ws,
        user,
        channels: new Set(),
        id: user?.id || `anon-${Date.now()}`,
      };

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(client, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(client);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        event: 'connected',
        user: user ? { id: user.id, email: user.email } : null,
      }));
    });
  }

  extractToken(req) {
    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('token');
  }

  async handleMessage(client, data) {
    const { event, channel, payload } = data;

    // Anonymous clients can only subscribe to public channels
    if (!client.user && event !== 'subscribe') {
      client.ws.send(JSON.stringify({ error: 'Authentication required for this action' }));
      return;
    }

    switch (event) {
      case 'subscribe':
        // Anonymous clients restricted to public channels only
        if (!client.user && channel && !channel.startsWith('public:')) {
          client.ws.send(JSON.stringify({ error: 'Authentication required for non-public channels' }));
          return;
        }
        this.subscribe(client, channel);
        break;

      case 'unsubscribe':
        this.unsubscribe(client, channel);
        break;

      case 'broadcast':
        this.broadcast(channel, {
          event: 'broadcast',
          channel,
          payload,
          from: client.user.id,
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        client.ws.send(JSON.stringify({ error: 'Unknown event' }));
    }
  }

  subscribe(client, channelName) {
    if (!channelName) {
      client.ws.send(JSON.stringify({ error: 'Channel name required' }));
      return;
    }

    // Add client to channel
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
    }
    this.channels.get(channelName).add(client);
    client.channels.add(channelName);

    client.ws.send(JSON.stringify({
      event: 'subscribed',
      channel: channelName,
    }));

    console.log(`Client ${client.id} subscribed to ${channelName}`);
  }

  unsubscribe(client, channelName) {
    if (this.channels.has(channelName)) {
      this.channels.get(channelName).delete(client);
      if (this.channels.get(channelName).size === 0) {
        this.channels.delete(channelName);
      }
    }
    client.channels.delete(channelName);

    client.ws.send(JSON.stringify({
      event: 'unsubscribed',
      channel: channelName,
    }));

    console.log(`Client ${client.id} unsubscribed from ${channelName}`);
  }

  broadcast(channelName, message) {
    if (!this.channels.has(channelName)) {
      return;
    }

    const messageStr = JSON.stringify(message);
    this.channels.get(channelName).forEach((client) => {
      if (client.ws.readyState === 1) { // WebSocket.OPEN
        client.ws.send(messageStr);
      }
    });
  }

  // Public method to broadcast from server
  publish(channelName, event, payload) {
    this.broadcast(channelName, {
      event,
      channel: channelName,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client) {
    // Unsubscribe from all channels
    client.channels.forEach((channelName) => {
      this.unsubscribe(client, channelName);
    });

    console.log(`Client ${client.id} disconnected`);
  }
}

export default WebSocketManager;
