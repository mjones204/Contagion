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

	//newTest('Random', p2Strategy, topologyID, 0, expStr);
	//runMultipleTests();
	//runSimpleGames();
	//runMonteCarlo();
	//runDSStrategies();
}

function runDSStrategies() {
	let p2Strategy = 'DSLow';
	let topologyID = 1;
	let expStr = 0.468;
	newTest('Random', p2Strategy, topologyID, 0, expStr);
	for (let i = 1; i < 10; i++) {
		setTimeout(() => {
			newTest('Random', p2Strategy, topologyID, 0, expStr);
		}, i * 1000);
	}

	// setTimeout(() => {
	// 	expStr = 0.5;
	// 	for (let i = 0; i < 5; i++) {
	// 		setTimeout(() => {
	// 			newTest('Random', p2Strategy, topologyID, 0, expStr);
	// 		}, i * 1000);
	// 	}
	// }, 8000);

	// setTimeout(() => {
	// 	expStr = 0.6;
	// 	for (let i = 0; i < 5; i++) {
	// 		setTimeout(() => {
	// 			newTest('Random', p2Strategy, topologyID, 0, expStr);
	// 		}, i * 1000);
	// 	}
	// }, 16000);
}

function runMultipleTests() {
	singularTest = false;
	testsToRun = [];
	let gameCount = 10000;
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'Random',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'Mirror',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'DSLow',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'DSHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'Equilibrium',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Random',
		p2Strat: 'SimpleGreedy',
		gameCount,
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
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'DSLow',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'DSHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'Equilibrium',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'Mirror',
		p2Strat: 'SimpleGreedy',
		gameCount,
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
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'DSHigh',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'Equilibrium',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'DSLow',
		p2Strat: 'SimpleGreedy',
		gameCount,
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
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'DSHigh',
		p2Strat: 'Equilibrium',
		gameCount,
	});
	testsToRun.push({
		p1Strat: 'DSHigh',
		p2Strat: 'SimpleGreedy',
		gameCount,
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

	// *************
	gameCount = 300; // reduce gamecount for montecarlo
	// *************
	// testsToRun.push({
	// 	p1Strat: 'Random',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// 	monteCarloIterations: 500,
	// });
	// testsToRun.push({
	// 	p1Strat: 'Random',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// 	monteCarloIterations: 1000,
	// });
	// testsToRun.push({
	// 	p1Strat: 'Random',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// 	monteCarloIterations: 2000,
	// });
	// testsToRun.push({
	// 	p1Strat: 'Random',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// 	monteCarloIterations: 3000,
	// });
	// testsToRun.push({
	// 	p1Strat: 'Random',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// 	monteCarloIterations: 10000,
	// });
	// testsToRun.push({
	// 	p1Strat: 'Mirror',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// });
	// testsToRun.push({
	// 	p1Strat: 'DSLow',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// });
	// testsToRun.push({
	// 	p1Strat: 'DSHigh',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// });
	// testsToRun.push({
	// 	p1Strat: 'Equilibrium',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// });
	// testsToRun.push({
	// 	p1Strat: 'SimpleGreedy',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// });
	// testsToRun.push({
	// 	p1Strat: 'GreedyPredictsHigh',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// });
	// testsToRun.push({
	// 	p1Strat: 'GreedyPredictsGreedy',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// });
	// testsToRun.push({
	// 	p1Strat: 'MonteCarlo',
	// 	p2Strat: 'MonteCarlo',
	// 	gameCount,
	// });
	console.log('testsToRun.length: ' + testsToRun.length);

	// start running sims
	runNextTest();
}

function runNextTest() {
	if (testsToRun.length > 0) {
		// load already ran tests from json
		allResults = require('../test-results.json');
		console.log('allResults.length: ' + allResults.length);
		let test = undefined;
		for (let i = 0; i < testsToRun.length; i++) {
			test = testsToRun[i];
			let testRecorded = false;
			for (let j = 0; j < allResults.length; j++) {
				let resultTest = allResults[j];
				if (
					test.p1Strat === resultTest.p1Strategy &&
					test.p2Strat === resultTest.p2Strategy
				) {
					// monte carlo iterations is defined
					if (
						test.monteCarloIterations &&
						resultTest.monteCarloIterations
					) {
						// iterations are the same - the test has already been run
						if (
							test.monteCarloIterations ===
							resultTest.monteCarloIterations
						) {
							testRecorded = true;
						} else {
							testRecorded = false;
						}
					} else {
						testRecorded = true;
					}
					break;
				}
			}
			// test hasn't been saved yet
			if (!testRecorded) {
				break;
			} else {
				test = undefined;
			}
		}

		if (!test) {
			// finished
			console.log('[TEST] Finished running all tests!');
		} else {
			// run test
			console.log('[TEST] Running test: ', test);
			console.log('index of test: ' + testsToRun.indexOf(test));
			console.log('test', test);
			testsToRun.splice(testsToRun.indexOf(test), 1);
			newMultipleGamesTest(test);
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
	monteCarloIterations = null,
}) {
	// set strategies
	p1Strategy = p1Strat;
	p2Strategy = p2Strat;
	Server.setTestP2Strategy(p2Strategy);

	// set topology and layout manually
	// (when null the server will just use random ones as usual)
	Server.setTestTopologyID(topologyID);
	Server.setTestLayoutID(layoutID);

	// set monte carlo iterations if defined
	if (monteCarloIterations) {
		Server.setMonteCarloIterations(monteCarloIterations);
	}

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
	results.p1AverageVoteShares = [];
	results.p2AverageVoteShares = [];
	if (monteCarloIterations) {
		results.monteCarloIterations = monteCarloIterations;
	}

	gameStart();
}

function newTest(p1Strat, p2Strat, topologyID = null, layoutID = null, expStr) {
	singularTest = true;
	// set strategies
	p1Strategy = p1Strat;
	p2Strategy = p2Strat;
	Server.setTestP2Strategy(p2Strategy);

	// set topology and layout manually
	// (when null the server will just use random ones as usual)
	Server.setTestTopologyID(topologyID);
	Server.setTestLayoutID(layoutID);

	// set exp strength if specified
	if (expStr) {
		Server.setExponentStrength(expStr);
	}

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
	// 	`Player 1 (${p1Strategy}) Moves: ${game.playerOneMoves} Scores: ${game.playerOneScoreList} VoteShares: ${game.playerOneVoteShareList}`,
	// );
	// console.log(
	// 	`Player 2 (${p2Strategy}) Moves: ${game.playerTwoMoves} Scores: ${game.playerTwoScoreList} VoteShares: ${game.playerTwoVoteShareList}`,
	// );

	var p1FinalVoteShare =
		game.playerOneVoteShareList[game.playerOneVoteShareList.length - 1];
	var p2FinalVoteShare =
		game.playerTwoVoteShareList[game.playerTwoVoteShareList.length - 1];

	// init game results (single game results)
	let gameResults = {};
	gameResults.p1Strategy = p1Strategy;
	gameResults.p2Strategy = p2Strategy;
	gameResults.topologyId = ctx.TestTopologyID;
	gameResults.p1Moves = game.playerOneMoves;
	gameResults.p2Moves = game.playerTwoMoves;
	//gameResults.p1VoteShareList = game.playerOneVoteShareList;
	//gameResults.p2VoteShareList = game.playerTwoVoteShareList;
	gameResults.p1MoveNodeDegreeList = game.playerOneNodeDegreeList;
	gameResults.p2MoveNodeDegreeList = game.playerTwoNodeDegreeList;
	gameResults.p2ExponentStrength = game.exponentStrength;
	gameResults.p2RandomNumberList = game.p2RandomNumberList;
	gameResults.p2Pdf = game.p2Pdf;
	gameResults.p2PdfNorm = game.p2PdfNorm;
	gameResults.p2SortedPdfInfo = game.p2SortedPdfInfo;
	//gameResults.p1ScoreList = game.playerOneScoreList;
	//gameResults.p2ScoreList = game.playerTwoScoreList;
	// calculate winne
	if (p1FinalVoteShare > p2FinalVoteShare) {
		gameResults.winner = 1; // p1 wins
	} else if (p1FinalVoteShare < p2FinalVoteShare) {
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
		if (results.p1AverageVoteShares.length == 0) {
			results.p1AverageVoteShares = game.playerOneVoteShareList.slice(0);
			results.p2AverageVoteShares = game.playerTwoVoteShareList.slice(0);
		} else {
			for (let i = 0; i < results.p1AverageVoteShares.length; i++) {
				const cur = results.p1AverageVoteShares[i];
				results.p1AverageVoteShares[i] =
					cur + game.playerOneVoteShareList[i];
			}
			for (let i = 0; i < results.p2AverageVoteShares.length; i++) {
				const cur = results.p2AverageVoteShares[i];
				results.p2AverageVoteShares[i] =
					cur + game.playerTwoVoteShareList[i];
			}
		}
	}

	moves = [];
	game = null;

	if (singularTest) {
		console.log(JSON.stringify(gameResults) + ',');
		return;
	}

	// increment games played count
	gamesPlayed++;
	if (gamesPlayed % 1000 === 0) {
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
	for (let i = 0; i < results.p1AverageVoteShares.length; i++) {
		const cur = results.p1AverageVoteShares[i];
		results.p1AverageVoteShares[i] = parseFloat(
			(cur / results.gamesPlayed).toFixed(3),
		);
	}
	for (let i = 0; i < results.p2AverageVoteShares.length; i++) {
		const cur = results.p2AverageVoteShares[i];
		results.p2AverageVoteShares[i] = parseFloat(
			(cur / results.gamesPlayed).toFixed(3),
		);
	}
	results.p1WinRatio = (results.p1Wins / results.gamesPlayed).toFixed(3);
	results.p2WinRatio = (results.p2Wins / results.gamesPlayed).toFixed(3);
	results.drawRatio = (results.draws / results.gamesPlayed).toFixed(3);
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
		p1VoteShareList: [],
		p2VoteShareList: [],
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
