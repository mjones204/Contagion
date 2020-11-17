const { TestManager } = require('./TestManager');
const { Strategies } = require('./AI/AI');
const { ScoringStrategies } = require('./Scoring');

const start = () => {
	const testManager = new TestManager();
	//testManager.runAllMultipleGameTests(10000);
	// testManager.runAllMultipleGameTests({
	// 	testAllStrategies: false,
	// 	testStrategies: [Strategies.SimpleGreedy],
	// 	gamesToRun: 10000,
	// });

	// testManager.runAllMultipleGameTests({
	// 	testAllStrategies: true,
	// 	scoringStrategy: ScoringStrategies.Uniform,
	// 	gamesToRun: 5000,
	// });
	// testManager.runAllMultipleGameTests({
	// 	testAllStrategies: true,
	// 	scoringStrategy: ScoringStrategies.EarlyIgnoredUniform,
	// 	gamesToRun: 2000,
	// });
	// testManager.runAllMultipleGameTests({
	// 	testAllStrategies: true,
	// 	scoringStrategy: ScoringStrategies.LastRound,
	// 	gamesToRun: 2000,
	// });
	testManager.runAllMultipleGameTests({
		testAllStrategies: true,
		scoringStrategy: ScoringStrategies.EarlyWeighted,
		gamesToRun: 2000,
	});

	// testManager.runAllMultipleGameTests({
	// 	testAllStrategies: false,
	// 	testStrategies: [Strategies.GreedyPredictsGreedy],
	// 	gamesToRun: 10000,
	// });
	// testManager.runMultipleGameTest(
	// 	Strategies.SimpleGreedy,
	// 	Strategies.MCTS,
	// 	1000,
	// );
	// testManager.runMultipleGameTest(
	// 	Strategies.Random,
	// 	Strategies.SimpleGreedy,
	// 	1,
	// 	ScoringStrategies.EarlyIgnoredUniform,
	// );
	//testManager.runMultipleGameTest(Strategies.Random, Strategies.MCTS, 200);
	// testManager.runMultipleGameTest(
	// 	Strategies.SimpleGreedy,
	// 	Strategies.MCTS,
	// 	1000,
	// );
};

const temp = () => {
	const testManager = new TestManager();
	testManager.pruneMultipleGameTestArrayKeepingLatestResults();
};

start();
//temp();
