const ScoringStrategies = {
	Uniform: 'Uniform',
	EarlyIgnoredUniform: 'EarlyIgnoredUniform',
	LastRound: 'LastRound',
	EarlyWeighted: 'EarlyWeighted',
};

class Scoring {
	constructor(strategy) {
		this.setStrategy(strategy);
	}

	setStrategy(strategy) {
		this.strategy = ScoringStrategies[strategy];
		if (this.strategy === undefined) {
			console.log(`Scoring Strategy Not Recognised: ${strategy}`);
			console.log(`Scoring Strategy Defaulting to: Uniform`);
			this.strategy = ScoringStrategies.Uniform;
		}
	}

	getScoreForRound(nodesControlled, round, rounds, strategy) {
		if (strategy) {
			this.setStrategy(strategy);
		}

		switch (this.strategy) {
			case ScoringStrategies.Uniform:
				return getScoreUniform(nodesControlled, round, rounds);
			case ScoringStrategies.EarlyIgnoredUniform:
				return getScoreEarlyIgnoredUniform(
					nodesControlled,
					round,
					rounds,
				);
			case ScoringStrategies.LastRound:
				return getScoreLastRound(nodesControlled, round, rounds);
			case ScoringStrategies.EarlyWeighted:
				return getScoreEarlyWeighted(nodesControlled, round, rounds);
			default:
				return getScoreUniform(nodesControlled, round, rounds);
		}
	}

	getScoreUniform(nodesControlled, round, rounds) {
		return 10 * nodesControlled;
	}

	getScoreEarlyIgnoredUniform(nodesControlled, round, rounds) {
		if (round <= 5) {
			return 0;
		} else {
			return this.getScoreUniform(nodesControlled, round, rounds);
		}
	}

	getScoreLastRound(nodesControlled, round, rounds) {
		// last round only
		if (round === rounds) {
			return 10 * nodesControlled;
		}
		return 0;
	}

	getScoreEarlyWeighted(nodesControlled, round, rounds) {
		// earlier rounds weighted higher
		if (round <= 5) {
			return 15 * nodesControlled;
		} else {
			return 10 * nodesControlled;
		}
	}
}

exports.Scoring = Scoring;
exports.ScoringStrategies = ScoringStrategies;
