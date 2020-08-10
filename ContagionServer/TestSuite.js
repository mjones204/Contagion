var ctx;
let ws;
let game;
let p1Strategy;
let p2Strategy;
let moves = [];
let gamesPlayed = 0;
let gamesToPlay = 1;

let testsToRun = [];
let allResults = [];
let results = {};

let singularTest = false;

const clone = require('clone');
const Message = require('./Message');
const Server = require('./server');
const uuidv4 = require('uuid/v4');

module.exports.setupTest = setupTest;

//Wrapper for each pairwise experiment
function setupTest(context) {
	ctx = context;
	//Sets up websocket connection in same way that a normal player would
	const WebSocket = require('ws');
	ws = new WebSocket('ws://127.0.0.1:5001'); //"wss://stark-atoll-77422.herokuapp.com/"
	ws.onopen = function (event) {
		ws.send('Connection Recieved from TestSuite');
	};
	ws.onerror = function (err) {
		console.log('err Experimental: ', err);
	};
	ws.onmessage = function (event) {
		parseEvent(event);
	};
	console.log('[TEST] Test Suite Started');

	//runMultipleTests();
	//newTest('Random', 'DSHigh', 2, 1);
	//runSimpleGames();
	//runMonteCarlo();
}

function runMultipleTests() {
	singularTest = false;
	testsToRun = [];
	const gameCount = 10000;
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'Random',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'Mirror',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'DSLow',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'DSHigh',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'Equilibrium',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'SimpleGreedy',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'GreedyPredictsHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'GreedyPredictsGreedy',
		gameCount,
	});

	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'Mirror',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'DSLow',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'DSHigh',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'Equilibrium',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'SimpleGreedy',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'GreedyPredictsHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'GreedyPredictsGreedy',
		gameCount,
	});

	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'DSLow',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'DSHigh',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'Equilibrium',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'SimpleGreedy',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'GreedyPredictsHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'GreedyPredictsGreedy',
		gameCount,
	});

	testsToRun.push({
		p1Strat: 'DSHigh',
		p2Strat: 'DSHigh',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'DSHigh',
		p2Strat: 'Equilibrium',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'DSHigh',
		p2Strat: 'SimpleGreedy',
		gameCount
	});
	testsToRun.push({
		p1Strat: 'DSHigh',
		p2Strat: 'GreedyPredictsHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'DSHigh',
		p2Strat: 'GreedyPredictsGreedy',
		gameCount,
	});

	testsToRun.push({
		p1Strat: 'Equilibrium',
		p2Strat: 'Equilibrium',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Equilibrium',
		p2Strat: 'SimpleGreedy',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Equilibrium',
		p2Strat: 'GreedyPredictsHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Equilibrium',
		p2Strat: 'GreedyPredictsGreedy',
		gameCount,
	});

	testsToRun.push({
		p1Strat: 'SimpleGreedy',
		p2Strat: 'SimpleGreedy',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'SimpleGreedy',
		p2Strat: 'GreedyPredictsHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'SimpleGreedy',
		p2Strat: 'GreedyPredictsGreedy',
		gameCount,
	});

	testsToRun.push({
		p1Strat: 'GreedyPredictsHigh',
		p2Strat: 'GreedyPredictsHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'GreedyPredictsHigh',
		p2Strat: 'GreedyPredictsGreedy',
		gameCount,
	});

	testsToRun.push({
		p1Strat: 'GreedyPredictsGreedy',
		p2Strat: 'GreedyPredictsGreedy',
		gameCount,
	});
	console.log("testsToRun.length: " + testsToRun.length);


	// start running sims
	runNextTest();
}

function runNextTest() {
	if (testsToRun.length > 0) {
		// load already ran tests from json
		allResults = require('../test-results.json');
		console.log("allResults.length: " + allResults.length);
		let nextTest = testsToRun.shift();
		// if the test doesn't appear in the results then run it
		allResults.forEach(test => {
			if (nextTest && test.p1Strategy === nextTest.p1Strat && test.p2Strategy === nextTest.p2Strat) {
				nextTest = testsToRun.shift();
			}
		});
		if (!nextTest) {
			console.log("[TEST] nextTest undefined");
		} else {
			// run test
			console.log('[TEST] Running test: ', nextTest);
			newMultipleGamesTest(nextTest);
		}
	} else {
		// finished
		console.log('[TEST] Finished running all tests!');
	}
}

function newMultipleGamesTest({
	p1Strat,
	p2Strat,
	gameCount = 1,
	topologyID = null,
	layoutID = null,
}) {
	// set strategies
	p1Strategy = p1Strat;
	p2Strategy = p2Strat;
	Server.setTestP2Strategy(p2Strategy);

	// set topology and layout manually
	// (when null the server will just use random ones as usual)
	Server.setTestTopologyID(topologyID);
	Server.setTestLayoutID(layoutID);

	// these variables are checked in gameOver() to see whether another game should be run
	gamesPlayed = 0;
	gamesToPlay = gameCount;

	// results init
	results = {};
	results.testName = `${p1Strategy}_vs_${p2Strategy}`;
	results.p1Strategy = p1Strategy;
	results.p2Strategy = p2Strategy;
	results.gamesPlayed = 0;
	results.p1Wins = 0;
	results.p2Wins = 0;
	results.draws = 0;
	results.p1AverageBoardShares = [];
	results.p2AverageBoardShares = [];

	gameStart();
}

function newTest(p1Strat, p2Strat, topologyID = null, layoutID = null) {
	singularTest = true;
	// set strategies
	p1Strategy = p1Strat;
	p2Strategy = p2Strat;
	Server.setTestP2Strategy(p2Strategy);

	// set topology and layout manually
	// (when null the server will just use random ones as usual)
	Server.setTestTopologyID(topologyID);
	Server.setTestLayoutID(layoutID);

	gameStart();
}

function gameStart() {
	var playerID = 'TEST_PLAYER_1';
	sendServerMessage(new Message(playerID, 'NEW_GAME_TOKEN'));
	//console.log(`[TEST] Game Started: (${p1Strategy}) vs (${p2Strategy})`);
}

function updateState() {
	moves.push(game.aiTurn(game.playerOneMoves, 1, p1Strategy));
	sendServerMessage(new Message(moves, 'SUBMIT_MOVES_TOKEN'));
}

function gameOver(payload) {
	// let winnerText = '';
	// const p1Score = game.playerOneScoreList[game.playerOneScoreList.length - 1];
	// const p2Score = game.playerTwoScoreList[game.playerTwoScoreList.length - 1];
	// if (p1Score > p2Score) {
	// 	winnerText = 'Player 1 wins';
	// } else if (p1Score < p2Score) {
	// 	winnerText = 'Player 2 wins';
	// } else {
	// 	winnerText = 'Draw';
	// }
	// console.log('[TEST] Game Over - ' + winnerText);
	// console.log(
	// 	`Player 1 (${p1Strategy}) Moves: ${game.playerOneMoves} Scores: ${game.playerOneScoreList} BoardShares: ${game.playerOneBoardShareList}`,
	// );
	// console.log(
	// 	`Player 2 (${p2Strategy}) Moves: ${game.playerTwoMoves} Scores: ${game.playerTwoScoreList} BoardShares: ${game.playerTwoBoardShareList}`,
	// );

	var p1FinalBoardShare =
		game.playerOneBoardShareList[game.playerOneBoardShareList.length - 1];
	var p2FinalBoardShare =
		game.playerTwoBoardShareList[game.playerTwoBoardShareList.length - 1];

	// init game results (single game results)
	let gameResults = {};
	gameResults.p1Strategy = p1Strategy;
	gameResults.p2Strategy = p2Strategy;
	gameResults.p1Moves = game.playerOneMoves;
	gameResults.p2Moves = game.playerTwoMoves;
	gameResults.p1BoardShareList = game.playerOneBoardShareList;
	gameResults.p2BoardShareList = game.playerTwoBoardShareList;
	gameResults.p1MoveNodeDegreeList = game.playerOneNodeDegreeList;
	gameResults.p2MoveNodeDegreeList = game.playerTwoNodeDegreeList;
	gameResults.p2RandomNumberList = game.p2RandomNumberList;
	gameResults.p2Distribution = game.p2Distribution;
	gameResults.p2MaxValue = game.p2MaxValue;
	//gameResults.p1ScoreList = game.playerOneScoreList;
	//gameResults.p2ScoreList = game.playerTwoScoreList;
	// calculate winne
	if (p1FinalBoardShare > p2FinalBoardShare) {
		gameResults.winner = 1; // p1 wins
	} else if (p1FinalBoardShare < p2FinalBoardShare) {
		gameResults.winner = 2; // p2 wins
	} else {
		gameResults.winner = 0; // draw
	}

	//console.log('[TEST] Game Over - winner: ' + gameResults.winner);

	if (!singularTest) {
		// update results object (for logging multiple games)
		results.gamesPlayed++;
		if (gameResults.winner == 1) {
			results.p1Wins++;
		} else if (gameResults.winner == 2) {
			results.p2Wins++;
		} else {
			results.draws++;
		}
		// no board share info has been added yet - init with last game's shares
		if (results.p1AverageBoardShares.length == 0) {
			results.p1AverageBoardShares = game.playerOneBoardShareList.slice(0);
			results.p2AverageBoardShares = game.playerTwoBoardShareList.slice(0);
		} else {
			for (let i = 0; i < results.p1AverageBoardShares.length; i++) {
				const cur = results.p1AverageBoardShares[i];
				results.p1AverageBoardShares[i] =
					cur + game.playerOneBoardShareList[i];
			}
			for (let i = 0; i < results.p2AverageBoardShares.length; i++) {
				const cur = results.p2AverageBoardShares[i];
				results.p2AverageBoardShares[i] =
					cur + game.playerTwoBoardShareList[i];
			}
		}
	}

	moves = [];
	game = null;

	if (singularTest) {
		console.log(gameResults)
		return;
	}

	// increment games played count
	gamesPlayed++;
	if (gamesPlayed % 100 === 0) {
		console.log('[TEST] Games Played: ' + gamesPlayed);
	}
	// run another game
	if (gamesPlayed < gamesToPlay) {
		gameStart();
	} else {
		// end reached
		appendTestResults();
		runNextTest();
	}
}

function appendTestResults() {
	// calculate average board shares based on games played
	for (let i = 0; i < results.p1AverageBoardShares.length; i++) {
		const cur = results.p1AverageBoardShares[i];
		results.p1AverageBoardShares[i] = parseFloat(
			(cur / results.gamesPlayed).toFixed(3),
		);
	}
	for (let i = 0; i < results.p2AverageBoardShares.length; i++) {
		const cur = results.p2AverageBoardShares[i];
		results.p2AverageBoardShares[i] = parseFloat(
			(cur / results.gamesPlayed).toFixed(3),
		);
	}
	allResults.push(results);
	console.log(results);
	writeJsonToFile(allResults);
}

function writeJsonToFile(json) {
	const fs = require('fs');
	const data = JSON.stringify(json);
	fs.writeFileSync('test-results.json', data);
}

function parseEvent(message) {
	try {
		message = JSON.parse(message.data);
	} catch (err) {
		return;
	}
	switch (message.status) {
		case 'CONFIG_TOKEN':
			game = ctx.CurrentGames[0];
			updateState();
			break;
		case 'UPDATE_STATE_TOKEN':
			updateState();
			break;
		case 'GAME_END_TOKEN':
			gameOver(message.payload);
			break;
	}
}

function sendServerMessage(msg) {
	if (ws.readyState == 0) {
		//This version connects too quickly to the server! Must have a short wait at beginning.
		setTimeout(() => {
			sendServerMessage(msg);
		}, 250);
	} else {
		try {
			ws.send(JSON.stringify(msg));
		} catch (err) {
			console.log(err);
			setTimeout(() => {
				sendServerMessage(msg);
			}, 250);
			return;
		}
	}
}

function runSimpleGames() {
	const SimpleGame = require('./SimpleGame');
	const configData = Server.getConfigData();
	const topologyID = 0;
	const layoutID = 0;
	const network = clone(configData.configs[topologyID][layoutID]);
	const gameSettings = {
		peeps: network.peeps,
		connections: network.connections,
	};

	const gamesToRun = 500000;
	let p1Scores = 0;
	let p2Scores = 0;
	let lowestScore = 100000;
	let highestScore = 0;
	for (let i = 0; i < gamesToRun; i++) {
		let game = new SimpleGame(gameSettings);
		for (let r = 0; r < 10; r++) {
			game.submitMove(1, game.getRandomNode());
			game.submitMove(2, game.getRandomNode());
		}
		const p1Score = game.getPlayerScore(1);
		const p2Score = game.getPlayerScore(2);
		p1Scores += p1Score;
		p2Scores += p2Score;

		if (p1Score < lowestScore) {
			lowestScore = p1Score;
			console.log('New lowest score observed: ' + lowestScore);
		}
		if (p2Score < lowestScore) {
			lowestScore = p2Score;
			console.log('New lowest score observed: ' + lowestScore);
		}
		if (p1Score > highestScore) {
			highestScore = p1Score;
			console.log('New highest score observed: ' + highestScore);
		}
		if (p2Score > highestScore) {
			highestScore = p2Score;
			console.log('New highest score observed: ' + highestScore);
		}

		if (i % 10000 == 0) {
			console.log('Games completed: ' + i);
		}
	}
	console.log(
		`Finished running ${gamesToRun} games. Lowest score: ${lowestScore} Highest score: ${highestScore}`,
	);
	console.log('p1 average score: ' + p1Scores / gamesToRun);
	console.log('p2 average score: ' + p2Scores / gamesToRun);
}

function runMonteCarlo() {
	const MonteCarlo = require('./MonteCarlo');
	const configData = Server.getConfigData();
	const topologyID = 0;
	const layoutID = 0;
	const network = clone(configData.configs[topologyID][layoutID]);
	// create new start state
	state = {
		gameID: uuidv4(),
		rngThreshCount: 0,
		roundNumber: 0,
		p1Moves: [],
		p2Moves: [],
		p1ScoreList: [],
		p2ScoreList: [],
		formattedPeeps: network.peeps,
		formattedConnections: network.connections,
		flippedNodes: [],
		roundLimit: 10,
		lastRoundBonus: 5,
		gameOver: false,
		winner: -1,
	};

	// run monte carlo tree search from the state
	MonteCarlo.monteCarloTreeSearch(state);
}