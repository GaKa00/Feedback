import { WebSocketServer, WebSocket as WSWebSocket } from "ws";
import http from "http";
import net from "net";
import { wsArcjet } from "../arcjet";

// Extend WebSocket type with custom properties
interface WebSocket extends WSWebSocket {
  isAlive?: boolean;
  subscriptions?: Set<string>;
}

const matchSubscribers = new Map<string, Set<WebSocket>>();

function subscribe(matchId: string, socket: WebSocket): void {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId)!.add(socket);
  socket.subscriptions!.add(matchId);
}

function unsubscribe(matchId: string, socket: WebSocket): void {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  subscribers.delete(socket);
  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket: WebSocket): void {
  for (const matchId of socket.subscriptions!) {
    unsubscribe(matchId, socket);
  }
}

function broadcastToMatch(matchId: string, data: any): void {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(data);
  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

function sendJson(socket: WebSocket, data: any): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function broadcastToAll(wss: WebSocketServer, data: any): void {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }
}

export function attachWebSocketServer(server: http.Server): {
  broadcastMatchCreated: (match: any) => void;
  broadcastCommentary: (matchId: string, comment: any) => void;
} {
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  server.on(
    "upgrade",
    async (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const { pathname } = url;

      if (pathname !== "/ws") {
        return;
      }

      if (wsArcjet) {
        try {
          // Create a context object for WebSocket protection
          const context = {
            getBody: async () => new Uint8Array(),
          };
          const decision = await wsArcjet.protect(req as any, context as any);

          if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
              socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
            } else {
              socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            }
            socket.destroy();
            return;
          }
        } catch (e) {
          console.error("WS upgrade protection error", e);
          socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    },
  );

  wss.on("connection", async (socket: WebSocket, req) => {
    socket.isAlive = true;
    socket.subscriptions = new Set();

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "welcome" });

    socket.on("message", (data: Buffer) => {
      handleMessage(socket, data);
    });

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    socket.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as WebSocket;
      if (socket.isAlive === false) return socket.terminate();

      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  function broadcastMatchCreated(match: any): void {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  function broadcastCommentary(matchId: string, comment: any): void {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentary };
}

function handleMessage(socket: WebSocket, data: Buffer): void {
  let message: any;

  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJson(socket, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(String(message.matchId), socket);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribe(String(message.matchId), socket);
    socket.subscriptions!.delete(String(message.matchId));
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
    return;
  }
}
