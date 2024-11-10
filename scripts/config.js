import { MODULE_ID } from "./main.js";
import {capitalize_first_letter, remove_tags} from './utils.js'
import { BR2RollHandler, SWADERollHandler, SWADEToolsRollHandler } from './roll.js'

const ECHItems = {};
const HelperMainButtons = []
const HelperFreeButtons = []
const MODULE_FOLDER= "modules/enhancedcombathud-swade/"
let rollhandler = {}
let RUNNING = 0
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
        const isSwadeToolsEnabled = game.modules.get("swade-tools")?.active || false;
        const isBR2Enabled = game.modules.get("betterrolls-swade2")?.active || false;
        if(isSwadeToolsEnabled) {
            rollhandler = new SWADEToolsRollHandler()
        } else if(isBR2Enabled) {
            rollhandler = new BR2RollHandler()
        } else {
            rollhandler = new SWADERollHandler()
        }
        


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

                details.push({
                    label: game.i18n.localize("enhancedcombathud-swade.Descriptions.Duration"),
                    value: item.system.duration,
                });

                details.push({
                    label: game.i18n.localize("enhancedcombathud-swade.Descriptions.PP"),
                    value: item.system.pp,
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
                rollhandler.roll(this.token, event, "attribute", "vigor")
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
                                onClick: (event) => rollhandler.roll(this.token, event, "attribute", ability),
                            },
                            {
                                label: `<span class="d${abilityData.die.sides}-hud dice-hud"></span>`,
                                style: "display: flex; justify-content: flex-end;",
                                onClick: (event) => rollhandler.roll(this.token, event, "attribute", ability),
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
                                onClick: (event) => rollhandler.roll(this.token, event, "skill", skillData)
                            },
                            {
                                label: `<span class="d${skillData.system.die.sides}-hud dice-hud"></span>`,
                                style: "display: flex; justify-content: flex-end;",
                                onClick: (event) => rollhandler.roll(this.token, event, "skill", skillData)
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
                RUNNING = 0;
                this.updateActionUse();
            }

            async _getButtons() {
                const spellItems = this.actor.items.filter((item) => item.type === "power");
                const generalactionsItems = this.actor.items.filter((item) => item.type === "action" &&  !["disarm", "jump", "grapple", "push"].includes(item.name.toLowerCase()));
                const featItems = [] 
                const consumableItems = this.actor.items.filter((item) => item.type === "consumable" && item.system.subtype === "regular");

                const actionButton = !generalactionsItems ? [] : [new SWADEButtonPanelButton({ type: "action", items: generalactionsItems, color: this.color })];
                const spellButton = !spellItems.length ? [] : [new SWADEButtonPanelButton({ type: "power", items: spellItems, color: this.color })];
                const helperButtons = !HelperMainButtons.length ? [] : [new SWADEButtonPanelButton({ type: "helpMainActions", items: HelperMainButtons, color: this.color })];
                const specialActions = Object.values(ECHItems);

                const defaultActions =  this.actor.items.filter((item) => item.type === "action" && ["disarm", "jump", "grapple", "push"].includes(item.name.toLowerCase()));
                let splitButtons = []
                if(defaultActions.length == 4) {

                    splitButtons.push(new ARGON.MAIN.BUTTONS.SplitButton(
                        new SWADESpecialActionButton(defaultActions[0], this.color),
                        new SWADESpecialActionButton(defaultActions[1], this.color)
                        ))
                    splitButtons.push(new ARGON.MAIN.BUTTONS.SplitButton(
                        new SWADESpecialActionButton(defaultActions[2], this.color),
                        new SWADESpecialActionButton(defaultActions[3], this.color))
                    )
                }
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
                
                buttons.push(...[new SWADEItemButton({ item: null, isWeaponSet: true, isPrimary: true }), 
                                 ...bennieButtons,
                                 ...spellButton,
                                 ...splitButtons,
                                ...actionButton,
                                new SWADEButtonPanelButton({ type: "consumable", items: consumableItems, color: this.color }),
                                ...helperButtons
                            ]);

                const barItems = []
                buttons.push(...condenseItemButtons(barItems));
                
                return buttons.filter((button) => button.hasContents || button.items == undefined || button.items.length);
            }
        }

        class SWADEEffectsPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args)
                this.color = 8;
                this.defaultStatuses=[]
            }

            get label() {
                return "enhancedcombathud-swade.Titles.Other"
            }
            _getEffects() {
                let effects = []
                const effectActor = Array.from(this.actor.effects)

                effectActor.forEach(item => {
                    if(!this.defaultStatuses.includes(item.name)) {
                        effects.push({
                            id: item.id,
                            name: item.name,
                            disabled: item.disabled,
                            type: "effect",
                            img: item.img,
                            color: 3,
                            system: {
                                description:item.description,
                            },
                            flags: {
                                hud: {
                                    subtype: "effect"
                                }
                            }
                        })
                    }
                })

                const effectItems = this.actor.items.filter(item => item.type==="edge" && item.effects.size > 0)
                effectItems.forEach(eff => {
                    const _efItem = Array.from(eff.effects)
                    _efItem.forEach(item=>{
                        if(!this.defaultStatuses.includes(item.name)) {
                            effects.push({
                                id: item.id,
                                name: item.name,
                                type: "effect",
                                disabled: item.disabled,
                                img: item.icon,
                                system: {
                                    description:item.description,
                                },
                                flags: {
                                    hud: {
                                        subtype: 'status'
                                    }
                                }
                            })
                        }
                    })
                })

                return effects

            }
            _getStatuses() {
                let statuses = []
                let default_statuses = []
                CONFIG.statusEffects.forEach( item => {
                    if (Object.hasOwn(item, 'name')) {
                        if(item.name != 'SWADE.Prone')
                            default_statuses.push(item)
                    } else if (Object.hasOwn(item, 'label')) {
                        if(item.label != 'SWADE.Prone')
                            default_statuses.push(item)
                    }
                    
                })
                default_statuses.forEach(_status => {
                    this.defaultStatuses.push(_status)
                    statuses.push(
                        { 
                            id: _status.id,
                            name: _status.label ? game.i18n.localize(_status.label) : game.i18n.localize(_status.name),
                            type: "effect",
                            disabled: _status?.disabled,
                            img: _status?.icon ?? null,
                            system: {
                                description: _status?.description ?? _status,
                            },
                            flags: {
                                hud: {
                                    subtype: 'status'
                                }
                            }
                        }
                    )
                })
                return statuses
            }

            async _getButtons() {
                const buttons = []
                buttons.push(new SWADEButtonPanelButton({ type: "statuses", items: this._getStatuses(), color: this.color }))
                buttons.push(new SWADEButtonPanelButton({ type: "effects", items: this._getEffects(), color: this.color }))
                
                
                return buttons;
            }
        }
        class SWADEFreeActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
                this.color = 4;
            }

            get label() {
                return "enhancedcombathud-swade.Titles.FreeActions";
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
                
                ECHItems["run"].img = game.i18n.localize("enhancedcombathud-swade.Icons.run"); //"systems/swade/assets/dice/d"+this.actor.system.stats.speed.runningDie+"-grey.svg"
                const button2 = new SWADESpecialActionButton(ECHItems["run"], this.color)
                buttons.push(button2)

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
                return tooltipData;
            }

            async _onLeftClick(event) {
                ui.ARGON.interceptNextDialog(event.currentTarget);
                if(this.item?.flags?.hud?.subtype == "helper") return
                if(this.item?.flags?.hud?.subtype == "status") {
                    await rollhandler.roll(this.token, event, "status", this.item);
                    if (this.actor.statuses.has(this.item.id)) {
                        
                        event.srcElement.style.filter= "brightness(150%)";
                    } else {
                        event.srcElement.style.filter= "";
                    }
                    await this.render(true);
                } else if(this.item?.flags?.hud?.subtype == "effect") {
                    rollhandler.roll(this.token, event, "effect", this.item);
                } else {
                    rollhandler.roll(this.token, event, "show", this.item)
                }
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

            async activateListeners(html) {
                await super.activateListeners(html);
                const span = html.querySelector("span");
                if (this.item?.type == "effect") {
                    if (this.actor.statuses.has(this.item.id)) {
                        html.style.filter= "brightness(150%)";
                    }
                }
              }


            get quantity() {
                if(this.item?.range) {
                    return this.item.system.currentShots
                }
                return null
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
                        let keys = Object.keys(this.token.actor.system.powerPoints)
                        return game.i18n.localize("SWADE.Pow") + `<br /> ${this.actor.system.powerPoints[keys[keys.length-1]].value} / ${this.actor.system.powerPoints[keys[keys.length-1]].max}`;
                    case "consumable":
                        return "enhancedcombathud-swade.Buttons.useItem.name";
                    case "action":
                        return "enhancedcombathud-swade.Titles.Actions";
                    case "run":
                        return "enhancedcombathud-swade.Titles.Run";
                    case "helpMainActions":
                    case "helpFreeActions":
                        return "enhancedcombathud-swade.Titles.HelpMe";
                    case "statuses":
                        return "Status"
                    case "effects":
                        return "Effects"
                    default:
                        return "Missing Config"

                }
                return this.name
            }

            get icon() {
                const icon = game.i18n.localize(`enhancedcombathud-swade.Icons.${this.type}`)

                if(icon.indexOf("enhancedcombathud-swade.Icons") > -1) {
                    return "icons/svg/mystery-man.svg"
                }
                return icon
            }

            async _onLeftClick(event) {
                if(this.item?.flags?.hud?.subtype == "help") {
                    return
                } else {
                    rollhandler.roll(this.token, event, "show", this.item)
                }
                
            }

            async _getPanel() {
                this._spells = []
                if (this.type === "spell") {
                    return new ARGON.MAIN.BUTTON_PANELS.ACCORDION.AccordionPanel({ id: this.id, accordionPanelCategories: this._spells.map(({ label, buttons, uses }) => new ARGON.MAIN.BUTTON_PANELS.ACCORDION.AccordionPanelCategory({ label, buttons, uses })) });
                } else {
                    return new ARGON.MAIN.BUTTON_PANELS.ButtonPanel({ id: this.id, buttons: this.items.map((item) => new SWADEItemButton({ item })) });
                }
            }

            async activateListeners(html) {
                await super.activateListeners(html);
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
                if(RUNNING != 0 ) return RUNNING / canvas.scene.dimensions.distance;
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

            async _onLeftClick(event) {
                if(this.item.name.toLowerCase() == "prone") {
                    if(RUNNING == 0)
                        RUNNING = this.actor.system.stats.speed.value-2
                    else 
                        RUNNING -= 2
                    ui.ARGON.components.movement.updateMovement();
                    rollhandler.roll(this.token, event, "status", this.item)
                } else if(this.item.name.toLowerCase() == "run") {
                    const runtotal = await rollhandler.roll(this.token, event, "runningDie", this.item)
                    if(RUNNING == 0)
                        RUNNING = runtotal.total;
                    else
                        RUNNING = runtotal.total - (this.actor.system.stats.speed.value - RUNNING)
                    ui.ARGON.components.movement.updateMovement();
                }
                else if(this.item.type == "action") {
                    switch (this.item?.flags?.hud?.subtype) {
                        case "addbennie":
                            rollhandler.roll(this.token, event, "benny", "give")
                            break
                        case "spendbennie":
                            rollhandler.roll(this.token, event, "benny", "spend")
                            break
                        default:
                            rollhandler.roll(this.token, event, "show", this.item)
                    }
                } else {
                    rollhandler.roll(this.token, event, "show", this.item)
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
                    4: {
                        primary: actions[3]?.uuid ?? null,
                        secondary: null,
                    },
                    5: {
                        primary: actions[4]?.uuid ?? null,
                        secondary: null,
                    },
                };
            }

            async _getSets() {
                const sets = foundry.utils.mergeObject(await this.getDefaultSets(), foundry.utils.deepClone(this.actor.getFlag("enhancedcombathud", "weaponSets") || {}));
            
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
        CoreHUD.defineMainPanels([SWADEActionActionPanel,  SWADEFreeActionPanel,SWADEEffectsPanel, ARGON.PREFAB.PassTurnPanel]);
        CoreHUD.defineMovementHud(SWADEMovementHud);
        CoreHUD.defineWeaponSets(SWADEWeaponSets);
        CoreHUD.defineSupportedActorTypes(["character", "npc"]);
    });
}

function registerCombatHelpers() {
    const freeActions = ["move", "run", "speak", "prone", "drop", "ask"]
    const mainAction = ["multi","attack", "wildAttack", "desperateAttack", "aim", "defend", "grapple", "push", "reload", "support", "shot", "test"]

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
        id: "prone",
        name: "Prone",
        description: "Go prone",
        type: "action",
        img: "icons/magic/control/silhouette-fall-slip-prone.webp",
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

    ECHItems["run"] = {
        name: "run",
        description: "Running die",
        type: "action",
        img: MODULE_FOLDER+"/assets/icons/run.svg",
        system: {
            type: {
                value: "",
                subtype: ""
            },
            description: "Run",
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
            damage: 0,
            formula: "",
        },
        
        sort: 0,
        flags: {
            core: {
                sourceId: "Item.wyQkeuZkttllAFB2",
            },

            hud: {
                subtype: "running"
            }
        },
    };
}