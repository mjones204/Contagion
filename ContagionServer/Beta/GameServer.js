const WebSocketServer = require('ws').Server;
const uuidv4 = require('uuid/v4');
const http = require('http');
const express = require('express');
const { GameManager } = require('./GameManager');
const Message = require('./Message');

class GameServer {
	constructor(port = 5001) {
		this.gameManager = new GameManager({ server: this });
		this.startServer(port);
		this.games = [];
	}

	startServer(port) {
		// web socket server
		const app = express();
		const webSocketServer = http.createServer(app);
		webSocketServer.listen(port);
		console.log('Game Server listening on port', port);

		const wss = new WebSocketServer({
			server: webSocketServer,
		});

		// web socket connection code
		wss.on('connection', (ws) => {
			// assigns unique ID to the websocket so we can uniquely ID players
			ws.id = uuidv4();
			console.info('New Connection: ' + ws.id);
			ws.on('message', (message) => {
				//Parses messages received from the client
				this.parseMessage(message, ws);
			});
			ws.on('end', () => {});
			ws.send('Connected');
		});
	}

	parseMessage(message, ws) {
		try {
			message = JSON.parse(message);
		} catch (err) {
			return;
		}
		// don't log heartbeats since they clutter the log
		if (message.status != 'HEARTBEAT') {
			console.log('Message Received: ' + message.status);
		}
		switch (message.status) {
			case 'NEW_GAME_TOKEN':
				this.newGame(message.payload.toString(), ws);
				break;
			case 'SUBMIT_MOVES_TOKEN':
				this.submitMove(message.payload, ws);
				break;
			case 'CLICK_TOKEN':
				this.registerClick(message.payload, ws);
				break;
			case 'HEARTBEAT':
				this.registerHeartbeat(ws);
				break;
		}
	}

	// sends message to the client (for front-end visualisation only)
	sendClientMessage(message, ws) {
		try {
			//Needs to be in JSON format to send
			ws.send(JSON.stringify(message));
		} catch (err) {
			console.error('sendClientMessage() ERROR', err);
		}
	}

	newGame(playerId, ws) {
		// payload is the player 1 id
		const p1Id = playerId;
		// TODO: validate id - id should be less than 36 chars
		ws.id = p1Id;
		// kill any existing games for player (perhaps they refreshed the page in an ongoing game)
		this.gameManager.killGamesByPlayerId(p1Id);
		// create a new game
		this.gameManager.newGame({ p1Id, p1Ai: false, p1Ws: ws });
		console.log('New Game created with p1Id: ' + p1Id);
		// get the game we just created
		const game = this.gameManager.getGameByPlayerId(p1Id);
		if (game !== null) {
			// generate config to send to client (for front-end visualisation only)
			const config = this.gameManager.getClientConfigPayload(game, p1Id);
			this.sendClientMessage(new Message(config, 'CONFIG_TOKEN'), ws);
		}
		//console.log(game);
	}

	submitMove(payload, ws) {
		const [nodeIndex] = payload;
		this.gameManager.submitMove(nodeIndex, ws);
	}

	registerHeartbeat(ws) {
		this.gameManager.registerHeartbeat(ws);
	}

	registerClick(payload, ws) {
		try {
			// node ID and action (Left/Right click)
			const [nodeId, action] = payload;
			this.gameManager.registerClick(nodeId, action, ws);
		} catch (err) {
			console.error('registerClick() ERROR', err);
		}
	}

	// sends the updated game state to human players (for front-end visualisation only)
	updateClientsState(game) {
		game.players.forEach((player) => {
			// player is not AI and has a valid websocket connection
			if (!player.isAI && player.ws !== null) {
				const payload = this.gameManager.getClientUpdateStatePayload(
					game,
					player,
				);
				this.sendClientMessage(
					new Message(payload, 'UPDATE_STATE_TOKEN'),
					player.ws,
				);
			}
		});
	}

	// sends the game over results to human players (for front-end visualisation only)
	updateClientsGameOver(game) {
		game.players.forEach((player) => {
			// player is not AI and has a valid websocket connection
			if (!player.isAI && player.ws !== null) {
				const payload = this.gameManager.getClientGameOverPayload(
					game,
					player,
				);
				this.sendClientMessage(
					new Message(payload, 'GAME_END_TOKEN'),
					player.ws,
				);
			}
		});
	}
}

exports.GameServer = GameServer;
