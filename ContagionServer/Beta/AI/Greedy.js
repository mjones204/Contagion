const GreedyAnticipation = {
	None: 'None',
	High: 'High',
	Greedy: 'Greedy',
};

class Greedy {
	constructor({ game, player, anticipation = GreedyAnticipation.None }) {
		this.game = game;
		this.player = player;
		this.anticipation = anticipation;
	}

	getMove() {
		let enemyAnticipationNode = null;

		// enemy move anticipation
		if (this.anticipation === GreedyAnticipation.High) {
			// anticipating enemy to pick high degree nodes
			// create a new high degree AI to pick the node
			const { DegreeSensitive } = require('./DegreeSensitive');
			const degreeSensitive = new DegreeSensitive({
				game: this.game,
				lowDegree: false,
			});
			enemyAnticipationNode = this.game.graph.getNode(
				degreeSensitive.getMove(),
			);
		} else if (this.anticipation === GreedyAnticipation.Greedy) {
			// anticipating enemy to play a greedy strategy
			// create a new Greedy AI with the enemy as the player
			const enemyGreedy = new Greedy({
				game: this.game,
				player: this.game.getEnemyPlayer(this.player),
				anticipation: GreedyAnticipation.None,
			});
			enemyAnticipationNode = enemyGreedy.greedyNodeSelection(null);
		}
		// return id of the selected node (this is the move the AI plays)
		return this.greedyNodeSelection(enemyAnticipationNode).id;
	}

	greedyNodeSelection(enemyAnticipationNode) {
		const nodeControlProbabilities = [];
		// for each node we add a temporary token (source of influence)
		this.game.graph.nodes.forEach((tokenNode) => {
			const controlProbabilities = [];
			// for every node calculate the probability that we control it next round
			this.game.graph.nodes.forEach((node) => {
				let friendlyInfluences = this.game.getFriendlyInfluencesForNode(
					node,
					this.player,
				);
				let totalInfluences = this.game.getTotalInfluencesForNode(node);

				// we are adding a temporary token to this node so increment the sources of influence
				if (node === tokenNode) {
					friendlyInfluences++;
					totalInfluences++;
				}

				// anticipating that the enemy has placed a token on this node - increment influence total
				if (
					enemyAnticipationNode !== null &&
					enemyAnticipationNode.id === node.id
				) {
					totalInfluences++;
				}

				let controlProbability = 0;
				if (totalInfluences > 0) {
					controlProbability = friendlyInfluences / totalInfluences;
				}
				controlProbabilities.push(controlProbability);
			});
			nodeControlProbabilities.push({
				node: tokenNode,
				controlProbabilities,
			});
		});

		const bestNode = this.getNodeWithHighestControlProbabilities(
			nodeControlProbabilities,
			enemyAnticipationNode,
		);
		return bestNode;
	}

	shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * i);
			const temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
		return array;
	}

	getLookaheadProbabilities(
		controlProbabilities,
		tokenNode,
		enemyAnticipationNode,
	) {
		const lookaheadProbabilities = [];
		this.game.graph.nodes.forEach((node) => {
			const neighbourNodes = this.game.graph.getNeighbourNodes(node); // all neighbours nodes (includes neutral nodes)
			let friendlyInfluenceProbSum = 0;
			neighbourNodes.forEach((neighbour) => {
				// friendly control probability for the neighbouring nodes
				const contProb = controlProbabilities[neighbour.id];
				friendlyInfluenceProbSum += contProb;
			});

			// consider tokens on the node
			let friendlyTokens = node.getFixedTokens(this.player).length;
			let enemyTokens = node.getFixedTokens(
				this.game.getEnemyPlayer(this.player),
			).length;

			// we have added a temporary token to this node
			if (node === tokenNode) {
				friendlyTokens++;
			}
			// anticipating that the enemy has placed a token on this node
			if (
				enemyAnticipationNode !== null &&
				enemyAnticipationNode.id === node.id
			) {
				enemyTokens++;
			}

			// add token probabilities to friendly control probability sum for node
			// each token is a source of influence with 100% friendly control (so 1 probability)
			friendlyInfluenceProbSum += friendlyTokens * 1;

			let totalInfluences =
				neighbourNodes.length + friendlyTokens + enemyTokens;
			let controlProbability = 0;
			if (totalInfluences > 0) {
				controlProbability = friendlyInfluenceProbSum / totalInfluences;
			}
			lookaheadProbabilities.push(controlProbability);
		});
		return lookaheadProbabilities;
	}

	getNodeWithHighestControlProbabilities(
		nodeControlProbabilities,
		enemyAnticipationNode,
	) {
		// shuffle order so that tied nodes are picked at random
		nodeControlProbabilities = this.shuffleArray(nodeControlProbabilities);

		let highestAvg = -1;
		let bestNode = null;
		let lookaheadRounds = this.game.rounds; // lookahead to the end of the game
		nodeControlProbabilities.forEach(({ node, controlProbabilities }) => {
			// at the start we already have control probabilities for the next round (current round + 1)
			let projectedRound = this.game.round + 1;
			// lookahead by lookaheadRounds or until the end of the game (whichever comes sooner) (we play the 10th round)
			// note, the following code wont run unless lookaheadRounds >= 2
			while (
				projectedRound < this.game.round + lookaheadRounds &&
				projectedRound < this.game.rounds + 1
			) {
				// for each node (the node which the token was placed), assign the calculated control probabilities to each node in the network
				const lookaheadProbabilities = this.getLookaheadProbabilities(
					controlProbabilities,
					node,
					enemyAnticipationNode,
				);
				// set the controlProbabilities to the lookahead probabilities
				controlProbabilities = lookaheadProbabilities;
				// next round
				projectedRound++;
			}

			let probabilitySum = 0;
			controlProbabilities.forEach((probability) => {
				probabilitySum += probability;
			});
			const avg = probabilitySum / controlProbabilities.length;
			if (avg > highestAvg) {
				highestAvg = avg;
				bestNode = node;
			}
		});
		return bestNode;
	}
}

exports.Greedy = Greedy;
exports.GreedyAnticipation = GreedyAnticipation;
