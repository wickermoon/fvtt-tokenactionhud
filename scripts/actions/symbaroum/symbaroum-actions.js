import { ActionHandler } from "../actionHandler.js";
import * as settings from "../../settings.js";

export class ActionHandlerSymbaroum extends ActionHandler {
  constructor(filterManager, categoryManager) {
    super(filterManager, categoryManager);
  }

  /** @override */
  async doBuildActionList(token, multipleTokens) {
    let result = this.initializeEmptyActionList();

    if (!token) return result;

    let tokenId = token.id;

    result.tokenId = tokenId;

    let actor = token.actor;

    if (!actor) return result;

    result.actorId = actor.id;

    let actorType = actor.data.type;

    let mysticalPowers = this._getMysticalPowers(actor, tokenId);
    let traits = this._getTraits(actor, tokenId);
    let weapons = this._getWeapons(actor, tokenId);
    let armors = this._getArmors(actor, tokenId);
    let abilities = this._getAbilities(actor, tokenId);
    let attributes = this._getAttributes(actor, tokenId);

    this._combineCategoryWithList(
      result,
      this.i18n("tokenactionhud.symbaroum.mysticalPowers"),
      mysticalPowers
    );
    this._combineCategoryWithList(
      result,
      this.i18n("tokenactionhud.traits"),
      traits
    );
    if (!game.settings.get("symbaroum", "combatAutomation")) {
      this._combineCategoryWithList(
        result,
        this.i18n("tokenactionhud.armour"),
        armors
      );
    }
    this._combineCategoryWithList(
      result,
      this.i18n("tokenactionhud.weapons"),
      weapons
    );
    this._combineCategoryWithList(
      result,
      this.i18n("tokenactionhud.symbaroum.abilities"),
      abilities
    );
    this._combineCategoryWithList(
      result,
      this.i18n("tokenactionhud.attributes"),
      attributes
    );

    if (settings.get("showHudTitle")) result.hudTitle = token.data?.name;

    return result;
  }

  _getMysticalPowers(actor, tokenId) {
    let filteredItems = actor.items.filter(
      (item) => item.data?.type === "mysticalPower" && item.data.data?.script
    );
    let result = this.initializeEmptyCategory("actorPowers");
    let powersCategory = this.initializeEmptySubcategory();
    powersCategory.actions = this._produceMap(
      tokenId,
      filteredItems,
      "mysticalPower"
    );
    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.roll"),
      powersCategory
    );
    return result;
  }

  _getTraits(actor, tokenId) {
    let filteredItems = actor.items.filter(
      (item) => item.data?.type === "trait" && item.data.data?.script
    );
    let result = this.initializeEmptyCategory("actorsTraits");
    let traitsCategory = this.initializeEmptySubcategory();
    traitsCategory.actions = this._produceMap(tokenId, filteredItems, "trait");

    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.roll"),
      traitsCategory
    );
    return result;
  }

  _getWeapons(actor, tokenId) {
    let filteredItems = actor.items.filter(
      (item) =>
        item.data?.type === "weapon" && item.data.data?.state === "active"
    );
    let result = this.initializeEmptyCategory("actorWeapons");
    let weaponsCategory = this.initializeEmptySubcategory();
    weaponsCategory.actions = this._produceMap(
      tokenId,
      filteredItems,
      "weapon"
    );

    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.roll"),
      weaponsCategory
    );
    return result;
  }

  _getArmors(actor, tokenId) {
    let result = this.initializeEmptyCategory("actorArmors");
    let armorsCategory = this.initializeEmptySubcategory();
    let encodedValue = ["armor", tokenId, actor.system.combat.id].join(
      this.delimiter
    );
    let item = {
      name: actor.system.combat.armor,
      encodedValue: encodedValue,
      id: actor.system.combat.id,
    };

    armorsCategory.actions = [item];
    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.roll"),
      armorsCategory
    );
    return result;
  }

  _getAbilities(actor, tokenId) {
    let filteredItems = actor.items.filter(
      (item) => item.data?.type === "ability" && item.data.data?.script
    );
    let result = this.initializeEmptyCategory("actorAbilities");
    let abilitiesCategory = this.initializeEmptySubcategory();
    abilitiesCategory.actions = this._produceMap(
      tokenId,
      filteredItems,
      "ability"
    );
    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.roll"),
      abilitiesCategory
    );
    return result;
  }

  _getAttributes(actor, tokenId) {
    let result = this.initializeEmptyCategory("attributes");
    let attributes = Object.entries(actor.system.attributes);
    let attributesCategory = this.initializeEmptySubcategory();
    attributesCategory.actions = attributes.map((c) => {
      let encodedValue = ["attribute", tokenId, c[0]].join(this.delimiter);
      return {
        name: game.i18n.localize(c[1].label),
        encodedValue: encodedValue,
        id: c[0],
      };
    });
    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.attributes"),
      attributesCategory
    );
    return result;
  }

  _produceMap(tokenId, itemSet, type) {
    return itemSet.map((i) => {
      let encodedValue = [type, tokenId, i.id].join(this.delimiter);
      let img = this._getImage(i);
      let result = {
        name: i.name,
        encodedValue: encodedValue,
        id: i.id,
        img: img,
      };
      return result;
    });
  }

  _getImage(item) {
    let result = "";
    if (settings.get("showIcons")) result = item.img ?? "";
    return !result?.includes("systems/symbaroum/asset/image/trait.png")
      ? result
      : "";
  }
}
