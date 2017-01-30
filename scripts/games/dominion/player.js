var shuffle = require('shuffle-array');
var cards = require("./card.js").cards



function Player(user) {
    this.user = user

    this.current_gold = 0

    this.in_game = false;
    
    this.reset = function() {
        this.hand = [];
        this.deck = shuffle(["Copper", "Copper", "Copper", "Copper", "Copper", "Copper", "Copper", "Estate", "Estate", "Estate"])
        this.discard = []

        this.buys = 0
        this.actions = 0
        this.gold = 0
        
        this.order = {
            next: undefined,
            prev: undefined
        };
    };

    this.getAllCards = function(){
        return this.deck.concat(this.discard.concat(this.hand))
    }

    this.getPoints = function(game){
        var points = 0
        for(var c of this.getAllCards()){
            points += cards[c].getPoints(this, game)
        }
        return points
    }

    this.hasAction = function(game){
        for(var c of this.hand){
            if(cards[c].playable(this, game)){
                return true
            }
        }
        return false
    }

    this.gainCard = function(card){
        if(typeof(card) == "string"){this.discard.push(card)}
        else {this.discard.push(card.name)}
    }

    this.getGold = function(game){
        gold = 0
        for(var c of this.hand){
            gold += cards[c].getValue(this, game)
        }
        return gold
    }

    this.discardCard = function(card){
        if(typeof(card) != "string"){card = card.name}
        this.hand.splice(this.hand.indexOf(card), 1)

    }

    this.draw = function(cards){
        if(this.deck.length < 1){
            this.deck = shuffle(this.discard, {copy: true})
            this.discard = []
        }

        for(var i = 0; i < cards; i++){
            if(this.deck.length > 0){
                this.hand.push(this.deck.pop())
                if(this.deck.length < 1){
                    this.deck = shuffle(this.discard, {copy: true})
                    this.discard = []
                }

            } else {
                return false
            }
            
        }
    }

    this.mill = function(mill){
        var milled = []
        if(this.deck.length < 1){
            this.deck = shuffle(this.discard, {copy: true})
            this.discard = []
        }
        for(var i = 0; i < mill; i++){
            if(this.deck.length > 0){
                var card = this.deck.pop()
                this.discard.push(card)
                milled.push(card)
                if(this.deck.length < 1){
                    this.deck = shuffle(this.discard, {copy: true})
                    this.discard = []
                }
            } else {
                return milled
            }
            
        }
        return milled
    }

    this.redraw = function() {
        while(this.hand.length > 0){
            this.discard.push(this.hand.pop())
        }
        this.draw(5)
    }

    this.setOrder = function(prev, next) {
        this.order = {
            prev: prev,
            next: next
        };
        console.log(prev.user.name, '->', this.user.name, '->', next.user.name);
    };

    this.addBuys = function(x){this.buys += x}
    this.addGold = function(x){this.current_gold += x}
    this.addCards = function(x){this.draw(x)}
    this.addActions = function(x){this.actions += x}

    this.reset();
}
module.exports = Player;
