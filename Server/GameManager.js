const { Game, Player, Graph } = require('./GameClasses');
const { AI, Strategies } = require('./AI/AI');
const { Scoring, ScoringStrategies } = require('./Scoring');
const { Database } = require('./Database');
const Message = require('./Message');

class GameManager {
	constructor({ server = null, database = null }) {
		this.server = server; // required so that games can request the server to update clients
		this.activeGames = [];
		this.topologies = [];
		this.playerTopologyPerms = [];
		this.loadTopologies();
		this.database = database;

		// create a new database connection if one is not provided
		if (this.database === null) {
			this.database = new Database();
		}
	}

	hasServer() {
		return this.server !== null;
	}

	// load topologies from .json files in the Topologies directory
	loadTopologies() {
		const fs = require('fs');
		const path = require('path');
		// files are located in the Topologies folder
		const dirPath = path.join(__dirname, '/Topologies/');

		const files = fs
			.readdirSync(dirPath)
			.filter((file) => file.endsWith('.json'));
		// store topologies in this.topologies array
		files.forEach((file) => {
			const topology = require(dirPath + file);
			// set topology.id as the filename
			topology.id = file.replace('.json', '');
			this.topologies.push(topology);
		});
	}

	getRandomTopology() {
		return this.topologies[
			Math.floor(Math.random() * this.topologies.length)
		];
	}

	getTopologyById(id) {
		return this.topologies.filter((topology) => topology.id === id)[0];
	}

	newGame({
		topologyId,
		layoutId,
		p1Id = 0,
		p2Id = 1,
		p1Ai = true,
		p2Ai = true,
		p1AiStrategy = Strategies.SimpleGreedy,
		p2AiStrategy = Strategies.SimpleGreedy,
		p1Ws = null,
		p2Ws = null,
		scoringStrategy = ScoringStrategies.Uniform,
	}) {
		let topology = this.getRandomTopology();
		if (topologyId === undefined) {
			topologyId = topology.id;
		} else {
			// TODO: set topology and layout from params
		}
		if (layoutId === undefined) {
			layoutId = 0;
		} else {
			// TODO: set topology and layout from params
		}
		const graph = new Graph(topology);
		const players = [
			new Player({
				id: p1Id,
				number: 1,
				color: 'green',
				layoutId,
				isAI: p1Ai,
				aiStrategy: p1AiStrategy,
				ws: p1Ws,
			}),
			new Player({
				id: p2Id,
				number: 2,
				color: 'red',
				layoutId,
				isAI: p2Ai,
				aiStrategy: p2AiStrategy,
				ws: p2Ws,
			}),
		];
		const game = new Game({
			players,
			graph,
			topologyId,
			scoringStrategy,
			gameManager: this, // required so that games can request the server to update clients
		});
		game.beginRound(); // gives players their tokens and inits scores
		this.activeGames.push(game);

		// add game to database
		this.database.addGame(game);

		return game;
	}

	killGamesByPlayerId(id) {
		const gamesToRemove = this.getGamesByPlayerId(id);
		console.log('activeGames length', this.activeGames.length);
		// kill games
		gamesToRemove.forEach((game) => this.killGame(game, false));

		console.log(
			'activeGames length (after killing)',
			this.activeGames.length,
		);
	}

	killGame(game, naturalEnd) {
		if (naturalEnd) {
			// game reached max number of rounds
			// send msg to players informing them of game end
			if (this.hasServer()) {
				this.server.updateClientsGameOver(game);
			}
		} else {
			// disconnected or new game started by existing player
			// ideally we should notify players here
		}
		// remove game from active games
		const index = this.activeGames.indexOf(game);
		this.activeGames.splice(index, 1);
	}

	getGameByPlayerId(id) {
		const games = this.getGamesByPlayerId(id);
		// no games found or multiple games found (bug)
		if (games.length !== 1) {
			return null;
		}
		return games[0];
	}

	getGamesByPlayerId(id) {
		return this.activeGames.filter((game) => {
			return game.players.filter((player) => player.id === id).length > 0;
		});
	}

	// the client needs the config to be in a particular format (for front-end visualisation only)
	getClientConfigPayload(game, player) {
		const config = {};
		config.fullscreen = true;
		// maxConnections is the number of tokens the player is allowed to place per round
		// it's set to the number of tokens the player has available (most likely 1)
		config.maxConnections = player.freeTokens.length;
		config.network = {
			connections: game.graph.edges.map(({ start, end }) => {
				return [start.toString(), end.toString()];
			}),
			peeps: game.graph.nodes.map((node, index) => {
				const topology = this.getTopologyById(game.graph.id);
				const layoutIndex = player.layoutId;
				const [x, y] = topology.layouts[layoutIndex][index];
				return [x, y, node.getControlledState(player)];
			}),
		};
		config.tokenProtocol = 'Incremental';
		config.type = 'sim';
		config.x = 0;
		config.y = 0;
		return config;
	}

	// payload is in legacy format for clients
	getClientUpdateStatePayload(game, player) {
		const peepsToSend = game.graph.nodes.map((node) =>
			node.getControlledState(player),
		);
		const movesToSend = game.getPlayerMoves(game.getEnemyPlayer(player));
		const playerScore = game.getPlayerScore(player);
		const friendlyControlledNodes = game
			.getNodesControlledByPlayer(player)
			.map((node) => node.id);
		const enemyControlledNodes = game
			.getNodesControlledByEnemies(player)
			.map((node) => node.id);
		return [
			peepsToSend,
			movesToSend,
			playerScore,
			friendlyControlledNodes,
			enemyControlledNodes,
		];
	}

	// payload is in legacy format for clients
	getClientGameOverPayload(game, player) {
		let result = ''; // win, lose, draw, disconnect, time
		const winningPlayers = game.getWinningPlayersByScore();
		if (winningPlayers.some((p) => p === player)) {
			if (winningPlayers.length > 1) {
				// player is drawing
				result = 'draw';
			} else {
				// player is winner
				result = 'win';
			}
		} else {
			// player is losing
			result = 'lose';
		}

		const playerScoreList = game.getPlayerScores(player);
		const enemyScoreList = game.getPlayerScores(
			game.getEnemyPlayer(player),
		);
		const gameId = game.id;
		const playerNo = 1; // always 1 because p2 is AI (this might need adjusting if spec changes)
		return [result, playerScoreList, enemyScoreList, gameId, playerNo];
	}

	registerHeartbeat(ws) {
		const game = this.getGameByPlayerId(ws.id);
		if (game !== null) {
			const player = game.getPlayerById(ws.id);
			if (player) {
				player.setHeartbeat(Date.now());
			}
		}
	}

	registerClick(nodeId, action, ws) {
		const game = this.getGameByPlayerId(ws.id);
		if (game !== null) {
			const player = game.getPlayerById(ws.id);
			if (player) {
				console.log(
					`registerClick(nodeId: ${nodeId}, action: ${action})`,
				);
				// milliseconds since game start
				const timestamp = Date.now() - game.startTime;
				// add to database
				this.database.addClick(
					game,
					player.number,
					nodeId,
					action,
					timestamp,
				);
			}
		}
	}

	submitMove(nodeId, ws) {
		const game = this.getGameByPlayerId(ws.id);
		if (game !== null) {
			const player = game.getPlayerById(ws.id);
			if (player) {
				game.playerMove(player, nodeId);
			}
		}
	}
}

exports.GameManager = GameManager;
