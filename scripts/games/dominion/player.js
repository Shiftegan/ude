var shuffle = require('shuffle-array')
var cards = require('./card')


class Zone{
	constructor(cards, name, hidden){
		this.cards = cards || []
		this.name = name
		this.hidden = hidden
	}
	empty(){
		this.cards = []
	}
	set(val){
		this.cards = val
	}
	pop(){
		return this.cards.pop()
	}
	shuffle(){
		shuffle(this.cards)
	}
	add(cards){
	    if(cards){this.cards = this.cards.concat(cards)}
	    return this.cards
	}
	unshift(card){
		this.cards.unshift(card)
	}
	concat(cards){
		if(cards) return this.cards.concat(cards)
		else return this.cards
	}
	push(card){
		this.cards.push(card)
	 }
	remove(card){
		if(this.cards.includes(card)) this.cards.splice(this.cards.indexOf(card), 1)
	}

	get length(){
		return this.cards.length
	}

	get data(){
		var allData = []
		if (this.hidden){
			return this.obfData
		}
		else this.cards.forEach(function(x){allData.push(x.data)})
		return allData
	}

	get obfData(){
		var allData = []
		this.cards.forEach(function(x){allData.push({id: x.id})})
		shuffle(allData)
		return allData
	}
}

class Player{
	constructor(user, game) {
		this.game = game
		this.user = user

		this.in_game = false

		this.zones = {
					hand: new Zone([], "Hand"),
					deck: new Zone([], "Deck", true),
					discard: new Zone([], "Discard"),
					revealed: new Zone([], "Reveal")
		}
	}

	reset(){
		this.hand.empty()
		this.deck.empty()
		this.discard.empty()
		this.revealed.empty()
        for(var i = 0; i < 7; i++) this.deck.push(this.game.buyCard("Copper"))
        for(var i = 0; i < 3; i++) this.deck.push(this.game.buyCard("Estate"))
		this.deck.shuffle()
		this.order = {next: undefined, prev: undefined}
	}

	get gold() {
		var gold = 0
		for(var c of this.hand.cards){
			gold += c.value
		}
		return gold
	}

	get name() {return this.user.name}

	get hand() {return this.zones.hand}
	set hand(val) {this.zones.hand = val}

	get deck() {return this.zones.deck}
	set deck(val) {this.zones.deck = val}

	get discard() {return this.zones.discard}
	set discard(val) {this.zones.discard = val}

	get revealed() {return this.zones.revealed}
	set revealed(val) {this.zones.reveald = val}

	get cards() {return this.hand.length}
	set cards(val) {this.draw(val - this.hand.length)}

	get publicData(){
		return {
			revealed: this.revealed.data,
			deck: this.deck.data,
			hand: this.hand.length,
			discard: this.discard.data,
			points: this.points,
			name: this.user.name,
			active: this.active
		}
	}

	get privateData(){
		return {
			revealed: this.revealed.data,
			deck: this.deck.data,
			discard: this.discard.data,
			hand: this.hand.data,
			name: this.user.name,
			active: this.active
		}
	}

	get points() {
		var points = 0
		for(var c of this.allCards){
			points += c.points(this)
		}
		return points
	}


	get allCards() {
		return this.deck.concat(this.discard.concat(this.hand.cards))
	}


	checkShuffle() {
		if(this.deck.length < 1){
			this.deck.cards = this.discard.cards
			this.discard.empty()
			this.deck.shuffle()
		}
	}

	peel(x){
		var peeled = []
		for(var i = 0; i < x; i++){
			this.checkShuffle()
			if(this.deck.length > 0){
				peeled.push(this.deck.pop())
			} else {
				return peeled
			}
		}
		return peeled
	}

	draw(x){
		this.hand.add(this.peel(x))
	}

	mill(x){
		this.discard.add(this.peel(x))
	}

	trashCard(c){
		this.game.trash.push(c)
		this.hand.remove(c)
	}

	discardCard(c){
		this.hand.remove(c)
		this.discard.push(c)
	}

	discardHand(){
		this.discard.add(this.hand.cards)
		this.hand.empty()
	}


	gainCard(card){
		this.discard.push(card)
	}

	hasAction(){
		for(var c of this.hand.cards){
			if(c.playable(this, this.game)){
				return true
			}
		}
		return false
	}


	redraw() {
		this.discardHand()
		this.draw(5)
	}

	setOrder(prev, next){
		this.order = {
			prev: prev,
			next: next
		}
	}
}

module.exports = {Player: Player,
	Zone: Zone}
