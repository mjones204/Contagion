const { Client } = require('pg');
const Constants = require('./Constants');

class Database {
	constructor() {
		try {
			if (!process.env.DATABASE_URL) {
				console.log('DATABASE_URL is not initialised');
				console.log('Initialising DATABASE_URL from db_config.json');
				const dbConfig = require('./db_config.json');
				process.env.DATABASE_URL = dbConfig.DATABASE_URL;
			}
			// database url not set in db_config.json
			if (process.env.DATABASE_URL === '') {
				console.log('ERROR: No database URL in db_config.json');
				console.log(
					'WARNING: Game may produce undesireable results if not connected to a database',
				);
				this.client = null;
			}
			// database url is set - attempt to connect
			else {
				this.client = new Client({
					connectionString: process.env.DATABASE_URL,
					ssl: {
						rejectUnauthorized: false,
					},
				});
				this.client.connect();
				console.log('Connected to Database');
				let writeAccessText = 'is enabled';
				if (Constants.DISABLE_DATABASE_WRITE) {
					writeAccessText =
						'has been disabled - Database is read only';
				}
				console.log(`Database writing ${writeAccessText}`);
			}
		} catch (err) {
			console.error('Error connecting to Database', err);
		}
	}

	async sendSqlQuery(query, game = null) {
		//Doesn't use the database if we're running locally/experiments
		console.info(query);
		try {
			if (this.client === null) {
				throw Error('Error: Database not connected');
			} else {
				const res = await this.client.query(query);
				return res;
			}
		} catch (err) {
			this.databaseFailure(query, err, game);
			return false;
		}
	}

	databaseFailure(query, error, game) {
		console.log(`Database ERROR at time: ${new Date().toUTCString()}`);
		console.log(`Database ERROR executing query: ${query}`, error);

		if (game !== null) {
			if (game.hasGameManager()) {
				// kill game
				game.gameManager.killGame(game, false);
			}
		}
	}

	addGame(game) {
		if (Constants.DISABLE_DATABASE_WRITE) {
			return;
		}
		if (Constants.ONLY_WRITE_HUMAN_GAMES && !game.hasHumanPlayer()) {
			return;
		}
		const gameId = game.id;
		const timestamp = new Date().toISOString().slice(0, -1); // slice removes the Z from the timestamp
		const [p1, p2] = game.players;
		const p1Id = p1.id;
		let p2Id = p2.id;
		if (p2.isAI) {
			// AI player id's are given the value of their AI strategy
			p2Id = 'AI' + p2.aiStrategy;
		}
		const initialInfections = ''; // this is basically deprecated unless spec changes
		const tokenRemoval = false; // same with this, not really sure what this means but it's always false
		const p1TopologyId = game.graph.id;
		const p2TopologyId = game.graph.id;
		const p1LayoutId = p1.layoutId;
		const p2LayoutId = p2.layoutId;
		const query = `INSERT INTO master_games_table VALUES ('${gameId}', '${timestamp}', '${p1Id}', '${p2Id}', '${initialInfections}', '${tokenRemoval}', ${p1TopologyId}, ${p1LayoutId}, ${p2TopologyId}, ${p2LayoutId});`;
		this.sendSqlQuery(query, game);
	}

	addMoves(game) {
		if (Constants.DISABLE_DATABASE_WRITE) {
			return;
		}
		if (Constants.ONLY_WRITE_HUMAN_GAMES && !game.hasHumanPlayer()) {
			return;
		}
		const gameId = game.id;
		const round = game.round;
		const [p1, p2] = game.players;
		const flippedNodes = game.flippedNodes;
		const p1LastMove = game.getPlayerLastMove(p1);
		console.log(p1LastMove);
		const p2LastMove = game.getPlayerLastMove(p2);
		const p1LastMoveTime = game.getPlayerLastMoveTime(p1);
		const p2LastMoveTime = game.getPlayerLastMoveTime(p2);
		const p1ControlledNodes = game
			.getNodesControlledByPlayer(p1)
			.map((node) => node.id);
		const p2ControlledNodes = game
			.getNodesControlledByPlayer(p2)
			.map((node) => node.id);
		const query = `INSERT INTO player_actions_table VALUES ('${gameId}', ${round}, '${flippedNodes}', ${p1LastMove} , ${p2LastMove}, ${p1LastMoveTime}, ${p2LastMoveTime}, '${p1ControlledNodes}', '${p2ControlledNodes}');`;
		this.sendSqlQuery(query, game);
	}

	addClick(game, playerNum, nodeId, action, timestamp) {
		if (Constants.DISABLE_DATABASE_WRITE) {
			return;
		}
		if (Constants.ONLY_WRITE_HUMAN_GAMES && !game.hasHumanPlayer()) {
			return;
		}
		const gameId = game.id;
		const round = game.round;
		const query = `INSERT INTO player_clicks_table VALUES ('${gameId}', ${playerNum}, '${nodeId}', '${action}', '${timestamp}', '${round}');`;
		this.sendSqlQuery(query, game);
	}

	// adds a player's mturk completion code, returns the database lookup for confirmation of success
	async addPlayerCompletionCode(playerId, timestamp, completionCode) {
		if (Constants.DISABLE_DATABASE_WRITE) {
			return;
		}
		const query = `INSERT INTO mturk_completion_table VALUES ('${timestamp}', '${playerId}', '${completionCode}');`;
		await this.sendSqlQuery(query);
		return await this.getPlayerCompletionCode(playerId);
	}

	// get all the game id's where either player's id matches the given playerId
	async getAllGamesPlayedByPlayer(playerId) {
		const query = `SELECT * FROM master_games_table WHERE player_one_id='${playerId}' OR player_two_id='${playerId}'`;
		const result = await this.sendSqlQuery(query);
		if (result) {
			return result.rows;
		} else {
			return [];
		}
	}

	// gets all the rounds for a given game
	async getAllRoundsInfoForGame(gameID) {
		const query = `SELECT * FROM player_actions_table WHERE game_id='${gameID}' ORDER BY round_number ASC`;
		const result = await this.sendSqlQuery(query);
		if (result) {
			return result.rows;
		} else {
			return [];
		}
	}

	// gets a single round specified by the round number for a given game
	async getRoundInfoForGame(gameID, roundNo) {
		const query = `SELECT * FROM player_actions_table WHERE game_id='${gameID}' AND round_number=${roundNo}`;
		const result = await this.sendSqlQuery(query);
		if (result) {
			return result.rows;
		} else {
			return [];
		}
	}

	// gets player mturk completion code (if exists)
	async getPlayerCompletionCode(playerId) {
		const query = `SELECT * FROM mturk_completion_table WHERE player_id='${playerId}'`;
		const result = await this.sendSqlQuery(query);
		if (result && result.rows.length > 0) {
			return result.rows[0].completion_code.trim();
		} else {
			return null;
		}
	}
}

exports.Database = Database;
