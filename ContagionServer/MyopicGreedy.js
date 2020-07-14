//Greedy strategy, i.e. maximising expected increase in opinions spread for the next turn
var ctx;

function aiTurnSimpleGreedy(aiMoves, removeOld, context, friendlyNodeStatus, anticipating, laplacian) {
  ctx = context;
  if (ctx.isServerPlayer(friendlyNodeStatus)) {
    var myMoves = ctx.prevAiMoves;
    var enemyMoves = ctx.playerOneMoves;
  } else {
    var myMoves = ctx.playerOneMoves;
    var enemyMoves = ctx.prevAiMoves;
  }

  if (anticipating.length > 0) {
    if (ctx.roundNumber == 0) {
      anticipating = "";
    } else {
      if (anticipating == "High") {
        var highestDegree = getHighestDegreeNode(laplacian);
        enemyMoves.push(highestDegree);
      } else if (anticipating == "Greedy") {
        //1-nodestatus, enemyMoves isntead of mymoves to do it from enemy POV.
        var tokenInfluences = createTokenInfluencesList(1 - friendlyNodeStatus, enemyMoves, myMoves);
        var greedyNode = greedyNodeSelection(1 - friendlyNodeStatus, tokenInfluences, aiMoves, true, enemyMoves, true);
        enemyMoves.push(greedyNode);
      }
    }
  }

  //We know at the point one player is AI, this retrieves their previous moves.
  //array of [AI(friendly from this POV), Player(enemy)] moves

  var tokenInfluences = createTokenInfluencesList(friendlyNodeStatus, myMoves, enemyMoves);


  if (removeOld) {
    greedyNodeSelection(friendlyNodeStatus, tokenInfluences, aiMoves, true, myMoves, false); //true to remove worst. False at end to add the selection to the list
  } else {
    greedyNodeSelection(friendlyNodeStatus, tokenInfluences, aiMoves, false, myMoves, false); //false to just add best
  }
  if (anticipating.length > 0) {
    enemyMoves.pop();
  }
}

//returns the id of the best node by fitness, using a greedy strategy
//dontAdd lets us run a dummy version to see what an opponent would choose without affecting the players' moves.
function greedyNodeSelection(friendlyNodeStatus, tokenInfluences, aiMoves, findWorst, myMoves, dontAdd) {
  var bestNodesID = [-1];
  var bestNodeValue = -1;

  if (findWorst) {
    var worstTokensID = [-1];
    var worstTokenValue = 100;
  }

  var hasFutureRounds = (ctx.roundNumber < 9); //On the final round, we want to change behaviour to only a one-round lookahead.
  for (i = 0; i < ctx.formattedPeeps.length; i++) {
    var fitness = greedyFitnessChange(i, friendlyNodeStatus, tokenInfluences, true, hasFutureRounds, false); //3rd last is 'isAdd', 2nd is recursive, last is a modifier for primary node changing from enemy to friendly (not needed here)

    if (fitness > bestNodeValue) {
      bestNodesID = [i];
      bestNodeValue = fitness;
    } else if (fitness == bestNodeValue) {
      bestNodesID.push(i);
    }
    if (findWorst && myMoves.includes(i)) { //If we're looking for the worst token & the node inspected has a token.
      fitness = greedyFitnessChange(i, friendlyNodeStatus, tokenInfluences, false, hasFutureRounds, false); //false to show we are removing a token
      if (fitness < worstTokenValue) {
        worstTokensID = [i];
        worstTokenValue = fitness;
      } else if (fitness == worstTokenValue) {
        worstTokensID.push(i);
      }
    }
  }

  //picks a random node from those with equal fitness
  var index = bestNodesID[Math.floor(Math.random() * bestNodesID.length)];
  if (dontAdd) {
    return index;
  }
  if (ctx.isServerPlayer(friendlyNodeStatus)) {
    ctx.prevAiMoves.push(index);
    ctx.prevAiMoves.forEach(function (peep) {
      aiMoves.push(peep);
    });
  } else {
    aiMoves.push(index);
  }

  if (findWorst) {
    var worstToken = worstTokensID[Math.floor(Math.random() * worstTokensID.length)]; //Selects all equally-bad nodes at random

    if (ctx.isServerPlayer(friendlyNodeStatus)) {
      var index = ctx.prevAiMoves.indexOf(worstToken);
      ctx.prevAiMoves.splice(index, 1);
    } else {
      var index = aiMoves.indexOf(worstToken);
      aiMoves.splice(index, 1);
    }
  }

}

//Returns two arrays containing the friendly and enemy influences for each node.
function createTokenInfluencesList(friendlyNodeStatus, myMoves, enemyMoves) {
  var enemyNodeStatus = 1 - friendlyNodeStatus; //0 if 1, 1 if 0.
  var infectedStates = []; //Will contain 0 for uninfected, 1 for infected (colour doesn't matter)
  var friendlySources = []; //Final % change for the node
  var enemySources = []; //Checks if there are enemy sources. If entirely friendly sources, adding will not change %, so has value 0.

  //Initialises some useful variables
  ctx.formattedPeeps.forEach(function (peep, index) {
    //-1 is the value for neutral, so 1 or 0 is infected by either player.
    infectedStates.push(peep[2]);
    friendlySources.push(0); //adds a value for each node for use later. impact% is 1/(infected neighbours + tokens + 1)
    enemySources.push(0);
  });

  //Accounts for neighbour influences
  ctx.formattedConnections.forEach(function (connection) {
    if (infectedStates[connection[0]] == friendlyNodeStatus) { //i.e. is 0 or 1, infected by either player.
      friendlySources[connection[1]]++; //Adds the infected neighbour to this node's number of infected sources.
    } else if (infectedStates[connection[0]] == enemyNodeStatus) {
      enemySources[connection[1]]++;
    }
    if (infectedStates[connection[1]] == friendlyNodeStatus) { //i.e. is 0 or 1, infected by either player.
      friendlySources[connection[0]]++; //Adds the infected neighbour to this node's number of infected sources.
    } else if (infectedStates[connection[1]] == enemyNodeStatus) {
      enemySources[connection[0]]++;
    }
  });

  //Accounts for both players' tokens
  for (var i = 0; i < myMoves.length; i++) {
    var token = myMoves[i];
    var enemyToken = enemyMoves[i];
    friendlySources[token]++;
    enemySources[enemyToken]++;
  }
  if (myMoves.length < enemyMoves.length) { //When anticipating enemy moves, they have one more 'move', so we account for it here.
    enemySources[enemyMoves[enemyMoves.length - 1]]++;
  }

  return [friendlySources, enemySources];
}

function greedyFitnessChange(nodeID, friendlyNodeStatus, tokenInfluences, isAdd, recursive, primaryFlipped) { //accounts for increase in fitness of surrounding nodes here
  //primaryFlipped lets the fitnessChangeCalculation know to subtract one enemy source.
  var fitness = fitnessChangeCalculation(nodeID, isAdd, tokenInfluences, primaryFlipped);
  var additionalFitness = 0;
  if (recursive) {
    var isFlippedModifier = false;
    if (ctx.formattedPeeps[nodeID][2] == 1 - friendlyNodeStatus) { //we adjust the influences for the surrounding nodes if the primary node converts to friendly
      isFlippedModifier = true;
    }
    additionalFitness = fitness; //accounts for the increase in the primary node for both rounds
    var connectedNodes = [];

    //increments influences from neighbours
    ctx.formattedConnections.forEach(function (connection) {
      if (connection[0] == nodeID) {
        additionalFitness += (fitness * greedyFitnessChange(connection[1], friendlyNodeStatus, tokenInfluences, isAdd, false, isFlippedModifier));
      } else if (connection[1] == nodeID) {
        additionalFitness += (fitness * greedyFitnessChange(connection[0], friendlyNodeStatus, tokenInfluences, isAdd, false, isFlippedModifier));
      }
    });
  }

  return fitness + additionalFitness;
}

function fitnessChangeCalculation(nodeID, isAdd, tokenInfluences, primaryFlipped) {
  var modifier = (primaryFlipped ? 1 : 0);
  var initialFitness = (tokenInfluences[0][nodeID]) / (tokenInfluences[0][nodeID] + tokenInfluences[1][nodeID]);
  if (isNaN(initialFitness)) {
    initialFitness = 0;
  }
  var finalFitness;
  if (isAdd) {
    finalFitness = (tokenInfluences[0][nodeID] + 1) / (tokenInfluences[0][nodeID] + tokenInfluences[1][nodeID] + 1 - modifier);
  } else {
    if (tokenInfluences[0][nodeID] < 2) { //prevents /0 error
      finalFitness = 0;
    } else {
      finalFitness = tokenInfluences[0][nodeID] - 1 / (tokenInfluences[0][nodeID] + tokenInfluences[1][nodeID] - 1 - modifier);
    }
  }
  //console.log("F"+finalFitness+"_"+initialFitness);
  return finalFitness - initialFitness;
}

function getHighestDegreeNode(laplacian) {
  var best = -1;
  var bestIndex = [-1];
  for (var i = 0; i < 20; i++) {
    if (laplacian[i][i] > best) {
      bestIndex = [i];
      best = laplacian[i][i];
    } else if (laplacian[i][i] >= best) {
      bestIndex.push[i];
    }
  }
  return bestIndex[Math.floor(Math.random() * bestIndex.length)];
}


module.exports = aiTurnSimpleGreedy;