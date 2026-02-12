import express from "express";
import MatchRouter from "./routes/matches";
import http from "http";

import { securityMiddleware } from "./arcjet";
import attachWebSocketServer from "./ws/server";

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);
app.get("/", (_req, res) => {
  res.json({ message: "Hello from Express TypeScript server!" });
});

app.use((req, res, next) => securityMiddleware(req, res, next));
app.use("/matches", MatchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;

app.listen(PORT, HOST, () => {
  const url =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server listening at ${url}`);
  console.log(`WebSocket server attached at ws://${HOST}:${PORT}/ws`);
});
