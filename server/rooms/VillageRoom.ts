import { Room, Client } from "colyseus";
import { MapSchema } from "@colyseus/schema";
import { PlayerState, VillageState } from "../state/PlayerState";

const COLORS = [0x496dca, 0xc56b57, 0x9b70bd, 0xd09a43, 0x4e9b8a, 0xc16f9d];

export class VillageRoom extends Room<VillageState> {
  maxClients = 8;

  onCreate() {
    this.setState(new VillageState());
    this.onMessage("move", (client, payload: { x?: number; y?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (typeof payload?.x !== "number" || typeof payload?.y !== "number") return;
      // Basic bounds validation for the first prototype. Tile collision comes next.
      player.x = Math.max(18, Math.min(782, Math.round(payload.x)));
      player.y = Math.max(22, Math.min(578, Math.round(payload.y)));
    });
    this.onMessage("setName", (client, payload: { name?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof payload?.name !== "string") return;
      const name = payload.name.replace(/[<>]/g, "").trim().slice(0, 16);
      if (name) player.name = name;
    });
    this.onMessage("chat", (client, payload: { text?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof payload?.text !== "string") return;
      const text = payload.text.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 180);
      if (!text) return;
      this.broadcast("chat", { name: player.name, text });
    });
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new PlayerState();
    player.x = 390 + Math.floor(Math.random() * 20);
    player.y = 300 + Math.floor(Math.random() * 20);
    player.name = (typeof options?.name === "string" ? options.name : "Adventurer").replace(/[<>]/g, "").trim().slice(0, 16) || "Adventurer";
    player.color = COLORS[this.clients.length % COLORS.length];
    this.state.players.set(client.sessionId, player);
    this.broadcast("chat", { name: "Village", text: `${player.name} wandered into town.` });
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) this.broadcast("chat", { name: "Village", text: `${player.name} headed off.` });
    this.state.players.delete(client.sessionId);
  }
}
