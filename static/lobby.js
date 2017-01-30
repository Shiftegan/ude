var socket = io.connect();

function ce(type) {
    var e = $(document.createElement(type));
    for (var i = 1; i < arguments.length; i++) {
        e.addClass(arguments[i]);
    }
    return e;
}

function redirect(address){
    window.location.href = "." + address
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

function joinRoom(roomID) {
    socket.emit('sayMessage', {type: "join", roomID: roomID});
}

function createRoom() {
    var name = $("#gamename-input").val()
    var gametype = $("#gametype-input").val()
    console.log("Creating game:",name, gametype)
    socket.emit('sayMessage', {type: "create", name: name, gametype: gametype});
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
    redirect('/game/' + data.roomID)
})

setInterval(function () {
    socket.emit('askUpdate', userID);
}, 500);

function populatePage(data){
    $("#rooms").empty()
    for(var room of data.roomData){
        let div = ce('div', 'room')
        let id = room.id
        let joinButton = ce('button').text("Join").click(function(){socket.emit('sayMessage', {type: "join", userID: userID, joinID: id})})
        div.append(room.name)
        div.append(joinButton)
        $("#rooms").append(div)
    }

}