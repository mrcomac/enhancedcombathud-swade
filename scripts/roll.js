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
            const existsOnActor = this.token.actor.statuses.has(item.name.toLowerCase())
            const data = game.swade.util.getStatusEffectDataById(item.name.toLowerCase());
            data["flags.core.statusId"] = item.name.toLowerCase();
            await this.token.toggleEffect(data, { active: !existsOnActor });
            
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