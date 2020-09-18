const { GameManager } = require('./GameManager');
const { Strategies } = require('./AI');
const fs = require('fs');
const path = require('path');

// array of multiple game test results (strategy vs strategy)
const multipleGameTestResultsPath =
	'./Public/data/multipleGameTestResults.json';
const multipleGameTestResults = require(multipleGameTestResultsPath);

class TestManager {
	constructor() {
		this.gm = new GameManager({});
		console.log('Test Manager Started');
	}

	writeJsonToFile(json, filePath) {
		const data = JSON.stringify(json);
		const fullPath = path.join(__dirname, filePath);
		fs.writeFileSync(fullPath, data);
	}

	// runs all AI vs AI permutations
	runAllMultipleGameTests(gamesToRun = 1000) {
		const results = [];

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
			for (const [key2, strategy2] of Object.entries(Strategies)) {
				// is pair does not exist then the strategy vs strategy matchup has not yet been run
				if (!pairExists(strategy1, strategy2)) {
					// add strategy to pairs array
					pairs.push([strategy1, strategy2]);
					// run test
					const result = this.runMultipleGameTest(
						strategy1,
						strategy2,
						gamesToRun,
					);
					// save results
					results.push(result);

					//  write to file
					// ignore old test results if we have new ones
					const oldResults = multipleGameTestResults.filter(
						(oldRes) =>
							!results.some(
								(res) => res.testName === oldRes.testName,
							),
					);
					// concat old and new results arrays
					const allResults = [...oldResults, ...results];
					// write results to file
					this.writeJsonToFile(
						allResults,
						multipleGameTestResultsPath,
					);
				}
			}
		}
	}

	runMultipleGameTest(p1AiStrategy, p2AiStrategy, gamesToRun = 1000) {
		console.log(
			`Starting new multiple game test - ${p1AiStrategy} vs ${p2AiStrategy} for ${gamesToRun} games`,
		);

		// results object
		const results = {
			testName: `${p1AiStrategy}_vs_${p2AiStrategy}`,
			p1Strategy: p1AiStrategy,
			p2Strategy: p2AiStrategy,
			gamesPlayed: 0,
			p1Wins: 0,
			p2Wins: 0,
			draws: 0,
			p1AverageVoteShares: [],
			p2AverageVoteShares: [],
		};

		// run games
		for (let g = 0; g < gamesToRun; g++) {
			// console log every 1000 games
			if (g > 0 && g % 1000 === 0) {
				console.log(`Games Completed: ${g}`);
			}

			// run game
			const game = this.gm.newGame({ p1AiStrategy, p2AiStrategy });

			// update results
			const [p1, p2] = game.players;
			results.gamesPlayed++;
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
		// player win ratios
		results.p1WinRatio = (results.p1Wins / results.gamesPlayed).toFixed(3);
		results.p2WinRatio = (results.p2Wins / results.gamesPlayed).toFixed(3);
		results.drawRatio = (results.draws / results.gamesPlayed).toFixed(3);
		console.log(results);
		return results;
	}
}

exports.TestManager = TestManager;
