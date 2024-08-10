export class SWADERollHandler {
    constructor() {
        this.actor = null;
    }

    async roll(token, event, itemType, item) {
        this.actor = token.actor
        this.token = token
        switch (itemType) {
            case "ae":
                this._ae(event, itemType, item)
                break;
            case "show":
            case "action":
            case "item":
            case "weapon":
            case "gear":
            case "consumable":
            case "power":
                this._show(event, itemType, item)
                break;
            case "effect":
            case "status":
                await this._toggleStatus(event, itemType, item);
                break;
            case "benny":
                this._adjustBennies(event, itemType, item);
                break;
            case "attribute":
                this._rollAttribute(event, itemType, item);
                break;
            case "runningDie":
                return await this._run();
                break;
            case "skill":
                this._rollSkill(event, itemType, item);
                break;
        } 
    }

    _show(event, itemType, item) {
        item.show()
    }

    async _toggleStatus(event, itemType, item) {
        if(itemType != "effect") {
            await this.actor.toggleStatusEffect(item.id, {overlay: false});
        } else {
            let effect = this.token.actor.effects.filter(el => el.id === item.id)
            if(effect.length == 0) {
                const items = Array.from(this.actor.items.filter(it => ['edge', 'hindrance', 'ability'].includes(it.type)))
                items.forEach(async (item) => {
                    let _eff = item.effects.filter(el => el.id === item.id)
                    if(_eff.length > 0) 
                        await _eff[0].update({ disabled: !_eff[0].disabled })
                })
            } else {
                await this.token.actor.effects.filter(el => el.id === item.id)[0].update({ disabled: !effect[0].disabled })
            }
        }
    }

    _adjustBennies(event, itemType, item) {
        if (item === "spend") {
            this.actor.spendBenny()
        } else if (item === "give") {
            this.actor.getBenny()
        }
    }

    _rollAttribute(event, itemType, item) {
        this.actor.rollAttribute(item, { event })
    }

    async _run() {
        return await this.token.actor.rollRunningDie();
    }

    _rollSkill(event, itemType, item) {
        this.actor.rollSkill(item.id, { event })
    }
}

export class SWADEToolsRollHandler extends SWADERollHandler {
    /** @override */
    _show(event, itemType, item) {
        game.swadetools.item(this.actor,item.id)
    }

    /** @override */
    async _rollAttribute(event, itemType, item) {
        await game.swadetools.attribute(this.token.actor,item)
    }

    /** @override */
    async _rollSkill(event, itemType, item) {
        await game.swadetools.skill(this.actor,item.id)
    }
}

export class BR2RollHandler extends SWADERollHandler {
    /** @override */
    async _show(event, itemType, item) {
        if(item.type === 'consumable') {
            await item.show()
            return
        }
        const behavior = game.brsw.get_action_from_click(event);

        if (behavior === "trait") {
            await game.brsw
                .create_item_card(this.token, item.id)
                .then((message) => {
                    game.brsw.roll_item(message, $(message.content), false);
                });
        } else if (behavior === "trait_damage") {
            await game.brsw
                .create_item_card(this.token, item.id)
                .then((message) => {
                    game.brsw.roll_item(message, $(message.content), false, true);
                });
        } else if (behavior === "system") {
            await game.swade.rollItemMacro(item.name);
        } else if(behavior == 'dialog'){
            await game.brsw.create_item_card(this.token, item.id).then(br_card => {
                game.brsw.dialog.show_card(br_card);
            })
            
        } else {
            await game.brsw.create_item_card(this.token, item.id);
        }
}

    /** @override */
    async _rollAttribute(event, itemType, item) {
        const behavior =  game.brsw.get_action_from_click(event);

            if (behavior === "trait" || behavior === "trait_damage") {
                game.brsw
                    .create_atribute_card(this.token, item)
                    .then((message) => {
                        game.brsw.roll_attribute(message, false);
                    });
            } else if (behavior === "system") {
                this.token.actor.rollAttribute(item);
            } else if(behavior == 'dialog'){
                game.brsw.create_atribute_card(this.token, item).then(br_card => {
                    game.brsw.dialog.show_card(br_card);
                })
                
            } else {
                game.brsw.create_atribute_card(this.token, item);
            }
    }

    /** @override */
    async _rollSkill(event, itemType, item) {
        const behavior =  game.brsw.get_action_from_click(event);

        if (behavior === "trait" || behavior === "trait_damage") {
            game.brsw
                .create_skill_card(this.token, item.id)
                .then((message) => {
                    game.brsw.roll_skill(message, false);
                });
        } else if (behavior === "system") {
            game.swade.rollItemMacro(item.name);
        } else if(behavior == 'dialog'){
            game.brsw.create_skill_card(this.token, item.id).then(br_card => {
                game.brsw.dialog.show_card(br_card);
            })
            
        } else {
            game.brsw.create_skill_card(this.token, item.id);
        }
    }
}