import { clonePreset } from "../helpers/config.mjs";

const fields = foundry.data.fields;

/**
 * Character actor data model. Used for both player characters and enemies/NPCs
 * (both are built from Limbs). Limbs are stored as an object keyed by limb id so
 * individual fields update cleanly from the sheet form (system.limbs.head.points).
 */
export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      species: new fields.StringField({ initial: "", required: false }),
      isNPC: new fields.BooleanField({ initial: false }),
      size: new fields.StringField({ initial: "Standard" }),
      movement: new fields.NumberField({ initial: 6, integer: true }),
      initiative: new fields.NumberField({ initial: 0, integer: true }),
      // Combat action economy: 2 Actions per turn (rulebook Ch.8). `value` can rise
      // above `max` from Ring-solve bonus Actions; it resets to `max` each turn.
      actions: new fields.SchemaField({
        value: new fields.NumberField({ initial: 2, integer: true, min: 0 }),
        max: new fields.NumberField({ initial: 2, integer: true, min: 0 })
      }),
      slots: new fields.NumberField({ initial: 10, integer: true }),
      notes: new fields.HTMLField({ initial: "" }),
      // Current stockpiles on hand.
      resources: new fields.SchemaField({
        food: new fields.NumberField({ initial: 0, integer: true }),
        water: new fields.NumberField({ initial: 0, integer: true }),
        air: new fields.NumberField({ initial: 0, integer: true }),
        energy: new fields.NumberField({ initial: 0, integer: true })
      }),
      // Per-Cycle consumption (rulebook Ch.7: most organics eat 1 Food + 1 Water;
      // Machine / Digital use 2 Energy; Air only where there is no atmosphere).
      intake: new fields.SchemaField({
        food: new fields.NumberField({ initial: 1, integer: true }),
        water: new fields.NumberField({ initial: 1, integer: true }),
        energy: new fields.NumberField({ initial: 0, integer: true }),
        air: new fields.NumberField({ initial: 0, integer: true })
      }),
      // Deprivation tracks: tier 1 = no penalty, each tier above = -1 to all rolls
      // (to -5 at tier 6). Starvation advances a tier every 3 tallies.
      deprivation: new fields.SchemaField({
        starvation: new fields.SchemaField({
          tier: new fields.NumberField({ initial: 1, integer: true, min: 1, max: 6 }),
          tallies: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 2 })
        }),
        dehydration: new fields.SchemaField({
          tier: new fields.NumberField({ initial: 1, integer: true, min: 1, max: 6 })
        }),
        exhaustion: new fields.SchemaField({
          tier: new fields.NumberField({ initial: 1, integer: true, min: 1, max: 6 })
        })
      }),
      // Energy Depletion forces Emergency Sleep Mode for 1D6 Cycles (rulebook Ch.7);
      // while active the character cannot roll Initiative or Skill rolls, and wakes
      // with Energy restored. This is a state, NOT a -1/tier penalty.
      emergencySleep: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        cyclesLeft: new fields.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      // Whether this character is currently inside a Carapace (mid-hack). The hack
      // itself plays out in the hacking prototype; this just tracks the state so the
      // sheet shows it and each combat turn reads as one hacking round.
      hacking: new fields.SchemaField({
        inCarapace: new fields.BooleanField({ initial: false })
      }),
      // Untyped object of limb records: { key: { label, order, toHitTarget,
      // hp:{value,max}, deathValue, defense, points, speciesBonus } }
      limbs: new fields.ObjectField({ initial: () => clonePreset("humanoid") })
    };
  }

  /**
   * Limbs sorted by their `order` field, each tagged with its key and a computed
   * Skill Total (Points + Species Bonus) and HP %. These are spread COPIES, so the
   * derived fields never leak back into the stored source object.
   */
  get sortedLimbs() {
    return Object.entries(this.limbs ?? {})
      .map(([key, l]) => {
        const points = Number(l.points) || 0;
        const speciesBonus = Number(l.speciesBonus) || 0;
        const max = Number(l.hp?.max) || 0;
        const value = Number(l.hp?.value) || 0;
        return {
          key, ...l,
          skillTotal: points + speciesBonus,
          hpPct: max ? Math.clamp(Math.round((value / max) * 100), 0, 100) : 0
        };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}
