// import math functions
const { inv, multiply, sum } = require('mathjs');

class Equilibirum {
	constructor({ game, player }) {
		this.game = game;
		this.player = player;
	}

	getMove() {
		// first round
		if (this.game.round === 1) {
			// no opponent moves to base own move off of, so plays randomly
			return this.game.graph.getRandomNode().id;
		}

		// get friendly and enemy moves (friendly refers to the player running the Equilibrium AI)
		const friendlyMoves = this.game.getPlayerMoves(this.player);
		const enemyMoves = this.game.getPlayerMoves(
			this.game.getEnemyPlayer(this.player),
		);

		// initiallise vectors with zeroes
		const friendlyMovesVector = [];
		const enemyMovesVector = [];
		this.game.graph.nodes.forEach((n) => {
			friendlyMovesVector.push(0);
			enemyMovesVector.push(0);
		});

		// create laplacian from edges
		const laplacian = this.createLaplacian();

		// for each friendly move (token placement)
		friendlyMoves.forEach((move, index) => {
			const enemyMove = enemyMoves[index]; // complemental enemy move
			// update laplacian with probabilities
			laplacian[move][move]++; // adds Pa for the friendly player's token
			laplacian[enemyMove][enemyMove]++; // Pb for enemy player's token
			// update vectors
			friendlyMovesVector[move]++;
			enemyMovesVector[enemyMove]++;
		});

		let maxScore = 0;
		let bestNode = null;
		// loops through all nodes to find the node that will provide best improvement based on the equilibrium strategy
		this.game.graph.nodes.forEach((node, index) => {
			// creates vector of probabilities that each node will be owned by the friendly player
			const probabilitiesVector = this.createProbabilitiesVector(
				laplacian,
				friendlyMovesVector,
				index,
			);
			// sums these probabilities to get a fitness (i.e. maximise score)
			const selectionFitness = sum(probabilitiesVector);

			// records best node and its score
			if (selectionFitness > maxScore) {
				maxScore = selectionFitness;
				bestNode = node;
			}
		});
		// error
		if (bestNode === null) {
			console.log('ERROR: Equilibrium AI failed - bestNode is null');
			return 0;
		}
		// return node id as the move to play
		return bestNode.id;
	}

	createLaplacian() {
		const laplacian = [];
		this.game.graph.nodes.forEach((y) => {
			const arr = [];
			this.game.graph.nodes.forEach((x) => {
				arr.push(0);
			});
			laplacian.push(arr);
		});

		this.game.graph.edges.forEach((e) => {
			// adds to the degree matrix
			laplacian[e.start][e.start]++;
			laplacian[e.end][e.end]++;
			// subtracts the adjacency matrix
			laplacian[e.start][e.end]--;
			laplacian[e.end][e.start]--;
		});
		return laplacian;
	}

	createProbabilitiesVector(laplacian, friendlyMovesVector, i) {
		laplacian[i][i]++;
		friendlyMovesVector[i]++; // adds the token to test to the node. This affects both the laplacian and Pa (friendly moves)

		const invLaplacian = inv(laplacian); // inverts the matrix
		const probVector = multiply(friendlyMovesVector, invLaplacian); // multiplies Pa by the inverted laplacian

		laplacian[i][i]--;
		friendlyMovesVector[i]--; // reverts the change to this var to avoid an expensive clone operation
		return probVector;
	}
}

exports.Equilibirum = Equilibirum;
