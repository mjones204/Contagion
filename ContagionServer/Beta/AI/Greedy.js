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

	aiSimpleGreedy(lookahead = 1) {
		let enemyAnticipationNode = null;

		// enemy move anticipation
		if (this.anticipation === GreedyAnticipation.High) {
			// anticipating enemy to pick high degree nodes
			enemyAnticipationNode = this.game.graph.getHighestDegreeNode();
		} else if (this.anticipation === GreedyAnticipation.Greedy) {
			// anticipating enemy to play a greedy strategy
			// create a new Greedy AI with the enemy as the player
			const enemyGreedy = new Greedy({
				game: this.game,
				player: this.game.getEnemyPlayer(this.player),
				anticipation: GreedyAnticipation.None,
			});
			enemyAnticipationNode = enemyGreedy.greedyNodeSelection(
				null,
				lookahead,
			);
		}
		return this.greedyNodeSelection(enemyAnticipationNode, lookahead).id;
	}

	greedyNodeSelection(enemyAnticipationNode, lookahead) {
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
			lookahead,
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

	getNodeWithHighestControlProbabilities(
		nodeControlProbabilities,
		lookahead = 1,
	) {
		// shuffle order so that tied nodes are picked at random
		nodeControlProbabilities = this.shuffleArray(nodeControlProbabilities);

		let highestAvg = -1;
		let bestNode = null;
		nodeControlProbabilities.forEach(({ node, controlProbabilities }) => {
			let probabilitySum = 0;
			controlProbabilities.forEach((probability) => {
				// e.g. a round lookahead of 2 squares the probability
				probabilitySum += Math.pow(probability, lookahead);
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
