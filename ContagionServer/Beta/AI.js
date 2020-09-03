const { Greedy, GreedyAnticipation } = require('./AI/Greedy');
const { DegreeSensitive } = require('./AI/DegreeSensitive');

const Strategies = {
	Random: 'Random',
	SimpleGreedy: 'SimpleGreedy',
	GreedyPredictsHigh: 'GreedyPredictsHigh',
	GreedyPredictsGreedy: 'GreedyPredictsGreedy',
	DSLow: 'DSLow',
	DSHigh: 'DSHigh',
	Mirror: 'Mirror',
};

class AI {
	constructor({ game = null, player = null, strategy = 'Random' }) {
		this.game = game;
		this.player = player;
		this.setStrategy(strategy);
	}

	setStrategy(strategy) {
		this.strategy = Strategies[strategy];
		if (this.strategy === undefined) {
			console.log(`AI Strategy Not Recognised: ${strategy}`);
			console.log(`AI Strategy Defaulting to: Random`);
			this.strategy = Strategies.Random;
		}
	}

	move({ game, strategy, player }) {
		// optional set game
		if (game) {
			this.game = game;
		}

		// optional set player
		if (player) {
			this.player = player;
		}

		// optional set strategy
		if (strategy) {
			this.setStrategy(strategy);
		}

		// run AI strategy
		switch (this.strategy) {
			case Strategies.Random:
				return this.aiRandom();
			case Strategies.Mirror:
				return this.aiMirror();
			case Strategies.SimpleGreedy:
				return this.aiGreedy(GreedyAnticipation.None);
			case Strategies.GreedyPredictsHigh:
				return this.aiGreedy(GreedyAnticipation.High);
			case Strategies.GreedyPredictsGreedy:
				return this.aiGreedy(GreedyAnticipation.Greedy);
			case Strategies.DSLow:
				return this.aiDegreeSensitive(true);
			case Strategies.DSHigh:
				return this.aiDegreeSensitive(false);
			default:
				return this.aiRandom();
		}
	}

	aiRandom() {
		return this.game.graph.getRandomNode().id;
	}

	aiMirror() {
		if (this.game.round <= 1) {
			// no moves have been played for us to mirror, node chosen at random
			return this.aiRandom();
		}
		// array of node ids representing enemy player's moves
		const enemyMoves = this.game.getPlayerMoves(
			this.game.getEnemyPlayer(this.player),
		);
		// return last move enemy played
		return enemyMoves[enemyMoves.length - 1];
	}

	aiGreedy(anticipation) {
		const greedy = new Greedy({
			game: this.game,
			player: this.player,
			anticipation,
		});
		return greedy.aiSimpleGreedy();
	}

	aiDegreeSensitive(lowDegree) {
		const degreeSensitive = new DegreeSensitive({
			game: this.game,
			lowDegree,
		});
		return degreeSensitive.aiDegreeSensitive();
	}
}

exports.AI = AI;
exports.Strategies = Strategies;
