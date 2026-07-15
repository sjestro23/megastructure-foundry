import { MEGA } from "./helpers/config.mjs";
import { CharacterData } from "./data/actor-data.mjs";
import { WeaponData, ArmorData, GearData } from "./data/item-data.mjs";
import { MegaActor } from "./documents/actor.mjs";
import { MegaActorSheet } from "./sheets/actor-sheet.mjs";
import { MegaItemSheet } from "./sheets/item-sheet.mjs";

Hooks.once("init", () => {
  console.log("Megastructure | Initializing the 1d10 limb system");

  CONFIG.MEGA = MEGA;

  // Document class + data models
  CONFIG.Actor.documentClass = MegaActor;
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Item.dataModels.weapon = WeaponData;
  CONFIG.Item.dataModels.armor = ArmorData;
  CONFIG.Item.dataModels.gear = GearData;

  // Initiative: 1d10 + Initiative, minus any deprivation / over-carry penalty (it
  // applies to every roll, Initiative included).
  CONFIG.Combat.initiative = { formula: "1d10 + @initiative + @penalty", decimals: 0 };

  // Sheets (v13 collections live under foundry.documents.collections; fall back to
  // the legacy globals for safety). makeDefault makes ours the default sheet.
  const ActorsCol = foundry.documents?.collections?.Actors ?? globalThis.Actors;
  const ItemsCol = foundry.documents?.collections?.Items ?? globalThis.Items;
  ActorsCol.registerSheet("megastructure", MegaActorSheet, {
    types: ["character"], makeDefault: true, label: "Megastructure Character Sheet"
  });
  ItemsCol.registerSheet("megastructure", MegaItemSheet, {
    types: ["weapon", "armor", "gear"], makeDefault: true, label: "Megastructure Item Sheet"
  });

  // Handlebars helpers used by the templates.
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("signed", (n) => {
    const v = Number(n) || 0;
    return (v >= 0 ? "+" : "") + v;
  });
  Handlebars.registerHelper("cap", (s) => {
    s = String(s ?? "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
  Handlebars.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
});

Hooks.once("ready", () => {
  console.log("Megastructure | Ready");
});

// Refill a combatant's Actions to their per-turn max at the start of their turn.
// Only the active GM writes, so it happens once (rulebook Ch.8: 2 Actions per turn;
// the Thymus acts inside the hacker's turn, so it needs no combatant of its own).
async function resetTurnActions(combatant) {
  if (game.users?.activeGM !== game.user) return;
  const actor = combatant?.actor;
  if (actor?.resetActions) await actor.resetActions();
}
Hooks.on("combatStart", (combat) => resetTurnActions(combat.combatant));
Hooks.on("combatTurnChange", (combat, prior, current) => {
  resetTurnActions(combat.combatants.get(current?.combatantId));
});
Hooks.on("combatRound", (combat) => resetTurnActions(combat.combatant));
