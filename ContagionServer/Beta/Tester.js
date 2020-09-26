const { TestManager } = require('./TestManager');
const { Strategies } = require('./AI/AI');
// const network = {
// 	nodes: [0, 1, 2, 3, 4],
// 	edges: [
// 		[0, 1],
// 		[0, 4],
// 		[1, 3],
// 		[1, 2],
// 	],
// };

const start = () => {
	const testManager = new TestManager();
	//testManager.runAllMultipleGameTests(10000);
	testManager.runAllMultipleGameTests({
		testAllStrategies: false,
		testStrategies: [Strategies.SimpleGreedy],
		gamesToRun: 10000,
	});
	testManager.runAllMultipleGameTests({
		testAllStrategies: false,
		testStrategies: [Strategies.GreedyPredictsHigh],
		gamesToRun: 10000,
	});
	testManager.runAllMultipleGameTests({
		testAllStrategies: false,
		testStrategies: [Strategies.GreedyPredictsGreedy],
		gamesToRun: 10000,
	});
	testManager.runAllMultipleGameTests({
		testAllStrategies: false,
		testStrategies: [Strategies.HighGreedy],
		gamesToRun: 10000,
	});
};

start();
