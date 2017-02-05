var shuffle = require('shuffle-array')

var Player = require('./player')
var phase = require('./phases')
var cards = require('./card')
var utility = require('../../utility')

ALL_CARDS = new Map()

class Card{
	constructor(id, cardData){
		ALL_CARDS.set(id, this)

		this.cardData = cardData
		this.id = id
		this.lastCardID = 0

	}
	get name(){return this.cardData.name}
	get cost(){return this.cardData.cost}
	get value(){return this.cardData.value}
	get types(){return this.cardData.types}
	points(player){return this.cardData.getPoints(player)}

	play(p,g,c){return this.cardData.play(p,g,c)}
	playable(p,g,c){return this.cardData.playable(p,g)}
	react(p,g,c){return this.cardData.react(p,g)}
	effect(p,g,c){return this.cardData.effect(p,g,c)}

	get data(){
		return {
			id: this.id,

			name: this.cardData.name,
			image: this.cardData.image,

			types: this.types
		}
	}
}

function f(func){
	return function(){func()}
}


BASE_SET = ["Copper", "Silver", "Gold", "Estate", "Duchy", "Province", "Curse"]
ACTION_SET = ["Moat", "Cellar", "Workshop", "Woodcutter", "Bureaucrat", "Remodel", "Throne Room", "Witch", "Festival", "Market"]

class Game {
	constructor(id, name) {
		this.id = id
		this.name = name
		this.type = "dominion"

		this.players = new Map()
		this.purchase = {}

		this.active = false
		this.phase = undefined
		this.activePlayer = undefined
		this.firstPlayer = undefined

		this.history = []
		this.revealed = []

		this._lastCardID = 0
		this.stamp = 0
	}

	set activePlayer(val){
		if(this._activePlayer) this._activePlayer.active = false
		this._activePlayer = val
		if(val instanceof Player){
			val.active = true
		}
	}

	get activePlayer(){
		return this._activePlayer
	}

	get data(){
		let game = this
		var purchase = {}
		Object.keys(this.purchase).forEach(function(key){
			purchase[key] = {}
			purchase[key].amount = game.purchase[key].amount
			purchase[key].card = game.purchase[key].card.data
		})
		return {
			purchase: purchase,
			stamp: this.stamp
		}
	}

	get playersOrdered() {
		if(this.firstPlayer){
			var order = [this.firstPlayer];

			var last = this.firstPlayer.order.next

			while(last != this.firstPlayer){
				order.push(last)
				last = last.order.next
			}

			return order
		} else {
			return this.players.values()
		}
	}

	get lastCardID(){
		this._lastCardID++
		return this._lastCardID
	}

	addPlayer(user) {
		if(!this.players[user.id]){
			this.players.set(user.id, new Player(user))
			this.stamp++
		}
	}

	kickPlayer(user) {
		if(this.players.has(user.id)){
			this.player.delete(user.id)
			this.stamp++
		}
	}


	getPlayer(object) {
		if(typeof(object) == "string") return this.players.get(object)
		if(object instanceof Player) return object
		else return this.players.get(object.id)
	}

	process(user, data) {
		var player = this.getPlayer(user)
		switch(data.type){
			case "start":
				this.startGame()
				return this.getUpdate(player)
			case "choice":
				if(player == this.activePlayer){
					if(data.choiceType == "card") data.choice = ALL_CARDS.get(data.choice)
					this.phase.decision(player, data.choice)
					return this.getUpdate(player)
				}
				break
		}
	}

	getUpdate(user) {
		if(this.active){
			var player = this.getPlayer(user)
			var players = []
			for(var p of this.playersOrdered){
				var data = p.publicData
				if(p == player) data.self = true
				players.push(data)
			}

			if(player == this.activePlayer) var choices = this.phase.optionData
			else choices = []

			return {
				game: this.data,
				players: players,
				phase: this.phase.data,
				choices: choices,
				player: player.privateData,
				stamp: this.stamp
			}
		}
	}

	startGame(){
		var playerOrder = [];

		this.populatePurchase()

		for(var p of this.players.values()){
			p.reset(this)
			if(p.user.connected){
				p.redraw()
				playerOrder.push(p)
				p.in_game = true
			} else {
				p.in_game = false
			}
		}
		shuffle(playerOrder)
		const L = playerOrder.length
		for(var i in playerOrder) {
			i = parseInt(i);
			playerOrder[i].setOrder(
                playerOrder[(i - 1 + L) % L],
                playerOrder[(i + 1) % L]
            )
		}

		this.activePlayer = playerOrder[0]
		this.firstPlayer = playerOrder[0]
		this.phase = new phase.BuyPhase(this, 0, 1, 0)
		this.active = true
		this.stamp++
	}

	populatePurchase(){
	    for(var c of BASE_SET.concat(ACTION_SET)){
	        if(cards[c].types[0] == "treasure"){
	            this.purchase[c] = {
	                amount: 100,
	                card: new Card(this.lastCardID, cards[c])
	            }
	        } else if (cards[c].types[0] == "victory"){
	            if(c == "Curse"){
	                this.purchase[c] = {
	                    amount: 10 * (this.players.length - 1),
	                    card: new Card(this.lastCardID, cards[c])
	                }
	            } else {
	                if(this.players.length == 2){
	                    this.purchase[c] = {
	                    	amount: 8,
	                    	card: new Card(this.lastCardID, cards[c])
	                    }
	                } else {
	                    this.purchase[c] = {
	                    	amount: 12,
	                    	card: new Card(this.lastCardID, cards[c])
	                    }
	                }

	            }
	        } else {
	            this.purchase[c] = {
	                amount: 10,
	                card: new Card(this.lastCardID, cards[c])
	            }
	        }
	    }
	}

	getCards(player, restrictions) {
        restrictions = utility.mergeDic({locations:["purchase", "hand"], maxCost: 999, type: false, invalid: [], playable: false}, restrictions)
        var valid = []
        for(var card of Object.keys(this.purchase)){
        	var data = this.purchase[card]
            if(restrictions.locations.includes("purchase")
                && data.card.cost <= restrictions.maxCost
                && data.amount > 0
                && (!restrictions.type || data.card.types.includes(restrictions.type))
                && !restrictions.invalid.includes(card.name)
                && (!restrictions.playable || data.card.playable(player, this))){
                valid.push(data.card)
            }
        }
        for(var card of player.hand.cards){
            if(restrictions.locations.includes("hand")
                && card.cost <= restrictions.maxCost
                && (!restrictions.type || card.types.includes(restrictions.type))
                && !restrictions.invalid.includes(card.name)
                && (!restrictions.playable || card.playable(player, this))){
                valid.push(card)
            }
        }
        return valid
	}

	playerChoice(player, cards, other, cb){
		this.phase = new phase.ChoicePhase(this, {cards: cards, other:other}, this.phase, this.activePlayer, cb)
		this.activePlayer = player
		console.log("In:",this.phase.type)
	}

	advancePlayer(){
		this.activePlayer.redraw()
		this.activePlayer = this.activePlayer.order.next
	}

	advancePhase(current){
		this.stamp++
		console.log("Advancing Phase From:",current.type)
		switch(current.type){
			case "Choice":
				this.phase = current.oldPhase
				this.activePlayer = current.oldPlayer
				this.phase.check()
				break
			case "Buy":
				this.advancePlayer()
				if(this.activePlayer.hasAction(this)) this.phase = new phase.ActionPhase(this)
				else this.phase = new phase.BuyPhase(this, 0, 1, 0)
				break
			case "Action":
				this.phase = new phase.BuyPhase(this, current.actions, current.buys, current.gold)
				break
		}
	}

	revealCard(player, name){
		var card = new Card(this.lastCardID, cards[name])
		player.revealed.push(card)
	}

	emptyReveal(player){
		if(player) player.revealed.empty()
		else {
			for(var player of this.players.values()){
				player.revealed.empty()
			}
		}
	}

	buyCard(name) {
		var card = this.purchase[name].card
		this.purchase[name].amount -= 1
		this.purchase[name].card = new Card(this.lastCardID, cards[name])
		return card
		this.stamp++
	}
}

module.exports = Game
