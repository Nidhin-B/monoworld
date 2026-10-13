import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("number") x = 400;
  @type("number") y = 300;
  @type("string") name = "Adventurer";
  @type("number") color = 0x496dca;
}

export class VillageState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
