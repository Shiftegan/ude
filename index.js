var express = require('express');
var pug = require('pug');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Host = require('./scripts/server.js')
// var uuid = require('uuid');

var games = ["dominion"]

app.use('/static', express.static(__dirname + '/static/'));

app.get('/', function(req, res) {
    res.send(pug.renderFile(__dirname + '/templates/index.pug'));
});

app.get('/lobby', function(req, res) {
    res.send(pug.renderFile(__dirname + '/templates/lobby.pug', {games: games}));
});

app.get('/game/:roomID', function(req, res) {
    var room = host.getRoom(parseInt(req.params.roomID))
    res.send(pug.renderFile(__dirname + '/templates/game.pug', {room: room}));
});

server.listen(process.env.PORT || 8081, function() {
    console.log('listening');
});

io.on('connection', function(socket) {

    let userID = undefined
    let username = undefined

    socket.on("sayName", function(data) {
        username = data.name
        userID = data.uuid
        host.addUser(data.uuid, data.name)
        console.log("User:",data.name,"("+data.uuid+")","has announced connection")
    })

    socket.on('askUpdate', function(data){
        host.keepAwake(userID)
        var response = host.getUpdate(userID, data)
        if(response){
            socket.emit(response[0], response[1])
        }
    })

    socket.on('sayMessage', function(data){
        host.keepAwake(userID)
        var response = host.receiveMessage(userID, data)
        if(response){
            socket.emit(response[0], response[1])
        }
    })

    socket.on('disconnect', function(data){
        host.disconnectUser(userID)
        console.log("User:",data.name,"("+data.uuid+")","has closed connection")
    })

    socket.emit('askName')
    console.log("Asking for connection from new user")

});

var host = new Host()
