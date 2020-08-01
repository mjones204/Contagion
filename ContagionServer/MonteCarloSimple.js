// Simple Monte Carlo - For each position, k-random games are played out n rounds - highest score at the end determines best moves
// k random games are played out to the very end, and the scores are recorded. The move leading to the best score is chosen.

function aiTurnMonteCarloSimple(aiMoves, ctx, friendlyNodeStatus, maxLookaheadRounds = 10) {
  // vars changed when making a move
  // this.playerOneMoves
  // this.playerTwoMoves
  // this.prevAiMoves

  // vars changed in performInfections()
  // this.formattedPeeps
  // this.formattedConnections
  // this.flippedNodes

  // vars changed in updateScores()
  // this.playerOneScore
  // this.playerOneScoreList
  // this.playerTwoScore
  // this.playerTwoScoreList


}

function playoutFromState(ourMoves, opponentMoves, maxLookaheadRounds) {
  // enumerate through every move

  // randomly play each game to end (or until maxLookaheadRounds)

  // move which leads to highest score is  
}