class MCGame {
	/*
		nodeStates array:
		Each element is a node
	*/
	constructor() {}

	// from full game (GameClasses)
	setStateFromGame(game, player) {
		const enemy = game.getEnemyPlayer(player);
		// friendly player is always p1
		this.state = {
			p1Moves: game.getPlayerMoves(player),
			p2Moves: game.getPlayerMoves(enemy),
			p1VoteShares: game.getPlayerVoteshares(player),
			nodeStates: this.createNodeStatesFromGame(game, player),
			nodeNeighbours: this.createNodeNeighboursArray(game),
			round: game.round,
			rounds: game.rounds,
			gameOver: game.gameOver,
			winner: -1,
		};
		// since we may be 2nd to act, the enemy (p2) may have already submitted a move
		// we aren't supposed to know this move yet so we can remove it
		if (this.state.p1Moves.length < this.state.p2Moves.length) {
			this.state.p2Moves.pop();
		}
	}

	createNodeStatesFromGame(game, player) {
		const nodeStates = game.graph.nodes.map((node) => {
			// each node is represented by control probability of the friendly player
			// in the first conversion from the game the probabilities of control are binary (we either control the node or not)
			if (node.isControlledByPlayer(player)) {
				// we control node, probability of control is 1
				return 1;
			}
			// we don't control node, proability of control is 0
			return 0;
		});
		return nodeStates;
	}

	createNodeNeighboursArray(game) {
		// array of array containing indexes of neighbouring nodes
		const nodeNeighbours = game.graph.nodes.map((node) => {
			const neighbours = game.graph.getNeighbourNodes(node);
			return neighbours.map((neighbour) => neighbour.id);
		});
		return nodeNeighbours;
	}

	getState() {
		return this.state;
	}
	setState(state) {
		this.state = state;
	}

	// returns a deep copy of the game state
	cloneState() {
		return {
			p1Moves: this.state.p1Moves.slice(0),
			p2Moves: this.state.p2Moves.slice(0),
			p1VoteShares: this.state.p1VoteShares.slice(0),
			nodeStates: this.state.nodeStates.slice(0),
			nodeNeighbours: JSON.parse(
				JSON.stringify(this.state.nodeNeighbours),
			),
			round: this.state.round,
			rounds: this.state.rounds,
			gameOver: this.state.gameOver,
			winner: this.state.winner,
		};
	}

	updateNodeStates() {
		const updatedStates = [];
		// friendlyInfluences / totalInfluences
		this.state.nodeStates.forEach((n, i) => {
			let friendlyInfluenceProbSum = 0;
			const neighbours = this.state.nodeNeighbours[i];
			neighbours.forEach((neighbour) => {
				// friendly control probability for the neighbouring nodes
				friendlyInfluenceProbSum += this.state.nodeStates[neighbour];
			});

			// consider tokens on the node
			const friendlyTokens = this.getP1TokensOnNode(i);
			const enemyTokens = this.getP2TokensOnNode(i);

			// add token probabilities to friendly control probability sum for node
			// each token is a source of influence with 100% friendly control (so 1 probability)
			friendlyInfluenceProbSum += friendlyTokens * 1;
			let totalInfluences =
				neighbours.length + friendlyTokens + enemyTokens;
			let controlProbability = 0;
			if (totalInfluences > 0) {
				controlProbability = friendlyInfluenceProbSum / totalInfluences;
			}
			// new node state
			updatedStates.push(controlProbability);
		});
		this.state.nodeStates = updatedStates;
	}

	getP1TokensOnNode(node) {
		return this.state.p1Moves.filter((move) => move === node).length;
	}

	getP2TokensOnNode(node) {
		return this.state.p2Moves.filter((move) => move === node).length;
	}

	calculateVoteShare() {
		// vote share (for p1) is the average node state over all nodes
		let sumNodeStates = 0;
		this.state.nodeStates.forEach(
			(nodeState) => (sumNodeStates += nodeState),
		);
		// push vote share to list
		this.state.p1VoteShares.push(
			sumNodeStates / this.state.nodeStates.length,
		);
	}

	getP1VoteShare() {
		let [lastVoteShare] = this.state.p1VoteShares.slice(-1);
		if (!lastVoteShare) {
			lastVoteShare = 0;
		}
		return lastVoteShare;
	}

	getP1VoteShareAverage() {
		let sum = 0;
		this.state.p1VoteShares.forEach((vs) => (sum += vs));
		return sum / this.state.p1VoteShares.length;
	}

	// returns list of valid moves given current game state
	moves() {
		const moves = [];
		this.state.nodeStates.forEach((node, index) => moves.push(index));
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
			// update node states
			this.updateNodeStates();
			this.calculateVoteShare();

			this.state.round++;
			// round limit reached - game ending
			if (this.state.round > this.state.rounds) {
				this.state.gameOver = true;
				// winner based on vote share
				// player 1 wins
				if (this.getP1VoteShareAverage() > 0.5) {
					this.state.winner = 1;
				}
				// player 2 wins
				else if (this.getP1VoteShareAverage() < 0.5) {
					this.state.winner = 2;
				}
				// draw
				else {
					this.state.winner = -1;
				}
			}
		}
	}

	gameOver() {
		return this.state.gameOver;
	}

	winner() {
		//will return -1 if draw
		return this.state.winner;
	}
}

class MCTSNode {
	constructor(moves, parent) {
		this.parent = parent;
		this.visits = 0;
		this.wins = 0;
		this.score = 0;
		this.numUnexpandedMoves = moves.length;
		this.children = new Array(this.numUnexpandedMoves).fill(null); //temporary store move for debugging purposes
	}
}

class MCTS {
	constructor(game, player, iterations = 500, exploration = 1.41) {
		this.game = game;
		this.player = player;
		this.iterations = iterations;
		this.exploration = exploration;
	}

	selectMove() {
		const originalState = this.game.getState();
		const possibleMoves = this.game.moves();
		const root = new MCTSNode(possibleMoves, null);

		for (let i = 0; i < this.iterations; i++) {
			this.game.setState(originalState);
			const clonedState = this.game.cloneState();
			this.game.setState(clonedState);

			let selectedNode = this.selectNode(root);
			let expandedNode = this.expandNode(selectedNode);
			const winner = this.playout(expandedNode);

			let reward;
			// draw
			if (winner == -1) {
				reward = 0;
			}
			// win
			else if (winner == 1) {
				reward = 1;
			}
			// lost
			else {
				reward = -1;
			}
			const score = this.game.getP1VoteShare();
			this.backprop(expandedNode, reward, score);
		}

		// for introspective stats
		let sortedMoves = [];
		//choose move with most wins
		let maxWins = -Infinity;
		let maxIndex = -1;
		let maxAvgScore = -Infinity;
		for (let i in root.children) {
			const child = root.children[i];
			if (child == null) {
				continue;
			}
			const avgScore = child.score / child.visits;

			// node with the most end-state wins gets prioritised
			if (child.wins > maxWins) {
				maxWins = child.wins;
				maxIndex = i;
				maxAvgScore = avgScore;
			}
			// decider of which node to pick is the average score (vote share)
			else if (child.wins == maxWins) {
				// node has higher score than current best so pick it
				if (avgScore > maxAvgScore) {
					maxIndex = i;
					maxAvgScore = avgScore;
				}
			}

			sortedMoves.push({
				move: possibleMoves[i],
				wins: child.wins,
				avg_score: avgScore,
			});
		}
		sortedMoves.sort((a, b) => {
			if (a.wins < b.wins) {
				return -1;
			}
			if (a.wins > b.wins) {
				return 1;
			}
			// a wins equal to b wins
			// decide by score (vote share)
			if (a.avg_score < b.avg_score) {
				return -1;
			}
			if (a.avg_score > b.avg_score) {
				return 1;
			}
			return 0;
		});
		//console.log("Sorted Moves:");
		//console.log(sortedMoves);

		this.game.setState(originalState);
		return possibleMoves[maxIndex];
	}
	selectNode(root) {
		const c = this.exploration;

		while (root.numUnexpandedMoves == 0) {
			let maxUBC = -Infinity;
			let maxIndex = -1;
			let Ni = root.visits;
			for (let i in root.children) {
				const child = root.children[i];
				const ni = child.visits;
				const wi = child.wins;
				const ubc = this.computeUCB(wi, ni, c, Ni);
				if (ubc > maxUBC) {
					maxUBC = ubc;
					maxIndex = i;
				}
			}
			const moves = this.game.moves();
			this.game.playMove(moves[maxIndex]);

			root = root.children[maxIndex];
			if (this.game.gameOver()) {
				return root;
			}
		}
		return root;
	}

	expandNode(node) {
		if (this.game.gameOver()) {
			return node;
		}
		let moves = this.game.moves();
		const childIndex = this.selectRandomUnexpandedChild(node);
		this.game.playMove(moves[childIndex]);

		moves = this.game.moves();
		const newNode = new MCTSNode(moves, node);
		node.children[childIndex] = newNode;
		node.numUnexpandedMoves -= 1;

		return newNode;
	}

	playout(node) {
		while (!this.game.gameOver()) {
			const moves = this.game.moves();
			const randomChoice = Math.floor(Math.random() * moves.length);
			this.game.playMove(moves[randomChoice]);
		}
		return this.game.winner();
	}
	backprop(node, reward, score) {
		while (node != null) {
			node.visits += 1;
			node.wins += reward;
			node.score += score;
			node = node.parent;
		}
	}

	// returns index of a random unexpanded child of node
	selectRandomUnexpandedChild(node) {
		const choice = Math.floor(Math.random() * node.numUnexpandedMoves); //expand random nth unexpanded node
		let count = -1;
		for (let i in node.children) {
			const child = node.children[i];
			if (child == null) {
				count += 1;
			}
			if (count == choice) {
				return i;
			}
		}
	}

	computeUCB(wi, ni, c, Ni) {
		return wi / ni + c * Math.sqrt(Math.log(Ni) / ni);
	}
}

class MonteCarloTreeSearch {
	constructor({ game, player, iterations = 5000 }) {
		this.game = game;
		this.player = player;
		this.iterations = iterations;
	}

	getMove() {
		// convert game into reduced format so monte carlo can run more efficiently
		const mcGame = new MCGame();
		mcGame.setStateFromGame(this.game, this.player);
		const player = new MCTS(mcGame, 1, this.iterations);
		const move = player.selectMove();
		return move;
	}
}

exports.MonteCarloTreeSearch = MonteCarloTreeSearch;
