/**
 * The Megastructure - system configuration and rules data.
 * All values are taken from the rulebook (Chapter 2 Core Mechanics, Chapter 3
 * Anatomy). Limb To-Hit Targets / Base HP / Death Values are the humanoid table;
 * body-plan presets rearrange those Limbs onto other frames.
 */
export const MEGA = {};

// The 15 skills (each is resolved by whichever Limb fits the action; the sheet
// rolls per-Limb, so this list is only used to label a roll if the player wants).
MEGA.skills = [
  "Aerial", "Balance", "Climb", "Communicate", "Crawl", "Endurance",
  "First Aid / Repair", "Interface", "Jump", "Knowledge", "Salvage",
  "Stealth", "Survey", "Swim", "Tunnel"
];

MEGA.weaponTypes = [
  "Blunt", "Bladed", "Energy", "Combustion Firearm", "Bow", "Launcher", "Thrown", "Other"
];

MEGA.attackModes = ["melee", "thrown", "launched"];

MEGA.sizes = ["Standard +1", "Standard", "Standard -1", "Standard -2"];

/**
 * Build one limb record. Stats default to the humanoid table unless overridden.
 * @param {string} key    machine key (unique on the actor)
 * @param {string} label  display name
 * @param {object} o      { toHit, hp, death, order }
 */
function limb(key, label, o = {}) {
  return {
    [key]: {
      label,
      order: o.order ?? 0,
      toHitTarget: o.toHit ?? 6,
      hp: { value: o.hp ?? 2, max: o.hp ?? 2 },
      deathValue: o.death ?? 8,
      defense: 1,
      points: 0,
      speciesBonus: 0
    }
  };
}

// Humanoid: Head, Face, Center Mass, Arms, Hands, Legs, Feet (rulebook table).
MEGA.limbPresets = {
  humanoid: Object.assign({},
    limb("head",       "Head",        { toHit: 9, hp: 1, death: 15, order: 1 }),
    limb("face",       "Face",        { toHit: 9, hp: 1, death: 15, order: 2 }),
    limb("centerMass", "Center Mass", { toHit: 5, hp: 3, death: 12, order: 3 }),
    limb("arms",       "Arms",        { toHit: 6, hp: 2, death: 8,  order: 4 }),
    limb("hands",      "Hands",       { toHit: 6, hp: 2, death: 5,  order: 5 }),
    limb("legs",       "Legs",        { toHit: 6, hp: 2, death: 8,  order: 6 }),
    limb("feet",       "Feet",        { toHit: 6, hp: 2, death: 5,  order: 7 })
  ),
  quadruped: Object.assign({},
    limb("head",       "Head",        { toHit: 9, hp: 1, death: 15, order: 1 }),
    limb("face",       "Face",        { toHit: 9, hp: 1, death: 15, order: 2 }),
    limb("centerMass", "Center Mass", { toHit: 5, hp: 3, death: 12, order: 3 }),
    limb("forelegs",   "Forelegs",    { toHit: 6, hp: 2, death: 8,  order: 4 }),
    limb("forepaws",   "Forepaws",    { toHit: 6, hp: 2, death: 5,  order: 5 }),
    limb("hindlegs",   "Hindlegs",    { toHit: 6, hp: 2, death: 8,  order: 6 }),
    limb("hindpaws",   "Hindpaws",    { toHit: 6, hp: 2, death: 5,  order: 7 }),
    limb("tail",       "Tail",        { toHit: 6, hp: 2, death: 5,  order: 8 })
  ),
  avian: Object.assign({},
    limb("head",       "Head",        { toHit: 9, hp: 1, death: 15, order: 1 }),
    limb("face",       "Face",        { toHit: 9, hp: 1, death: 15, order: 2 }),
    limb("centerMass", "Center Mass", { toHit: 5, hp: 3, death: 12, order: 3 }),
    limb("wings",      "Wings",       { toHit: 6, hp: 2, death: 8,  order: 4 }),
    limb("legs",       "Legs",        { toHit: 6, hp: 2, death: 8,  order: 5 }),
    limb("feet",       "Feet",        { toHit: 6, hp: 2, death: 5,  order: 6 }),
    limb("tail",       "Tail",        { toHit: 6, hp: 2, death: 5,  order: 7 })
  ),
  // Humanoid frame plus a Tail (Junkpaw, Splashpaw).
  humanoidTail: Object.assign({},
    limb("head",       "Head",        { toHit: 9, hp: 1, death: 15, order: 1 }),
    limb("face",       "Face",        { toHit: 9, hp: 1, death: 15, order: 2 }),
    limb("centerMass", "Center Mass", { toHit: 5, hp: 3, death: 12, order: 3 }),
    limb("arms",       "Arms",        { toHit: 6, hp: 2, death: 8,  order: 4 }),
    limb("hands",      "Hands",       { toHit: 6, hp: 2, death: 5,  order: 5 }),
    limb("legs",       "Legs",        { toHit: 6, hp: 2, death: 8,  order: 6 }),
    limb("feet",       "Feet",        { toHit: 6, hp: 2, death: 5,  order: 7 }),
    limb("tail",       "Tail",        { toHit: 6, hp: 2, death: 5,  order: 8 })
  ),
  polypedal: Object.assign({},
    limb("head",       "Head",        { toHit: 9, hp: 1, death: 15, order: 1 }),
    limb("face",       "Face",        { toHit: 9, hp: 1, death: 15, order: 2 }),
    limb("centerMass", "Center Mass", { toHit: 5, hp: 3, death: 12, order: 3 }),
    limb("legs",       "Legs",        { toHit: 6, hp: 2, death: 8,  order: 4 }),
    limb("feet",       "Feet",        { toHit: 6, hp: 2, death: 5,  order: 5 })
  ),
  insectile: Object.assign({},
    limb("head",       "Head",        { toHit: 9, hp: 1, death: 15, order: 1 }),
    limb("centerMass", "Center Mass", { toHit: 5, hp: 3, death: 12, order: 2 }),
    limb("wings",      "Wings",       { toHit: 5, hp: 3, death: 8,  order: 3 }),
    limb("forelegs",   "Forelegs",    { toHit: 6, hp: 2, death: 8,  order: 4 }),
    limb("hindlegs",   "Hindlegs",    { toHit: 6, hp: 2, death: 8,  order: 5 }),
    limb("feet",       "Feet",        { toHit: 6, hp: 2, death: 5,  order: 6 })
  ),
  crustacean: Object.assign({},
    limb("head",       "Head",        { toHit: 9, hp: 1, death: 15, order: 1 }),
    limb("centerMass", "Center Mass", { toHit: 5, hp: 3, death: 12, order: 2 }),
    limb("arms",       "Arms",        { toHit: 6, hp: 2, death: 8,  order: 3 }),
    limb("claws",      "Claws",       { toHit: 6, hp: 2, death: 5,  order: 4 }),
    limb("legs",       "Legs",        { toHit: 6, hp: 2, death: 8,  order: 5 }),
    limb("feet",       "Feet",        { toHit: 6, hp: 2, death: 5,  order: 6 }),
    limb("tail",       "Tail",        { toHit: 6, hp: 2, death: 5,  order: 7 })
  ),
  cubeoid: Object.assign({},
    limb("centerMass", "Center Mass", { toHit: 5, hp: 3, death: 12, order: 1 })
  )
};

/**
 * Playable species -> starting stats (rulebook Ch.4/5). Applying a species sets the
 * body-plan Limbs + per-Limb Species Bonus, inventory slots, size, move, initiative
 * and per-Cycle intake. A few are approximations the player can tune: Digital uses
 * its counterpart's Skill Values (bonuses left 0); Sentinel is multi-fuel (defaulted
 * to 2 Energy); Synthetic eats Food once per 30 Cycles (defaulted to 0/Cycle);
 * Parasitic Pilot pilots a host (its own body is Center Mass + tendrils).
 */
MEGA.species = {
  human:          { label: "Human", preset: "humanoid", slots: 10, size: "Standard", move: 6, init: 2, intake: { food: 1, water: 1, energy: 0, air: 0 }, bonuses: { head: 2, face: 3, hands: 2 } },
  clonedHuman:    { label: "Cloned Human", preset: "humanoid", slots: 10, size: "Standard", move: 6, init: 2, intake: { food: 1, water: 1, energy: 0, air: 0 }, bonuses: { head: 2, face: 2, centerMass: 1, hands: 2 } },
  synthetic:      { label: "Synthetic Human", preset: "humanoid", slots: 20, size: "Standard +1", move: 9, init: 4, intake: { food: 0, water: 1, energy: 0, air: 0 }, bonuses: { head: 0, face: -2, centerMass: 2, arms: 2, hands: 2, legs: 2, feet: 1 }, defense: { head: 3, face: 3, centerMass: 3, arms: 3, hands: 3, legs: 3, feet: 3 } },
  mlHumanoid:     { label: "Machine Lifeform (Humanoid)", preset: "humanoid", slots: 15, size: "Standard", move: 6, init: 1, intake: { food: 0, water: 0, energy: 2, air: 0 }, bonuses: { head: 3, centerMass: 2, arms: 1, legs: 1 } },
  mlAndroid:      { label: "Machine Lifeform (Android)", preset: "humanoid", slots: 10, size: "Standard", move: 6, init: 1, intake: { food: 0, water: 0, energy: 2, air: 0 }, bonuses: { head: 3, centerMass: 2, arms: 1, legs: 1 } },
  mlSentinel:     { label: "Machine Lifeform (Sentinel)", preset: "humanoid", slots: 20, size: "Standard +1", move: 8, init: -3, intake: { food: 0, water: 0, energy: 2, air: 0 }, bonuses: { head: 4, centerMass: 5, arms: 4, hands: 4, legs: 4, feet: 4 }, defense: { head: 5, face: 5, centerMass: 5, arms: 5, hands: 5, legs: 5, feet: 5 } },
  mlDoll:         { label: "Machine Lifeform (Doll)", preset: "humanoid", slots: 2, size: "Standard -2", move: 2, init: 3, intake: { food: 0, water: 0, energy: 2, air: 0 }, bonuses: { head: 5, face: 5 } },
  mlPolypedal:    { label: "Machine Lifeform (Polypedal)", preset: "polypedal", slots: 16, size: "Standard -1", move: 4, init: 1, intake: { food: 0, water: 0, energy: 2, air: 0 }, bonuses: { centerMass: 3, legs: 4 } },
  mlInsectile:    { label: "Machine Lifeform (Insectile)", preset: "insectile", slots: 6, size: "Standard -1", move: 8, init: -2, intake: { food: 0, water: 0, energy: 2, air: 0 }, bonuses: { hindlegs: 1 }, defense: { head: 2, centerMass: 4, wings: 3, forelegs: 3, hindlegs: 3, feet: 3 } },
  mlCrustacean:   { label: "Machine Lifeform (Crustacean)", preset: "crustacean", slots: 20, size: "Standard +1", move: 8, init: -2, intake: { food: 0, water: 0, energy: 2, air: 0 }, bonuses: {}, defense: { head: 2, centerMass: 4, arms: 3, claws: 3, legs: 3, feet: 3, tail: 3 } },
  silicon:        { label: "Silicon Lifeform", preset: "humanoid", slots: 20, size: "Standard +1", move: 9, init: -3, intake: { food: 1, water: 1, energy: 0, air: 0 }, bonuses: { centerMass: 5, arms: 5, hands: 5, legs: 5, feet: 5 }, defense: { head: 4, face: 4, centerMass: 4, arms: 4, hands: 4, legs: 4, feet: 4 } },
  digital:        { label: "Digital Lifeform", preset: "humanoid", slots: 10, size: "Standard", move: 6, init: -1, intake: { food: 0, water: 0, energy: 2, air: 0 }, bonuses: {} },
  junkpaw:        { label: "Junkpaw", preset: "humanoidTail", slots: 4, size: "Standard -2", move: 5, init: 5, intake: { food: 1, water: 1, energy: 0, air: 0 }, bonuses: { arms: 1, hands: 2, legs: 2, feet: 2, tail: 4 } },
  junkhound:      { label: "Junkhound", preset: "quadruped", slots: 6, size: "Standard", move: 7, init: 3, intake: { food: 1, water: 1, energy: 0, air: 0 }, bonuses: { head: 5, face: 2, tail: 3 } },
  junkbeak:       { label: "Junkbeak", preset: "avian", slots: 2, size: "Standard -2", move: 2, init: 3, intake: { food: 1, water: 1, energy: 0, air: 0 }, bonuses: { head: 2, wings: 3, feet: 2, tail: 2 } },
  splashpaw:      { label: "Splashpaw", preset: "humanoidTail", slots: 4, size: "Standard -2", move: 2, init: 3, intake: { food: 1, water: 1, energy: 0, air: 0 }, bonuses: { head: 1, centerMass: 2, arms: 2, legs: 2, tail: 2 } },
  junkursu:       { label: "Junkursu", preset: "quadruped", slots: 25, size: "Standard +1", move: 7, init: -3, intake: { food: 2, water: 1, energy: 0, air: 0 }, bonuses: { head: 3, centerMass: 3, forelegs: 2, hindlegs: 2, tail: 3 }, defense: { head: 3, face: 3, centerMass: 3, forelegs: 3, forepaws: 3, hindlegs: 3, hindpaws: 3, tail: 3 } },
  mutant:         { label: "Mutant", preset: "humanoid", slots: 8, size: "Standard -1", move: 5, init: 2, intake: { food: 3, water: 3, energy: 0, air: 0 }, bonuses: { head: 2, face: -2, centerMass: 7 } },
  parasiticPilot: { label: "Parasitic Pilot", preset: "humanoid", slots: 10, size: "Standard", move: 6, init: 2, intake: { food: 1, water: 1, energy: 0, air: 1 }, bonuses: { centerMass: 5, arms: 2 } }
};

/** A deep, mutable copy of a body-plan preset (used as the actor's default). */
export function clonePreset(name = "humanoid") {
  return foundry.utils.deepClone(MEGA.limbPresets[name] ?? MEGA.limbPresets.humanoid);
}
