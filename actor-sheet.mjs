import { clonePreset } from "../helpers/config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * The Megastructure character sheet (ApplicationV2). Limbs each carry a Skill
 * Roll button; equipped weapons carry an Attack button. All stat fields submit on
 * change (limbs are stored as an object, so system.limbs.<key>.<field> updates
 * cleanly).
 */
export class MegaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["megastructure", "sheet", "actor"],
    position: { width: 760, height: 820 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollSkill: MegaActorSheet.#onRollSkill,
      attack: MegaActorSheet.#onAttack,
      addLimb: MegaActorSheet.#onAddLimb,
      deleteLimb: MegaActorSheet.#onDeleteLimb,
      applyPreset: MegaActorSheet.#onApplyPreset,
      createItem: MegaActorSheet.#onCreateItem,
      editItem: MegaActorSheet.#onEditItem,
      deleteItem: MegaActorSheet.#onDeleteItem,
      toggleEquip: MegaActorSheet.#onToggleEquip,
      advanceCycle: MegaActorSheet.#onAdvanceCycle,
      applySpecies: MegaActorSheet.#onApplySpecies,
      spendAction: MegaActorSheet.#onSpendAction,
      gainAction: MegaActorSheet.#onGainAction,
      resetActions: MegaActorSheet.#onResetActions,
      enterCarapace: MegaActorSheet.#onEnterCarapace,
      exitCarapace: MegaActorSheet.#onExitCarapace
    }
  };

  static PARTS = {
    body: { template: "systems/megastructure/templates/actor/character-sheet.hbs", scrollable: [""] }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    context.actor = this.actor;
    context.system = sys;
    context.editable = this.isEditable;
    // Limbs, each annotated with its armor-adjusted effective stats.
    context.limbs = sys.sortedLimbs.map((l) => ({ ...l, eff: sys.effLimbs?.[l.key] ?? {} }));
    context.limbOptions = sys.sortedLimbs.map((l) => ({ key: l.key, label: l.label }));
    context.weapons = this.actor.items.filter((i) => i.type === "weapon");
    context.armor = this.actor.items.filter((i) => i.type === "armor");
    context.gear = this.actor.items.filter((i) => i.type === "gear");
    context.equippedWeapons = context.weapons.filter((w) => w.system.equipped);
    context.sizes = CONFIG.MEGA.sizes;
    context.presets = Object.keys(CONFIG.MEGA.limbPresets);
    context.speciesList = Object.entries(CONFIG.MEGA.species ?? {}).map(([k, v]) => ({ key: k, label: v.label }));
    // Survival / carry derived data.
    context.carry = sys.carry ?? { used: 0, capacity: sys.slots, over: 0 };
    context.penalty = Number(sys.penalty) || 0;
    context.depPenalty = Number(sys.depPenalty) || 0;
    return context;
  }

  /* -------------------------------------------- Actions */

  static async #onRollSkill(event, target) {
    await this.actor.rollSkill(target.dataset.limb);
  }

  static async #onAttack(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId ?? target.dataset.item;
    await this.actor.rollAttack(id);
  }

  static async #onAddLimb() {
    const key = `limb${foundry.utils.randomID(6)}`;
    const order = Object.keys(this.actor.system.limbs ?? {}).length + 1;
    await this.actor.update({
      [`system.limbs.${key}`]: {
        label: "New Limb", order, toHitTarget: 6,
        hp: { value: 2, max: 2 }, deathValue: 8, defense: 1, points: 0, speciesBonus: 0
      }
    });
  }

  static async #onDeleteLimb(event, target) {
    const key = target.closest("[data-limb-key]")?.dataset.limbKey ?? target.dataset.limb;
    if (!key) return;
    await this.actor.update({ [`system.limbs.-=${key}`]: null });
  }

  static async #onApplyPreset(event, target) {
    const name = target.dataset.preset;
    const preset = clonePreset(name);
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Change Body Plan" },
      content: `<p>Replace this actor's Limbs with the <b>${name}</b> body plan? Current Limb stats will be lost.</p>`
    });
    if (!confirmed) return;
    const clear = {};
    for (const k of Object.keys(this.actor.system.limbs ?? {})) clear[`system.limbs.-=${k}`] = null;
    if (Object.keys(clear).length) await this.actor.update(clear);
    await this.actor.update({ system: { limbs: preset } });
  }

  static async #onCreateItem(event, target) {
    const type = target.dataset.itemType;
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const [doc] = await this.actor.createEmbeddedDocuments("Item", [{ name: `New ${label}`, type }]);
    doc?.sheet?.render(true);
  }

  static #onEditItem(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    this.actor.items.get(id)?.sheet?.render(true);
  }

  static async #onDeleteItem(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    if (id) await this.actor.deleteEmbeddedDocuments("Item", [id]);
  }

  static async #onToggleEquip(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(id);
    if (item) await item.update({ "system.equipped": !item.system.equipped });
  }

  static async #onAdvanceCycle() {
    await this.actor.advanceCycle();
  }

  static async #onEnterCarapace() { await this.actor.enterCarapace(); }
  static async #onExitCarapace() { await this.actor.exitCarapace(); }

  static async #onSpendAction() { await this.actor.spendAction(1); }
  static async #onGainAction() { await this.actor.gainAction(1); }
  static async #onResetActions() { await this.actor.resetActions(); }

  static async #onApplySpecies() {
    const key = this.element.querySelector("[data-species-pick]")?.value;
    if (!key) return;
    const sp = CONFIG.MEGA.species?.[key];
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Apply Species" },
      content: `<p>Apply <b>${sp?.label ?? key}</b>? This replaces the current Limbs, slots, size, movement, initiative and intake.</p>`
    });
    if (ok) await this.actor.applySpecies(key);
  }

  /** Wire selects that must not trigger the actor form's submit-on-change. */
  _onRender(context, options) {
    super._onRender(context, options);
    // Per-armor "covered Limb" dropdown updates the embedded item.
    for (const sel of this.element.querySelectorAll("select[data-armor-limb]")) {
      sel.addEventListener("change", async (ev) => {
        ev.stopPropagation();
        const id = ev.target.closest("[data-item-id]")?.dataset.itemId;
        const item = this.actor.items.get(id);
        if (item) await item.update({ "system.limb": ev.target.value });
      });
    }
    // The species auto-fill picker holds its value until "Apply" is clicked.
    const sp = this.element.querySelector("select[data-species-pick]");
    if (sp) sp.addEventListener("change", (ev) => ev.stopPropagation());
  }
}
