const uuidv4 = require('uuid/v4');
const { Game } = require('./GameClasses');
const { Database } = require('./Database');

class MTurkManager {
	constructor({ server = null, database = null }) {
		this.server = server;
		this.database = database;

		// create a new database connection if one is not provided
		if (this.database === null) {
			this.database = new Database();
		}
	}

	calculateMTurkRewardForGame(score, win) {
		const MTURK_WIN_REWARD = 0.05;
		const MTURK_MIN_SCORE_REWARD = 0.03;
		const MTURK_MAX_SCORE_REWARD = 0.2;

		if (score <= 0) {
			return 0;
		}

		let reward = 0;
		// scale the score to a monetary value
		reward += this.convertRange(
			score,
			[1, 3500],
			[MTURK_MIN_SCORE_REWARD, MTURK_MAX_SCORE_REWARD],
		);

		// winner bonus
		if (win) {
			reward += MTURK_WIN_REWARD;
		}
		return reward;
	}

	convertRange(value, r1, r2) {
		return ((value - r1[0]) * (r2[1] - r2[0])) / (r1[1] - r1[0]) + r2[0];
	}

	async getMTurkInfoForPlayer(playerId, lastGameID) {
		const GameClass = new Game({});
		const info = {};
		info.gamesPlayed = 0;
		info.gamesWon = 0;
		info.lastGameReward = 0;
		info.lastGameWon = false;
		info.totalReward = 0;
		// get all the game id's for games this player was involved in
		const games = await this.database.getAllGamesPlayedByPlayer(playerId);
		//console.log('games', games);
		// for each game, get the round information
		for (let i = 0; i < games.length; i++) {
			const game = games[i];
			// determine whether we are p1 or p2 based on our userID
			let isPlayerOne = false;
			if (game.player_one_id.trim() == playerId) {
				isPlayerOne = true;
			}
			const gameID = game.game_id.trim();
			// get rounds info of game
			const rounds = await this.database.getAllRoundsInfoForGame(gameID);

			// should always have info for all 10 rounds
			if (rounds.length === 10) {
				let ourScore = 0;
				let opponentScore = 0;
				for (let r = 0; r < rounds.length; r++) {
					const round = rounds[r];
					// build node arrays
					let ourNodes = [];
					let opponentNodes = [];
					let p1Nodes = [];
					let p2Nodes = [];
					// convert p1 node string into node array
					if (round.p1_nodes.includes(',')) {
						p1Nodes = round.p1_nodes.trim().split(',');
					} else {
						p1Nodes.push(round.p1_nodes);
					}
					// convert p2 node string into node array
					if (round.p2_nodes.includes(',')) {
						p2Nodes = round.p2_nodes.trim().split(',');
					} else {
						p2Nodes.push(round.p2_nodes);
					}
					// requesting player is player one
					if (isPlayerOne) {
						ourNodes = p1Nodes;
						opponentNodes = p2Nodes;
					}
					// requesting player is player two
					else {
						opponentNodes = p1Nodes;
						ourNodes = p2Nodes;
					}
					// calculate scores
					ourScore += GameClass.getScoreFromNodesControlled(
						ourNodes.length,
						round.round_number,
					);
					opponentScore += GameClass.getScoreFromNodesControlled(
						opponentNodes.length,
						round.round_number,
					);
				}
				// calculate winner based on scores
				let winner = false;
				if (ourScore > opponentScore) {
					winner = true;
				}
				// calculate monetary reward
				const gameReward = this.calculateMTurkRewardForGame(
					ourScore,
					winner,
				);
				// set info vars
				info.gamesPlayed++;
				console.log('info.gamesPlayed', info.gamesPlayed);
				if (winner) {
					info.gamesWon++;
				}
				info.totalReward += gameReward;
				// for the last game we save the reward separately so we can display it to the player
				if (gameID === lastGameID) {
					info.lastGameReward = gameReward;
					if (winner) {
						info.lastGameWon = true;
					}
				}
				//console.log("game_id: " + gameID + " ourScore: " + ourScore + " won: " + winner);
			} else {
				console.log(
					`getMTurkInfoForClient [Error] Game: ${gameID} does not have 10 rounds in the database`,
				);
			}
		}
		return info;
	}

	async getCompletionCodeForPlayer(playerId) {
		const completionCode = await this.database.getPlayerCompletionCode(
			playerId,
		);
		if (completionCode) {
			// completion code found in database
			return completionCode;
		} else {
			console.log(`Creating new completion code for player ${playerId}`);
			// completion code not found
			const timestamp = new Date().toISOString().slice(0, -1);
			// generate new code
			const newCompletionCode = this.generateCompletionCode();
			// add to database (return value is retrieved code from database after add)
			const databaseCompletionCode = await this.database.addPlayerCompletionCode(
				playerId,
				timestamp,
				newCompletionCode,
			);
			if (databaseCompletionCode === newCompletionCode) {
				return databaseCompletionCode;
			} else {
				// database failure
				console.log(
					`Error adding new completion code to database for player ${playerId}`,
				);
				return false;
			}
		}
	}

	generateCompletionCode() {
		const code = '' + uuidv4();
		const shortenedCode = code.slice(code.length - 12);
		return shortenedCode;
	}
}

exports.MTurkManager = MTurkManager;
