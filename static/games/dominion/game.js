var socket = io.connect();

var qt

var IMAGE_PATH = '/static/games/dominion/images/scans'

var roomID = parseInt($("#roomID").text())

function ce(type) {
    var e = $(document.createElement(type));
    for (var i = 1; i < arguments.length; i++) {
        e.addClass(arguments[i]);
    }
    return e;
}

function getImage(data, card){
    if(card.name){return IMAGE_PATH + card.image}
    else{return IMAGE_PATH + data.cards[card].image}
}

function sayMessage(type, data){
    var data = mergeDic({type: type, roomID: roomID, userID: userID}, data)
    console.log("SENDING MESSAGE:", data)
    socket.emit("sayMessage", data)
}

var last_update = undefined;


function populatePage(data) {

    function addText(d, c, text){
        d.append(ce('p', 'card-info').append(text).css("z-index", c*2+1))
    }

    if (data.stamp != last_update && data.stamp != -1) {
        last_update = data.stamp;
        $('#other-players').empty();
        for (var p in data.players) {
            // console.log(data.players[p]);
            var d = ce('div', 'player-info');
            d.append(
                ce('h1').text(data.players[p].name),
                ce('p').text("Deck: " + data.players[p].decksize + ' | Hand: ' + data.players[p].handsize + ' | VP: ' + data.players[p].points)
            );
            if (data.players[p].connected === false) d.addClass('red');
            else if (data.players[p].active === true) {
                d.addClass('green');
                d.append(ce('p').text('Currently in ' + data.phase + " phase").css("font-weight", "Bold"))
                if(data.phase != "choice"){d.append(ce('p').text("Actions: " + data.active_info.actions + " | Buys: " + data.active_info.buys + " | Gold: " + data.active_info.gold))}
            }
            // console.log(d);
            $('#other-players').append(d);
        }


        $('#my-cards').empty();
        for (var c in data.hand) {
            let name = data.hand[c];
            var d = ce('div', 'hand-card').width(180).height(288)
            var img = ce('img', 'scale');
            var card = data.cards[name]
            
            // TODO: Proper card images.
            img.attr('src', getImage(data, card));
            img.attr('title', name)
            img.hover(function() {
                $(this).stop(true, true).animate({top: "-=10%" }, "fast").css('z-index', '10');
            }, function() {
                $(this).stop(true, true).animate({top: "+=10%" }, "fast").css('z-index', '0');
            })
            if (data.blur_hand.indexOf(name) >= 0) img.addClass('blur');
            if (data.phase == "action"){
                img.on('click', function() {
                    sayMessage('playCard', {card: name})
                   
                })
            } else {
                img.on('click', function() {
                    sayMessage('makeChoice', {choice: name, choiceType: "card"})
                })
            }
            d.append(img)
            $('#my-cards').append(d);
        }
        $('#my-deck').empty();

        var img = ce('img');
        img.attr('src', '/static/games/dominion/images/blank.png');
        img.attr('title', "Deck: " + data.decksize)

        $('#my-deck').append(img);

        $('#my-discard').empty();
        $('#my-discard').width(180).height(288)

        var img = ce('img', 'scale');

        if(data.discard.length > 0){
            img.attr('src', getImage(data, data.discard[data.discard.length-1]))
            img.attr('title', "Discard: " + data.discard.length)
            $('#my-discard').append(img);
        }

        $('#purchase').empty();
        for (var row of data.layout) {
            var rowDiv = ce('div', 'purchase-row')
            for(var c in data.purchase){
                if(row.includes(data.cards[c].types[0])){
                    let name = c
                    var cardDiv = ce('div', 'card').width(108).height(173)

                    let img = ce('img', 'scale')
                    var card = data.cards[name]
                    img.attr('src', getImage(data, card))
                    img.attr('title',name + ": " + data.purchase[name])
                    img.hover(function() {
                        $(this).stop(true, true).animate({ height: "200%", width: "200%", left: "-=50%", top: "-=50%" }, "fast").css('z-index', '10');
                    }, function() {
                        $(this).stop(true, true).animate({ height: "100%", width: "100%", left: "+=50%", top: "+=50%" }, "fast").css('z-index', '0');
                    })


                    if (data.blur_purchase.indexOf(name) >= 0) img.addClass('blur');
                        if (data.phase == "buy"){
                            img.on('click', function() {
                            sayMessage('buyCard', {card: name})
                        })
                        } else {
                            img.on('click', function() {
                            sayMessage('makeChoice', {choice: name, choiceType: "card"})
                        })
                    }
                    cardDiv.append(img)



                    rowDiv.append(cardDiv)
                }
            }
            $('#purchase').append(rowDiv);
        }

        $('#my-choices').empty();
        console.log(data.active_info)
        if(data.active_info.otherChoices){
            for(var c of data.active_info.otherChoices){
                let name = c
                var button = ce('button').text(c)
                button.on('click', function() {
                    console.log("sending choice ", name, "other")
                    sayMessage('makeChoice', {choice: name, choiceType: "other"})
                })
                $('#my-choices').append(button)
            }

        }

        $('#history').empty();
        for (var c of data.history) {
            console.log(c)
            let name = c
            var d = ce('div', 'history-card').width(90).height(144)
            var img = ce('img', 'scale')
            img.hover(function() {
                $(this).stop(true, true).animate({ height: "200%", width: "200%", top: "-=50%" }, "fast").css('z-index', '10');
            }, function() {
                $(this).stop(true, true).animate({ height: "100%", width: "100%", top: "+=50%" }, "fast").css('z-index', '0');
            })
            var card = data.cards[name]

            img.attr('src', getImage(data, card));
            d.append(img)
            $('#history').append(d);
        }

        $('#revealed').empty();
        for (var c of data.revealed) {
            console.log(c)
            let name = c
            var d = ce('div', 'revealed-card').width(90).height(144)
            var img = ce('img', 'scale')
            img.hover(function() {
                        $(this).stop(true, true).animate({ height: "200%", width: "200%", left: "-=75%", top: "-=50%" }, "fast").css('z-index', '10');
                    }, function() {
                        $(this).stop(true, true).animate({ height: "100%", width: "100%", left: "+=75%", top: "+=50%" }, "fast").css('z-index', '0');
                    })
            var card = data.cards[name]

            img.attr('src', getImage(data, card));
            d.append(img)
            $('#revealed').append(d);
        }


        $("img.scale").imageScale();
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



