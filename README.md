# MONOWORLD

A small, original, browser-based multiplayer RPG prototype. The first milestone is a shared village with movement and chat. It does not contain Pokémon ROMs, Pokémon artwork, or other Nintendo assets.

## Requirements

- Node.js LTS (18+; a current LTS is recommended)
- npm
- A modern browser

## Run locally

From this folder:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`). Keep the terminal running. Open the same URL in a second browser tab/window to test two players.

The client expects the Colyseus server at `ws://localhost:2567` for local HTTP development. For a public HTTPS deployment, set `VITE_SERVER_URL` to your secure WebSocket endpoint (for example, `wss://your-server.example`).

## What is included

- Phaser 3 browser game
- Original procedural village drawn with simple shapes
- Colyseus room with a maximum of eight clients
- Server-synchronized player positions
- Display-name changes and room chat
- Basic connection indicator and responsive web UI

## Prototype limitations

This is a starter, not a finished MMO. It does not yet have accounts, persistent saves, NPC interactions, tile-based collision validation, creatures, battles, trading, moderation, rate limits, or production security. The server currently validates movement bounds, not map geometry. Do not expose this prototype publicly until the missing security and abuse protections are implemented.

## Build

```bash
npm run build
```

If the starter reports API/type errors after dependency installation, check the installed Colyseus versions and consult the current docs before changing APIs.

## Planned milestones

1. Verify two local browser clients can see each other.
2. Add tile-based map data and server-side collision validation.
3. Add reconnect handling and chat moderation/rate limits.
4. Add original creatures and server-authoritative battles.
5. Add secure trading and persistent player saves.
6. Evaluate optional PWA/desktop packaging.
