import { MODULE_ID } from "./main.js";
import {capitalize_first_letter, remove_tags} from './utils.js'

const ECHItems = {};
const HelperMainButtons = []
const HelperFreeButtons = []
const MODULE_FOLDER= "modules/enhancedcombathud-swade/"

export function initConfig() {

    Hooks.on("argonInit", (CoreHUD) => {
        if (game.system.id !== "swade") return;
        registerItems();
        registerCombatHelpers();
        const ARGON = CoreHUD.ARGON;
        

        const actionTypes = {
            action: ["action"],
            free: ["special"],
        };

        const itemTypes = {
            spell: ["power"],
            weapon: ["weapon"],
            skill: ["skill"],
            consumable: ["consumable", "equipment", "loot"],
        };

        const mainBarFeatures = [];


        CoreHUD.SWADE = {
            actionTypes,
            itemTypes,
            ECHItems,
            HelperMainButtons,
            HelperFreeButtons,
        };


        async function getTooltipDetails(item, type) {
            let title, description, itemType, subtitle, target, range, dt;
            const typesWithDescription = ['weapon','consumable', 'power', 'skill']
            let damageTypes = [];
            let properties = [];
            let materialComponents = "";
            if(typesWithDescription.includes(item.type)) {
                title = item.name
                description = remove_tags(item.system.description)
            } else {
                if (!item || !item.system) return;
                title = item.name;
                description = remove_tags(item.system.description);
                itemType = item.type;
                target = item.labels?.target || "-";
                range = item.labels?.range || "-";
                properties = [];
                dt = item.labels?.damageTypes?.split(", ");
                damageTypes = dt && dt.length ? dt : [];
                materialComponents = "";
            }

            if (description) description = await TextEditor.enrichHTML(description);
            let details = [];
            
            if(item?.system?.range) {
                details.push({
                    label: game.i18n.localize("enhancedcombathud-swade.Descriptions.Range"),
                    value: item.system.range,
                });
            }
            if(item?.system?.shots) {
                details.push({
                    label: game.i18n.localize("enhancedcombathud-swade.Descriptions.Shots"),
                    value: item.system.currentShots,
                });
            }

            if(item?.system?.damage) {
                details.push({
                    label: game.i18n.localize("enhancedcombathud-swade.Descriptions.Damage"),
                    value: item.system.damage,
                });
            }
            const tooltipProperties = [];
            return { title, description, subtitle, details, properties: tooltipProperties, footerText: materialComponents };
        }

        function condenseItemButtons(items) {
            const condensedItems = [];
            const barItemsLength = items.length;
            const barItemsMultipleOfTwo = barItemsLength - (barItemsLength % 2);
            let currentSplitButtonItemButton = null;
            for (let i = 0; i < barItemsLength; i++) {
                const isCondensedButton = i < barItemsMultipleOfTwo;
                const item = items[i];
                if (isCondensedButton) {
                    if (currentSplitButtonItemButton) {
                        const button = new SWADEItemButton({item, inActionPanel: false});
                        condensedItems.push(new ARGON.MAIN.BUTTONS.SplitButton(currentSplitButtonItemButton, button));
                        currentSplitButtonItemButton = null;
                    } else {
                        currentSplitButtonItemButton = new SWADEItemButton({item, inActionPanel: false});
                    }
                } else {
                    condensedItems.push(new SWADEItemButton({ item, inActionPanel: true }));
                }
            }
            return condensedItems;
        }
        
        class SWADEPortraitPanel extends ARGON.PORTRAIT.PortraitPanel {
            constructor(...args) {
                super(...args);
                
            }

            get wildcard() {
                return this._wildcard
            }

            set wildcard(value) {
                this._wildcard = value
            }

            get template() {
                return `modules/${MODULE_ID}/templates/portraitpanel.hbs`;
            }
            getData() {
                
                const data = {
                  name: this.name,
                  image: this.image,
                  isWildcard: this.actor.system.wildcard,
                  bennies: this.actor.system.bennies.value,
                  description: this.description,
                  isDead: this.isDead,
                  isDying: this.isDying,
                  deathIcon: this.deathIcon,
                  successes: this.successes,
                  failures: this.failures,
                  playerDetailsBottom: game.settings.get("enhancedcombathud", "playerDetailsBottom"),
                }
                return data;
              }

            get name() {
                return this.actor.name
            }

            get description() {
                const { type, system } = this.actor;
                const actor = this.actor;
                const isNPC = type === "npc";
                const isPC = type === "character";
                if (isNPC) {
                    const smarts = system.attributes.smarts.animal ? game.i18n.localize("SWADE.AnimalSmarts") : null;
                    return smarts;
                } else if (isPC) {
                    return this.actor.system.advances.rank;
                } else {
                    return "";
                }
            }

            get isDead() {
                return this.isDying && this.actor.type !== "character";
            }

            get isDying() {
                return (this.actor.system.wounds.value > this.actor.system.wounds.max);
            }

            get successes() {
                return this.actor.system.attributes?.death?.success ?? 0;
            }

            get failures() {
                return this.actor.system.attributes?.death?.failure ?? 0;
            }

            get configurationTemplate() {
                return "modules/enhancedcombathud-swade/templates/argon-actor-config.hbs";
            }

            async _onDeathSave(event) {
                this.actor.rollAttribute("vigor", { event })
            }

            async getStatBlocks() {
                const WoundsText = game.i18n.localize("SWADE.Wounds");
                const FatigueText = game.i18n.localize("SWADE.Fatigue");
                const SpellDC = game.i18n.localize("SWADE.PP");
                const hpColor = "rgb(0 255 170)";
                const tempMax = 12;
                const hpMaxColor = tempMax ? (tempMax > 0 ? "rgb(222 91 255)" : "#ffb000") : "rgb(255 255 255)";
                let blocks = []
                
                
                if(this.actor.system.fatigue.max > 0) {
                    blocks.push(
                        [
                            {
                                text: FatigueText,
                            },
                            {
                                text: this.actor.system.fatigue.value,
                                color: hpColor,
                            },
                            {
                                text: `/`,
                            },
                            {
                                text: this.actor.system.fatigue.max,
                                color: hpMaxColor,
                            },
                        ],
                    )
                }
                if(this.actor.system.wounds.max > 0) {
                    blocks.push(
                        [
                            {
                                text: WoundsText,
                            },
                            {
                                text: this.actor.system.wounds.value,
                                color: hpColor,
                            },
                            {
                                text: `/`,
                            },
                            {
                                text: this.actor.system.wounds.max,
                                color: hpMaxColor,
                            },
                        ],
                    )
                }                
                return blocks;
            }
        }
        
        class SWADEDrawerButton extends ARGON.DRAWER.DrawerButton {
            constructor(buttons, item, type) {
                super(buttons);
                this.item = item;
                this.type = type;
            }

            get hasTooltip() {
                return true;
            }

            get tooltipOrientation() {
                return TooltipManager.TOOLTIP_DIRECTIONS.RIGHT;
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item, this.type);
                return tooltipData;
            }
        }

        class SWADEDrawerPanel extends ARGON.DRAWER.DrawerPanel {
            constructor(...args) {
                super(...args);
            }

            get categories() {
                const abilities = this.actor.system.attributes;
                const skills = this.actor.items.filter((item) => item.type === "skill");
                skills.sort((a, b) => a.name.localeCompare(b.name));

                const abilitiesButtons = Object.keys(abilities).map((ability) => {
                    const abilityData = abilities[ability];
                    return new SWADEDrawerButton(
                        [
                            {
                                label: capitalize_first_letter(ability),
                                onClick: (event) => this.actor.rollAttribute(ability, { event }),
                            },
                            {
                                label: `<span class="d${abilityData.die.sides} dice"></span>`,
                                style: "display: flex; justify-content: flex-end;",
                                onClick: (event) => this.actor.rollAttribute(ability, { event }),
                            },
                        ],
                        ability,
                        "attribute",
                    );
                });

                const skillsButtons = Object.keys(skills).map((skill) => {
                    const skillData = skills[skill];
                    return new SWADEDrawerButton(
                        [
                            {
                                label: skillData.name + `(${skillData.system.attribute})`,
                                onClick: (event) => this.actor.rollSkill(skillData.id, { event }),
                            },
                            {
                                label: `<span class="d${skillData.system.die.sides} dice"></span>`,
                                style: "display: flex; justify-content: flex-end;",
                                onClick: (event) => this.actor.rollAttribute(ability, { event }),
                            },
                        ],
                        skillData,
                        "skill",
                    );
                });

                return [
                    {
                        gridCols: "8fr 1fr",
                        captions: [
                            {
                                label: "Attributes",
                                align: "left",
                            },
                            {
                                label: "Die",
                                align: "left",
                            },
                        ],
                        align: ["left", "left"],
                        buttons: abilitiesButtons,
                    },
                    {
                        gridCols: "8fr 1fr",
                        captions: [
                            {
                                label: "Skills",
                                align: "left",
                            },
                            {
                                label: "Die",
                                align: "left",
                            },
                        ],
                        align: ["left", "left"],
                        buttons: skillsButtons,
                    },
                ];
            }

            get title() {
                return "enhancedcombathud-swade.Titles.AttributesSkills";
            }
        }

        class SWADEActionActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
                this.color = 0;
            }

            get label() {
                return "enhancedcombathud-swade.Titles.MainActions";
            }

            get maxActions() {
                return this.actor?.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.isActionUsed ? 0 : 1;
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const spellItems = this.actor.items.filter((item) => item.type === "power");
                const generalactionsItems = this.actor.items.filter((item) => item.type === "action");
                const featItems = [] 
                const consumableItems = this.actor.items.filter((item) => item.type === "consumable" && item.system.subtype === "regular");

                const actionButton = !generalactionsItems ? [] : [new SWADEButtonPanelButton({ type: "action", items: generalactionsItems, color: this.color })];
                const spellButton = !spellItems.length ? [] : [new SWADEButtonPanelButton({ type: "power", items: spellItems, color: this.color })];
                const helperButtons = !HelperMainButtons.length ? [] : [new SWADEButtonPanelButton({ type: "helpMainActions", items: HelperMainButtons, color: this.color })];

                const specialActions = Object.values(ECHItems);

                const defaultActions =  this.actor.items.filter((item) => item.type === "action" && ["disarm", "jump", "grapple", "push"].indexOf(item.name.toLowerCase())> -1);

                const buttons = [];
                let bennieButtons = []

                if(this.actor.system.wildcard) {
                    if(game.user.isGM) {
                        bennieButtons = [new ARGON.MAIN.BUTTONS.SplitButton(
                            new SWADESpecialActionButton(specialActions[0], this.color),
                            new SWADESpecialActionButton(specialActions[1], this.color),
                        )]
                    } else {
                        bennieButtons = [new SWADESpecialActionButton(specialActions[0], this.color)]
                    }

                }
                if (defaultActions.length == 4) {
                buttons.push(...[new SWADEItemButton({ item: null, isWeaponSet: true, isPrimary: true }), 
                                 ...helperButtons,
                                 ...bennieButtons,
                                 ...spellButton,
                                 new ARGON.MAIN.BUTTONS.SplitButton(
                                    new SWADESpecialActionButton(defaultActions[0], this.color),
                                    new SWADESpecialActionButton(defaultActions[1]), this.color),
                                 new ARGON.MAIN.BUTTONS.SplitButton(
                                    new SWADESpecialActionButton(defaultActions[2], this.color),
                                    new SWADESpecialActionButton(defaultActions[3]), this.color),
                                new SWADEButtonPanelButton({ type: "consumable", items: consumableItems, color: this.color })]);
                } else {
                    buttons.push(...[new SWADEItemButton({ item: null, isWeaponSet: true, isPrimary: true }),
                                ...helperButtons,
                                ...bennieButtons,
                                ...spellButton,
                                ...actionButton,
                                new SWADEButtonPanelButton({ type: "consumable", items: consumableItems, color: this.color })]); 
                }

                const barItems = []
                buttons.push(...condenseItemButtons(barItems));
                
                return buttons.filter((button) => button.hasContents || button.items == undefined || button.items.length);
            }
        }

        class SWADEFreeActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
                this.color = 4;
            }

            get label() {
                return game.i18n.localize("enhancedcombathud-swade.combatHelper.freeActions.name");
            }

            get maxActions() {
                return this.actor?.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.isActionUsed ? 0 : 1;
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const buttons = [new SWADEItemButton({ item: null, isWeaponSet: true, isPrimary: false })];
                const helperButtons = !HelperFreeButtons.length ? [] : [new SWADEButtonPanelButton({ type: "helpFreeActions", items: HelperFreeButtons, color: this.color })];
                const button = new SWADESpecialActionButton(ECHItems["prone"], this.color)
                buttons.push(button)

                const barItems = []
                buttons.push(...condenseItemButtons(barItems), ...helperButtons);

                return buttons;
            }
        }

        class SWADEItemButton extends ARGON.MAIN.BUTTONS.ItemButton {
            constructor(...args) {
                super(...args);
            }

            get hasTooltip() {
                return true;
            }

            get ranges() {
                const item = this.item;
                const touchRange = item.system.range.units == "touch" ? canvas?.scene?.grid?.distance : null;
                return {
                    normal: item.system?.range?.value ?? touchRange,
                    long: item.system?.range?.long ?? null,
                };
            }

            get label() {
                console.log(this.item)
                if(this.item.name) return this.item.name
                return "NONE";
            }

            get icon() {
                if(this.item.img)
                    return this.item.img
                else
                    return "systems/swade/assets/icons/edge.svg"
            }

            get targets() {
                const item = this.item;
                const validTargets = ["creature", "ally", "enemy"];
                const actionType = item.system.actionType;
                const targetType = item.system.target?.type;
                if (!item.system.target?.units && validTargets.includes(targetType)) {
                    return item.system.target?.value;
                } else if (actionType === "mwak" || actionType === "rwak"){
                    return 1;
                }
                return null;
            }

            get visible() {
                if(!this._isWeaponSet || this._isPrimary) return super.visible;
                return super.visible && this.item?.system?.armor?.type !== "shield";
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item);
                //tooltipData.propertiesLabel = "";
                return tooltipData;
            }

            async _onLeftClick(event) {
                ui.ARGON.interceptNextDialog(event.currentTarget);
                if(this.item?.flags?.hud?.subtype == "helper") return
                await this.item.show();
            }

            async _onRightClick(event) {
                this.item?.sheet?.render(true);
            }

            static consumeActionEconomy(item) {
                const activationType = item.system.activation?.type;
                let actionType = null;
                for (const [type, types] of Object.entries(actionTypes)) {
                    if (types.includes(activationType)) actionType = type;
                }
                if (!actionType) return;
                if (game.combat?.combatant?.actor !== item.parent) actionType = "reaction";
                if (actionType === "action") {
                    ui.ARGON.components.main[0].isActionUsed = true;
                    ui.ARGON.components.main[0].updateActionUse();
                } else if (actionType === "bonus") {
                    ui.ARGON.components.main[1].isActionUsed = true;
                    ui.ARGON.components.main[1].updateActionUse();
                } else if (actionType === "reaction") {
                    ui.ARGON.components.main[2].isActionUsed = true;
                    ui.ARGON.components.main[2].updateActionUse();
                } else if (actionType === "free") {
                    ui.ARGON.components.main[3].isActionUsed = true;
                    ui.ARGON.components.main[3].updateActionUse();
                } else if (actionType === "legendary") {
                    ui.ARGON.components.main[4].isActionUsed = true;
                }
            }

            async render(...args) {
                await super.render(...args);
                if (this.item) {
                    const weapons = this.actor.items.filter((item) => item.system.consume?.target === this.item.id);
                    ui.ARGON.updateItemButtons(weapons);
                }
            }

            get quantity() {
                return null;
            }
        }

        class SWADEButtonPanelButton extends ARGON.MAIN.BUTTONS.ButtonPanelButton {
            constructor({ type, items, color }) {
                super();
                this.type = type;
                this.items = items;
                this.color = color;
            }

            get colorScheme() {
                return this.color;
            }

            get id() {
                return `${this.type}-${this.color}`
            }

            get label() {
                switch (this.type) {
                    case "power":
                        return "SWADE.Pow";
                    case "consumable":
                        return "enhancedcombathud-swade.Buttons.useItem.name";
                    case "action":
                        return "enhancedcombathud-swade.Titles.OtherActions";
                    case "run":
                        return "enhancedcombathud-swade.Titles.Run";
                    case "helpMainActions":
                    case "helpFreeActions":
                        return "enhancedcombathud-swade.Titles.HelpMe";

                }
                return this.name
            }

            get icon() {
                switch (this.type) {
                    case "power":
                        return "modules/enhancedcombathud/icons/spell-book.webp";
                    case "feat":
                        return "modules/enhancedcombathud/icons/mighty-force.webp";
                    case "consumable":
                        return "modules/enhancedcombathud/icons/drink-me.webp";
                    case "action":
                        return "systems/swade/assets/icons/action.svg";
                    case "run":
                        return "systems/swade/assets/icons/edge.svg";
                    case "helpMainActions":
                    case "helpFreeActions":
                        return `${MODULE_FOLDER}assets/icons/question_mark.svg`;
                }

            }

            async _onLeftClick(event) {
                if(this.item?.flags?.hud?.subtype == "help") {
                    return
                } else {
                    this.item.show()
                }
                
            }

            async _getPanel() {
                if (this.type === "spell") {
                    return new ARGON.MAIN.BUTTON_PANELS.ACCORDION.AccordionPanel({ id: this.id, accordionPanelCategories: this._spells.map(({ label, buttons, uses }) => new ARGON.MAIN.BUTTON_PANELS.ACCORDION.AccordionPanelCategory({ label, buttons, uses })) });
                } else {
                    console.log("CONSUMABLES")
                    return new ARGON.MAIN.BUTTON_PANELS.ButtonPanel({ id: this.id, buttons: this.items.map((item) => new SWADEItemButton({ item })) });
                }
            }
        }

        
        class SWADEMovementHud extends ARGON.MovementHud {

            constructor (...args) {
                super(...args);
                this.getMovementMode = game.modules.get('elevation-drag-ruler')?.api?.getMovementMode;
            }

            get visible() {
                return game.combat?.started;
            }

            get movementMode() {
                return this.getMovementMode ? this.getMovementMode(this.token) : 'walk';
            }

            get movementMax() {
                return this.actor.system.stats.speed.value / canvas.scene.dimensions.distance;
            }
        }

        class SWADESpecialActionButton extends ARGON.MAIN.BUTTONS.ActionButton {
            constructor(specialItem, color=0) {
                super();
                this.color = color;
                const actorItem = this.actor.items.getName(specialItem.name);
                this.item =
                    actorItem ??
                    new CONFIG.Item.documentClass(specialItem, {
                        parent: this.actor,
                    });
            }

            get label() {
                return this.item.name;
            }

            get colorScheme() {
                return this.color;
            }

            get icon() {
                return this.item.img;
            }

            get hasTooltip() {
                return true;
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item);
                return tooltipData;
            }

            async _toggleStatus(event, actionId) {
                if(event != "effects") {
                    const existsOnActor = this.token.actor.statuses.has(actionId.toLowerCase())
                    const data = game.swade.util.getStatusEffectDataById(actionId.toLowerCase());
                    data["flags.core.statusId"] = actionId.toLowerCase();
                    await this.token.toggleEffect(data, { active: !existsOnActor });
                    
                } else {
                    let effect = this.token.actor.effects.filter(el => el.id === actionId)
                    if(effect.length == 0) {
                        const items = Array.from(this.actor.items.filter(it => ['edge', 'hindrance', 'ability'].includes(it.type)))
                        items.forEach(async (item) => {
                            let _eff = item.effects.filter(el => el.id === actionId)
                            if(_eff.length > 0) 
                                await _eff[0].update({ disabled: !_eff[0].disabled })
                        })
                    } else {
                        await this.token.actor.effects.filter(el => el.id === actionId)[0].update({ disabled: !effect[0].disabled })
                    }
    
                    
                }
            }
           
            _adjustBennies(event, actionId) {
                if (actionId === "spend") {
                    this.token.actor.spendBenny()
                } else if (actionId === "give") {
                    this.token.actor.getBenny()
                }
            }

            async _onLeftClick(event) {
                if(this.item.name.toLowerCase() == "prone")
                    this._toggleStatus(event, this.item.name)
                else if(this.item.type == "action") {
                    switch (this.item?.flags?.hud?.subtype) {
                        case "addbennie":
                            this._adjustBennies(event, "give")
                            break
                        case "spendbennie":
                            this._adjustBennies(event, "spend")
                            break
                        default:
                            this.item.show()

                    }
                } else {
                    this.item.show()
                }                
            }
        }


        class SWADEButtonHud extends ARGON.ButtonHud {

            constructor (...args) {
                super(...args);
            }

            get visible() {
                return !game.combat?.started;
            }

            async _getButtons() {

                return [
                ]
            }
        }

        class SWADEWeaponSets extends ARGON.WeaponSets {
            async getDefaultSets() {
                const actions = this.actor.items.filter((item) => item.type === "weapon");
                return {
                    1: {
                        primary: actions[0]?.uuid ?? null,
                        secondary: null,
                    },
                    2: {
                        primary: actions[1]?.uuid ?? null,
                        secondary: null,
                    },
                    3: {
                        primary: actions[2]?.uuid ?? null,
                        secondary: null,
                    },
                };
            }

            async _getSets() {
                const sets = mergeObject(await this.getDefaultSets(), deepClone(this.actor.getFlag("enhancedcombathud", "weaponSets") || {}));
            
                for (const [set, slots] of Object.entries(sets)) {
                  slots.primary = slots.primary ? await fromUuid(slots.primary) : null;
                  slots.secondary = null; 
                }
                return sets;
            }
            get template() {
                return `modules/${MODULE_ID}/templates/swadeWeaponSets.hbs`;
            }

            async _onSetChange({ sets, active }) {
                const updates = [];
                const activeSet = sets[active];
                const activeItems = Object.values(activeSet).filter((item) => item);
                const inactiveSets = Object.values(sets).filter((set) => set !== activeSet);
                const inactiveItems = inactiveSets.flatMap((set) => Object.values(set)).filter((item) => item).filter((item) => !activeItems.includes(item));
                activeItems.forEach((item) => {
                    if (!item.system?.equipped) updates.push({ _id: item.id, "system.equipped": true });
                });
                inactiveItems.forEach((item) => {
                    if (item.system?.equipped) updates.push({ _id: item.id, "system.equipped": false });
                });
                return await this.actor.updateEmbeddedDocuments("Item", updates);
            }
        }

        CoreHUD.definePortraitPanel(SWADEPortraitPanel);
        CoreHUD.defineDrawerPanel(SWADEDrawerPanel);
        CoreHUD.defineMainPanels([SWADEActionActionPanel, SWADEFreeActionPanel, ARGON.PREFAB.PassTurnPanel]);
        CoreHUD.defineMovementHud(SWADEMovementHud);
        CoreHUD.defineWeaponSets(SWADEWeaponSets);
        CoreHUD.defineSupportedActorTypes(["character", "npc"]);
    });
}

function registerCombatHelpers() {
    const freeActions = ["move", "run", "speak", "prone", "drop", "ask"]
    const mainAction = ["attack", "aim", "defend", "grapple", "push", "reload", "support", "shot", "test"]

    mainAction.forEach( action => {
        const img = game.i18n.localize(`enhancedcombathud-swade.combatHelper.mainActions.${action}.img`);
        HelperMainButtons.push({
            name: game.i18n.localize(`enhancedcombathud-swade.combatHelper.mainActions.${action}.name`),
            type: "action",
            img: `${MODULE_FOLDER}/${img}`,
            system: {
                type: {
                    value: "",
                    subtype: ""
                },
                description: game.i18n.localize(`enhancedcombathud-swade.combatHelper.mainActions.${action}.description`),
                source: "",
                quantity: 1,
                weight: 0,
                price: 0,
                attuned: false,
                attunement: 0,
                equipped: false,
                rarity: "",
                identified: true,
                activation: {
                    type: "action",
                    cost: 1,
                    condition: "",
                },
                duration: {
                    value: 1,
                    units: "turn",
                },
                target: {
                    value: null,
                    width: null,
                    units: "",
                    type: "self",
                },
                
                consume: {
                    type: "",
                    target: "",
                    amount: null,
                },
                ability: "",
                actionType: "util",
                attackBonus: 0,
                chatFlavor: "",
                critical: null,
                
                formula: "",
                save: {
                    ability: "",
                    dc: null,
                    scaling: "spell",
                },
            },
            effects: [
                {
                    _id: "8FtZnIC1vbyKZ6xF",
                    changes: [],
                    disabled: false,
                    duration: {
                        startTime: null,
                        turns: 1,
                    },
                    icon: "modules/enhancedcombathud/icons/journey.webp",
                    label: "Disengage",
                    origin: "Item.wyQkeuZkttllAFB1",
                    transfer: false,
                    flags: {
                        dae: {
                            stackable: "none",
                            macroRepeat: "none",
                            specialDuration: [],
                            transfer: false,
                        },
                    },
                    tint: "",
                },
            ],
            sort: 0,
            flags: {
                core: {
                    sourceId: "Item.wyQkeuZkttllAFB1",
                },
    
                hud: {
                    subtype: "helper"
                },
            },
        })
    })

    freeActions.forEach( action => {
        const img = game.i18n.localize(`enhancedcombathud-swade.combatHelper.freeActions.${action}.img`);
        HelperFreeButtons.push({
            name: game.i18n.localize(`enhancedcombathud-swade.combatHelper.freeActions.${action}.name`),
            type: "action",
            img: `${MODULE_FOLDER}/${img}`,
            system: {
                type: {
                    value: "",
                    subtype: ""
                },
                description: game.i18n.localize(`enhancedcombathud-swade.combatHelper.freeActions.${action}.description`),
                source: "",
                quantity: 1,
                weight: 0,
                price: 0,
                attuned: false,
                attunement: 0,
                equipped: false,
                rarity: "",
                identified: true,
                activation: {
                    type: "action",
                    cost: 1,
                    condition: "",
                },
                duration: {
                    value: 1,
                    units: "turn",
                },
                target: {
                    value: null,
                    width: null,
                    units: "",
                    type: "self",
                },
               
                consume: {
                    type: "",
                    target: "",
                    amount: null,
                },
                ability: "",
                actionType: "util",
                attackBonus: 0,
                chatFlavor: "",
                critical: null,
                
                formula: "",
                save: {
                    ability: "",
                    dc: null,
                    scaling: "spell",
                },
            },
            effects: [
                {
                    _id: "8FtZnIC1vbyKZ6xF",
                    changes: [],
                    disabled: false,
                    duration: {
                        startTime: null,
                        turns: 1,
                    },
                    icon: "modules/enhancedcombathud/icons/journey.webp",
                    label: "Disengage",
                    origin: "Item.wyQkeuZkttllAFB1",
                    transfer: false,
                    flags: {
                        dae: {
                            stackable: "none",
                            macroRepeat: "none",
                            specialDuration: [],
                            transfer: false,
                        },
                    },
                    tint: "",
                },
            ],
            sort: 0,
            flags: {
                core: {
                    sourceId: "Item.wyQkeuZkttllAFB1",
                },
    
                hud: {
                    subtype: "helper"
                }
            },
        })
    })
    
}
function registerItems() {
    if(game.user.isGM) {
        ECHItems[game.i18n.localize("enhancedcombathud-swade.Buttons.addBenny.name")] = {
            name: game.i18n.localize("enhancedcombathud-swade.Buttons.addBenny.name"),
            type: "action",
            img: "systems/swade/assets/bennie.webp",
            system: {
                type: {
                    value: "",
                    subtype: ""
                },
                description: game.i18n.localize("enhancedcombathud-swade.Buttons.addBenny.description"),
                source: "",
                quantity: 1,
                weight: 0,
                price: 0,
                attuned: false,
                attunement: 0,
                equipped: false,
                rarity: "",
                identified: true,
                activation: {
                    type: "action",
                    cost: 1,
                    condition: "",
                },
                duration: {
                    value: 1,
                    units: "turn",
                },
                target: {
                    value: null,
                    width: null,
                    units: "",
                    type: "self",
                },
                range: {
                    value: null,
                    long: null,
                    units: "",
                },
                consume: {
                    type: "",
                    target: "",
                    amount: null,
                },
                ability: "",
                actionType: "util",
                attackBonus: 0,
                chatFlavor: "",
                critical: null,
                damage: {
                    parts: [],
                    versatile: "",
                },
                formula: "",
                save: {
                    ability: "",
                    dc: null,
                    scaling: "spell",
                },
            },
            effects: [
                {
                    _id: "8FtZnIC1vbyKZ6xF",
                    changes: [],
                    disabled: false,
                    duration: {
                        startTime: null,
                        turns: 1,
                    },
                    icon: "modules/enhancedcombathud/icons/journey.webp",
                    label: "Disengage",
                    origin: "Item.wyQkeuZkttllAFB1",
                    transfer: false,
                    flags: {
                        dae: {
                            stackable: "none",
                            macroRepeat: "none",
                            specialDuration: [],
                            transfer: false,
                        },
                    },
                    tint: "",
                },
            ],
            sort: 0,
            flags: {
                core: {
                    sourceId: "Item.wyQkeuZkttllAFB1",
                },
                hud: {
                    subtype: "addbennie",
                }
            },
        };
    }

    ECHItems[game.i18n.localize("enhancedcombathud-swade.Buttons.removeBenny.name")] = {
        name: game.i18n.localize("enhancedcombathud-swade.Buttons.removeBenny.name"),
        type: "action",
        img: "systems/swade/assets/bennie.webp",
        system: {
            type: {
                value: "",
                subtype: ""
            },
            description: game.i18n.localize("enhancedcombathud-swade.Buttons.removeBenny.description"),
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: 1,
                units: "turn",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },
            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "spell",
            },
        },
        effects: [
            {
                _id: "8FtZnIC1vbyKZ6xF",
                changes: [],
                disabled: false,
                duration: {
                    startTime: null,
                    turns: 1,
                },
                icon: "modules/enhancedcombathud/icons/journey.webp",
                label: "Disengage",
                origin: "Item.wyQkeuZkttllAFB1",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            core: {
                sourceId: "Item.wyQkeuZkttllAFB1",
            },

            hud: {
                subtype: "spendbennie",
            }
        },
    };

    ECHItems["prone"] = {
        name: "Prone",
        description: "go prone",
        type: "action",
        img: "systems/swade/assets/bennie.webp",
        system: {
            type: {
                value: "",
                subtype: ""
            },
            description: "Go prone",
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: 1,
                units: "turn",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },
            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "spell",
            },
        },
        effects: [
            {
                _id: "8FtZnIC1vbyKZ6xF",
                changes: [],
                disabled: false,
                duration: {
                    startTime: null,
                    turns: 1,
                },
                icon: "modules/enhancedcombathud/icons/journey.webp",
                label: "Disengage",
                origin: "Item.wyQkeuZkttllAFB1",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            core: {
                sourceId: "Item.wyQkeuZkttllAFB1",
            },

            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
}