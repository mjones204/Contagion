const WebSocketServer = require('ws').Server;
const uuidv4 = require('uuid/v4');
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Database } = require('./Database');
const { GameManager } = require('./GameManager');
const { MTurkManager } = require('./MTurkManager');
const Message = require('./Message');

class GameServer {
	constructor(port = 5001) {
		const database = new Database();
		this.gameManager = new GameManager({ server: this, database });
		this.mturkManager = new MTurkManager({ server: this, database });
		this.startServer(port);
		this.games = [];
	}

	startServer(port) {
		// ssl cert paths
		const certPath = path.join(__dirname, '.', 'SSL', 'server.crt');
		const keyPath = path.join(__dirname, '.', 'SSL', 'server.key');
		// web socket server
		const app = express();
		const webSocketServer = https.createServer(
			{
				cert: fs.readFileSync(certPath),
				key: fs.readFileSync(keyPath),
			},
			app,
		);
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
			case 'GET_MTURK_INFO':
				this.sendMTurkInfo(message.payload, ws);
				break;
			case 'NEW_COMPLETION_CODE':
				this.sendMTurkCompletionCode(message.payload, ws);
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
		const player = game.getPlayerById(p1Id);
		if (game !== null) {
			// generate config to send to client (for front-end visualisation only)
			const config = this.gameManager.getClientConfigPayload(
				game,
				player,
			);
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

	// gets mturk reward based on results of all games played by the player
	async sendMTurkInfo(payload, ws) {
		const playerId = payload.username;
		const lastGameID = payload.last_game_id;
		const mturkInfo = await this.mturkManager.getMTurkInfoForPlayer(
			playerId,
			lastGameID,
		);
		this.sendClientMessage(new Message(mturkInfo, 'MTURK_INFO'), ws);
	}

	// gets a completion code from the database and return to client
	async sendMTurkCompletionCode(payload, ws) {
		const playerId = payload.toString();
		const completionCode = await this.mturkManager.getCompletionCodeForPlayer(
			playerId,
		);
		if (completionCode) {
			this.sendClientMessage(
				new Message(completionCode, 'COMPLETION_CODE'),
				ws,
			);
		} else {
			this.sendClientMessage(
				new Message('', 'COMPLETION_CODE_ERROR'),
				ws,
			);
			console.log(
				`Error getting completion code for player: ${playerId}`,
			);
		}
	}
}

exports.GameServer = GameServer;
