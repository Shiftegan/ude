var socket = io.connect();

var qt

var IMAGE_PATH = '/static/games/dominion/images/scans'

var roomID = parseInt($("#roomID").text())

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

function ce(type) {
    var e = $(document.createElement(type));
    for (var i = 1; i < arguments.length; i++) {
        e.addClass(arguments[i]);
    }
    return e;
}

function copy(obj) {
    return $.extend(true, {}, obj);
}

function getImage(card){
    return IMAGE_PATH + card.image
}

function sayMessage(type, data){
    console.log("SENDING MESSAGE:", data)
    var data = mergeDic({type: type, roomID: roomID, userID: userID}, data)
    socket.emit("sayMessage", data)
}

function redirect(address){
    window.location.href = "." + address
}

var cardTable = new CardTable()



var hand = new CardPile(0, 0, 108*1.2, 173*1.2, "bottom", {spread: {x: 80, centered: false}}, copy(SteadyHand))
hand.resize = function(w, h){
    this.transform.position.x = 108*0.8
    this.transform.position.y = h
}



var discard = new CardPile(0, 0, 108*1.2, 173*1.2, "bottom", {
    hover: {
        spread: {
            perCard: true,
            x: -60,
            fromRight: true,
            centered: false

        },
        spreadFromHovered: {
            right: 0,
            left: 0
        },
    }
}, copy(CompressedPile));
discard.resize = function(w, h) {
    this.transform.position.x = w * 4/5;
    this.transform.position.y = h;
}

var deck = new CardPile(0,0, 108*1.2, 173*1.2, "bottom", {hover: {enabled: false}, spreadFromHovered: {right:0, left:0}})//, spreadFromHovered: {left: 0, right: 0}})
deck.resize = function(w, h){
    this.move(discard.right, "left")
}

var trash = new CardPile(0,0, 108, 173, "right", {
    spread: {
        x: 0,
        y: 20,
        centered: false,
        fromRight: true
    }
}, copy(SteadyHand))
trash.resize = function(w, h){
    // this.transform.position.x = w - 108*2
    // this.transform.position.y = 180
    trash.move({x: w, y: 180}, "right")
}

var historyPile = new CardPile(0,0, 108, 173, "center", {
    spread: {
        x: 0,
        y: 20,
        centered: false,
        fromRight: true
    }
}, copy(SteadyHand))
historyPile.resize = function(w, h){
    this.transform.position.x = w - 108*1.5 - 10
    this.transform.position.y = 180
}

var firstRow = new CardPile(0, 0, 108, 173, "center", {
    spread: {
        x: 108
    }
}, copy(DisplayRow));
firstRow.resize = function(w, h) {
    this.transform.position.x = w/2 + 100;
    this.transform.position.y = h/2 - 173/2 - 30;
}

var secondRow = new CardPile(0, 0, 108, 173, "center", {
    spread: {
        x: 108
    }
}, copy(DisplayRow));
secondRow.resize = function(w, h) {
    // Puts the BOTTOM of the first row at the TOP of this row
    this.move(firstRow.bottom, "top");
}

var playerDecks = []
for(var i = 0; i < 3; i++){
    let num = i
    playerDecks.push(new CardPile(0, 0, 108, 173, "left", {hover: {enabled: false}, spreadFromHovered: {right:0, left:0}}))
    playerDecks[i].resize = function(w,h){
        this.transform.position.x = 0
        this.transform.position.y = h * (num)/4.5 + 180
    }
    cardTable.addCardPile(playerDecks[i])
}

var playerDiscards = []
for(var i = 0; i < 3; i++){
    let num = i
    playerDiscards.push(new CardPile(0, 0, 108, 173, "center", {
        hover: {
            enabled: true,
            spread: {
                perCard: true,
                x: 60,
                fromRight: true,
                centered: false

            },
            spreadFromHovered: {
                right: 0,
                left: 0
            },
        }
    }, copy(CompressedPile)))
    playerDiscards[i].resize = function(w,h){
        this.transform.position.x = 118 + 108/2
        this.transform.position.y = h * (num)/4.5 + 180
    }
    cardTable.addCardPile(playerDiscards[i])
}

var playerReveals = []
for(var i = 0; i < 3; i++){
    let num = i
    playerReveals.push(new CardPile(0, 0, 108, 173, "center", {
        hover: {
            enabled: true,
            spread: {
                perCard: true,
                x: 60,
                fromRight: true,
                centered: false

            },
            spreadFromHovered: {
                right: 0,
                left: 0
            },
        }
    }, copy(CompressedPile)))
    playerReveals[i].resize = function(w,h){
        this.transform.position.x = 2*118 + 108/2
        this.transform.position.y = h * (num)/4.5 + 180
    }
    cardTable.addCardPile(playerReveals[i])
}


var playerList = new CardPile(0, 0, 210, 143, "top", {
    spread: {
        x: 215
    },
    hoveredCard: {enabled: false}
}, copy(DisplayRow));
playerList.resize = function(w, h) {
    this.transform.position.x = w/2 + 100;
    this.transform.position.y = 0;
}

var playerLabels = new TextPile(0,0, 100, 100, "center")
playerLabels.resize = function(w,h){
    this.transform.x = 20
    this.transform.y = 100
}

var playerChoices = new CardPile(0,0, 100, 30, "bottom", {
        spread: {
            x: 0,
            y: 30,
            centered: false,
            fromRight: true,
        },
        hoveredCard: {enabled: false},
    }, copy(DisplayRow))

playerChoices.resize = function(w,h) {
    this.move(discard.left, "right")
    this.transform.position.y -= discard.height/2 - this.height/2
}


var temp = new CardPile(0, 0, 108*1.2, 173*1.2, "center", {spread: {x: -80, centered: false, fromRight:true}}, copy(SteadyHand))
temp.resize = function(w, h){
    this.move(playerChoices.left, "right")
    this.transform.position.y += this.height/2 - playerChoices.height/2
}

cardTable.addCardPile(playerLabels)
cardTable.addCardPile(playerChoices)
cardTable.addCardPile(hand);
cardTable.addCardPile(deck);
cardTable.addCardPile(discard);
cardTable.addCardPile(firstRow);
cardTable.addCardPile(secondRow);
cardTable.addCardPile(playerList);
cardTable.addCardPile(trash)
cardTable.addCardPile(historyPile)
cardTable.addCardPile(temp)

// Begin main loop
cardTable.beginLoop();

class PlayerInfoCard extends Card {
    constructor(info, phase) {
        super()
        this.info = info;
        this.phase = phase
    }

    drawCard(ctx, x, y, w, h) {
        ctx.stroke('black');
        if(this.info.active) ctx.fill('#15f698');
        else ctx.fill('#15c7f6')
        ctx.rect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fill('black');
        ctx.font('sans-serif', 32);
        y += 15;
        ctx.centerText(this.info.name, x + w/2, y + 30);
        ctx.font('sans-serif', 13);
        var myString = 'Deck: ' + this.info.deck.length + ' | Hand: ' + this.info.hand + ' | VP: ' + this.info.points;
        ctx.centerText(myString, x + w/2, y + 58);
        if(this.info.active){
            ctx.font('sans-serif', 16)
            ctx.centerText(this.phase.type.toTitleCase(), x + w/2, y + 83);
            ctx.font('sans-serif', 13);
            myString = 'Actions: ' + this.phase.actions + ' | Buys: ' + this.phase.buys + ' | Gold: ' + this.phase.gold;
            ctx.centerText(myString, x + w/2, y + 108);
        }
    }
}


var last_update = undefined;

var cardInfo = {}

function populatePage(data) {

    if (data.stamp != last_update && data.stamp != -1) {
        last_update = data.stamp;

        for(var id of Object.keys(cardInfo)){
            cardInfo[id].alive = false
        }

        playerChoices.empty()
        if(data.choices.other){
            for(var c of data.choices.other){
                let choiceName = c
                var c = new Button(c)
                c.onClick = function(){sayMessage('choice', {choice: choiceName, choiceType: "other"})}
                playerChoices.addCard(c)
            }
        }
        playerChoices.skipAnimations()
        var currPlayerIndex = 0
        playerList.empty()
        playerLabels.empty()
        for(var p in data.players){
            console.log(data.players)
            var c = new PlayerInfoCard(data.players[p], data.phase)


            playerList.addCard(c)

            if(!data.players[p].self){
                var label = new Text(data.players[p].name, 10 , 80 + 213*(currPlayerIndex), 'Arial', 18, false)
                playerLabels.addText(label)

                var deckPile = playerDecks[currPlayerIndex]
                var discardPile = playerDiscards[currPlayerIndex]
                var revealPile = playerReveals[currPlayerIndex]

                for(var c of data.players[p].deck){
                    if(cardInfo[c.id]){
                        card = cardInfo[c.id].object
                        card.img.src = "../static/games/dominion/images/cardback.jpg"
                        card.num = data.players[p].deck.length
                        deckPile.stealCard(card)
                        cardInfo[c.id].alive = true
                        cardInfo[c.id].location = deckPile
                    } else {
                        var card = new BorderedPictureCard("../static/games/dominion/images/cardback.jpg", data.players[p].deck.length)
                        cardInfo[c.id] = {object: card, alive: true, location: deckPile}
                        deckPile.addCard(card)
                    }
                    card.border_active = true
                    card.grayed_out = false
                }

                for(var c of data.players[p].discard){
                    if(cardInfo[c.id]){
                        card = cardInfo[c.id].object
                        card.img.src = getImage(c)
                        discardPile.stealCard(card)
                        cardInfo[c.id].alive = true
                        cardInfo[c.id].location = discardPile
                    } else {
                        var card = new BorderedPictureCard(getImage(c))
                        cardInfo[c.id] = {object: card, alive: true, location: discardPile}
                        discardPile.addCard(card)
                    }
                    card.border_active = false
                    card.grayed_out = false
                }

                for(var c of data.players[p].revealed){
                    if(cardInfo[c.id]){
                        card = cardInfo[c.id].object
                        card.img.src = getImage(c)
                        revealPile.stealCard(card)
                        cardInfo[c.id].alive = true
                        cardInfo[c.id].location = revealPile
                    } else {
                        var card = new BorderedPictureCard(getImage(c))
                        cardInfo[c.id] = {object: card, alive: true, location: revealPile}
                        revealPile.addCard(card)
                    }
                    card.border_active = false
                    card.grayed_out = false
                }

                currPlayerIndex += 1
                console.log(discardPile.cards)
            }

        }
        playerList.skipAnimations()

        for(var c of data.player.hand){
            if(cardInfo[c.id]){
                cardInfo[c.id].object.img.src = getImage(c)
                hand.stealCard(cardInfo[c.id].object)
                cardInfo[c.id].alive = true
                cardInfo[c.id].location = hand
                card = cardInfo[c.id].object
            } else {
                var card = new BorderedPictureCard(getImage(c))
                cardInfo[c.id] = {object: card, alive: true, location: hand}
                hand.addCard(card)
            }
            let id = c.id
            card.border_active = false
            card.onClick = function(){sayMessage('choice', {choice: id, choiceType: "card"})}
            if(!data.choices.cards || !data.choices.cards.includes(c.id)) card.grayed_out = true
            else card.grayed_out = false
        }

        for(var c of data.player.temp){
            if(cardInfo[c.id]){
                cardInfo[c.id].object.img.src = getImage(c)
                temp.stealCard(cardInfo[c.id].object)
                cardInfo[c.id].alive = true
                cardInfo[c.id].location = temp
                card = cardInfo[c.id].object
            } else {
                var card = new BorderedPictureCard(getImage(c))
                cardInfo[c.id] = {object: card, alive: true, location: temp}
                temp.addCard(card)
            }
            let id = c.id
            card.border_active = false
            card.onClick = function(){sayMessage('choice', {choice: id, choiceType: "card"})}
            if(!data.choices.cards || !data.choices.cards.includes(c.id)) card.grayed_out = true
            else card.grayed_out = false
        }

        for(var c of data.player.discard){
            if(cardInfo[c.id]){
                cardInfo[c.id].object.img.src = getImage(c)
                discard.stealCard(cardInfo[c.id].object)
                cardInfo[c.id].alive = true
                cardInfo[c.id].location = discard
                card = cardInfo[c.id].object
            } else {
                var card = new BorderedPictureCard(getImage(c))
                cardInfo[c.id] = {object: card, alive: true, location: discard}
                discard.addCard(card)
            }
            card.border_active = false
            card.grayed_out = false

        }

        for(var c of data.player.deck){
            if(cardInfo[c.id]){
                cardInfo[c.id].object.img.src = "../static/games/dominion/images/cardback.jpg"
                deck.stealCard(cardInfo[c.id].object)
                cardInfo[c.id].object.grayed_out = false
                cardInfo[c.id].object.num = data.player.deck.length
                cardInfo[c.id].object.border_active = true
                cardInfo[c.id].alive = true
                cardInfo[c.id].location = deck
            } else {
                var card = new BorderedPictureCard("../static/games/dominion/images/cardback.jpg", data.player.deck.length)
                cardInfo[c.id] = {object: card, alive: true, location: deck}
                deck.addCard(card)
            }
        }

        for(var c of data.game.trash){
            if(cardInfo[c.id]){
                cardInfo[c.id].object.img.src = getImage(c)
                trash.stealCard(cardInfo[c.id].object)
                cardInfo[c.id].alive = true
                cardInfo[c.id].location = trash
                card = cardInfo[c.id].object
            } else {
                var card = new BorderedPictureCard(getImage(c))
                cardInfo[c.id] = {object: card, alive: true, location: trash}
                trash.addCard(card)
            }
            card.border_active = false
            card.grayed_out = false

        }




        firstRow.empty()
        secondRow.empty()
        for(var c in data.game.purchase){

            var amount = data.game.purchase[c].amount
            c = data.game.purchase[c].card
            let id = c.id



            var card = new BorderedPictureCard(getImage(c), amount, "center")
            if(!data.choices.cards || !data.choices.cards.includes(c.id)) card.grayed_out = true
            card.onClick = function(){sayMessage('choice', {choice: id, choiceType: "card"})}

            if(c.types.includes("treasure") || c.types.includes("victory") || c.types.includes("curse")) {
                firstRow.addCard(card)
                cardInfo[c.id] = {object: card, alive: true, location: firstRow}
            }
            else {
                secondRow.addCard(card)
                cardInfo[c.id] = {object: card, alive: true, location: secondRow}
            }

        }
        firstRow.skipAnimations()
        secondRow.skipAnimations()

        historyPile.empty()
        for(var h of data.game.history){
            var card = new BorderedPictureCard(getImage(h.card), h.player + " " + h.action)
            historyPile.addCard(card)
        }
        historyPile.skipAnimations()


        for(var id of Object.keys(cardInfo)){
            if(!cardInfo[id].alive) cardInfo[id].location.removeCard(cardInfo[id].object)
        }
    }
}

function cookieDefault(cookie, def) {
    var c = Cookies.get(cookie);
    if (c === undefined) c = def;
    Cookies.set(cookie, c);
    return c;
}

function uuid() {
    // SOURCE: http://stackoverflow.com/a/2117523/2002307
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function forceDeal() {
    socket.emit('sayMessage', {roomID: roomID, type: 'start'});
}

var userID = cookieDefault('userid', uuid());
var username = cookieDefault('username', 'Guest');

socket.on('connect', function() {
    console.log('Connected!', arguments);
});

socket.on('sayUpdate', function(data) {
    populatePage(data);
});

socket.on('askName', function(data) {
    socket.emit('sayName', {
        uuid: userID,
        name: username
    });
});

socket.on('redirect', function(data) {
    redirect(data.address)
})


setInterval(function () {
    socket.emit('askUpdate', {roomID: roomID});
}, 500);
