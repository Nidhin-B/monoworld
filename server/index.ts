import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { VillageRoom } from "./rooms/VillageRoom";

const port = Number(process.env.PORT || 2567);
const server = new Server({ transport: new WebSocketTransport() });
server.define("village", VillageRoom);

server.listen(port).then(() => {
  console.log(`MONOWORLD multiplayer server listening on port ${port}`);
}).catch((error) => {
  console.error("Failed to start MONOWORLD server:", error);
  process.exit(1);
});
