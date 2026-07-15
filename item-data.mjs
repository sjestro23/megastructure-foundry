const fields = foundry.data.fields;

/**
 * Weapon. Damage is a flat value per mode (Melee / Thrown / Launched); the same
 * value adds to the To-Hit roll for that mode (rulebook Chapter 8: "1d10 + Skill
 * + weapon's Thrown score", and the listed value is also the flat damage dealt).
 */
export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
      weaponType: new fields.StringField({ initial: "Blunt" }),
      melee: new fields.NumberField({ initial: 0, integer: true }),
      thrown: new fields.NumberField({ initial: 0, integer: true }),
      launched: new fields.NumberField({ initial: 0, integer: true }),
      tier: new fields.NumberField({ initial: 1, integer: true }),
      slots: new fields.NumberField({ initial: 1, integer: true }),
      properties: new fields.StringField({ initial: "" }),
      equipped: new fields.BooleanField({ initial: true })
    };
  }

  /** Modes this weapon can actually be used in (value > 0). */
  get availableModes() {
    return ["melee", "thrown", "launched"].filter((m) => Number(this[m]) > 0);
  }
}

/** Armor covers one Limb and grants a Defense bonus and/or a To-Hit bonus. */
export class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
      limb: new fields.StringField({ initial: "" }),
      defenseBonus: new fields.NumberField({ initial: 0, integer: true }),
      toHitBonus: new fields.NumberField({ initial: 0, integer: true }),
      tier: new fields.NumberField({ initial: 1, integer: true }),
      slots: new fields.NumberField({ initial: 1, integer: true }),
      properties: new fields.StringField({ initial: "" }),
      equipped: new fields.BooleanField({ initial: true })
    };
  }
}

/** Generic gear / item. */
export class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
      quantity: new fields.NumberField({ initial: 1, integer: true }),
      tier: new fields.NumberField({ initial: 1, integer: true }),
      slots: new fields.NumberField({ initial: 1, integer: true }),
      // Packs (Backpack, Satchel, Sack) take 1 slot and ADD carry capacity.
      slotBonus: new fields.NumberField({ initial: 0, integer: true }),
      properties: new fields.StringField({ initial: "" })
    };
  }
}
