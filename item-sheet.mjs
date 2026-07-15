const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/** Generic item sheet for weapons, armor and gear. */
export class MegaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["megastructure", "sheet", "item"],
    position: { width: 480, height: "auto" },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    body: { template: "systems/megastructure/templates/item/item-sheet.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.editable = this.isEditable;
    context.weaponTypes = CONFIG.MEGA.weaponTypes;
    context.isWeapon = this.item.type === "weapon";
    context.isArmor = this.item.type === "armor";
    context.isGear = this.item.type === "gear";
    return context;
  }
}
