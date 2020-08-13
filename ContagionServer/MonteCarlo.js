// Simple Monte Carlo - For each position, k-random games are played out n rounds - highest score at the end determines best moves
// k random games are played out to the very end, and the scores are recorded. The move leading to the best score is chosen.
const MCGame = require('./MCGame');
const MCTS = require('./MCTS').MCTS;
module.exports.monteCarloTreeSearch = monteCarloTreeSearch;
module.exports.aiTurnMonteCarlo = aiTurnMonteCarlo;

class RandomAI {
	constructor(game) {
		this.game = game;
	}
	selectMove() {
		const moves = this.game.moves();
		return moves[Math.floor(Math.random() * moves.length)];
	}
}

function monteCarloTreeSearch(state) {
	// create a new game with the starting state
	let game = new MCGame();
	game.setState(state);

	let iterations = 25000; //more iterations -> stronger AI, more computation
	let exploration = 1.41; //exploration vs. explotation parameter, sqrt(2) is reasonable default (c constant in UBC forumula)

	let player1 = new MCTS(game, 1, iterations, exploration);
	const player1Type = 'MCTS';
	//let player2 = new MCTS(game, 2, iterations, exploration);
	//const player2Type = 'MCTS';
	let player2 = new RandomAI(game);
	const player2Type = 'Random';

	console.log('Starting Monte Carlo Tree Search');
	while (true) {
		let p1_move = player1.selectMove();
		game.playMove(p1_move);
		console.log('MCTS: Player 1 move: ' + p1_move);

		if (game.gameOver()) {
			break;
		}

		let p2_move = player2.selectMove();
		game.playMove(p2_move);
		console.log('MCTS: Player 2 move: ' + p2_move);
		if (game.gameOver()) {
			break;
		}
	}
	console.log('Monte Carlo Tree Search Finished');
	const winnerType = game.winner() == 1 ? player1Type : player2Type;
	console.log(`Player ${game.winner()} (${winnerType}) wins!`);
	console.log(
		`Player 1 (${player1Type}) Moves: ${game.getPlayerMoves(
			1,
		)} Scores: ${game.getPlayerVoteShareList(1)}`,
	);
	console.log(
		`Player 2 (${player2Type}) Moves: ${game.getPlayerMoves(
			2,
		)} Scores: ${game.getPlayerVoteShareList(2)}`,
	);
}

//more iterations -> stronger AI, more computation
function aiTurnMonteCarlo(state, playerNumber, iterations = 2000) {
	// create a new game with the starting state
	let game = new MCGame();
	game.setState(state);
	//console.log(state);

	let exploration = 1.41; //exploration vs. explotation parameter, sqrt(2) is reasonable default (c constant in UBC forumula)

	if (playerNumber == 2 && state.p1Moves.length == state.p2Moves.length) {
		//since we dont have p1's moves yet, we have p1 make a reasonable move before running mcts for player 2
		//console.log('Calculating Preliminary MCTS move');
		//let player = new MCTS(game, 1, iterations / 10, exploration);
		let player = new RandomAI(game);
		const move = player.selectMove();
		game.playMove(move);
		//console.log('Preliminary Move Played');
	}

	//console.log('Starting Monte Carlo Tree Search');
	let player = new MCTS(game, playerNumber, iterations, exploration);
	const move = player.selectMove();
	//console.log('Monte Carlo Tree Search Finished');
	return move;
}
