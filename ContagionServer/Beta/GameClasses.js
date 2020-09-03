const uuidv4 = require('uuid/v4');
const Message = require('./Message');
const { AI, Strategies } = require('./AI');

class Game {
	constructor({
		id = uuidv4(),
		players = [],
		graph = null,
		round = 0,
		rounds = 10,
		playerMoves = [],
		playerScores = [],
		playerVoteShares = [],
		startTime = Date.now(),
		lastRoundScoreMultiplier = 5,
		autoRunAi = true,
		gameOver = false,
	}) {
		this.id = id;
		this.players = players;
		this.graph = graph;
		this.round = round;
		this.rounds = rounds;
		this.playerMoves = playerMoves;
		this.playerScores = playerScores;
		this.playerVoteShares = playerVoteShares;
		this.startTime = startTime;
		this.lastRoundScoreMultiplier = lastRoundScoreMultiplier;
		this.autoRunAi = autoRunAi;
		this.gameOver = gameOver;
	}

	// called at the start of every round - progresses the game by infecting nodes, updating scores, etc
	beginRound() {
		console.log('beginRound() - Round ' + this.round);

		// fix all tokens (can no longer be removed by player)
		this.graph.nodes.forEach((node) =>
			node.getTokens().forEach((token) => {
				token.setFixed(true);
			}),
		);

		// 0th round is for game initialisation
		if (this.round === 0) {
			this.initialisePlayerInfo();
		}
		// all subsequent rounds run game progression logic
		else {
			this.performInfections();
			this.calculateVoteShares();
			this.calculateScores();
			// front-end visualisation
			this.updateClientsState();
		}
		console.log('this.playerScores', this.playerScores);

		// increment round
		this.round++;

		// round limit reached
		if (this.round > this.rounds) {
			this.gameOver = true;
			// front-end visualisation
			this.updateClientsGameOver();
			return;
		}

		// give all players a token
		this.players.forEach((player) =>
			player.giveTokens(new Token({ owner: player, fixed: false })),
		);

		// immediately have AI's compute and submit their next move
		if (this.autoRunAi) {
			this.runAI();
		}
	}

	// get AI's to compute and submit their next move
	runAI() {
		this.players.forEach((player) => {
			// if the player is an AI and has free tokens
			if (player.isAI && player.hasRemainingTokens()) {
				const ai = new AI({
					game: this,
					strategy: player.aiStrategy,
					player,
				});
				// play the move as suggested by the AI
				this.playerMove(player, ai.move({}));
			}
		});
	}

	// submit a move for a player (human or AI)
	playerMove(player, node) {
		// get id from input (valid input types - nodeId or node obj)
		let id = node;
		if (node instanceof Node) {
			id = node.id;
		}

		// if player has token then place it on the node
		if (player.hasRemainingTokens()) {
			player.placeToken(this.graph.getNode(id));
			// push move to the playerMoves array
			this.playerMoves.forEach((playerMovesObj) => {
				if (playerMovesObj.player.id === player.id) {
					playerMovesObj.moves.push(id);
				}
			});
			console.log(`Player ${player.id} placed a token on node ${id}`);

			// if all players have submitted a move
			if (this.allPlayersSubmittedMove()) {
				// progress to next round
				this.beginRound();
			}
		} else {
			console.log(
				'playerMove() - Cannot make move - Player has no free tokens',
			);
		}
	}

	allPlayersSubmittedMove() {
		return (
			this.players.filter((player) => player.hasRemainingTokens())
				.length === 0
		);
	}

	// sends a message to a human client (for front-end visualisation only)
	sendClientMessage(message, ws) {
		try {
			//Needs to be in JSON format to send
			ws.send(JSON.stringify(message));
		} catch (err) {
			console.error('sendClientMessage() ERROR', err);
		}
	}

	// sends the updated game state to human players (for front-end visualisation only)
	// ideally this logic shouldn't be in the game class
	updateClientsState() {
		this.players.forEach((player) => {
			// player is not AI and has a valid websocket connection
			if (!player.isAI && player.ws !== null) {
				const payload = this.getUpdateStatePayload(player);
				this.sendClientMessage(
					new Message(payload, 'UPDATE_STATE_TOKEN'),
					player.ws,
				);
			}
		});
	}

	// sends the game over results to human players (for front-end visualisation only)
	// ideally this logic shouldn't be in the game class
	updateClientsGameOver() {
		this.players.forEach((player) => {
			// player is not AI and has a valid websocket connection
			if (!player.isAI && player.ws !== null) {
				const payload = this.getGameOverPayload(player);
				this.sendClientMessage(
					new Message(payload, 'GAME_END_TOKEN'),
					player.ws,
				);
			}
		});
	}

	// payload is in legacy format for clients
	getUpdateStatePayload(player) {
		const peepsToSend = this.graph.nodes.map((node) =>
			node.getControlledState(player),
		);
		const movesToSend = this.getPlayerMoves(this.getEnemyPlayer(player));
		const playerScore = this.getPlayerScore(player);
		const friendlyControlledNodes = this.getNodesControlledByPlayer(
			player,
		).map((node) => node.id);
		const enemyControlledNodes = this.getNodesControlledByEnemies(
			player,
		).map((node) => node.id);
		return [
			peepsToSend,
			movesToSend,
			playerScore,
			friendlyControlledNodes,
			enemyControlledNodes,
		];
	}

	// payload is in legacy format for clients
	getGameOverPayload(player) {
		let result = ''; // win, lose, draw, disconnect, time
		const winningPlayers = this.getWinningPlayersByScore();
		if (winningPlayers.some((p) => p.id === player.id)) {
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

		const playerScoreList = this.getPlayerScores(player);
		const enemyScoreList = this.getPlayerScores(
			this.getEnemyPlayer(player),
		);
		const gameId = this.id;
		const playerNo = 1; // always 1 because p2 is AI (this might need adjusting if spec changes)
		return [result, playerScoreList, enemyScoreList, gameId, playerNo];
	}

	initialisePlayerInfo() {
		// init player moves
		this.players.forEach((player) => {
			this.playerMoves.push({ player, moves: [] });
		});

		// init player scores
		this.players.forEach((player) => {
			this.playerScores.push({ player, scores: [] });
		});

		// init player vote shares
		this.players.forEach((player) => {
			this.playerVoteShares.push({ player, voteShares: [] });
		});
	}

	calculateScores() {
		// for each player
		this.players.forEach((player) => {
			// score is determined by how many nodes the player controls
			const controlledNodes = this.getNodesControlledByPlayer(player)
				.length;
			// 10 points for each node
			let additionalScore = controlledNodes * 10;
			// applies multiplier bonus for the final round
			if (this.round === this.rounds) {
				additionalScore *= this.lastRoundScoreMultiplier;
			}
			const currentScore = this.getPlayerScore(player);
			const newScore = currentScore + additionalScore;
			// push new score to the player info array
			this.playerScores.forEach((playerScore) => {
				if (playerScore.player.id === player.id) {
					playerScore.scores.push(newScore);
				}
			});
		});
	}

	calculateVoteShares() {
		const totalControlledNodes = this.graph.nodes.filter((node) =>
			node.isControlled(),
		).length;
		// for each player
		this.players.forEach((player) => {
			// vote share is ratio of nodes player controls vs total controlled nodes
			const controlledNodes = this.getNodesControlledByPlayer(player)
				.length;
			const voteShare = controlledNodes / totalControlledNodes;
			// push vote share to the player info array
			this.playerVoteShares.forEach((playerVoteShare) => {
				if (playerVoteShare.player.id === player.id) {
					playerVoteShare.voteShares.push(voteShare);
				}
			});
		});
	}

	getFriendlyInfluencesForNode(node, player) {
		// variable to count the number of sources of influence for the given player
		let influenceCount = 0;

		// player owned tokens placed on the node contribute to the count
		const playerTokens = node.getFixedTokens(player);
		influenceCount += playerTokens.length;

		// neighbouring controlled (non-neutral) nodes contribute to the count
		const neighbours = this.graph.getNeighbourNodes(node);
		neighbours.forEach((neighbour) => {
			// player controls node
			if (neighbour.controllingPlayer === player) {
				influenceCount++;
			}
		});
		return influenceCount;
	}

	getTotalInfluencesForNode(node) {
		let totalInfluences = 0;
		// sums all sources of influence from all players for the given node
		this.players.forEach((player) => {
			const influences = this.getFriendlyInfluencesForNode(node, player);
			totalInfluences += influences;
		});
		return totalInfluences;
	}

	performInfections() {
		console.log('performInfections() - Round ' + this.round);
		// contains the influence count for every player for every node
		const nodeInfluences = [];
		// for every node, infection probability depends on sources of influence (controlled neighbours and tokens)
		this.graph.nodes.forEach((node) => {
			const nodeInfluencesObj = {
				node,
				influences: [],
				totalInfluences: 0,
			};
			// for all players
			this.players.forEach((player) => {
				// number of sources of influence for the given player for the given node
				const influenceCount = this.getFriendlyInfluencesForNode(
					node,
					player,
				);

				// update counts
				nodeInfluencesObj.influences.push({ player, influenceCount });
				nodeInfluencesObj.totalInfluences += influenceCount;
			});
			nodeInfluences.push(nodeInfluencesObj);
		});

		// perform infections
		nodeInfluences.forEach((nodeInfluence) => {
			// node has at least one source of influence
			if (nodeInfluence.totalInfluences > 0) {
				// new random number between 0 and 1
				const random = Math.random();
				let cumulativeRatio = 0;
				// for each player
				for (let i = 0; i < nodeInfluence.influences.length; i++) {
					const influence = nodeInfluence.influences[i];
					// ratio based on the share of influences the player has compared to the total
					const playerRatio =
						influence.influenceCount /
						nodeInfluence.totalInfluences;
					cumulativeRatio += playerRatio;
					if (cumulativeRatio >= random) {
						nodeInfluence.node.setControllingPlayer(
							influence.player,
						);
						break;
					}
				}
			}
		});
	}

	getNodesControlledByPlayer(player) {
		return this.graph.nodes.filter((node) => {
			if (node.isControlled()) {
				return node.controllingPlayer.id === player.id;
			}
			return false;
		});
	}

	getNodesControlledByEnemies(friendlyPlayer) {
		return this.graph.nodes.filter((node) => {
			if (node.isControlled()) {
				return node.controllingPlayer.id !== friendlyPlayer.id;
			}
			return false;
		});
	}

	// will need some adjusting if we decide to use more than 2 players per game
	getEnemyPlayer(friendlyPlayer) {
		return this.players.filter(
			(player) => player.id !== friendlyPlayer.id,
		)[0];
	}

	getPlayerMoves(player) {
		return this.playerMoves.filter(
			(playerMovesObj) => playerMovesObj.player.id === player.id,
		)[0].moves;
	}

	getPlayerScores(player) {
		return this.playerScores.filter(
			(playerScoresObj) => playerScoresObj.player.id === player.id,
		)[0].scores;
	}

	getPlayerScore(player) {
		const scores = this.getPlayerScores(player);
		const lastScore = scores[scores.length - 1];
		if (lastScore === undefined) {
			return 0;
		} else {
			return lastScore;
		}
	}

	getPlayerVoteshares(player) {
		return this.playerVoteShares.filter(
			(playerVoteShareObj) => playerVoteShareObj.player.id === player.id,
		)[0].voteShares;
	}

	getPlayerVoteShare(player) {
		const voteShares = this.getPlayerVoteshares(player);
		const lastVoteShare = voteShares[voteShares.length - 1];
		if (lastVoteShare === undefined) {
			return 0;
		} else {
			return lastVoteShare;
		}
	}

	getPlayerById(playerId) {
		return this.players.filter((player) => player.id === playerId)[0];
	}

	getWinningPlayersByScore() {
		let winningPlayers = [];
		let highestScore = -1;
		this.players.forEach((player) => {
			const playerScore = this.getPlayerScore(player);
			// new winning player
			if (playerScore > highestScore) {
				winningPlayers = [player];
				highestScore = playerScore;
			}
			// draw
			else if (playerScore === highestScore) {
				winningPlayers.push(player);
			}
		});
		return winningPlayers;
	}

	getWinningPlayersByVoteShare() {
		let winningPlayers = [];
		let highestVoteShare = -1;
		this.players.forEach((player) => {
			const playerVoteShare = this.getPlayerVoteShare(player);
			// new winning player
			if (playerVoteShare > highestVoteShare) {
				winningPlayers = [player];
				highestVoteShare = playerVoteShare;
			}
			// draw
			else if (playerVoteShare === highestVoteShare) {
				winningPlayers.push(player);
			}
		});
		return winningPlayers;
	}
}

class Player {
	constructor({
		id = 0,
		color = 'green',
		freeTokens = [],
		layoutId = 0,
		ws = null,
		isAI = true,
		aiStrategy = Strategies.Random,
	}) {
		this.id = id;
		this.color = color;
		this.freeTokens = freeTokens;
		this.isAI = isAI;
		// AI
		if (this.isAI) {
			this.aiStrategy = aiStrategy;
		}
		// human player
		else {
			this.layoutId = layoutId;
			this.ws = ws;
			this.heartbeat = Date.now();
		}
	}

	giveTokens(...tokens) {
		this.freeTokens = [...this.freeTokens, ...tokens];
		// set owner of tokens to be this player
		this.freeTokens.forEach((token) => token.setOwner(this));
	}

	placeToken(node) {
		if (this.freeTokens.length > 0) {
			const token = this.freeTokens.pop();
			node.addToken(token);
		} else {
			console.log(
				'Error: placeToken - player does not have any free tokens',
			);
		}
	}

	hasRemainingTokens() {
		return this.freeTokens.length > 0;
	}

	setHeartbeat(time) {
		this.heartbeat = time;
	}
}

class Graph {
	constructor({ nodes = [], edges = [], id = 1 }) {
		this.nodes = [];
		this.edges = [];
		this.id = id; // topology id

		nodes.forEach((node) => {
			// node is a Node instance
			if (node instanceof Node) {
				// add node
				this.addNode(node);
			}
			// node is an id
			else {
				// create new Node instance from id and add node
				this.addNode(new Node({ id: node }));
			}
		});

		edges.forEach((edge) => {
			// edge is an Edge instance
			if (edge instanceof Edge) {
				// add edge
				this.addEdge(edge);
			}
			// edge is in an [id, id] format
			else {
				// create new Edge instance from ids and add edge
				const [start, end] = edge;
				this.addEdge(new Edge({ start, end }));
			}
		});
	}

	addNode(node) {
		// add node if id is unique
		if (this.getNode(node.id) === -1) {
			this.nodes.push(node);
		} else {
			console.log('Error: addNode - node with id already exists');
		}
	}

	addEdge(edge) {
		// edges must be between 2 distinct nodes
		if (edge.start === edge.end) {
			console.log('Error: addEdge - edge cannot link to itself');
		}

		// add edge if edge does not already exist
		if (this.getEdge(edge.start, edge.end) === -1) {
			this.edges.push(edge);
		} else {
			console.log('Error: addEdge - edge already exists');
		}
	}

	getNode(id) {
		let n = -1;
		this.nodes.forEach((node) => {
			if (node.id === id) {
				n = node;
			}
		});
		return n;
	}

	getEdge(nodeId1, nodeId2) {
		let e = -1;
		this.edges.forEach((edge) => {
			if (
				(edge.start === nodeId1 && edge.end === nodeId2) ||
				(edge.start === nodeId2 && edge.end === nodeId1)
			) {
				e = edge;
			}
		});
		return e;
	}

	getNeighbourNodes(node) {
		// get id from input (valid input types - nodeId or node obj)
		let id = node;
		if (node instanceof Node) {
			id = node.id;
		}
		const neighbours = [];
		this.edges.forEach((edge) => {
			if (edge.start === id) {
				neighbours.push(this.getNode(edge.end));
			} else if (edge.end === id) {
				neighbours.push(this.getNode(edge.start));
			}
		});
		return neighbours;
	}

	getDegree(node) {
		return getNeighbourNodes(node).length;
	}

	getHighestDegreeNode() {
		let highestDegree = -1;
		let highestDegreeNode = [];
		this.nodes.forEach((node) => {
			const nodeDegree = this.getDegree(node);
			if (nodeDegree === highestDegree) {
				highestDegreeNode.push(node);
			} else if (nodeDegree > highestDegree) {
				highestDegree = nodeDegree;
				highestDegreeNode = [node];
			}
		});
		// if multiple nodes with highest degree, select node at random
		return highestDegreeNode[
			Math.floor(Math.random() * highestDegreeNode.length)
		];
	}

	getRandomNode() {
		//Selects random node from the list of nodes.
		const nodeIndex = Math.floor(Math.random() * this.nodes.length);
		return this.getNode(nodeIndex);
	}
}

class Node {
	constructor({ id = 0, controllingPlayer = null, tokens = [] }) {
		this.id = id;
		this.controllingPlayer = controllingPlayer;
		this.tokens = tokens;
	}

	addToken(token) {
		this.tokens.push(token);
	}

	getTokens(tokenOwner) {
		return this.tokens.filter((token) => {
			// filtering by tokenOwner
			if (tokenOwner) {
				return tokenOwner.id === token.owner.id ? true : false;
			} else {
				return true;
			}
		});
	}

	getFixedTokens(tokenOwner) {
		return this.getTokens(tokenOwner).filter((token) => {
			return token.isFixed();
		});
	}

	setControllingPlayer(player) {
		this.controllingPlayer = player;
	}

	isControlled() {
		return this.controllingPlayer !== null;
	}

	isControlledByPlayer(player) {
		if (!this.isControlled()) {
			return false;
		}
		return player.id === this.controllingPlayer.id;
	}

	// used by legacy front-end code
	getControlledState(friendlyPlayer) {
		if (!this.isControlled()) {
			// node is neutral
			return -1;
		} else if (this.isControlledByPlayer(friendlyPlayer)) {
			// node is controlled by the given player (friendly node)
			return 1;
		} else {
			// node is controlled by enemy
			return 0;
		}
	}
}

class Edge {
	constructor({ start = 0, end = 1 }) {
		this.start = start;
		this.end = end;
	}
}

class Token {
	constructor({ owner = new Player({}), fixed = false }) {
		this.owner = owner;
		this.fixed = fixed;
	}

	setOwner(player) {
		this.owner = player;
	}

	setFixed(fixed) {
		this.fixed = fixed;
	}

	isFixed() {
		return this.fixed;
	}
}

exports.Game = Game;
exports.Player = Player;
exports.Graph = Graph;
exports.Node = Node;
exports.Edge = Edge;
exports.Token = Token;
