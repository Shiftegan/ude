var io = require("../index.js")
var Dominion = require("./games/dominion/game.js")
var Boomo = require("./games/boomo/game.js")

function User(id, name) {
	this.id = id
	this.name = name

	this.connected = true
}

function Host() {

	this.games = {"dominion": Dominion, "boomo": Boomo}

    this.users = new Map()
    this.rooms = new Map()

    this.stamp = 0
    this.nextID = 0


    //GETTING USER OBJECTS

    this.getUser = function(object, def) {
        if (!(object instanceof User)) object = this.users.get(object)
        if (object === undefined) object = def
        return object;
    };

    this.getUsers = function(){
        var users = []
        for (var user of this.users){
            if(user[1].connected){users.push(user[1])}
        }
        return users
    }

    this.getRoom = function(id){
    	return this.rooms.get(id)
    }

    this.getRooms = function(){
    	var rooms = []
        for (var room of this.rooms){
            rooms.push(room[1])
        }
        return rooms
    }


    //ADDING AND REMOVING USERS

    this.addUser = function(id, name) {
        if (this.users.get(id) === undefined) {
            this.users.set(id, new User(id, name))
        } else {
        	console.log("Reconnecting user:", name)
            this.users.get(id).connected = true
            this.users.get(id).name = name
        }
        this.stamp++;
    };

    this.keepAwake = function(user) {
        var user = this.getUser(user)
        if (user !== undefined) {
            if (user.connected == false) {
                user.connected = true
                this.stamp++
            }
        }
    };

    this.disconnectUser = function(id) {
        this.getUser(id, {}).connected = false;
        this.stamp++
    }


    //PROCESSING DATA SENT BY USERS

    this.receiveMessage = function(id, data){
    	console.log("RECIEVED MESSAGE:", data)
    	var user = this.getUser(id)
    	if(data.roomID != undefined){
    		if(this.rooms.has(data.roomID)){
                var room = this.rooms.get(data.roomID)
    		    return room.process(user, data)
            }
        }
    	else{return this.process(user, data)}
    }

	this.process = function(user, data){
		switch(data.type) {
			case "join":
				console.log(this.rooms.get(data.joinID))
				this.rooms.get(data.joinID).addPlayer(user)
				return ["redirect", {roomID: data.joinID}]

			case "create":
				var roomID = this.nextID
				this.rooms.set(roomID, new this.games[data.gametype](roomID, data.name))
				this.nextID++
				console.log("Creating room:", data.name, "(" + roomID + ")", "of type", "'" + data.gametype + "'")
				break

		}
	}

	this.getUpdate = function(id, data){
		var user = this.getUser(id)
		if(user){
			if(data.roomID === undefined){
				var roomData = []
				for(var room of this.getRooms()){
					roomData.push({
						name: room.name,
						id: room.id
					})
				}
				return ["sayUpdate", {roomData: roomData}]
			} else {
				if(this.rooms.has(data.roomID) && this.rooms.get(data.roomID).players.has(user.id)){
					return ["sayUpdate", this.rooms.get(data.roomID).getUpdate(user, data)]
				} else {
					return ["redirect", {address: "/lobby"}]
				}
			}
		}

	}
}

module.exports = Host
