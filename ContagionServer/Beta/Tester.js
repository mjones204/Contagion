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
	// testManager.runAllMultipleGameTests({
	// 	testAllStrategies: false,
	// 	testStrategies: [Strategies.SimpleGreedy],
	// 	gamesToRun: 10000,
	// });
	// testManager.runAllMultipleGameTests({
	// 	testAllStrategies: false,
	// 	testStrategies: [Strategies.MCTS],
	// 	gamesToRun: 1000,
	// });
	// testManager.runAllMultipleGameTests({
	// 	testAllStrategies: false,
	// 	testStrategies: [Strategies.GreedyPredictsGreedy],
	// 	gamesToRun: 10000,
	// });
	//testManager.runMultipleGameTest(Strategies.Random, Strategies.MCTS, 300);
	testManager.runMultipleGameTest(Strategies.Random, Strategies.MCTS, 2000);
};

const temp = () => {
	const testManager = new TestManager();
	testManager.pruneMultipleGameTestArrayKeepingLatestResults();
};

start();
//temp();
