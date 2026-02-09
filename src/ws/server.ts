import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";

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

function attachWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", (socket : WebSocket) => {
    sendJson(socket, {
      type: "welcome",
      message: "Welcome to the WebSocket server!",
    });
  });

  function broadcastMatchCreated(wss: WebSocketServer, match: any) {
    broadcast(wss, { type: "matchCreated", match });
  }

  return { broadcastMatchCreated };
}
