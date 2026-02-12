import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { wsArcjet } from "../arcjet";

function sendJson(socket: WebSocket, data: any) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function broadcast(wss: WebSocketServer, data: any) {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }
}

export default function attachWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on(
    "connection",
    async (socket: WebSocket, req: http.IncomingMessage | undefined) => {
      if (wsArcjet) {
        try {
          const decision = await wsArcjet.protect(req as any, {} as any);

          if (decision.isDenied()) {
            const code = decision.reason.isRateLimit() ? 1013 : 1008;
            const reason = decision.reason.isRateLimit()
              ? "Rate limit exceeded"
              : "Forbidden";
            socket.close(code, reason);
            return;
          }
        } catch (error) {
          console.error("Arcjet WebSocket error:", error);
          socket.close(1011, "Internal Server Error");
          return;
        }
      }

      sendJson(socket, {
        type: "welcome",
        message: "Welcome to the WebSocket server!",
      });
    },
  );

  function broadcastMatchCreated(match: any) {
    broadcast(wss, { type: "matchCreated", match });
  }

  return { broadcastMatchCreated };
}
