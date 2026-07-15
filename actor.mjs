import { clonePreset } from "../helpers/config.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Megastructure actor. Adds the two rolls that drive play:
 *   - rollSkill: 1d10 + Limb Skill Total, meet or beat a DR (a tie succeeds).
 *   - rollAttack: 1d10 + Skill Total + weapon score vs a target Limb's To-Hit
 *     Target (must be strictly above; a tie misses), then flat weapon damage to
 *     the Limb, removing Defense first and then HP.
 */
export class MegaActor extends Actor {

  getLimb(key) {
    return this.system.limbs?.[key];
  }

  skillTotalOf(limb) {
    if (!limb) return 0;
    return (Number(limb.points) || 0) + (Number(limb.speciesBonus) || 0);
  }

  /** True while in Emergency Sleep from Energy Depletion (the character cannot act). */
  get isEmergencySleep() {
    return !!this.system.emergencySleep?.active;
  }

  /** Block a roll while in Emergency Sleep, notifying why. Returns true if blocked. */
  #asleepBlocked() {
    if (!this.isEmergencySleep) return false;
    ui.notifications?.warn(`${this.name} is in Emergency Sleep (Energy Depletion) and cannot roll Initiative or Skill rolls for ${this.system.emergencySleep.cyclesLeft} more Cycle(s).`);
    return true;
  }

  /** Cannot roll Initiative while in Emergency Sleep. */
  async rollInitiative(options) {
    if (this.#asleepBlocked()) return this;
    return super.rollInitiative(options);
  }

  /**
   * Derived data that needs the actor's items: effective Limb Defense / To-Hit
   * from equipped armor, carry load vs capacity, and the deprivation roll penalty.
   * These are written to `system` as derived (non-persisted) values.
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const sys = this.system;

    // Equipped armor, grouped by the Limb it covers.
    const armorByLimb = {};
    for (const it of this.items) {
      if (it.type !== "armor" || !it.system.equipped) continue;
      const key = this.matchLimbKey(it.system.limb);
      if (!key) continue;
      const a = (armorByLimb[key] ??= { def: 0, toHit: 0 });
      a.def += Number(it.system.defenseBonus) || 0;
      a.toHit += Number(it.system.toHitBonus) || 0;
    }

    // Effective Limb stats = natural base + worn armor.
    sys.effLimbs = {};
    for (const [key, l] of Object.entries(sys.limbs ?? {})) {
      const a = armorByLimb[key] ?? { def: 0, toHit: 0 };
      sys.effLimbs[key] = {
        defense: (Number(l.defense) || 0) + a.def,
        toHitTarget: (Number(l.toHitTarget) || 0) + a.toHit,
        armorDef: a.def,
        armorToHit: a.toHit
      };
    }

    // Carry: every item costs slots; packs add capacity (rulebook Ch.4).
    let used = 0;
    let capacity = Number(sys.slots) || 0;
    for (const it of this.items) {
      used += Number(it.system.slots ?? 1);
      capacity += Number(it.system.slotBonus ?? 0);
    }
    sys.carry = { used, capacity, over: Math.max(0, used - capacity) };

    // Deprivation penalty: -1 per tier above tier 1 on each track (to -5 each),
    // stacking, plus -1 per over-carried item (rulebook Ch.7 Exhaustion).
    // Starvation (Food), Dehydration (Water) and Exhaustion each impose -1 per tier
    // above tier 1 (to -5 each), stacking, across every roll. Energy Depletion is
    // handled separately as Emergency Sleep (see isEmergencySleep), not a penalty.
    const dep = sys.deprivation ?? {};
    const overTier = (t) => Math.clamp((Number(t?.tier) || 1) - 1, 0, 5);
    sys.depPenalty = overTier(dep.starvation) + overTier(dep.dehydration) + overTier(dep.exhaustion);
    sys.penalty = -(sys.depPenalty + sys.carry.over); // <= 0, added to every roll
  }

  /** Resolve an armor's "limb covered" string to one of this actor's limb keys. */
  matchLimbKey(str) {
    if (!str) return null;
    const limbs = this.system.limbs ?? {};
    if (limbs[str]) return str;
    const norm = (s) => String(s).toLowerCase().replace(/\s+/g, "");
    const want = norm(str);
    for (const [k, l] of Object.entries(limbs)) {
      if (norm(k) === want || norm(l.label) === want) return k;
    }
    return null;
  }

  /** Effective (armor-adjusted) stats for one Limb. */
  effLimb(key) {
    const base = this.getLimb(key) ?? {};
    const eff = this.system.effLimbs?.[key] ?? {};
    return {
      toHitTarget: eff.toHitTarget ?? base.toHitTarget ?? 0,
      defense: eff.defense ?? base.defense ?? 0,
      armorDef: eff.armorDef ?? 0
    };
  }

  /** Expose `@initiative` (and Limb Skill Totals) to Initiative and inline rolls. */
  getRollData() {
    const data = { ...super.getRollData() };
    data.initiative = Number(this.system.initiative) || 0;
    data.penalty = Number(this.system.penalty) || 0; // deprivation + over-carry, <= 0
    data.limb = {};
    for (const [k, l] of Object.entries(this.system.limbs ?? {})) {
      data.limb[k] = (Number(l.points) || 0) + (Number(l.speciesBonus) || 0);
    }
    return data;
  }

  /* -------------------------------------------- Action economy (2 per turn) */

  /** True while it is this actor's turn in the active, started encounter. */
  get isMyCombatTurn() {
    const c = game.combat;
    return !!(c?.started && c.combatant?.actorId === this.id);
  }

  async spendAction(n = 1) {
    const cur = Number(this.system.actions?.value) || 0;
    await this.update({ "system.actions.value": Math.max(0, cur - n) });
  }

  /** Gain Actions (e.g. a Ring solve grants +1); may exceed the per-turn max. */
  async gainAction(n = 1) {
    const cur = Number(this.system.actions?.value) || 0;
    await this.update({ "system.actions.value": cur + n });
  }

  /** Refill to the per-turn maximum (called at the start of this actor's turn). */
  async resetActions() {
    const max = Number(this.system.actions?.max) || 0;
    await this.update({ "system.actions.value": max });
  }

  /* -------------------------------------------- Hacking bridge */

  /**
   * Enter a machine's Carapace (rulebook Ch.8/9): an Interface roll (a Skill Roll,
   * meet or beat the DR) against the Limb housing the Carapace, costing one Base
   * Dimension Action. On a success the character is inside and the hack plays out in
   * the hacking prototype. One combat turn = one hacking round; the character's
   * Actions refill next turn and the hack resumes.
   */
  async enterCarapace() {
    if (this.#asleepBlocked()) return;
    const myLimbs = this.system.sortedLimbs ?? [];
    const def = myLimbs.find((l) => /hand|forepaw|claw/i.test(l.key)) ?? myLimbs[0];
    const atkOpts = myLimbs.map((l) => {
      const st = (Number(l.points) || 0) + (Number(l.speciesBonus) || 0);
      return `<option value="${l.key}" ${l.key === def?.key ? "selected" : ""}>${l.label} (Skill ${st >= 0 ? "+" : ""}${st})</option>`;
    }).join("");

    const opts = await DialogV2.wait({
      window: { title: "Enter Carapace (Interface roll)" },
      content: `
        <div class="mega-dialog">
          <div class="form-group"><label>Interfacing Limb</label><select name="limb">${atkOpts}</select></div>
          <div class="form-group"><label>Carapace Interface DR</label><input type="number" name="dr" value="8" autofocus></div>
          <div class="form-group"><label>Situational modifier</label><input type="number" name="mod" value="0"></div>
        </div>`,
      buttons: [
        { action: "roll", label: "Interface Roll", default: true, callback: (event, button) => ({
          limbKey: button.form.elements.limb.value,
          dr: Number(button.form.elements.dr.value),
          mod: Number(button.form.elements.mod.value) || 0
        }) },
        { action: "cancel", label: "Cancel", callback: () => null }
      ],
      rejectClose: false
    });
    if (!opts) return;

    const limb = this.getLimb(opts.limbKey);
    const skillTotal = this.skillTotalOf(limb);
    const pen = Number(this.system.penalty) || 0;
    const roll = await new Roll("1d10 + @skill + @mod + @pen", { skill: skillTotal, mod: opts.mod, pen }).evaluate();
    const die = roll.dice[0]?.total ?? roll.total;
    const success = roll.total >= opts.dr; // meet or beat

    if (success) await this.update({ "system.hacking.inCarapace": true });
    if (this.isMyCombatTurn) await this.spendAction(1);

    const content = `
      <div class="mega-card">
        <header class="mega-card-head">
          <span class="mega-card-kind">Interface :: Enter Carapace</span>
          <span class="mega-card-limb">${limb?.label ?? ""}</span>
        </header>
        <div class="mega-card-line">
          <span class="mega-die">${die}</span>
          <span class="mega-math">+ ${skillTotal} Skill${opts.mod ? ` ${opts.mod >= 0 ? "+" : ""}${opts.mod} mod` : ""}${pen ? ` ${pen} deprivation` : ""} = <b>${roll.total}</b></span>
          <span class="mega-vs">vs DR ${opts.dr}</span>
        </div>
        <div class="mega-result ${success ? "is-success" : "is-failure"}">${success ? "Breached" : "Failed"}</div>
        ${success ? `<div class="mega-dmg">Inside the Carapace. A full hacking exchange (your Tips &amp; Spins, then the Thymus) is <b>one Base Dimension Action</b>; run it in the hacking prototype. Your Actions refill next turn to continue the hack.</div>` : ""}
      </div>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      content,
      sound: CONFIG.sounds.dice
    });
    return { success };
  }

  /**
   * Exit the Carapace (rulebook Ch.8, line "Spend an Action to Exit at any time"):
   * costs one Action; the Thymus gets one free parting Attack as you jack out (a
   * Decoy / Clone Node counters it); you keep every Token earned and the control from
   * each Ring solved. The parting Attack is resolved in play (the Thymus is not a
   * Foundry combatant), so this posts the reminder.
   */
  async exitCarapace() {
    if (!this.system.hacking?.inCarapace) return;
    await this.update({ "system.hacking.inCarapace": false });
    if (this.isMyCombatTurn) await this.spendAction(1);
    const content = `
      <div class="mega-card">
        <header class="mega-card-head">
          <span class="mega-card-kind">Interface :: Exit Carapace</span>
          <span class="mega-card-limb">${this.name}</span>
        </header>
        <div class="mega-dmg">Jacked out. The Thymus gets one free parting <b>Attack</b> as you disconnect (a Decoy / Clone Node counters it). You keep every Token earned and the control from each Ring you solved; the hack ends incomplete.</div>
      </div>`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content });
  }

  /* -------------------------------------------- Skill Roll */

  async rollSkill(limbKey, { dr = null, label = "", mod = 0 } = {}) {
    if (this.#asleepBlocked()) return;
    const limb = this.getLimb(limbKey);
    if (!limb) return ui.notifications.warn("That Limb was not found on the sheet.");
    const skillTotal = this.skillTotalOf(limb);

    if (dr === null) {
      const res = await this.#promptSkill(limb.label);
      if (!res) return;
      dr = res.dr; label = res.label; mod = res.mod;
    }
    if (!Number.isFinite(dr)) return;

    const pen = Number(this.system.penalty) || 0; // deprivation + over-carry, <= 0
    const roll = await new Roll("1d10 + @skill + @mod + @pen", { skill: skillTotal, mod, pen }).evaluate();
    const die = roll.dice[0]?.total ?? roll.total;
    const success = roll.total >= dr; // meet or beat

    const content = `
      <div class="mega-card">
        <header class="mega-card-head">
          <span class="mega-card-kind">Skill Roll</span>
          <span class="mega-card-limb">${label ? `${label} &middot; ` : ""}${limb.label}</span>
        </header>
        <div class="mega-card-line">
          <span class="mega-die">${die}</span>
          <span class="mega-math">+ ${skillTotal} Skill${mod ? ` ${mod >= 0 ? "+" : ""}${mod} mod` : ""}${pen ? ` ${pen} deprivation` : ""} = <b>${roll.total}</b></span>
          <span class="mega-vs">vs DR ${dr}</span>
        </div>
        <div class="mega-result ${success ? "is-success" : "is-failure"}">${success ? "Success" : "Failure"}</div>
      </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      content,
      sound: CONFIG.sounds.dice
    });
    return { success, total: roll.total };
  }

  #promptSkill(limbLabel) {
    return DialogV2.wait({
      window: { title: `Skill Roll - ${limbLabel}` },
      content: `
        <div class="mega-dialog">
          <div class="form-group"><label>Skill (optional)</label>
            <input type="text" name="label" placeholder="e.g. Climb, Interface, Survey"></div>
          <div class="form-group"><label>Difficulty Rating (DR)</label>
            <input type="number" name="dr" value="8" autofocus></div>
          <div class="form-group"><label>Situational modifier</label>
            <input type="number" name="mod" value="0"></div>
        </div>`,
      buttons: [
        {
          action: "roll", label: "Roll", default: true,
          callback: (event, button) => ({
            dr: Number(button.form.elements.dr.value),
            label: (button.form.elements.label.value || "").trim(),
            mod: Number(button.form.elements.mod.value) || 0
          })
        },
        { action: "cancel", label: "Cancel", callback: () => null }
      ],
      rejectClose: false
    });
  }

  /* -------------------------------------------- Attack (To-Hit + Damage) */

  async rollAttack(weaponId) {
    if (this.#asleepBlocked()) return;
    const weapon = this.items.get(weaponId);
    if (!weapon || weapon.type !== "weapon") return;
    const modes = weapon.system.availableModes;
    if (!modes.length) {
      return ui.notifications.warn(`${weapon.name} has no Melee, Thrown or Launched value set.`);
    }

    // Resolve the target: prefer the user's targeted token; else a lone other token.
    let targetToken = Array.from(game.user.targets ?? [])[0];
    if (!targetToken) {
      const others = (canvas?.tokens?.placeables ?? []).filter((t) => t.actor && t.actor !== this);
      if (others.length === 1) targetToken = others[0];
    }
    const targetActor = targetToken?.actor;
    if (!targetActor) return ui.notifications.warn(game.i18n.localize("MEGA.Roll.NoTarget"));

    const targetLimbs = targetActor.system.sortedLimbs ?? [];
    const myLimbs = this.system.sortedLimbs ?? [];
    if (!targetLimbs.length) return ui.notifications.warn(`${targetActor.name} has no Limbs to target.`);
    const defaultAtk = myLimbs.find((l) => /arm|foreleg/i.test(l.key)) ?? myLimbs[0];

    const opts = await this.#promptAttack({ weapon, modes, targetActor, targetLimbs, myLimbs, defaultAtkKey: defaultAtk?.key });
    if (!opts) return;
    const { mode, attackerLimbKey, targetLimbKey, mod, energy = 0 } = opts;

    const atkLimb = this.getLimb(attackerLimbKey);
    const tgtLimb = targetActor.system.limbs[targetLimbKey];
    if (!atkLimb || !tgtLimb) return;

    const skillTotal = this.skillTotalOf(atkLimb);
    const wScore = Number(weapon.system[mode]) || 0;
    const pen = Number(this.system.penalty) || 0; // attacker deprivation / over-carry
    const tEff = targetActor.effLimb(targetLimbKey);
    const toHitTarget = tEff.toHitTarget; // includes the target's worn armor

    const roll = await new Roll("1d10 + @skill + @wpn + @mod + @pen", { skill: skillTotal, wpn: wScore, mod, pen }).evaluate();
    const die = roll.dice[0]?.total ?? roll.total;
    const hit = roll.total > toHitTarget; // strictly above; a tie misses

    // Flat weapon damage: effective Defense (base + armor) first, then HP. Armor
    // degrades by 1 only when penetrated; a fully absorbed hit deals no HP damage
    // and does not reduce armor (rulebook Chapter 3).
    let dmg = wScore;
    if (hit && energy > 0) dmg += 3 * energy; // Energy weapon: +3 damage per Energy spent
    const def = tEff.defense;
    const hpVal = Number(tgtLimb.hp?.value) || 0;
    let hpDealt = 0, absorbed = false;
    if (hit) {
      if (dmg > def) hpDealt = dmg - def;
      else absorbed = true;
    }

    // Spend the Energy on a successful hit (attacker's own reserves).
    if (hit && energy > 0 && this.isOwner) {
      const cur = Number(this.system.resources?.energy) || 0;
      await this.update({ "system.resources.energy": Math.max(0, cur - energy) });
    }

    // Apply to the target only if this user may modify it; otherwise the card still
    // reports the damage for the Admin to apply.
    let applied = false, degradeNote = "";
    if (hit && !absorbed && targetActor.isOwner) {
      const updates = { [`system.limbs.${targetLimbKey}.hp.value`]: hpVal - hpDealt };
      // Only WORN armor degrades on a penetrating hit; a Limb's base + natural Limb
      // Armor Defense are permanent and do not degrade (rulebook Chapter 3).
      if (tEff.armorDef > 0) {
        const worn = targetActor.items.find((it) =>
          it.type === "armor" && it.system.equipped &&
          targetActor.matchLimbKey(it.system.limb) === targetLimbKey &&
          (Number(it.system.defenseBonus) || 0) > 0);
        if (worn) {
          await worn.update({ "system.defenseBonus": Math.max(0, (Number(worn.system.defenseBonus) || 0) - 1) });
          degradeNote = " &middot; armor -1";
        }
      }
      await targetActor.update(updates);
      applied = true;
    }

    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
    let dmgLine = "";
    if (hit) {
      const eNote = energy > 0 ? ` (incl. +${3 * energy} from ${energy} Energy)` : "";
      const detail = absorbed
        ? `<b>${dmg}</b> damage${eNote}, fully absorbed by Defense ${def}`
        : `<b>${dmg}</b> damage${eNote} &rarr; ${hpDealt} to HP${degradeNote}`;
      dmgLine = `<div class="mega-dmg">${detail}${applied ? "" : " <em>(apply manually)</em>"}</div>`;
    }

    const content = `
      <div class="mega-card">
        <header class="mega-card-head">
          <span class="mega-card-kind">Attack</span>
          <span class="mega-card-limb">${weapon.name} &middot; ${modeLabel}</span>
        </header>
        <div class="mega-card-sub">${this.name} &rarr; ${targetActor.name}'s ${tgtLimb.label}</div>
        <div class="mega-card-line">
          <span class="mega-die">${die}</span>
          <span class="mega-math">+ ${skillTotal} Skill + ${wScore} weapon${mod ? ` ${mod >= 0 ? "+" : ""}${mod} mod` : ""}${pen ? ` ${pen} deprivation` : ""} = <b>${roll.total}</b></span>
          <span class="mega-vs">vs To-Hit ${toHitTarget}</span>
        </div>
        <div class="mega-result ${hit ? "is-success" : "is-failure"}">${hit ? "Hit" : "Miss"}</div>
        ${dmgLine}
      </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      content,
      sound: CONFIG.sounds.dice
    });

    // An Attack costs 1 Action on the attacker's turn (rulebook Ch.8).
    if (this.isMyCombatTurn) {
      if ((Number(this.system.actions?.value) || 0) <= 0) ui.notifications?.warn(`${this.name} has no Actions left this turn.`);
      await this.spendAction(1);
    }
    return { hit, total: roll.total };
  }

  #promptAttack({ weapon, modes, targetActor, targetLimbs, myLimbs, defaultAtkKey }) {
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const modeOpts = modes.map((m) => `<option value="${m}">${cap(m)} (${weapon.system[m]})</option>`).join("");
    const tgtOpts = targetLimbs.map((l) =>
      `<option value="${l.key}">${l.label}: To-Hit ${l.toHitTarget}, HP ${l.hp?.value ?? 0}/${l.hp?.max ?? 0}, Def ${l.defense ?? 0}</option>`).join("");
    const atkOpts = myLimbs.map((l) => {
      const st = (Number(l.points) || 0) + (Number(l.speciesBonus) || 0);
      return `<option value="${l.key}" ${l.key === defaultAtkKey ? "selected" : ""}>${l.label} (Skill ${st >= 0 ? "+" : ""}${st})</option>`;
    }).join("");

    // Energy weapons: spend 1 Energy for +3 damage per Energy on a hit (rulebook Ch.10).
    const isEnergy = weapon.system.weaponType === "Energy";
    const availEnergy = Number(this.system.resources?.energy) || 0;
    const energyField = isEnergy
      ? `<div class="form-group"><label>Energy to spend (+3 damage each, ${availEnergy} available)</label><input type="number" name="energy" value="0" min="0" max="${availEnergy}"></div>`
      : "";

    return DialogV2.wait({
      window: { title: `Attack - ${weapon.name} vs ${targetActor.name}` },
      content: `
        <div class="mega-dialog">
          <div class="form-group"><label>Mode</label><select name="mode">${modeOpts}</select></div>
          <div class="form-group"><label>Your attacking Limb</label><select name="atk">${atkOpts}</select></div>
          <div class="form-group"><label>Target Limb</label><select name="tgt">${tgtOpts}</select></div>
          ${energyField}
          <div class="form-group"><label>Situational modifier</label><input type="number" name="mod" value="0"></div>
        </div>`,
      buttons: [
        {
          action: "roll", label: "Roll To-Hit", default: true,
          callback: (event, button) => ({
            mode: button.form.elements.mode.value,
            attackerLimbKey: button.form.elements.atk.value,
            targetLimbKey: button.form.elements.tgt.value,
            energy: isEnergy ? Math.max(0, Number(button.form.elements.energy?.value) || 0) : 0,
            mod: Number(button.form.elements.mod.value) || 0
          })
        },
        { action: "cancel", label: "Cancel", callback: () => null }
      ],
      rejectClose: false
    });
  }

  /* -------------------------------------------- Apply a Species */

  /**
   * Apply a playable species (rulebook Ch.4/5): sets the body-plan Limbs with their
   * Species Bonuses, plus inventory slots, size, movement, initiative and per-Cycle
   * intake. Overwrites the current Limb set.
   */
  async applySpecies(key) {
    const sp = CONFIG.MEGA.species?.[key];
    if (!sp) return;
    const limbs = clonePreset(sp.preset);
    for (const [lk, l] of Object.entries(limbs)) {
      l.speciesBonus = Number(sp.bonuses?.[lk]) || 0;
      // Natural Limb Armor Defense: some species carry built-in protection above the
      // base 1 (Sentinel 5, Silicon 4, Synthetic 3, Junkursu 3, Insect/Crustacean
      // Head 2 / Center Mass 4 / others 3). It does not degrade in combat.
      if (sp.defense?.[lk] != null) l.defense = Number(sp.defense[lk]);
    }

    const clear = {};
    for (const k of Object.keys(this.system.limbs ?? {})) clear[`system.limbs.-=${k}`] = null;
    if (Object.keys(clear).length) await this.update(clear);
    await this.update({
      system: {
        limbs,
        species: sp.label,
        slots: sp.slots,
        size: sp.size,
        movement: sp.move,
        initiative: sp.init,
        intake: sp.intake
      }
    });
    ui.notifications?.info(`Applied ${sp.label}.`);
  }

  /* -------------------------------------------- Advance a Cycle */

  /**
   * Advance one Cycle (rulebook Ch.7): spend per-Cycle intake from stockpiles and
   * update deprivation. Food met eases Starvation a tier; unmet adds a tally (3 =
   * +1 tier). Water met eases Dehydration; unmet +1 tier. Energy / Air unmet post a
   * warning (Emergency Sleep / Suffocation are resolved in play).
   */
  async advanceCycle() {
    const sys = this.system;
    const intake = sys.intake ?? {};
    const need = (k) => Number(intake[k]) || 0;

    // Emergency Sleep (Energy Depletion): powered down and skipping this Cycle's
    // intake, counting down until it wakes with Energy restored.
    if (sys.emergencySleep?.active) {
      const left = Math.max(0, (Number(sys.emergencySleep.cyclesLeft) || 0) - 1);
      if (left <= 0) {
        const restored = Math.max(Number(sys.resources?.energy) || 0, (need("energy") || 2) * 3);
        await this.update({ "system.emergencySleep.active": false, "system.emergencySleep.cyclesLeft": 0, "system.resources.energy": restored });
        await this.#cycleCard([`Woke from Emergency Sleep. Energy restored to ${restored}.`]);
      } else {
        await this.update({ "system.emergencySleep.cyclesLeft": left });
        await this.#cycleCard([`In Emergency Sleep (${left} Cycle${left === 1 ? "" : "s"} left).`]);
      }
      return;
    }

    const r = foundry.utils.deepClone(sys.resources ?? {});
    const dep = foundry.utils.deepClone(sys.deprivation ?? {});
    dep.starvation ??= { tier: 1, tallies: 0 };
    dep.dehydration ??= { tier: 1 };
    dep.exhaustion ??= { tier: 1 };
    const log = [];

    if (need("food") > 0) {
      if ((r.food ?? 0) >= need("food")) {
        r.food -= need("food");
        if (dep.starvation.tier > 1) { dep.starvation.tier -= 1; dep.starvation.tallies = 0; log.push("Ate: Starvation eased a tier"); }
        else log.push(`Ate ${need("food")} Food`);
      } else {
        dep.starvation.tallies = (dep.starvation.tallies || 0) + 1;
        if (dep.starvation.tallies >= 3) { dep.starvation.tallies = 0; dep.starvation.tier = Math.min(6, dep.starvation.tier + 1); log.push("No Food: Starvation +1 tier"); }
        else log.push(`No Food: Starvation tally ${dep.starvation.tallies}/3`);
      }
    }
    if (need("water") > 0) {
      if ((r.water ?? 0) >= need("water")) {
        r.water -= need("water");
        if (dep.dehydration.tier > 1) { dep.dehydration.tier -= 1; log.push("Drank: Dehydration eased a tier"); }
        else log.push(`Drank ${need("water")} Water`);
      } else { dep.dehydration.tier = Math.min(6, dep.dehydration.tier + 1); log.push("No Water: Dehydration +1 tier"); }
    }
    if (need("energy") > 0) {
      if ((r.energy ?? 0) >= need("energy")) { r.energy -= need("energy"); log.push(`Spent ${need("energy")} Energy`); }
      else {
        // Depletion: forced into Emergency Sleep Mode for 1D6 Cycles (cannot act).
        const d6 = (await new Roll("1d6").evaluate()).total;
        await this.update({ "system.emergencySleep.active": true, "system.emergencySleep.cyclesLeft": d6 });
        log.push(`No Energy: Depletion forces Emergency Sleep Mode for ${d6} Cycle${d6 === 1 ? "" : "s"} (cannot roll Initiative or Skill rolls; wakes with Energy restored).`);
      }
    }
    if (need("air") > 0) {
      if ((r.air ?? 0) >= need("air")) { r.air -= need("air"); log.push(`Used ${need("air")} Air`); }
      else log.push("No Air: Suffocation - 1 damage per turn to Center Mass (undefendable)");
    }

    await this.update({ "system.resources": r, "system.deprivation": dep });
    await this.#cycleCard(log);
  }

  async #cycleCard(log) {
    const content = `
      <div class="mega-card">
        <header class="mega-card-head">
          <span class="mega-card-kind">Cycle</span>
          <span class="mega-card-limb">${this.name}</span>
        </header>
        <ul class="mega-cycle-log">${log.map((l) => `<li>${l}</li>`).join("")}</ul>
      </div>`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content });
  }
}
