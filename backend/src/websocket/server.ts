import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer | null = null;

export function initWebsocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });
  console.log("* WebSocket server started");

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "connected", ts: Date.now() }));
  });

  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  return wss;
}

export function broadcast(payload: unknown) {
  if (!wss) return;
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
