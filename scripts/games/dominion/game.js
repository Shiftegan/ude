var shuffle = require('shuffle-array');

var Player = require('./player');
var utility = require('../../utility.js')
var cards = require('./card').cards

// This is a single game instance, which holds information about the state of a game.

function newDeck() {
    return shuffle(CARD_LISTING.slice(), {copy: true});
}

CARD_ORDERING = {"action":1, "treasure":0, "victory":2}

BASE_SET = ["Copper", "Silver", "Gold", "Estate", "Duchy", "Province", "Curse"]
ACTION_SET = ["Moat", "Cellar", "Workshop", "Woodcutter", "Bureaucrat", "Remodel", "Throne Room", "Witch", "Festival", "Market"]

function generateCardSet(numPlayers){
    var set = {}
    for(var c of BASE_SET.concat(ACTION_SET)){
        if(cards[c].types[0] == "treasure"){
            set[c] = 100
        } else if (cards[c].types[0] == "victory"){
            if(c == "Curse"){
                set["Curse"] = 10 * (numPlayers - 1)
            } else {
                if(numPlayers == 2){
                    set[c] = 8
                } else {
                    set[c] = 12
                }
                
            }
        } else {
            set[c] = 10
        }
    }
    return set
}

function sortHand(hand) {
    return hand.sort(function(carda, cardb){return (CARD_ORDERING[cards[carda].types[0]] * 100 + cards[carda].cost) - (CARD_ORDERING[cards[cardb].types[0]] * 100 + cards[cardb].cost)})
}

function Game(id,name) {
    // Use an actual map so iteration is nice.
    this.id = id
    this.name = name
    this.type = "dominion"
    this.players = new Map();
    this.purchase = {}
    this.phase = undefined;
    this.active_player = undefined;
    this.play_direction = 1;
    this.stamp = 0;
    this.first_player = undefined;

    this.otherChoices = []
    this.cardChoices = []
    this.history = []
    this.revealed = []

    this.layout = [["treasure", "victory"], ["action"]]
    
    this.changeset = function(set){
        ACTION_SET = set
    }
    this.revertset = function(){
        ACTION_SET = ["Moat", "Cellar", "Workshop", "Woodcutter", "Bureaucrat", "Remodel", "Throne Room", "Witch", "Festival", "Market"]
    }

    this.addPlayer = function(user) {
        console.log("Adding new player:", user)
        this.players.set(user.id, new Player(user))
        console.log(this.players)
    };

    this.getPlayer = function(object, def) {
        if (typeof(object) == "string") object = this.players.get(object);
        else if (!(object instanceof Player) && object != undefined){
            object = this.players.get(object.id)
        }
        if (object === undefined) object = def;
        return object;
    };

    this.createPurchase = function(){
        this.purchase = generateCardSet(this.players.length)
    }
    this.getCardObject = function(card){
        if (typeof(card) == "string"){return cards[card]}
        else {return card}
    }

    this.getCards = function(player, restrictions) {
        console.log("RECEIVED QUERY:", player.user.name, restrictions)
        restrictions = utility.mergeDic({locations:["purchase", "hand"], maxCost: 999, type: false, invalid: [], playable: false}, restrictions)
        console.log("MADE QUERY:", player.user.name, restrictions)
        valid = []
        for(var card of Object.keys(this.purchase)){
            if(restrictions.locations.includes("purchase") 
                && cards[card].getCost(player, this) <= restrictions.maxCost 
                && this.purchase[card] > 0 
                && (!restrictions.type || cards[card].types.includes(restrictions.type))
                && !restrictions.invalid.includes(card)
                && (!restrictions.playable || cards[card].playable(player, this))){
                valid.push(card)
            }
        }
        for(var card of player.hand){
            if(restrictions.locations.includes("hand") 
                && cards[card].getCost(player, this) <= restrictions.maxCost 
                && (!restrictions.type || cards[card].types.includes(restrictions.type))
                && !restrictions.invalid.includes(card)
                && (!restrictions.playable || cards[card].playable(player, this))){
                valid.push(card)
            }
        }
        console.log("RETURNING:", valid)
        return valid
    }

    this.testAdvancePhase = function(){
        if(this.phase == "buy" && this.active_player.buys == 0){
            this.advancePhase()
        } else if (this.phase == "action" && this.active_player.actions == 0){
            this.advancePhase()
        }
    }

    this.advancePhase = function(){
        if(this.phase == "action" || this.phase == undefined){
            console.log("Moving to buy phase")
            if(this.active_player.buys < 1) {this.active_player.buys = 1}
            this.active_player.current_gold += this.active_player.getGold(this)
            this.phase = "buy"
        }
        else{
            this.history = []
            this.active_player.redraw()
            this.advanceActivePlayer()
            this.active_player.actions = 1
            this.active_player.buys = 1
            this.active_player.current_gold = 0
            if(this.active_player.hasAction(this)){
                console.log("Starting Action Phase")
                this.phase = "action"
            } else {
                console.log("Starting Buying Phase")
                this.active_player.current_gold += this.active_player.getGold(this)
                this.phase = "buy"
            }
        }
        this.stamp++
    }

    this.advanceActivePlayer = function() {
        if (this.play_direction == 1) this.active_player = this.active_player.order.next;
        else this.active_player = this.active_player.order.prev;
    }

    this.playAction = function(player, card) {
        card = this.getCardObject(card)
        var player = this.getPlayer(player);
        if (player != this.active_player || this.phase != "action") {
            console.log(player.user.name, 'tried to play out of turn');
        } else {
            if (player.hand.includes(card.name) && card.playable(player, this) && player.actions > 0) {
                
                this.history.push(card.name)
                player.actions -= 1
                player.hand.splice(player.hand.indexOf(card.name), 1)
                player.discard.push(card.name)
                card.play(player, this)
                console.log("Testing for end of phase", player.actions, player.hasAction(this), this.phase)
                if((player.actions == 0 || !player.hasAction(this)) && this.phase != "choice"){
                    console.log("Test Passed")
                    this.advancePhase()
                }
                this.stamp++;
            } else {
                console.warn(player.user.name, 'tried to play a card they were not allowed to.');
            }
        }

    };

    this.buyCard = function(player, card){
        card = this.getCardObject(card)
        var player = this.getPlayer(player);
        if (player != this.active_player || this.phase != "buy") {
            console.log(player.user.name, 'tried to buy out of turn');
        } else {
            if (this.purchase[card.name] && card.cost <= player.current_gold && player.buys > 0) {
                player.gainCard(card.name)
                this.purchase[card.name] -= 1
                player.buys -= 1
                player.current_gold -= card.getCost(player, this)
                if(player.buys == 0){
                    player.current_gold = 0
                    this.advancePhase()
                }
                this.stamp++;
            } else {
                console.warn(player.user.name, 'tried to buy a card they were not allowed to.');
            }
        }

    }

    this.makeChoice = function(player, choice, type){
        

        var player = this.getPlayer(player)

        if(choice == "End Phase"){
            if(player == this.active_player){
                this.advancePhase()
            } else {
                console.log("Someone tried to end someone elses phase")
            }
            return true
        }

        if(type == "card") {var choice = this.getCardObject(choice)}
        if (player != this.active_player || this.phase != "choice") {
            console.log(player.user.name, 'tried to choose out of turn');
        } else {
            if (this.otherChoices.includes(choice) || this.cardChoices.includes(choice.name)) {
                this.phase = this.turnPhase
                this.active_player = this.turnPlayer
                this.onChoice(player, choice)
                this.testAdvancePhase()
                this.stamp++;
            } else {
                console.warn(player.user.name, 'tried to make a choice they were not allowed to.');
            }
        }

    }


    this.playerChoice = function(player, cards, other, callback){
        var player = this.getPlayer(player);
        console.log("Setting up choice", player.hand, cards, other)
        this.turnPlayer = this.active_player
        this.turnPhase = this.phase

        this.active_player = player
        this.phase = "choice"

        this.cardChoices = cards
        this.otherChoices = other
        this.onChoice = callback
        this.stamp++
    }

    this.startGame = function() {
        player_order = [];
        for (var p of this.players.values()) {
            p.reset();
            console.log(p.user)
            if (p.user.connected) {
                p.reset();
                p.redraw()
                player_order.push(p);
                p.in_game = true;
            } else {
                p.in_game = false;
            }
        }
        shuffle(player_order);
        const L = player_order.length;
        for (var i in player_order) {
            i = parseInt(i);
            player_order[i].setOrder(
                player_order[(i - 1 + L) % L],
                player_order[(i + 1) % L]
            );
        }
        // console.warn(player_order);
        this.createPurchase()
        this.play_direction = 1;
        this.active_player = player_order[0];
        this.first_player = player_order[0];
        this.advancePhase()
        this.stamp++;
    }

    this.playersOrdered = function() {
        var order = [];
        var limit = 0;
        if (this.alive_count > 0) {
            for (var i = this.first_player; (i != this.first_player || order.length == 0) && limit < 1000; i = i.order.next) {
                if (i.lives > 0) {
                    order.push(i);
                }
                limit += 1;
            }
        }
        for (var p of this.players.values()) {
            if ((p.connected || p.in_game) && order.indexOf(p) == -1) {
                order.push(p);
            }
        }
        return order;
    };

    this.process = function(user, data) {
        var player = this.getPlayer(user)
        switch(data.type){
            case "start":
                console.log("Starting Game")
                this.startGame()
                return this.getUpdate(player)
            case "playCard":
                this.playAction(player, data.card)
                return this.getUpdate(player)
            case "makeChoice":
                this.makeChoice(player, data.choice, data.choiceType)
                return this.getUpdate(player)
            case "buyCard":
                this.buyCard(player, data.card)
                return this.getUpdate(player)

        }
    }

    this.getUpdate = function(user, data) {
        var player = this.getPlayer(user);
        if (player === undefined) {
            return {
                players: [],
                timer: 0,
                hand: [],
                stamp: -1
            }
        } else {
            var players = [];
            for (var p of this.playersOrdered()) {
                players.push({
                    name: p.user.name,
                    handsize: p.hand.length,
                    decksize: p.deck.length,
                    discard: p.discard,
                    connected: p.connected,
                    active: p == this.active_player,
                    points: p.getPoints(this)
                });
            }
            var blur_hand = []
            var blur_purchase = []

            if (this.active_player) {
                if(player == this.active_player){
                    if(this.phase == "choice"){
                        active_info = {
                        cardChoices: this.cardChoices,
                        otherChoices: this.otherChoices
                        }
                    } else {
                        active_info = {
                            buys: this.active_player.buys,
                            actions: this.active_player.actions,
                            gold: this.active_player.current_gold,
                            otherChoices: ["End Phase"]
                        }
                    }
                } else {
                    active_info = {
                        buys: this.active_player.buys,
                        actions: this.active_player.actions,
                        gold: this.active_player.current_gold,
                    }
                }
                
            } else {active_info = false}


            if(player == this.active_player){
                for (var c of player.hand){
                    if (this.phase == "buy" && !cards[c].types.includes("treasure")){
                        blur_hand.push(c)
                    }
                    if (this.phase == "action" && !cards[c].playable(player, this)){
                        blur_hand.push(c)
                    }
                    if(this.phase == "choice" && !this.cardChoices.includes(c)){
                        blur_hand.push(c)
                    }
                }
                
            }

            for (var c of Object.keys(this.purchase)){
                if(player == this.active_player){
                    if (this.phase == "buy" && (cards[c].cost > player.current_gold || this.purchase[c] == 0)){
                        blur_purchase.push(c)
                    }
                    if (this.phase == "action"){
                        blur_purchase.push(c)
                    }
                    if(this.phase == "choice" && !this.cardChoices.includes(c)){
                        blur_purchase.push(c)
                    }
                } else {
                    if(this.purchase[c] == 0){
                        blur_purchase.push(c)
                    }
                }

            }
            
            return {
                history: this.history,
                revealed: this.revealed,
                cards: cards,
                players: players,
                layout: this.layout,
                purchase: this.purchase,
                phase: this.phase,
                hand: sortHand(player.hand),
                active_info: active_info,
                decksize: player.deck.length,
                discard: player.discard,
                stamp: this.stamp,
                blur_hand: blur_hand,
                blur_purchase: blur_purchase
            }
        }
    }
}

module.exports = Game;
