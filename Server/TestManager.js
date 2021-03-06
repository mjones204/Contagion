const { GameManager } = require('./GameManager');
const { Strategies } = require('./AI/AI');
const { ScoringStrategies } = require('./Scoring');
const fs = require('fs');
const path = require('path');

const determineWinnerByVoteShare = false;

// array of multiple game test results (strategy vs strategy)
const multipleGameTestResultsPath =
	'./Public/data/multipleGameTestResults.json';

class TestManager {
	constructor() {
		this.gm = new GameManager({});
		console.log('Test Manager Started');
	}

	pruneMultipleGameTestArrayKeepingLatestResults() {
		const d = this.readJsonFile(multipleGameTestResultsPath);
		//const data = d.filter((obj) => !obj.testName.includes('HighGreedy'));
		const noDuplicates = [];
		data.reverse();
		data.forEach((obj) => {
			if (
				!noDuplicates.some((n) => {
					if (
						(n.p1Strategy === obj.p1Strategy &&
							n.p2Strategy === obj.p2Strategy) ||
						(n.p2Strategy === obj.p1Strategy &&
							n.p1Strategy === obj.p2Strategy)
					) {
						return true;
					}
					return false;
				})
			) {
				noDuplicates.push(obj);
			}
		});
		this.writeJsonToFile(noDuplicates, multipleGameTestResultsPath);
	}

	readJsonFile(filePath) {
		const fullPath = path.join(__dirname, filePath);
		const data = fs.readFileSync(fullPath);
		return JSON.parse(data);
	}

	writeJsonToFile(json, filePath) {
		const data = JSON.stringify(json);
		const fullPath = path.join(__dirname, filePath);
		fs.writeFileSync(fullPath, data);
	}

	// runs all AI vs AI permutations
	runAllMultipleGameTests({
		testAllStrategies = true,
		testStrategies = [],
		scoringStrategy = ScoringStrategies.Uniform,
		gamesToRun = 1000,
	}) {
		// keep pairs array so we dont run duplicate matchups
		const pairs = [];
		const pairExists = (s1, s2) => {
			return pairs.some((pair) => {
				const [pairS1, pairS2] = pair;
				if (
					(pairS1 === s1 && pairS2 === s2) ||
					(pairS1 === s2 && pairS2 === s1)
				) {
					return true;
				}
				return false;
			});
		};

		// run each AI strategy against the others - ignore duplicates
		for (const [key1, strategy1] of Object.entries(Strategies)) {
			let proceed = true;
			// not testing all strategies
			if (!testAllStrategies) {
				proceed = false;
				// only test strategies listed in testStrategies
				if (testStrategies.includes(strategy1)) {
					// strategy is listed so proceed with test
					proceed = true;
				}
			}
			if (proceed) {
				for (const [key2, strategy2] of Object.entries(Strategies)) {
					// is pair does not exist then the strategy vs strategy matchup has not yet been run
					if (!pairExists(strategy1, strategy2)) {
						// add strategy to pairs array
						pairs.push([strategy1, strategy2]);
						// run test and write result to json
						this.runMultipleGameTestAndWriteToFile(
							strategy1,
							strategy2,
							gamesToRun,
							scoringStrategy,
						);
					}
				}
			}
		}
	}

	runMultipleGameTestAndWriteToFile(
		p1AiStrategy,
		p2AiStrategy,
		gamesToRun,
		scoringStrategy,
	) {
		// run test
		const result = this.runMultipleGameTest(
			p1AiStrategy,
			p2AiStrategy,
			gamesToRun,
			scoringStrategy,
		);
		// save test result in new array
		const results = [result];

		// reload existing results
		const existingResults = this.readJsonFile(multipleGameTestResultsPath);
		// ignore old test result if we have a new one
		const oldResults = existingResults.filter(
			(oldRes) =>
				!results.some(
					(res) =>
						res.testName === oldRes.testName &&
						res.scoringStrategy === oldRes.scoringStrategy,
				),
		);
		// concat old and new results arrays
		const allResults = [...oldResults, ...results];
		// write results to file
		this.writeJsonToFile(allResults, multipleGameTestResultsPath);
	}

	runMultipleGameTest(
		p1AiStrategy,
		p2AiStrategy,
		gamesToRun,
		scoringStrategy,
	) {
		console.log(
			`Starting new multiple game test - ${p1AiStrategy} vs ${p2AiStrategy} for ${gamesToRun} games`,
		);

		// results object
		const results = {
			testName: `${p1AiStrategy}_vs_${p2AiStrategy}`,
			p1Strategy: p1AiStrategy,
			p2Strategy: p2AiStrategy,
			scoringStrategy: scoringStrategy,
			gamesPlayed: 0,
			p1Wins: 0,
			p2Wins: 0,
			draws: 0,
			p1AverageVoteShares: [],
			p2AverageVoteShares: [],
			p1AverageScores: [],
			p2AverageScores: [],
		};

		let logInterval = 1000;
		// shorter log interval for MCTS since it takes longer to run
		if (
			p1AiStrategy === Strategies.MCTS ||
			p2AiStrategy === Strategies.MCTS
		) {
			logInterval = 10;
		}
		// even shorter log intervals for monte carlo (brute force) strategies
		if (
			p1AiStrategy === Strategies.MonteCarlo ||
			p2AiStrategy === Strategies.MonteCarlo
		) {
			logInterval = 1;
		}

		// run games
		for (let g = 0; g < gamesToRun; g++) {
			// console log every 1000 games
			if (g > 0 && g % logInterval === 0) {
				console.log(`Games Completed: ${g}`);
			}

			// run game
			const game = this.gm.newGame({
				p1AiStrategy,
				p2AiStrategy,
				scoringStrategy,
			});

			// update results
			const [p1, p2] = game.players;
			results.gamesPlayed++;

			// determine winner based on vote share
			if (determineWinnerByVoteShare) {
				// game is a draw
				if (game.isDrawByVoteShare()) {
					results.draws++;
				}
				// p1 won
				else if (game.isWinningPlayerByVoteShare(p1)) {
					results.p1Wins++;
				}
				// p2 won
				else if (game.isWinningPlayerByVoteShare(p2)) {
					results.p2Wins++;
				}
			}
			// determine winner based on score
			else {
				// game is a draw
				if (game.isDrawByScore()) {
					results.draws++;
				}
				// p1 won
				else if (game.isWinningPlayerByScore(p1)) {
					results.p1Wins++;
				}
				// p2 won
				else if (game.isWinningPlayerByScore(p2)) {
					results.p2Wins++;
				}
			}

			// average vote shares
			if (results.p1AverageVoteShares.length === 0) {
				// no vote share info has been added yet - init from the game
				results.p1AverageVoteShares = game
					.getPlayerVoteshares(p1)
					.slice(0);
				results.p2AverageVoteShares = game
					.getPlayerVoteshares(p2)
					.slice(0);
			} else {
				// update sum (will be averaged after all games have finished)
				for (let i = 0; i < results.p1AverageVoteShares.length; i++) {
					const cur = results.p1AverageVoteShares[i];
					results.p1AverageVoteShares[i] =
						cur + game.getPlayerVoteshares(p1)[i];
				}
				for (let i = 0; i < results.p2AverageVoteShares.length; i++) {
					const cur = results.p2AverageVoteShares[i];
					results.p2AverageVoteShares[i] =
						cur + game.getPlayerVoteshares(p2)[i];
				}
			}

			// average scores
			if (results.p1AverageScores.length === 0) {
				// no score info has been added yet - init from the game
				results.p1AverageScores = game.getPlayerScores(p1).slice(0);
				results.p2AverageScores = game.getPlayerScores(p2).slice(0);
			} else {
				// update sum (will be averaged after all games have finished)
				for (let i = 0; i < results.p1AverageScores.length; i++) {
					const cur = results.p1AverageScores[i];
					results.p1AverageScores[i] =
						cur + game.getPlayerScores(p1)[i];
				}
				for (let i = 0; i < results.p2AverageScores.length; i++) {
					const cur = results.p2AverageScores[i];
					results.p2AverageScores[i] =
						cur + game.getPlayerScores(p2)[i];
				}
			}
		}

		// results processing
		// calculate average vote shares based on games played
		results.p1AverageVoteShares = results.p1AverageVoteShares.map(
			(avgVoteShare) => {
				return parseFloat(
					(avgVoteShare / results.gamesPlayed).toFixed(3),
				);
			},
		);
		results.p2AverageVoteShares = results.p2AverageVoteShares.map(
			(avgVoteShare) => {
				return parseFloat(
					(avgVoteShare / results.gamesPlayed).toFixed(3),
				);
			},
		);

		// calculate average scores based on games played
		results.p1AverageScores = results.p1AverageScores.map((avgScore) => {
			return parseFloat((avgScore / results.gamesPlayed).toFixed(3));
		});
		results.p2AverageScores = results.p2AverageScores.map((avgScore) => {
			return parseFloat((avgScore / results.gamesPlayed).toFixed(3));
		});

		// player win ratios
		results.p1WinRatio = (results.p1Wins / results.gamesPlayed).toFixed(3);
		results.p2WinRatio = (results.p2Wins / results.gamesPlayed).toFixed(3);
		results.drawRatio = (results.draws / results.gamesPlayed).toFixed(3);
		console.log(results);
		return results;
	}
}

exports.TestManager = TestManager;
