const SeededRNGGenerator = require('./seedrandom.min');
const uuidv4 = require('uuid/v4');
const log = false;

// has basic infection and score logic
module.exports = class SimpleGame {
	constructor({
		roundNumber = 0,
		p1Moves = [],
		p2Moves = [],
		p1ScoreList = [],
		p2ScoreList = [],
		peeps,
		connections,
		flippedNodes = [],
		roundLimit = 10,
		lastRoundBonus = 5,
	}) {
		this.gameID = uuidv4();
		this.rngThreshold = SeededRNGGenerator(this.gameID);
		this.rngThreshCount = 0;
		this.roundNumber = roundNumber;
		this.p1Moves = p1Moves;
		this.p2Moves = p2Moves;
		this.p1ScoreList = p1ScoreList;
		this.p2ScoreList = p2ScoreList;
		this.formattedPeeps = peeps;
		this.formattedConnections = connections;
		this.flippedNodes = flippedNodes;
		this.roundLimit = roundLimit;
		this.lastRoundBonus = lastRoundBonus;
		this.gameCompleted = false;
		this.peepInfectionProbabilitySmoothing = true;
	}

	randThreshold() {
		this.rngThreshCount++;
		return this.rngThreshold();
	}

	// called after all moves have been made
	newRound() {
		this.roundNumber++;
		this.performInfections();
		this.updateScores();

		if (log) {
			console.log(
				`ROUND ${this.roundNumber}: FINISHED - p1Moves: ${
					this.p1Moves
				} p1Score: ${this.getPlayerScore(1)} p2Moves: ${
					this.p2Moves
				} p2Score: ${this.getPlayerScore(2)}`,
			);
		}

		if (this.roundNumber >= this.roundLimit) {
			this.endGame();
		}
	}

	endGame() {
		this.gameCompleted = true;
		if (log) {
			console.log('GAME COMPLETED');
		}
	}

	performInfections() {
		var updatedPeeps = JSON.parse(JSON.stringify(this.formattedPeeps));
		updatedPeeps.forEach(function (peep) {
			peep.push(0);
			peep.push(0);
		});
		//required as using 'this' in the loop uses the loop's scope, and can't access the variable needed
		var originalPeeps = this.formattedPeeps;

		//Adds to the 'infected friends' ([3]) and 'total friends' ([4]) counts based on the peeps connected via lines.
		this.formattedConnections.forEach(function (connection) {
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
		this.p1Moves.forEach(function (move) {
			updatedPeeps[move][3]++;
			updatedPeeps[move][4]++;
		});

		//Adds to friends based on player two's tokens (i.e. always adds to just total friends)
		this.p2Moves.forEach(function (move) {
			updatedPeeps[move][4]++;
		});
		updatedPeeps.forEach((peep) => {
			if (this.peepInfectionProbabilitySmoothing) {
				// discuss whether this should be implemented
			}
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
		var flippedNodes = this.flippedNodes;
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

	updateScores() {
		var p1PeepCount = 0;
		var p2PeepCount = 0;

		//Records how many nodes owned by each player
		this.formattedPeeps.forEach(function (peep) {
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
		if (this.roundNumber == 10) {
			p1AdditionalScore = p1AdditionalScore * this.lastRoundBonus;
			p2AdditionalScore = p2AdditionalScore * this.lastRoundBonus;
		}

		// add new score
		this.p1ScoreList.push(this.getPlayerScore(1) + p1AdditionalScore);
		this.p2ScoreList.push(this.getPlayerScore(2) + p2AdditionalScore);
	}

	getPlayerScore(playerNumber) {
		let scoreList = [];
		if (playerNumber == 1) {
			scoreList = this.p1ScoreList;
		} else {
			scoreList = this.p2ScoreList;
		}
		let [prevScore] = scoreList.slice(-1);
		if (!prevScore) {
			prevScore = 0;
		}
		return prevScore;
	}

	submitMove(playerNumber, node) {
		if (this.gameCompleted) {
			console.log("Can't submit moves - Game has reached round limit");
			return false;
		}
		if (playerNumber == 1) {
			this.p1Moves.push(node);
		} else {
			this.p2Moves.push(node);
		}

		// both players have made a move
		if (this.p1Moves.length == this.p2Moves.length) {
			this.newRound();
		}
	}

	getRandomNode() {
		return Math.floor(Math.random() * this.formattedPeeps.length);
	}
};
