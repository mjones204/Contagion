const { Game, Player, Graph } = require('./GameClasses');
const { AI, Strategies } = require('./AI');
const Message = require('./Message');

class GameManager {
	constructor() {
		this.activeGames = [];
		this.topologies = [];
		this.playerTopologyPerms = [];
		this.loadTopologies();
	}

	// load topologies from .json files in the Topologies directory
	loadTopologies() {
		const dir = './Topologies/';
		const fs = require('fs');
		const files = fs
			.readdirSync(dir)
			.filter((file) => file.endsWith('.json'));
		// store topologies in this.topologies array
		files.forEach((file) => {
			const topology = require(dir + file);
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
		p1AiStrategy = Strategies.Random,
		p2AiStrategy = Strategies.Random,
		p1Ws = null,
		p2Ws = null,
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
				color: 'green',
				layoutId,
				isAI: p1Ai,
				aiStrategy: p1AiStrategy,
				ws: p1Ws,
			}),
			new Player({
				id: p2Id,
				color: 'red',
				layoutId,
				isAI: p2Ai,
				aiStrategy: p2AiStrategy,
				ws: p2Ws,
			}),
		];
		const game = new Game({ players, graph, topologyId });
		game.beginRound(); // gives players their tokens and inits scores
		this.activeGames.push(game);
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
		// send msg to players informing them of game end
		// naturalEnd is true when the game ends by reaching the max number of rounds
		if (naturalEnd) {
			// send win / lose
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

	// the client needs the config to be in a particular format
	getClientConfig(game, playerId) {
		const player = game.getPlayerById(playerId);
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
			console.log(`registerClick(nodeId: ${nodeId}, action: ${action})`);
			// milliseconds since game start
			const timestamp = Date.now() - game.startTime;
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
