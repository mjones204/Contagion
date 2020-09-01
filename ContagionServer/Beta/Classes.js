class Game {
	constructor({
		players = [],
		graph = null,
		round = 0,
		rounds = 10,
		playerMoves = [],
		playerScores = [],
		playerVoteShares = [],
	}) {
		this.players = players;
		this.graph = graph;
		this.round = round;
		this.rounds = rounds;
		this.playerMoves = playerMoves;
		this.playerScores = playerScores;
		this.playerVoteShares = playerVoteShares;
	}

	beginRound() {
		console.log('beginRound() - Round ' + this.round);

		// fix all tokens (can no longer be removed by player)
		this.graph.nodes.forEach((node) =>
			node.getTokens().forEach((token) => {
				token.setFixed(true);
			}),
		);

		// infections on all rounds except the 0th (game initialisation)
		if (this.round === 0) {
			this.initialisePlayerInfo();
		} else {
			this.performInfections();
			this.calculateVoteShares();
		}

		// increment round
		this.round++;

		// round limit reached
		if (this.round > this.rounds) {
			this.gameOver();
			return;
		}

		// give all players a token
		this.players.forEach((player) =>
			player.giveTokens(new Token({ owner: player, fixed: false })),
		);
	}

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
		} else {
			console.log(
				'playerMove() - Cannot make move - Player has no free tokens',
			);
		}
	}

	gameOver() {
		console.log('Game Over');
	}

	initialisePlayerInfo() {
		// init player moves
		this.players.forEach((player) => {
			this.playerMoves.push({ player, moves: [] });
		});

		// init vote shares
		this.players.forEach((player) => {
			this.playerVoteShares.push({ player, voteShares: [] });
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
}

class Player {
	constructor({ id = 0, color = 'green', freeTokens = [] }) {
		this.id = id;
		this.color = color;
		this.freeTokens = freeTokens;
	}

	giveTokens(...tokens) {
		this.freeTokens = [...this.freeTokens, ...tokens];
		// set owner of tokens to be player
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
}

class Graph {
	constructor({ nodes = [], edges = [] }) {
		this.nodes = [];
		this.edges = [];

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
