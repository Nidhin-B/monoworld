import Phaser from "phaser";
import { Client, Room } from "@colyseus/sdk";
import "./style.css";

type PlayerData = { x: number; y: number; name: string; color: number };
type ChatData = { name: string; text: string };

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname || "localhost"}:2567`;
const connectionEl = document.querySelector<HTMLDivElement>("#connection")!;
const onlineCountEl = document.querySelector<HTMLSpanElement>("#onlineCount")!;
const nameInput = document.querySelector<HTMLInputElement>("#playerName")!;
const saveNameButton = document.querySelector<HTMLButtonElement>("#saveName")!;
const messagesEl = document.querySelector<HTMLDivElement>("#messages")!;
const chatForm = document.querySelector<HTMLFormElement>("#chatForm")!;
const chatInput = document.querySelector<HTMLInputElement>("#chatInput")!;

let room: Room | null = null;
let playerName = nameInput.value;
let gameScene: VillageScene | null = null;
const remoteNames = new Map<string, string>();

function setConnection(online: boolean, message: string) {
  connectionEl.classList.toggle("online", online);
  connectionEl.innerHTML = `<span class="dot"></span><span>${message}</span>`;
}
function addMessage(name: string, text: string, system = false) {
  const el = document.createElement("div");
  if (system) {
    el.className = "system-message";
    el.textContent = text;
  } else {
    el.className = "chat-message";
    const strong = document.createElement("strong");
    strong.textContent = name;
    const span = document.createElement("span");
    span.textContent = text;
    el.append(strong, span);
  }
  messagesEl.appendChild(el);
  while (messagesEl.children.length > 60) messagesEl.firstElementChild?.remove();
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function sendMove(x: number, y: number) {
  if (room) room.send("move", { x, y });
}

class VillageScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private sprites = new Map<string, Phaser.GameObjects.Container>();
  private localId = "";
  private localX = 400;
  private localY = 300;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private moveCooldown = 0;
  private targetX = new Map<string, number>();
  private targetY = new Map<string, number>();

  constructor() { super("Village"); gameScene = this; }

  create() {
    this.cameras.main.setBackgroundColor("#91b879");
    this.graphics = this.add.graphics();
    this.drawMap();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
    this.add.text(14, 12, "MOSSLIGHT VILLAGE", {
      fontFamily: "monospace", fontSize: "11px", color: "#f4f4cf",
      backgroundColor: "#2b4836", padding: { x: 8, y: 6 }
    }).setScrollFactor(0).setDepth(1000);
    this.add.text(14, 38, "A little place to meet up", {
      fontFamily: "monospace", fontSize: "9px", color: "#344d36"
    }).setScrollFactor(0).setDepth(1000);
  }

  private drawMap() {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x91b879, 1); g.fillRect(0, 0, 800, 600);
    // Soft patches of darker grass.
    g.fillStyle(0x83aa6e, 1);
    for (let y = 22; y < 600; y += 48) for (let x = (y % 96 ? 16 : 38); x < 800; x += 74) {
      g.fillRect(x, y, 24, 9);
    }
    // Crossroads.
    g.fillStyle(0xd7c69a, 1); g.fillRect(0, 266, 800, 78); g.fillRect(357, 0, 86, 600);
    g.fillStyle(0xc6b587, 1); g.fillRect(0, 266, 800, 5); g.fillRect(0, 339, 800, 5);
    // Water pond.
    g.fillStyle(0x669eaa, 1); g.fillRoundedRect(52, 55, 174, 112, 18);
    g.lineStyle(3, 0x4d7f83, 1); g.strokeRoundedRect(52, 55, 174, 112, 18);
    g.lineStyle(2, 0x9dc6bd, 0.8);
    for (let i = 0; i < 4; i++) g.lineBetween(72 + i * 35, 82 + (i % 2) * 32, 91 + i * 35, 82 + (i % 2) * 32);
    // Buildings.
    this.building(490, 66, 170, 120, 0x9c7654, "VILLAGE HALL");
    this.building(540, 390, 138, 108, 0x8d6952, "LITTLE SHOP");
    this.building(100, 397, 142, 105, 0xa17a58, "REST HOUSE");
    // Trees.
    for (const [x, y] of [[292,80],[282,130],[715,92],[745,150],[290,435],[315,482],[710,290],[742,335],[75,220],[730,520],[480,520],[505,530]] as number[][]) this.tree(x, y);
    // Footpath stones.
    g.fillStyle(0xe8d8ae, 1);
    for (let x = 375; x < 430; x += 18) g.fillRect(x, 230, 9, 8);
    // Decorative flower dots.
    for (const [x, y] of [[260,235],[300,370],[465,210],[690,230],[260,540],[465,465],[330,190],[690,365]] as number[][]) {
      g.fillStyle(0xf0d98a, 1); g.fillCircle(x, y, 3); g.fillStyle(0xf5e8b8, 1); g.fillCircle(x+2, y-2, 1.5);
    }
  }
  private building(x: number, y: number, w: number, h: number, wall: number, label: string) {
    const g = this.graphics;
    g.fillStyle(0x506447, .35); g.fillRect(x+7, y+h-2, w, 12);
    g.fillStyle(wall, 1); g.fillRect(x, y+28, w, h-28);
    g.fillStyle(0x6e5140, 1); g.fillRect(x+w/2-13, y+h-42, 26, 42);
    g.fillStyle(0x473b32, 1); g.fillRect(x+w/2-9, y+h-37, 18, 37);
    g.fillStyle(0x77543c, 1);
    g.fillTriangle(x-12, y+31, x+w/2, y-18, x+w+12, y+31);
    g.fillStyle(0xb28a62, 1);
    g.fillRect(x+15, y+44, 25, 24); g.fillRect(x+w-40, y+44, 25, 24);
    g.fillStyle(0x6a9b9a, 1); g.fillRect(x+19, y+48, 17, 16); g.fillRect(x+w-36, y+48, 17, 16);
    this.add.text(x+w/2, y+h+5, label, { fontFamily: "monospace", fontSize: "9px", color: "#f6f1d6", backgroundColor: "#425b3d", padding: { x: 4, y: 3 } }).setOrigin(.5).setDepth(2);
  }
  private tree(x: number, y: number) {
    const g = this.graphics;
    g.fillStyle(0x5a6240, 1); g.fillRect(x-4, y+12, 9, 17);
    g.fillStyle(0x426a48, 1); g.fillCircle(x, y, 18);
    g.fillStyle(0x5c8754, 1); g.fillCircle(x-8, y-7, 10);
    g.fillStyle(0x78a363, 1); g.fillCircle(x+7, y-9, 8);
  }

  setLocalId(id: string) { this.localId = id; }

  syncPlayers(players: Map<string, PlayerData>) {
    onlineCountEl.textContent = String(players.size);
    for (const [id, data] of players) {
      this.targetX.set(id, data.x); this.targetY.set(id, data.y);
      if (!this.sprites.has(id)) this.makePlayer(id, data);
      const label = this.labels.get(id);
      if (label) label.setText(data.name || "Adventurer");
      if (id === this.localId) { this.localX = data.x; this.localY = data.y; }
    }
    for (const id of [...this.sprites.keys()]) if (!players.has(id)) this.removePlayer(id);
  }

  private makePlayer(id: string, data: PlayerData) {
    const container = this.add.container(data.x, data.y).setDepth(data.y);
    const shadow = this.add.ellipse(0, 8, 22, 8, 0x344b35, .35);
    const body = this.add.rectangle(0, 0, 13, 17, data.color || 0x496dca).setStrokeStyle(2, 0x273c31);
    const head = this.add.rectangle(0, -12, 12, 11, 0xf0c79b).setStrokeStyle(2, 0x493f32);
    const hair = this.add.rectangle(0, -17, 13, 5, 0x4c4038);
    const feet = this.add.rectangle(0, 10, 14, 4, 0x493f32);
    container.add([shadow, body, head, hair, feet]);
    const label = this.add.text(data.x, data.y - 32, data.name || "Adventurer", {
      fontFamily: "monospace", fontSize: "10px", color: "#fffbe3",
      stroke: "#304733", strokeThickness: 3, align: "center"
    }).setOrigin(.5).setDepth(1000);
    this.sprites.set(id, container); this.labels.set(id, label);
  }

  private removePlayer(id: string) {
    this.sprites.get(id)?.destroy(); this.sprites.delete(id);
    this.labels.get(id)?.destroy(); this.labels.delete(id);
    this.targetX.delete(id); this.targetY.delete(id);
  }

  update(_time: number, delta: number) {
    if (!this.localId || !room) return;
    this.moveCooldown -= delta;
    if (this.moveCooldown <= 0) {
      let dx = 0, dy = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1;
      else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;
      if (this.cursors.up.isDown || this.keys.W.isDown) dy = -1;
      else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1;
      if (dx || dy) {
        const step = 4;
        const nx = Phaser.Math.Clamp(this.localX + dx * step, 18, 782);
        const ny = Phaser.Math.Clamp(this.localY + dy * step, 22, 578);
        sendMove(nx, ny);
        this.localX = nx; this.localY = ny;
        this.moveCooldown = 40;
      }
    }
    for (const [id, sprite] of this.sprites) {
      const tx = this.targetX.get(id), ty = this.targetY.get(id);
      if (tx === undefined || ty === undefined) continue;
      sprite.x = Phaser.Math.Linear(sprite.x, tx, Math.min(1, delta / 70));
      sprite.y = Phaser.Math.Linear(sprite.y, ty, Math.min(1, delta / 70));
      sprite.setDepth(sprite.y);
      const label = this.labels.get(id);
      if (label) { label.x = sprite.x; label.y = sprite.y - 32; }
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, parent: "game", width: 800, height: 600,
  backgroundColor: "#91b879", pixelArt: true, antialias: false,
  render: { roundPixels: true }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [VillageScene]
};
new Phaser.Game(config);

async function connect() {
  try {
    setConnection(false, "Connecting…");
    const client = new Client(SERVER_URL);
    room = await client.joinOrCreate("village", { name: playerName });
    gameScene?.setLocalId(room.sessionId);
    setConnection(true, "Connected");
    addMessage("", "Connected to Mosslight Village.", true);

    room.onStateChange((state: any) => {
      const map = new Map<string, PlayerData>();
      state.players.forEach((p: any, id: string) => map.set(id, { x: p.x, y: p.y, name: p.name, color: p.color }));
      gameScene?.setLocalId(room!.sessionId);
      gameScene?.syncPlayers(map);
    });
    room.onMessage("chat", (data: ChatData) => addMessage(data.name, data.text));
    room.onLeave(() => setConnection(false, "Disconnected"));
  } catch (error) {
    console.error(error);
    setConnection(false, "Server offline");
    addMessage("", "Couldn't reach the multiplayer server. Start it with npm run dev, then refresh.", true);
  }
}
connect();

saveNameButton.addEventListener("click", () => {
  const candidate = nameInput.value.trim().slice(0, 16);
  if (!candidate) return;
  playerName = candidate;
  room?.send("setName", { name: playerName });
  addMessage("", `Your display name is now ${playerName}.`, true);
});
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !room) return;
  room.send("chat", { text });
  chatInput.value = "";
});
