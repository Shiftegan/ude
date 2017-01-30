var utility = require("../../utility.js")
cards = {}


function getCardObject(card){
    if (typeof(card) == "string"){return cards[card]}
    else {return card}
}

function addCard(values){
	values = utility.mergeDic({
		image: "../blank",
		name: "Unnamed Card",
		types: [],

		cost: 0,
		getCost: function(player, game){return this.cost},

		value: 0,
		getValue: function(player, game){return this.value},

		points: 0,
		getPoints: function(player, game){return this.points},

		buys: 0,
		getBuys: function(player, game){return this.buys},

		actions: 0,
		getActions: function(player, game){return this.actions},

		cards: 0,
		getCards: function(player, game){return this.cards},

		gold: 0,
		getGold: function(player, game){return this.gold},

		effect: false,
		play: function(player, game, callback){if(callback){callback()}},
		playable: function(player, game){return false},
		react: function(player, game){},



	},values)
	cards[values.name] = values
}

function addTreasure(values){
	addCard(utility.mergeDic({types: ["treasure"]}, values))
}

function addVictory(values){
	addCard(utility.mergeDic({types: ["victory"]}, values))
}

function addAction(values){
	addCard(utility.mergeDic({
		types: ["action"],
		play: function(player, game, callback){
				player.addActions(this.getActions(player,game))
				player.addCards(this.getCards(player,game))
				player.addGold(this.getGold(player,game))
				player.addBuys(this.getBuys(player,game))

				if(this.effect){
					console.log("Playing effect")
					this.effect(player, game, callback)
				} else {
					if(callback){callback()}
				}
			}, 
		playable: function(player, game){return true}},
		values))
}

function addAttack(values){
	addAction(utility.mergeDic({
		types: ["action", "attack"],
		play: function(player, game, callback){
				player.addActions(this.getActions(player,game))
				player.addCards(this.getCards(player,game))
				player.addGold(this.getGold(player,game))
				player.addBuys(this.getBuys(player,game))
				var multi = new utility.Multifunc()
				var unaffected = [player]
				game.revealed = []

				for(var p of game.players.values()){
					if(p != player){
						let current_player = p
						multi.push(function(callback){
							game.playerChoice(current_player, game.getCards(current_player, {locations: ["hand"], type: "reaction"}), ["Reveal None"],
								function(current_player, choice){
									if(choice != "Reveal None"){
										choice.react(current_player, game)
										game.revealed.push(choice.name)
										if(choice.name == "Moat"){
											unaffected.push(current_player)
										}
									}
									if(callback){callback()}
								})
						})
					}
				}
				let effect = this.effect
				console.log("Starting Reaction Tests")
				multi.run(
					function(){
						if(effect){
							effect(player, game, unaffected, callback)
						} else {
							if(callback){callback()}
						}
				})
				
		}

	}, values))
}

function addReaction(values){
	addAction(utility.mergeDic({
		types: ["action", "reaction"],
	}, values))
}

addTreasure({name:"Copper", value:1, cost:0, image: "/common/copper.jpg"})
addTreasure({name:"Silver", value:2, cost:3, image: "/common/silver.jpg"})
addTreasure({name:"Gold", 	value:3, cost:6, image: "/common/gold.jpg"})

addVictory({name: "Estate", 	points:1, cost:2, image: "/common/estate.jpg"})
addVictory({name: "Duchy", 		points:3, cost:5, image: "/common/duchy.jpg"})
addVictory({name: "Province", 	points:6, cost:8, image: "/common/province.jpg"})
addVictory({name: "Curse", 		points:-1, cost:0, image: "/common/curse.jpg"})

addVictory({name: "Gardens", getPoints: function(player, game){return Math.floor(player.deck.length/10)}, cost:4, image: "/base/gardens.jpg"})

addAction({name: "Cellar", cost:2, actions:1, image: "/base/cellar.jpg",
	effect: function(player, game, callback){
		var discarded = 0
		var func = function(func, player){
			game.playerChoice(player, game.getCards(player, {locations: ["hand"]}), ["Done"], 
				function(player, choice){
					if(choice == "Done"){
						player.draw(discarded)
						if(callback){callback()}
					} else {
						player.discardCard(choice.name)
						player.discard.push(choice.name)
						discarded += 1
						func(func, player)
					}
				})
		}
		func(func, player)
	}
})

addAction({name: "Chancellor", cost:3, gold:2, image: "/base/chancellor.jpg",
	effect: function(player, game, callback){
		game.playerChoice(player, [], ["Discard", "Don't Discard"], function(player, choice){
			if(choice == "Discard"){
				for(var card of player.deck){
					player.discard.push(card)
				}
				player.deck = []
				if(callback){callback()}
			}
		})
	}})

addAction({name: "Chapel", cost:2, image: "/base/chapel.jpg",
	effect: function(player, game, callback){
		var trashed = 0
		var func = function(func, player){
			game.playerChoice(player, game.getCards(player, {locations: ["hand"]}), ["Done"], 
				function(player, choice){
					if(choice != "Done"){
						trashed += 1
						player.discardCard(choice.name)
						if(trashed == 4){
							if(callback){callback()}
						} else {
							func(func, player)
						}
					} else {
						if(callback){callback()}
					}
				})
		}
		func(func, player)
	}
})

addAction({name: "Workshop", cost:3, image: "/base/workshop.jpg",

	playable: function(player, game){
		if(game.getCards(player, {place: "purchase", maxCost:4}).length > 0){
			return true
		}
		return false
	},
	effect: function(player, game, callback){
		console.log("Playing workshop effect")
		game.playerChoice(player, game.getCards(player, {locations: ["purchase"], maxCost:4}),[],
			function(player, choice){
				player.gainCard(choice.name)
				game.purchase[choice.name] -= 1
				if(callback){callback()}
			})

	}
})

addAction({name: "Village", cost:3, cards:1, actions:2, image: "/base/village.jpg"})

addAction({name: "Woodcutter", cost:3, buys:1, gold:2, image: "/base/woodcutter.jpg"})

addAttack({name: "Bureaucrat", cost:4, image: "/base/bureaucrat.jpg",
	effect: function(player, game , unaffected, callback){
		player.deck.unshift("Silver")
		game.purchase["Silver"] -= 1
		var multi = new utility.Multifunc()
		

		for(var p of game.players.values()){
			if(p != player && !unaffected.includes(p)){
				let current_player = p
				multi.push(function(cb){
					var cards = game.getCards(current_player, {locations: ["hand"], type: "victory"})
					if(cards.length == 0){
						var other = ["Reveal Hand"]
					} else {
						var other = []
					}

					game.playerChoice(current_player, cards, other,
						function(player, choice){
							if(choice != "Reveal Hand"){
								game.revealed.push(choice.name)
								current_player.discardCard(choice.name)
								current_player.deck.unshift(choice.name)
							} else {
								for(var card of current_player.hand){
									game.revealed.push(card)
								}
							}
							cb()
						})
				})
			}
		}
		multi.run(function(){if(callback){callback()}})
	}
})

addAction({name: "Smithy", cost:4, cards:3, image: "/base/smithy.jpg"})

addAction({name: "Feast", cost:4, image: "/base/feast.jpg",
	effect: function(player, game, callback){
		console.log("Destroyed: ", player.discard.pop())
		game.playerChoice(player, game.getCards(player, {locations: ["purchase"], maxCost:5}),[],
			function(player, choice){
				player.gainCard(choice.name)
				game.purchase[choice.name] -= 1
				if(callback){callback()}
				
		})
	}})

addAttack({name: "Militia", cost:4, gold:2, image: "/base/militia.jpg", 
	effect: function(player, game, unaffected, callback){
		var multi = new utility.Multifunc()

		for(var p of game.players.values()){
			if(p != player && !unaffected.includes(p)){
				
				let current_player = p
				if(current_player.hand.length > 3){
					multi.push(function(cb){

						var func = function(func, current_player){
							game.playerChoice(current_player, game.getCards(current_player, {locations: ["hand"]}), ["Done"], 
								function(current_player, choice){
									current_player.discardCard(choice.name)
									current_player.discard.push(choice.name)
									if(current_player.hand.length > 3){
										func(func, current_player)
									} else {
										cb()
									}

								})
						}
						func(func, current_player)

					})
				}
			}
		}
		multi.run(function(){if(callback){callback()}})
	}	
})

addAction({name: "Moneylender", cost:4, image: "/base/moneylender.jpg",
	playable: function(player, game){
		return player.hand.includes("Copper")
	},
	effect: function(player, game, callback){
		game.playerChoice(player, ["Copper"], [],
			function(player, choice){
				player.discardCard(choice)
				player.addGold(3)
				if(callback){callback()}
			})
	}})

addAttack({name: "Spy", cost:4, image: "/base/spy.jpg",
	effect: function(player, game, unaffected, callback){
		var multi = new utility.Multifunc()
		game.revealed = []
		for(var p of game.players.values()){
			if(!unaffected.includes(p) || p == player){
				let current_player = p
				multi.push(function(cb){
					game.revealed.push(current_player.deck[current_player.deck.length-1])
					game.playerChoice(player, [], ["Keep (" + current_player.user.name + ")", "Discard (" + current_player.user.name + ")"], function(player, choice){
						if(choice.startsWith("Discard")){
							current_player.mill(1)
						}
						cb()
					})
				})
			}
		}
		multi.run(function(){if(callback){callback()}})
	}
})

addAction({name: "Throne Room", cost:4, image: "/base/throneroom.jpg",
	playable: function(player, game){
		return game.getCards(player, {locations: ["hand"], type: "action", playable: true, invalid: "Throne Room"}).length > 0
	},
	effect: function(player, game, callback){
		game.playerChoice(player, game.getCards(player, {locations: ["hand"], type: "action", playable: true, invalid: "Throne Room"}), [],
			function(player, choice){
				player.discardCard(choice)
				game.history.push(choice.name)
				choice.play(player, game, function(){
					game.history.push(choice.name)
					choice.play(player, game, function(){
						if(callback){callback()}
					})
				})
			})
	}
})

addAction({name: "Remodel", cost:4, image: "/base/remodel.jpg",
	playable: function(player, game){
		return player.hand.length > 1
	},
	effect: function(player, game, callback){
		game.playerChoice(player, game.getCards(player, {locations: ["hand"]}), [], 
			function(player, choice){
				player.discardCard(choice)
				game.playerChoice(player, game.getCards(player, {locations: ["purchase"], maxCost: 2 + choice.cost}), [],
					function(player, choice){
						player.gainCard(choice)
						game.purchase[choice.name] -= 1
						if(callback){callback()}
					})
			})
	}
})

addAction({name: "Laboratory", cost:5, cards:2, actions:1, image: "/base/laboratory.jpg"})

addAction({name: "Market", cost:5, buys:1, actions:1 ,cards:1, gold:1, image: "/base/market.jpg"})

addAction({name: "Council Room", cost:5, cards:4, buys:1, image: "/base/councilroom.jpg",
	effect: function(player, game, callback){
		for(var p of game.players.values()){
			if(p != player){
				p.draw(1)
			}
		}
		if(callback){callback()}
	}})

addAction({name: "Mine", cost:5, image: "/base/mine.jpg",
	playable: function(player, game){
		return game.getCards(player, {locations: ["hand"], type: "treasure"}).length > 1
	},
	effect: function(player, game, callback){
		game.playerChoice(player, game.getCards(player, {locations: ["hand"], type: "treasure"}), [], 
			function(player, choice){
				player.discardCard(choice)
				game.playerChoice(player, game.getCards(player, {locations: ["purchase"], type: "treasure", maxCost: 3 + choice.cost}), [],
					function(player, choice){
						player.gainCard(choice)
						game.purchase[choice.name] -= 1
						if(callback){callback()}
					})
			})
	}
})

addAction({name: "Festival", cost:5, actions:2, buys:1, gold:2, image: "/base/festival.jpg"})

addAttack({name: "Witch", cost:5, cards:2, image: "/base/witch.jpg",
	effect: function(player,game,unaffected, callback){
		console.log("Playing witch effect: YAY")
		for(var p of game.players.values()){
			if(!unaffected.includes(p)){
				p.gainCard("Curse")
				game.purchase["Curse"] -= 1
			}
		}
		if(callback){callback()}
	}

})

addAction({name: "Adventurer", cost:6, image: "/base/adventurer.jpg",
	effect: function(player,game,callback){
		console.log("Playing adventurer effect")
		game.revealed = []
		var revealedTreasures = []
		while(revealedTreasures.length < 2 && player.discard.length + player.deck.length > 0){
			var revealed = player.mill(1)[0]
			console.log(revealed)
			if(cards[revealed].types.includes("treasure")){
				revealedTreasures.push(revealed)
			}
			game.revealed.push(revealed)
		}
		for(var c of revealedTreasures){
			player.hand.push(c)
		}
		if(callback){callback()}
	}})

addReaction({name: "Moat", cost:2 ,cards:2, image: "/base/moat.jpg"})

module.exports = {
	cards: cards
}