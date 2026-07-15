# The Megastructure — Foundry VTT System (v0.2.0)

A Foundry VTT **game system** for The Megastructure. Targets **Foundry v13** (uses
DataModels + ApplicationV2 sheets). This is the MVP: a limb-based character sheet
with per-Limb Skill Roll buttons and a weapon Attack flow, all resolving on the
rulebook's **1d10** engine.

## Install (development)

1. Copy (or symlink) the `megastructure/` folder into your Foundry user data at:
   `…/FoundryVTT/Data/systems/megastructure/`
   (the folder name **must** be `megastructure`, matching the `id` in `system.json`).
2. Restart Foundry. Create a new World and pick **The Megastructure** as its system.
3. Create an Actor of type **Character** — it opens with the humanoid Limb set.

Symlink example (Linux):
```
ln -s "…/Current Prototypes/Foundry System/megastructure" "…/FoundryVTT/Data/systems/megastructure"
```

## The rules it implements (rulebook Ch.2–3, 8)

- **Skill Roll** — click a Limb's d10 button → enter the DR → rolls `1d10 + that
  Limb's Skill Total` and reports **Success** if it **meets or beats** the DR (a tie
  succeeds). Skill Total = Points + Species Bonus.
- **Attack** — **target the enemy token** (press `T` over it), then click **Attack**
  on an equipped weapon. Pick the attack mode (Melee/Thrown/Launched), your attacking
  Limb, and the **target's Limb**. It rolls `1d10 + your Skill Total + weapon score`
  and **hits only if the total is strictly above** that Limb's To-Hit Target (a tie
  misses). On a hit it applies the weapon's **flat damage** to the Limb — Defense
  first, then HP — and posts the result to chat.
- **Body plans** — the Limbs panel has Humanoid / Quadruped / Winged presets, plus
  Add Limb, so Cyborgs and non-humanoid species work on the same sheet.

Both dialogs include a **situational modifier** field for any other bonus or penalty
the Admin calls.

## Equipment, carry and survival (v0.2.0)

- **Armor auto-applies.** Equip an armor item and set the Limb it covers (dropdown on
  the character sheet) — its Defense and To-Hit bonuses are added to that Limb's
  effective stats, shown as a chip beside the base value and used automatically in
  attacks. When a hit penetrates, the armor degrades by 1 (rulebook rule).
- **Carry / slots.** Every item costs slots (default 1); packs add capacity via a Slot
  Bonus. The Survival panel shows used / capacity; carrying over your limit adds a live
  −1 per excess item (Exhaustion) to all rolls.
- **Per-Cycle intake + deprivation.** Set each character's Food/Water/Energy/Air intake.
  **Advance Cycle** spends it from stockpiles and updates the deprivation tracks:
  Starvation (3 tallies = a tier; eating eases a tier), Dehydration (a tier per dry
  Cycle), and reports Energy Depletion / Air Suffocation. Deprivation tiers give −1 per
  tier above tier 1 (to −5 each, stacking) and apply automatically to **every** Skill
  and To-Hit roll. Both roll dialogs also have a situational modifier field.

## Initiative & Actions (v0.4.0)

- **Initiative** uses Foundry's Combat Tracker: `1d10 + Initiative`, highest first
  (roll it from the tracker as normal).
- **2 Actions per turn.** Each actor shows an Action tracker (in the Attacks header).
  It **refills to max at the start of that actor's turn** (combat hooks), an **Attack
  spends 1** automatically on your turn, and the +/reset buttons cover manual spends,
  the **+1 Action a Ring solve grants**, and a fresh turn. Set an actor's max in the
  data if a foe acts more than twice.
- **The Thymus needs no combatant.** Per the rulebook, a hack (the hacker's Actions,
  then the Thymus, then back) resolves inside the hacker's turn, so run the hacking
  prototype during that turn and advance the tracker afterward.
- **Digital Lifeform** acts twice per round: add it to the tracker twice (two
  Initiative rolls), per the rules.

## Hacking bridge (v0.5.0)

The hacking mini-game itself lives in the hacking prototype; Foundry governs the Base
Dimension turn around it.

- **Hack** (Attacks header) rolls an **Interface Skill Roll** to enter a Carapace,
  costing **1 Action**; on a success the sheet shows an **In Carapace** badge. The chat
  card reminds you: one combat turn = **one hacking round** (your Tips & Spins, then the
  Thymus), then Initiative passes on; your Actions refill next turn to continue.
- **Exit** costs 1 Action; the chat card notes the **Thymus's free parting Attack** (a
  Decoy / Clone Node counters it) and that you keep every Token and all control unlocked.
  The parting Attack itself is resolved in play, since the Thymus has no Foundry combatant.

## Notes / known limitations

- **One actor type** (`character`) is used for PCs and enemies; both have Limbs.
- Damage / armor degradation auto-applies to the target only if you own that actor (GMs
  own NPCs); otherwise the chat card reports it for the Admin to apply.
- Over-carry and deprivation are applied as a **live roll penalty**, not by mutating a
  stored Exhaustion tier, so nothing loops on render. Advance Cycle is the one action
  that writes deprivation changes.
- Still to come (later passes): species/equipment auto-fill from compendiums, XP success
  tallies, Energy-weapon spend, poisons, and paired-Limb shared skill pools.

## Layout

```
megastructure/
  system.json               manifest (v13, documentTypes, esmodule, styles)
  module/megastructure.mjs   init: register data models, sheets, helpers
  module/helpers/config.mjs  limb presets, skills, weapon types, sizes
  module/data/*.mjs          Actor + Item DataModels
  module/documents/actor.mjs rollSkill + rollAttack (the dice math)
  module/sheets/*.mjs        ApplicationV2 actor + item sheets
  templates/…                Handlebars templates
  css/megastructure.css      styling
  lang/en.json               localization
```
