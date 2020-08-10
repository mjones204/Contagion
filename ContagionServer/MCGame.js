const SeededRNGGenerator = require('./seedrandom.min');

module.exports = class MCGame {
	constructor() {
		this.state = {
			gameID: '1',
			rngThreshCount: 0,
			roundNumber: 0,
			p1Moves: [],
			p2Moves: [],
			p1ScoreList: [],
			p2ScoreList: [],
			formattedPeeps: [],
			formattedConnections: [],
			flippedNodes: [],
			roundLimit: 10,
			lastRoundBonus: 5,
			gameOver: false,
			winner: -1,
		};
	}

	getState() {
		return this.state;
	}
	setState(state) {
		this.rngThreshold = SeededRNGGenerator(state.gameID);
		this.state = state;
	}

	// returns a deep copy of the game state
	cloneState() {
		return {
			gameID: this.state.gameID,
			rngThreshCount: this.state.rngThreshCount,
			roundNumber: this.state.roundNumber,
			p1Moves: this.state.p1Moves.slice(0),
			p2Moves: this.state.p2Moves.slice(0),
			p1ScoreList: this.state.p1ScoreList.slice(0),
			p2ScoreList: this.state.p2ScoreList.slice(0),
			formattedPeeps: JSON.parse(
				JSON.stringify(this.state.formattedPeeps),
			),
			formattedConnections: this.state.formattedConnections.slice(0),
			flippedNodes: this.state.flippedNodes.slice(0),
			roundLimit: this.state.roundLimit,
			lastRoundBonus: this.state.lastRoundBonus,
			gameOver: this.state.gameOver,
			winner: this.state.winner,
		};
	}

	randThreshold() {
		this.state.rngThreshCount++;
		return this.rngThreshold();
	}

	getPlayerScore(playerNumber) {
		let scoreList = [];
		if (playerNumber == 1) {
			scoreList = this.state.p1ScoreList;
		} else {
			scoreList = this.state.p2ScoreList;
		}
		let [prevScore] = scoreList.slice(-1);
		if (!prevScore) {
			prevScore = 0;
		}
		return prevScore;
	}

	getPlayerScoreList(playerNumber) {
		if (playerNumber == 1) {
			return this.state.p1ScoreList;
		} else {
			return this.state.p2ScoreList;
		}
	}

	getPlayerMoves(playerNumber) {
		if (playerNumber == 1) {
			return this.state.p1Moves;
		} else {
			return this.state.p2Moves;
		}
	}

	// returns list of valid moves given current game state
	moves() {
		let moves = [];
		for (var i = 0; i < this.state.formattedPeeps.length; i++) {
			moves.push(i);
		}
		return moves;
	}
	playMove(move) {
		if (this.state.p1Moves.length == this.state.p2Moves.length) {
			this.state.p1Moves.push(move);
		} else if (this.state.p2Moves.length < this.state.p1Moves.length) {
			this.state.p2Moves.push(move);
		} else {
			console.log('playMove error: p1 has less moves than p2');
		}

		// both players have made a move
		if (this.state.p1Moves.length == this.state.p2Moves.length) {
			this.state.roundNumber++;
			this.performInfections();
			this.updateScores();

			if (this.state.roundNumber >= this.state.roundLimit) {
				this.state.gameOver = true;
				// winner based on scores
				// player 1 wins
				if (this.getPlayerScore(1) > this.getPlayerScore(2)) {
					this.state.winner = 1;
				}
				// player 2 wins
				else if (this.getPlayerScore(2) > this.getPlayerScore(1)) {
					this.state.winner = 2;
				}
				// draw
				else {
					this.state.winner = -1;
				}
			}
		}
	}
	updateScores() {
		var p1PeepCount = 0;
		var p2PeepCount = 0;

		//Records how many nodes owned by each player
		this.state.formattedPeeps.forEach(function (peep) {
			if (peep[2] == 1) {
				p1PeepCount++;
			} else if (peep[2] == 0) {
				p2PeepCount++;
			}
		});
		//Each node worth 10 points
		var p1AdditionalScore = p1PeepCount * 10;
		var p2AdditionalScore = p2PeepCount * 10;

		//Applies 5x bonus to the final round
		if (this.state.roundNumber == 10) {
			p1AdditionalScore = p1AdditionalScore * this.state.lastRoundBonus;
			p2AdditionalScore = p2AdditionalScore * this.state.lastRoundBonus;
		}

		// add new score
		this.state.p1ScoreList.push(this.getPlayerScore(1) + p1AdditionalScore);
		this.state.p2ScoreList.push(this.getPlayerScore(2) + p2AdditionalScore);
	}

	performInfections() {
		var updatedPeeps = JSON.parse(
			JSON.stringify(this.state.formattedPeeps),
		);
		updatedPeeps.forEach(function (peep) {
			peep.push(0);
			peep.push(0);
		});
		//required as using 'this' in the loop uses the loop's scope, and can't access the variable needed
		var originalPeeps = this.state.formattedPeeps;

		//Adds to the 'infected friends' ([3]) and 'total friends' ([4]) counts based on the peeps connected via lines.
		this.state.formattedConnections.forEach(function (connection) {
			var peep1 = updatedPeeps[connection[0]];
			var peep2 = updatedPeeps[connection[1]];
			//NB: It's ok to use the infection stats of updatedPeeps here because we're only calculating the likelihood of infection here.
			//The actual infecting step takes place after, which is the only thing that could cause a difference in calculations.
			//The third item in the peep array is the infected state. 1 = infected by player, 0 = infected by enemy, -1 = neutral
			if (peep2[2] != -1) {
				//Ignore peep if in neutral state
				peep1[3] += peep2[2];
				peep1[4]++;
			}
			if (peep1[2] != -1) {
				peep2[3] += peep1[2];
				peep2[4]++;
			}
		});

		//Adds to friends based on player one's tokens (i.e. always adds to both infected and total friends)
		this.state.p1Moves.forEach(function (move) {
			updatedPeeps[move][3]++;
			updatedPeeps[move][4]++;
		});

		//Adds to friends based on player two's tokens (i.e. always adds to just total friends)
		this.state.p2Moves.forEach(function (move) {
			updatedPeeps[move][4]++;
		});
		updatedPeeps.forEach((peep) => {
			var rand = this.randThreshold(); //we need to call a rand for each node regardless of whether or not we use it to make sure the random numbers generated are the same each time
			//prevents / by 0 error for peeps surrounded by neutral peeps
			if (peep[4] > 0) {
				var ratio = peep[3] / peep[4];
				if (ratio >= rand) {
					//Adding random element for voter model
					peep[2] = 1;
				} else {
					peep[2] = 0;
				}
			}
		});

		//Updates the record of which nodes have changed colour this round
		var flippedNodes = this.state.flippedNodes;
		originalPeeps.forEach(function (peep, index) {
			if (peep[2] != updatedPeeps[index][2]) {
				//Using != also allows us to capture neutral node changes
				if (updatedPeeps[index][2] == 1) {
					flippedNodes.push(index + 'p'); //Indicates changes to player nodes
				} else {
					flippedNodes.push(index);
				}
			}
			peep[2] = updatedPeeps[index][2];
		});
	}

	gameOver() {
		return this.state.gameOver;
	}

	winner() {
		//will return -1 if draw
		return this.state.winner;
	}
};
