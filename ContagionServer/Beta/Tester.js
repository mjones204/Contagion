const { Game, Player, Graph, Node, Edge, Token } = require('./GameClasses');
const { AI, Strategies } = require('./AI');
const { TestManager } = require('./TestManager');

const network = {
	nodes: [0, 1, 2, 3, 4],
	edges: [
		[0, 1],
		[0, 4],
		[1, 3],
		[1, 2],
	],
};

const start = () => {
	const testManager = new TestManager();
	testManager.runMultipleGameTest(
		Strategies.Random,
		Strategies.GreedyPredictsHigh,
		10000,
	);
};

start();
