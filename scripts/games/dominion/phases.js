class Phase {
	constructor(game, type){
		this.type = type || "Unnamed Phase"
		this.game = game
	}
	decision(player, choice){
		this.game.advancePhase(this)
	}
	get options(){
		return {}
	}

	get data(){
		return {
			type: this.type
		}
	}
}

class BuyPhase extends Phase {
	constructor(game, actions, buys, gold){
		super(game, "Buy")
		this.actions = actions
		this.buys = buys
		this.gold = gold + this.game.activePlayer.gold
	}
	check(){
		if(this.buys == 0 && this.game.phase == this) this.game.advancePhase(this)
	}

	decision(player, choice){
		if(choice == "Pass"){
			this.game.advancePhase(this)
			this.game.stamp++
		} else if(this.options.cards.includes(choice)){
			this.game.addHistory(choice.name, "Bought", player.name)
			player.gainCard(this.game.buyCard(choice.name))
			this.buys -= 1
			this.gold -= choice.cost
			this.game.stamp++
			this.check()
		}
	}
	get options(){
		return {
			cards: this.game.getCards(this.game.activePlayer, {locations: ["purchase"], maxCost: this.gold}),
			other: ["Pass"]
		}
	}
	get optionData(){
		var cards = []
		this.game.getCards(this.game.activePlayer, {locations: ["purchase"], maxCost: this.gold}).forEach(function(x){cards.push(x.id)})
		return {
			cards: cards,
			other: ["Pass"]
		}
	}
	get data(){
		return {
			type: this.type,
			actions: this.actions,
			buys: this.buys,
			gold: this.gold,
		}
	}
}

class ActionPhase extends Phase {
	constructor(game){
		super(game, "Action")
		this.actions = 1
		this.buys = 1
		this.gold = 0
	}

	check(){
		if((this.actions == 0 || !this.game.activePlayer.hasAction()) && this.game.phase == this) this.game.advancePhase(this)
	}

	decision(player, choice){
		if(choice == "Pass"){
			this.game.advancePhase(this)
			this.game.stamp++
		} else if(this.options.cards.includes(choice)){
			this.game.addHistory(choice.name, "Played", player.name)
			choice.play(player, this.game)
			player.discardCard(choice)
			this.actions -= 1
			this.game.stamp++
			this.check()
		}
	}
	get options(){
		return {
			cards: this.game.getCards(this.game.activePlayer, {locations: ["hand"], playable: true}),
			other: ["Pass"]
		}
	}
	get optionData(){
		var cards = []
		this.game.getCards(this.game.activePlayer, {locations: ["hand"], playable: true}).forEach(function(x){cards.push(x.id)})
		return {
			cards: cards,
			other: ["Pass"]
		}
	}
	get data(){
		return {
			type: this.type,
			actions: this.actions,
			buys: this.buys,
			gold: this.gold
		}
	}
}

class ChoicePhase extends Phase {
	constructor(game, choices, oldPhase, oldPlayer, callback){
		super(game, "Choice")
		this.choices = choices
		this.oldPhase = oldPhase
		this.oldPlayer = oldPlayer
		this.onComplete = callback

	}

	get actions(){return this.oldPhase.actions}
	get buys(){return this.oldPhase.buys}
	get gold(){return this.oldPhase.gold}

	set actions(val) {this.oldPhase.actions = val}
	set buys(val) {this.oldPhase.buys = val}
	set gold(val) {this.oldPhase.gold = val}

	check(){
		if(this.game.phase == this) this.game.advancePhase(this)
	}

	decision(player, choice){
		if(this.options.cards.includes(choice) || this.options.other.includes(choice)){
			console.log("CHOICE COMPLETE")
			this.onComplete(player, choice)
			this.game.stamp++
			this.check()

		}
	}
	get options(){
		return this.choices
	}
	get optionData(){
		var cards = []
		this.choices.cards.forEach(function(x){cards.push(x.id)})
		return {
			cards: cards,
			other: this.choices.other
		}
	}
	get data(){
		return {
			type: this.type,
			actions: this.actions,
			gold: this.gold,
			buys: this.buys
		}
	}
}

module.exports = {
	Phase: Phase,
	BuyPhase: BuyPhase,
	ActionPhase: ActionPhase,
	ChoicePhase: ChoicePhase
}
