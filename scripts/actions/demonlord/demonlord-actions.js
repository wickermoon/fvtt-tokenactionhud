import { ActionHandler } from "../actionHandler.js";
import * as settings from "../../settings.js";

export class ActionHandlerDemonlord extends ActionHandler {
  constructor(filterManager, categoryManager) {
    super(filterManager, categoryManager);
  }

  /** @override */
  async doBuildActionList(token, multipleTokens) {
    let result = this.initializeEmptyActionList();

    if (multipleTokens) {
      this._buildMultipleTokenList(result);
      return result;
    }

    if (!token) return result;

    let tokenId = token.data._id;
    result.tokenId = tokenId;

    let actor = token.actor;

    if (!actor) return result;

    result.actorId = actor.id;

    let attributes = this._getAttributes(actor, tokenId);
    let weapons = this._getItemsList(actor, tokenId);
    let talents = this._getTalents(actor, tokenId);
    let spells = this._getSpells(actor, tokenId);
    let utility = this._getUtilityList(actor, tokenId);

    this._combineCategoryWithList(
      result,
      this.i18n("tokenactionhud.settings.demonlord.challenge"),
      attributes
    );

    if (actor.data.type === "character")
      this._combineCategoryWithList(
        result,
        this.i18n("tokenactionhud.weapons"),
        weapons
      );
    else
      this._combineCategoryWithList(
        result,
        this.i18n("tokenactionhud.settings.demonlord.attackoptions"),
        weapons
      );

    if (actor.data.type === "character")
      this._combineCategoryWithList(
        result,
        this.i18n("tokenactionhud.talents"),
        talents
      );
    else
      this._combineCategoryWithList(
        result,
        this.i18n("tokenactionhud.settings.demonlord.specialattacks"),
        talents
      );

    this._combineCategoryWithList(
      result,
      this.i18n("tokenactionhud.spells"),
      spells
    );
    this._combineCategoryWithList(
      result,
      this.i18n("tokenactionhud.utility"),
      utility
    );

    this._setFilterSuggestions(actor);

    if (settings.get("showHudTitle")) result.hudTitle = token.data?.name;

    return result;
  }

  _getItemsList(actor, tokenId) {
    let macroType = "weapon";
    let result = this.initializeEmptyCategory("items");

    let subcategory = this.initializeEmptySubcategory();

    subcategory.actions = this._produceMap(
      tokenId,
      actor.items
        .filter((i) => i.type == macroType)
        .map((item) => {
          return {
            name: item.name,
            encodedValue: [item.type, tokenId, item.id].join(this.delimiter),
          };
        }),
      macroType
    );

    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.weapons"),
      subcategory
    );

    return result;
  }

  _getAttributes(actor, tokenId) {
    let result = this.initializeEmptyCategory("attributes");
    let attributes = this.initializeEmptySubcategory();
    let macroType = "challenge";

    let rollableAttributes = Object.entries(actor.system.attributes);
    let attributesMap = rollableAttributes.map((c) => {
      let name = this.i18n("tokenactionhud.attribute." + c[0]);
      let encodedValue = [macroType, tokenId, c[0]].join(this.delimiter);
      return { name: name, encodedValue: encodedValue, id: c[0] };
    });

    attributes.actions = this._produceMap(tokenId, attributesMap, macroType);

    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.settings.demonlord.challenge"),
      attributes
    );

    return result;
  }

  _addMultiAttributes(list, tokenId, actors) {
    let result = this.initializeEmptyCategory("attributes");
    let attributes = this.initializeEmptySubcategory();
    let macroType = "challenge";

    let attributesMap = null;

    if (
      actors.every((actor) => {
        let rollableAttributes = Object.entries(actor.system.attributes);

        attributesMap = rollableAttributes.map((c) => {
          let name = this.i18n("tokenactionhud.attribute." + c[0]);
          let encodedValue = [macroType, tokenId, c[0]].join(this.delimiter);
          return { name: name, encodedValue: encodedValue, id: c[0] };
        });
      })
    );

    if (attributesMap != null) {
      attributes.actions = this._produceMap(tokenId, attributesMap, macroType);

      this._combineSubcategoryWithCategory(
        result,
        this.i18n("tokenactionhud.settings.demonlord.challenge"),
        attributes
      );
      this._combineCategoryWithList(
        list,
        this.i18n("tokenactionhud.settings.demonlord.challenge"),
        result
      );
    }
  }

  _getTalents(actor, tokenId) {
    let macroType = "talent";
    let result = this.initializeEmptyCategory("talents");

    let talents = actor.items.filter((i) => i.type == macroType);

    const groups = [
      ...new Set(talents.map((talent) => talent.system.groupname)),
    ];
    groups.sort().forEach((group) => {
      if (group != undefined) {
        let groupCategory = this.initializeEmptySubcategory();
        groupCategory.name = group;
        result.subcategories.push(groupCategory);

        let levelSubcategory = this.initializeEmptySubcategory();
        talents.forEach((talentEntry) => {
          if (talentEntry.system.groupname == group) {
            let encodedValue = [macroType, tokenId, talentEntry.id].join(
              this.delimiter
            );
            let addTalent = {
              name: talentEntry.name,
              encodedValue: encodedValue,
              id: talentEntry.id,
            };
            addTalent.img = this._getImage(talentEntry);
            addTalent.info2 = this._getUsesData(talentEntry);

            levelSubcategory.actions.push(addTalent);
          }
        });

        this._combineSubcategoryWithCategory(
          groupCategory,
          group,
          levelSubcategory
        );
      }
    });

    return result;
  }

  _getSpells(actor, tokenId) {
    let macroType = "spell";
    let result = this.initializeEmptyCategory("spells");

    let spells = actor.items.filter((i) => i.type === macroType);

    let spellsSorted = this._sortSpellsByRank(spells);
    let spellCategories = this._categoriseSpells(tokenId, spellsSorted);

    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.spells"),
      spellCategories
    );

    return result;
  }

  _sortSpellsByRank(spells) {
    let result = Object.values(spells);

    result.sort((a, b) => {
      if (a.data.rank === b.data.rank)
        return a.name
          .toUpperCase()
          .localeCompare(b.name.toUpperCase(), undefined, {
            sensitivity: "base",
          });
      return a.data.rank - b.data.rank;
    });

    return result;
  }

  _categoriseSpells(tokenId, spells) {
    const macroType = "spell";
    let result = this.initializeEmptySubcategory();

    const traditions = [
      ...new Set(spells.map((spell) => spell.system.tradition)),
    ];
    traditions.sort().forEach((tradition) => {
      if (tradition != undefined) {
        let traditionCategory = this.initializeEmptySubcategory();
        traditionCategory.name = tradition;
        result.subcategories.push(traditionCategory);

        let levelSubcategory = this.initializeEmptySubcategory();
        spells.forEach((spellEntry) => {
          if (spellEntry.system.tradition == tradition) {
            let encodedValue = [macroType, tokenId, spellEntry.id].join(
              this.delimiter
            );
            let addSpell = {
              name: spellEntry.name,
              encodedValue: encodedValue,
              id: spellEntry.id,
            };
            addSpell.img = this._getImage(spellEntry);
            addSpell.info2 = this._getCastingsData(spellEntry);

            levelSubcategory.actions.push(addSpell);
          }
        });

        this._combineSubcategoryWithCategory(
          traditionCategory,
          tradition,
          levelSubcategory
        );
      }
    });

    return result;
  }

  _buildMultipleTokenList(list) {
    list.tokenId = "multi";
    list.actorId = "multi";

    const allowedTypes = ["creature", "character"];
    let actors = canvas.tokens.controlled
      .map((t) => t.actor)
      .filter((a) => allowedTypes.includes(a.data.type));

    this._addMultiAttributes(list, list.tokenId, actors);
    this._addMultiUtilities(list, list.tokenId, actors);
  }

  _getUtilityList(actor, tokenId) {
    let result = this.initializeEmptyCategory("utility");
    let macroType = "utility";

    let rests = this.initializeEmptySubcategory();

    if (actor.data.type === "character") {
      let shortRestValue = [macroType, tokenId, "rest"].join(this.delimiter);
      rests.actions.push({
        id: "rest",
        encodedValue: shortRestValue,
        name: this.i18n("tokenactionhud.settings.demonlord.rest"),
      });
    }

    this._combineSubcategoryWithCategory(
      result,
      this.i18n("tokenactionhud.settings.demonlord.rest"),
      rests
    );

    return result;
  }

  _addMultiUtilities(list, tokenId, actors) {
    let category = this.initializeEmptyCategory("utility");
    let macroType = "utility";

    let rests = this.initializeEmptySubcategory();

    if (actors.every((actor) => actor.data.type === "character")) {
      let shortRestValue = [macroType, tokenId, "rest", ""].join(
        this.delimiter
      );
      rests.actions.push({
        id: "rest",
        encodedValue: shortRestValue,
        name: this.i18n("tokenactionhud.settings.demonlord.rest"),
      });
    }

    this._combineSubcategoryWithCategory(
      category,
      this.i18n("tokenactionhud.settings.demonlord.rest"),
      rests
    );
    this._combineCategoryWithList(
      list,
      this.i18n("tokenactionhud.utility"),
      category
    );
  }

  /** @override */
  _setFilterSuggestions(id, items) {
    let suggestions = items?.map((s) => {
      return { id: s.id, value: s.name };
    });
    if (suggestions?.length > 0)
      this.filterManager.setSuggestions(id, suggestions);
  }

  _filterElements(categoryId, skills) {
    let filteredNames = this.filterManager.getFilteredNames(categoryId);
    let result = skills.filter((s) => !!s);
    if (filteredNames.length > 0) {
      if (this.filterManager.isBlocklist(categoryId)) {
        result = skills.filter((s) => !filteredNames.includes(s.name));
      } else {
        result = skills.filter((s) => filteredNames.includes(s.name));
      }
    }

    return result;
  }

  _produceMap(tokenId, itemSet, type) {
    return itemSet.map((i) => {
      let icon = this._getImage(i);
      let result = {
        name: i.name,
        encodedValue: i.encodedValue,
        id: i.id,
        icon,
      };

      if (type === "talent") result.info2 = this._getUsesData(i);

      return result;
    });
  }

  _getImage(item) {
    let result = "";
    if (settings.get("showIcons")) result = item.img ?? "";

    return !result?.includes("icons/svg/mystery-man.svg") ? result : "";
  }

  _getUsesData(item) {
    let result = "";

    let uses = item.system.uses;
    if (!uses) return result;

    if (!(uses.max || uses.value)) return result;

    result = uses.value ?? 0;

    if (uses.max > 0) {
      result += `/${uses.max}`;
    }

    return result;
  }

  _getCastingsData(item) {
    let result = "";

    let uses = item.system.castings;
    if (!uses) return result;

    if (!(uses.max || uses.value)) return result;

    result = uses.value ?? 0;

    if (uses.max > 0) {
      result += `/${uses.max}`;
    }

    return result;
  }
}
