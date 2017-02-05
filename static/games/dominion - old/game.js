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

function getImage(data, card){
    if(card.name){return IMAGE_PATH + card.image}
    else{return IMAGE_PATH + data.cards[card].image}
}

function sayMessage(type, data){
    var data = mergeDic({type: type, roomID: roomID, userID: userID}, data)
    socket.emit("sayMessage", data)
}

var cardTable = new CardTable()



var hand = new CardPile(0, 0, 108*1.2, 173*1.2, "bottom", {spread: {x: 80}}, copy(SteadyHand))
hand.resize = function(w, h){
    this.transform.position.x = w/4
    this.transform.position.y = h
}

var discard = new CardPile(0, 0, 108*1.2, 173*1.2, "bottom", {
    hover: {
        spread: {
            perCard: true,
            x: 60,

        },
        spreadFromHovered: {
            right: 60,
        },
    }
}, CompressedPile);

discard.resize = function(w, h) {
    this.transform.position.x = w * 4/5;
    this.transform.position.y = h;
}

var deck = new CardPile(0,0, 108*1.2, 173*1.2, "bottom")
deck.resize = function(w, h){
    this.move(discard.right, "left")
}

var firstRow = new CardPile(0, 0, 108, 173, "center", {
    spread: {
        x: 108
    }
}, copy(DisplayRow));
firstRow.resize = function(w, h) {
    this.transform.position.x = w/2;
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

var revealed = new CardPile(0, 0, 108, 173, "left")
revealed.resize = function(w, h) {
    this.transform.position.x = w - 108
    this.transform.position.y = h * 1/5
}

var cardHistory = new CardPile(0, 0, 108, 173, "left")
cardHistory.resize = function(w, h) {
    this.transform.position.x = 0
    this.transform.position.y = h * 1/5
}

var playerList = new CardPile(0, 0, 210, 143, "top", {
    spread: {
        x: 215
    },
    hoveredCard: {enabled: false}
}, copy(DisplayRow));
playerList.resize = function(w, h) {
    this.transform.position.x = w/2;
    this.transform.position.y = 0;
}

var playerChoices = new CardPile(0,0, 100, 20, "bottom", {}, copy(DisplayRow))
playerChoices.resize = function(w,h) {
    this.move(discard.top, "right")
} 

cardTable.addCardPile(playerChoices)
cardTable.addCardPile(hand);
cardTable.addCardPile(deck);
cardTable.addCardPile(revealed)
cardTable.addCardPile(cardHistory)
cardTable.addCardPile(discard);
cardTable.addCardPile(firstRow);
cardTable.addCardPile(secondRow);
cardTable.addCardPile(playerList);

// Begin main loop
cardTable.beginLoop();

class PlayerInfoCard extends Card {
    constructor(anchor, info, active_info) {
        super(210, 143, anchor);
        this.info = info;
        this.active_info = active_info
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
        var myString = 'Deck: ' + this.info.decksize + ' | Hand: ' + this.info.handsize + ' | VP: ' + this.info.points;
        ctx.centerText(myString, x + w/2, y + 58);
        if(this.info.active){
            ctx.font('sans-serif', 16)
            ctx.centerText(this.active_info.phase.toTitleCase(), x + w/2, y + 83);
            if(this.active_info.phase != "choice"){
               ctx.font('sans-serif', 13);
                myString = 'Actions: ' + this.active_info.actions + ' | Buys: ' + this.active_info.buys + ' | Gold: ' + this.active_info.gold;
                ctx.centerText(myString, x + w/2, y + 108); 
            }
        }     
    }
}


var last_update = undefined;


function populatePage(data) {
    console.log(data.players)

    if (data.stamp != last_update && data.stamp != -1) {
        last_update = data.stamp;


        playerChoices.empty()
        if(data.active_info.otherChoices){
            for(var c in data.active_info.otherChoices){
                var c = new NumberedCard(100, 20, c)
                playerChoices.addCard(c)
            }
        }
        playerChoices.skipAnimations()

        playerList.empty()
        for(var p in data.players){
            var c = new PlayerInfoCard("top", data.players[p], data.active_info)
            playerList.addCard(c)
        }
        playerList.skipAnimations()

        hand.empty()
        for(var c of data.hand){
            let name = c
            c = new PictureCard(108*1.2, 173*1.2, getImage(data, c))
            if(data.blur_hand.includes(name)) c.grayed_out = true
            if(data.phase == "action") c.onClick = function(){sayMessage('playCard', {card: name})}
            else c.onClick = function(){sayMessage('makeChoice', {choice: name, choiceType: "card"})}
            hand.addCard(c)
        }
        hand.skipAnimations()

        discard.empty()
        for(var c of data.discard){
            c = new PictureCard(108*1.2, 173*1.2, getImage(data, c))
            discard.addCard(c)
        }
        discard.skipAnimations()


        firstRow.empty()
        secondRow.empty()
        for(var c in data.purchase){
            let name = c
            var card = new BorderedPictureCard(108, 173, getImage(data,c), data.purchase[c], "center")
            if(data.blur_purchase.includes(name)) card.grayed_out = true
            if(data.phase == "buy") card.onClick = function(){sayMessage('buyCard', {card: name})}
            else card.onClick = function(){sayMessage('makeChoice', {choice: name, choiceType: "card"})}
            if(data.layout[0].includes(data.cards[c].types[0])) firstRow.addCard(card)
            else secondRow.addCard(card)

        }
        firstRow.skipAnimations()
        secondRow.skipAnimations()

        deck.empty()
        if(data.decksize > 1){
            var card = new BorderedPictureCard(108*1.2, 173*1.2, "../static/games/dominion/images/cardback.jpg", data.decksize, "bottom")
            deck.addCard(card)
        }
        deck.skipAnimations()

        // $('#my-choices').empty();
        // console.log(data.active_info)
        // if(data.active_info.otherChoices){
        //     for(var c of data.active_info.otherChoices){
        //         let name = c
        //         var button = ce('button').text(c)
        //         button.on('click', function() {
        //             console.log("sending choice ", name, "other")
        //             sayMessage('makeChoice', {choice: name, choiceType: "other"})
        //         })
        //         $('#my-choices').append(button)
        //     }

        // }
        cardHistory.empty()
        for(var c of data.history){
            c = new PictureCard(108, 173, getImage(data, c))
            cardHistory.addCard(c)
        }
        cardHistory.skipAnimations()

        revealed.empty()
        for(var c of data.revealed){
            c = new PictureCard(108, 173, getImage(data, c))
            revealed.addCard(c)
        }
        revealed.skipAnimations()


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

setInterval(function () {
    socket.emit('askUpdate', {roomID: roomID});
}, 500);



