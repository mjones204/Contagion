//NOTE: A lot of the human vs human player code is no longer bug-free due to changes in specification. It will work with some moderate changes but NOT as-is.

Server.LocalMode = false; //Run on local machine or internet-facing
Server.NeutralMode = true; //Supports neutral nodes (this is the default now)
Server.TrialMode = false; //Running controlled trials with people
Server.ExperimentMode = false; //For things like monte carlo...
Server.EnableAWS = false; //Connects to AWS
Server.NumberOfNodes = 20; //Changing this may require some refactoring...
Server.RemoveOldNodes = false; //TODO: Update game logic (DB side done)
Server.TestMoves = [ //[ 13, 2, 6, 14, 9, 10, 16, 15, 8, 18 ],
  //[ 6, 5, 12, 5, 2, 17, 7, 18, 9, 9 ],
  [7, 12, 9, 13, 13, 1, 4, 19, 10, 19],
  [19, 14, 7, 11, 18, 9, 7, 5, 13, 1]
];
Server.playerTopologies = [];
Server.LastRoundBonus = 5;
ExponentStrength = 50; //Higher = more bias to high/low degree nodes in their respective strategies
Server.ExistingTokensBias = 0; //Increases likelihood of placing tokens on nodes that already have tokens. Negative reduces the likelihood.
//Only affects degree sensitive strategies. We decided to make this 0 to simplify analysis.
console.info("Server starting!");
//Shuffles lists
shuffle = function (a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

//Creates a permutation of the 4 layouts so users get random order
Server.generatePerm = function () {
  var list = [0, 1, 2, 3];
  list = shuffle(list);
  for (var i = 0; i < 4; i++) {
    list.push(list[i]);
  }
  return list;
}

//need nodeJS and uuid on the server
//Use v4 as it is random and therefore hard to predict
//If we want user accounts, perhaps v3 or v5 would be better, as it produces reliable values based on names.
//Cookies are a potential route for tracking players, but legal issues.
const uuidv4 = require('uuid/v4');
const WebSocketServer = require('ws').Server;
const Message = require('./Message.js');
var http = require("http");
var express = require("express");
var nodemailer = require('nodemailer');
var extMath = require('./math.min');
var seededRNGGenerator = require('./seedrandom.min');

// AWS and Mechanical Turk setup
var AWS = require("aws-sdk");
if (Server.EnableAWS) {
  // Load config
  AWS.config.loadFromPath('./aws_config.json');
  fs = require('fs');
  // Use sandbox
  var endpoint = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com';
  // Uncomment this line to use in production
  // endpoint = 'https://mturk-requester.us-east-1.amazonaws.com';
  // Connect to sandbox
  var mturk = new AWS.MTurk({
    endpoint: endpoint
  });
  // Test ability to connect to MTurk by checking account balance
  mturk.getAccountBalance(function (err, data) {
    if (err) {
      console.log("Failed to connect to AWS MTurk");
      console.log(err.message);
    } else {
      // Sandbox balance check will always return $10,000
      console.log("Connected to AWS MTurk");
      console.log('Account balance: ' + data.AvailableBalance);
    }
  })
}

var app = express();
var PORT = process.env.PORT || 5001;
//app.use(express.static(__dirname + "/"));

//Setup mailing to alert if there is a problem with the database
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'contagiongamesoton@gmail.com',
    pass: 'southampt0N'
  }
});

//This is all to do with connecting the client & server. This is largely boilerplate code that we shouldn't touch
var server = http.createServer(app);
server.listen(PORT);

const wss = new WebSocketServer({
  server: server
});
var client = null;
//Doesn't log to database when local, as local is usually for testing. 
if (!Server.LocalMode) {
  const {
    Client
  } = require('pg');
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });
  console.info(process.env.DATABASE_URL);
  client.connect();
}

var clone = require('clone'); //Allows deep cloning of objects (for parallel games with shared starting resources)
module.exports = { //Allows other files to use the initialiseTopologyLayoutIndexes function
  initialiseTopologyLayoutIndexes: function () {
    Server.initialiseTopologyLayoutIndexes();
  },
  NeutralMode: Server.NeutralMode, //Allows other files to access these variables
  LocalMode: Server.LocalMode,
  NumberOfNodes: Server.NumberOfNodes

};
//Similarly to above, lets other files use these variables
module.exports.NeutralMode = Server.NeutralMode;
module.exports.LocalMode = Server.LocalMode;

//Lets us access the config data processed in the NetworkConfigurations file
configData = require('./NetworkConfigurations.js');
serverConfigs = configData.configs;
laplaciansList = configData.laplacians;

//Handles waiting until the server has finished loading
Server.LoadExperiment = function (times) {
  if (times > 100) {
    console.error("Error Initialising!");
    return;
  }
  //When this has a non-zero value, topologies have been loaded
  if (configData.laplacians.length != 0) {
    var experimentAi = require('./ExperimentalAi.js');
    setTimeout(() => {
      experimentAi.setupExperiment(this);
    }, 1500); //Debugger needs time to attach
  } else {
    setTimeout(() => {
      Server.LoadExperiment(times + 1);
    }, 250);
  }
}

if (Server.ExperimentMode) {
  Server.LoadExperiment(0);
}

//Handles storing of data to database
Server.sendSqlQuery = async function (query) {
  if (!Server.LocalMode && !Server.ExperimentMode) { //Doesn't use the database if we're running locally/experiments
    console.info(query);  
    try {
      var res = await client.query(query);
      return res;
    } catch (err) {
      Server.databaseFailure(err, query);
      return false;
    }
  }
}

//Handles storing of game data to database
Server.sendSqlQueryGame = function (query, game) {
  if (!Server.LocalMode && !Server.ExperimentMode) { //Doesn't use the database if we're running locally/experiments
    console.info(query);
    try {
      client.query(query, function (err, result) {
        if (err) {
          //Sends email if failure adding to db
          Server.databaseFailureGame(err, game, query);
        }
      });
    } catch (err) {
      Server.databaseFailureGame(err, game, query);
    }
  }
}

//Emails us if there's a problem with the DB and handles game logic
Server.databaseFailureGame = function (err, game, query) {
  console.error(err);

  //only emails at most once per hour
  if (Date.now() - Server.lastAlertTime > 3600000) {
    Server.lastAlertTime = Date.now();
    Server.sendMail("URGENT: Error Adding to Database! " + query, err);
  }

  //Makes players think the other disconnected
  //Suppress errors if either player cannot be reached.
  try {
    Server.sendResults(1, game, "disconnect");
  } catch (err) {}
  try {
    Server.sendResults(2, game, "disconnect");
  } catch (err) {}

  game.killGame(false, game);
}

//Emails us if there's a problem with the DB
Server.databaseFailure = function (err, query) {
  console.error(err);

  //only emails at most once per hour
  if (Date.now() - Server.lastAlertTime > 3600000) {
    Server.lastAlertTime = Date.now();
    Server.sendMail("URGENT: Error Adding to Database! " + query, err);
  }
}

//Sends an email to the contagion account for critical information.
Server.sendMail = function (emailSubject, errtext) {
  var fullText = "Error: " + errtext;

  var mailOptions = {
    from: 'contagiongamesoton@gmail.com',
    to: 'contagiongamesoton@gmail.com', //Can be changed to whoever. May be better to setup forwarding on this account.
    subject: emailSubject,
    text: fullText
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error(error);
    } else {
      console.info('Email sent: ' + info.response);
    }
  });

}

//Initialises a list containing the next layout to be used for each topology, so new players get different layouts
//N.B. This is not used for returning players - they will play new layouts/topologies based on their last played game
Server.initialiseTopologyLayoutIndexes = function () {
  var topologyLayoutIndexes = [];
  for (var i = 0; i < serverConfigs.length; i++) { //If 2 topologies, will be length 2 (layouts do not count)
    topologyLayoutIndexes.push(0);
  }

  Server.CurrentTopologyLayoutIndexes = topologyLayoutIndexes;
  Server.CurrentTopologyIndex = 0; //Similarly to how the list tracks layouts, this variable tracks the next topology to be used
}

//Initialises most server-wide variables (some frequenly changing ones are declared at the top of the file)
function Server() {
  Server.MAX_TOKENS = 5; //Used in game modes where players have all tokens at once but can move them.
  Server.CurrentGames = [];
  Server.WaitingGameConfig = null; //Used to give a 2nd human player the same config as p1.
  Server.RoundLimit = 10;
  Server.AiMode = true; //Always sets player 2 to AI
  Server.InfectionMode = "wowee"; //"majority" to only infect if >50% sources infected, or anything else for voter model.
  Server.AiStrategy = "GreedyPredictsGreedy"; // See 'aiTurn' method for each string
  Server.TokenProtocol = "Incremental"; //"AtStart" to get all tokens at start or "Incremental" for one per round
  Server.AiWaiting = false; //Implements a fake waiting to convince players they are playing against a human
  Server.lastAlertTime = 0; //Records time since last email alert to prevent spam
  Server.demoMode = true; //Prevents timeouts if players take too long
  Server.heartbeatCheckFrequency = 100; //Checks heartbeats from players every X milliseconds
  Server.heartAttackTime = 800; //If no response in X milliseconds, kills game (other player wins)
}

Server();

class GameState {
  constructor(peeps, connections, playerOneLayoutID, playerTwoLayoutID, laplacianID, ws) {
    this.gameID = uuidv4(); //Unique identifier for game, used in db
    this.playerOne = ws; //Stores player by their connection object
    this.playerOne.id = ws.id;
    this.playerOneScore = 0;
    this.playerTwo = null;
    this.formattedPeeps = peeps;
    this.formattedConnections = connections;
    this.playerOneLayoutID = playerOneLayoutID; //Allows different players to be given different layouts
    this.playerTwoLayoutID = playerTwoLayoutID;
    this.playerOneMoves = [];
    this.playerTwoMoves = [];
    this.roundNumber = 0;
    this.flippedNodes = []; //Records all nodes that have changed since last round
    this.playerOneTime = -1; //Starts just before sending config or updated state, ends as we identify whose moves we recieved.
    this.playerTwoTime = -1;
    this.playerTwoTimeOffset = 10000000000 //large value for debug, should only appear if something has gone wrong.
    this.playerOneLastHeartbeat = Date.now(); //uses now() as this is created when the first player joins
    this.playerTwoLastHeartbeat = -1;
    this.timer = setInterval(this.heartbeatHandler, Server.heartbeatCheckFrequency, this); //Checks heartbeats
    this.prevAiMoves = []; //Stores ai's previous moves - used to prevent some headaches with some ai types. Usually equal to playerTwoMoves
    this.gameStartTime = Date.now();
    this.aiCheckTimer = null; //Special timer for adding an AI if a player 2 doesn't appear
    this.playerOneScoreList = []; //Records score per round
    this.playerTwoScoreList = [];
    this.laplacianID = laplacianID; //Stores index of the laplacian used in this game for easy retrieval

    //created rng with random seedword to make it deterministic
    //We create this at the game level to prevent multiple games from affecting others' random number generation
    if (Server.TrialMode) {
      this.predeterminedAIMoves = Server.TestMoves[laplacianID];
      this.rngThreshold = seededRNGGenerator("1"); //These seeds have only a small bias - difficult to eliminate due to variances in topology.
      this.rngStrategy = seededRNGGenerator("Shrek II");
    } else {
      this.rngThreshold = seededRNGGenerator(this.gameID + "1");
      this.rngStrategy = seededRNGGenerator(this.gameID);
    }
    //uses two RNGs because different strategies use different number of calls to random
    this.rngStratCount = 0;
    this.rngThreshCount = 0;
  }

}

//Records game data and sends it as a query to the database
GameState.prototype.addGameToDatabase = function (query) {
  var timestamp = new Date();
  timestamp = timestamp.toISOString().slice(0, -1); //removes the Z from the timestamp. Not strictly necessary as the DB will truncate, but this avoids a warning being produced.
  var infectedPeepsString = "";
  this.formattedPeeps.forEach(function (peep, index) {
    if (peep[2] == 1) {
      infectedPeepsString = infectedPeepsString + index + "_";
    }
  });
  //sets ID to "AI" if they aren't a human player
  var p1id = (this.playerOne != null && this.playerOne != "AI") ? this.playerOne.id : "AI";
  var p2id = (this.playerTwo != null && this.playerTwo != "AI") ? this.playerTwo.id : "AI";
  if (p2id == "AI") {
    //Renames some AI's attributes to be more descriptive in the database
    p2id += Server.AiStrategy;
    this.playerTwoLayoutID = this.playerOneLayoutID;
  }
  var query = `INSERT INTO master_games_table VALUES ('${this.gameID}', '${timestamp}', '${p1id}', '${p2id}', '${infectedPeepsString}',  '${this.playerOneLayoutID}', '${this.playerTwoLayoutID}', '${Server.RemoveOldNodes}');`;
  Server.sendSqlQueryGame(query, this);
}

//updates the database game record if P1 or P2 changes
GameState.prototype.updateGameDatabaseEntry = function () {
  var p1id = (this.playerOne != null && this.playerOne != "AI") ? this.playerOne.id : "AI";
  var p2id = (this.playerTwo != null && this.playerTwo != "AI") ? this.playerTwo.id : "AI";
  var query = `UPDATE master_games_table SET player_one_id = '${p1id}', player_two_id = '${p2id}' WHERE game_id = '${this.gameID}';`;
  Server.sendSqlQueryGame(query, this);
}

//Adds a new row in player_actions_table to record the actions taken this round
GameState.prototype.addMovesToDatabase = function () {
  var flippedString = "";
  //Builds a string from the node IDs that have changed colour this round
  this.flippedNodes.forEach(function (nodeIndex) {
    flippedString = flippedString + nodeIndex + "_";
  });
  flippedString = flippedString.slice(0, -1); //removes trailing underscore

  //Similarly, builds a string from the tokens p1 (and p2 below) have placed
  var p1MovesString = "";
  this.playerOneMoves.forEach(function (move) {
    p1MovesString = p1MovesString + move + "_";
  });
  p1MovesString = p1MovesString.slice(0, -1);

  var p2MovesString = "";
  this.playerTwoMoves.forEach(function (move) {
    p2MovesString = p2MovesString + move + "_";
  });
  p2MovesString = p2MovesString.slice(0, -1);

  var p1Nodes = [];
  var p2Nodes = [];

  //For a more human-readable entry, we record which nodes either player owns after infection
  this.formattedPeeps.forEach(function (peep, index) {
    if (peep[2] == 1) {
      p1Nodes.push(index);
    } else if (peep[2] == 0) {
      p2Nodes.push(index);
    }
  });

  var query = `INSERT INTO player_actions_table VALUES ('${this.gameID}', ${this.roundNumber}, '${this.flippedNodes}', '${this.playerOneMoves}' ,'${this.playerTwoMoves}', ${this.playerOneTime}, ${this.playerTwoTime}, '${p1Nodes}', '${p2Nodes}');`;
  Server.sendSqlQueryGame(query, this);
  //Resets flipped nodes for next round
  this.flippedNodes = [];
}

//Takes moves submitted by a player and stores them
//Also moves the game on if possible (i.e.starts ai's turn, or begins infection process)
GameState.prototype.addPlayerMoves = function (moves, isPlayerOne, opponentReady) {
  //Performs AI moves before recording new player moves (to prevent bias)
  this.aiCheck();
  //Sets either the server's recording of p1 moves or p2 moves depending o who sent it
  isPlayerOne ? (this.playerOneMoves = moves) : (this.playerTwoMoves = moves);
  //If p2 has submitted moves OR is against ai
  if (opponentReady) {
    //Simulates a real opponent to the human player by sometimes waiting before making a move
    if (Server.AiWaiting == true && (this.playerTwo == "AI" || this.playerOne == "AI")) {
      this.fakeAiWait();
    } else {
      //Begins infection process
      this.newTurn();
    }
  } else {
    //Lets player know they must wait for p2's moves
    var recipient = isPlayerOne ? this.playerOne : this.playerTwo;
    Server.sendClientMessage(new Message(null, "DEFERRED_STATE_TOKEN"), recipient);
  }
}

//This is a very naive version that might wait a few seconds. Should be enough to convince users, but can revisit if not.
GameState.prototype.fakeAiWait = function () {
  var rand = Math.random();
  //60% chance of waiting, to make players not feel too rushed
  if (rand > 0.4) {
    rand = Math.random();
    //wait up to 4 seconds, avg. wait of 2s.
    setTimeout(() => {
      this.newTurn();
    }, rand * 4000);
  }
  //Simulates the other player having submitted before you
  else {
    //Begins infection phase
    this.newTurn();
  }
}

//Is called when player 1 submits moves - calls the generic addPlayerMoves, plus extra logic to handle waiting for opponent or hot-swapping AI
GameState.prototype.addPlayerOneMoves = function (moves) {
  //Will not fail the player for taking too long this round
  clearTimeout(this.playerOneTimer);
  //Records when the move was made in milliseconds, where 0 is start of the game
  this.playerOneTime = Date.now() - this.gameStartTime;
  this.addPlayerMoves(moves, true, (this.playerTwo == "AI" || this.playerTwoMoves.length > 0));
  if (this.roundNumber == 0) {
    //No P2 present
    if (this.playerTwo == null) {
      //Replaces the game-ending timer with a soft timer for the remaining duration+10s that will add an AI if nobody is present
      this.addPlayerOneTimer(70 - (Date.now() - this.gameStartTime));
    }
    //P2 present, but not submitted yet
    else if (this.playerTwo != "AI" && this.playerTwoMoves.length == 0) {
      //Calculates the time P2 has remaining
      this.addPlayerOneTimer(60 + this.playerTwoTimeOffset - (Date.now() - this.gameStartTime));
    }
  }
}

//Lets player one know how long player two has left to submit
GameState.prototype.addPlayerOneTimer = function (duration) {
  if (duration < 1) {
    duration = 1;
  }
  this.aiCheckTimer = setTimeout(() => {
    this.addPlayerTwoAI();
  }, duration);
  Server.sendClientMessage(new Message([1, duration - 1], "TIMER_TOKEN"), game.playerOne);
}

//Similar to addPlayerOneMoves, extra logic is not needed here as any extra waiting logic implemented elsewhere.
GameState.prototype.addPlayerTwoMoves = function (moves) {
  clearTimeout(this.playerTwoTimer);
  this.playerTwoTime = (Date.now() - this.gameStartTime) - this.playerTwoTimeOffset;
  this.addPlayerMoves(moves, false, (this.playerOne == "AI" || this.playerOneMoves.length > 0));
}

//returns the AI player's moves if the game is using an AI
//returns null if the game is run only by AI, and should be shut down.
GameState.prototype.aiCheck = function () {
  var oneAI = this.playerOne == "AI";
  var twoAI = this.playerTwo == "AI";
  if (oneAI || twoAI) {
    if (oneAI && twoAI) {
      //both AI. kill game.
      this.killGame(false, this);
    } else {
      var aiPlayer = this.playerTwoMoves; //WARN: Assumes P2 always AI.
      this.aiTurn(aiPlayer, 0, Server.AiStrategy);
    }
  }
  //no AI players, so do nothing
}

//Checks the game to ensure that both players remain connected
//Kills the game and causes the disconnector to lose if doesn't respond in time
GameState.prototype.heartbeatHandler = function (game) {
  var now = Date.now();
  if (!Server.demoMode && !Server.ExperimentMode) {
    //Kills game if time since last heartbeat is longer than acceptable
    if (now - game.playerOneLastHeartbeat > Server.heartAttackTime) {
      console.error("Heart attack1!");
      try {
        //Lets other player know of disconnect
        Server.sendResults(2, game, "disconnect");
      } catch (e) {
        console.error("Error when sending gameend msg: " + e);
      }
      game.killGame(false, game);
    }
    //Does same for other player
    if (game.playerTwo !== "AI" && game.playerTwo !== null && now - game.playerTwoLastHeartbeat > Server.heartAttackTime) {
      console.error("Heart attack2!");
      try {
        Server.sendResults(1, game, "disconnect");
      } catch (e) {
        console.error("Error when sending gameend msg: " + e);
      }
      game.killGame(false, game);
    }
  }
}

//Stores player clicks in the database
GameState.prototype.registerClick = function (playerID, nodeID, action) {
  //milliseconds since game start
  var timestamp = Date.now() - this.gameStartTime;
  var query = `INSERT INTO player_clicks_table VALUES ('${this.gameID}', '${playerID}', '${nodeID}', '${action}', '${timestamp}', '${this.roundNumber}');`;
  Server.sendSqlQueryGame(query, this);
}

//Removes game from the server's list of active games
GameState.prototype.removeGame = async (game) => {
  var index = Server.CurrentGames.indexOf(game);
  Server.CurrentGames.splice(index, 1);
}

//naturalEnd is true when the game ends by reaching the max number of rounds.
GameState.prototype.killGame = function (naturalEnd, game, causer) {
  if (causer != null) {
    try {
      //if p1 caused the game end by disconnecting
      if (causer == "p1") {
        Server.sendResults(2, game, "disconnect");
      } else if (causer == "p2") {
        Server.sendResults(1, game, "disconnect");
      }
    } catch (err) {} //Suppresses error if other player is an AI
    if (causer != "p1" && causer != "p2") {
      console.error("wtf! " + causer);
      Server.sendMail("URGENT: Unknown cause of game failure!", causer);
    }
  }
  if (naturalEnd) {
    //send score, etc.
    //Determines who is the winner/loser and sends their score along with win/lose status
    if (game.playerTwo == "AI") {
      if (game.playerOneScore > game.playerTwoScore) {
        Server.sendResults(1, game, "win");
      } else if (game.playerOneScore < game.playerTwoScore) {
        Server.sendResults(1, game, "lose");
      } else {
        Server.sendResults(1, game, "draw");
      }
    } else {
      if (game.playerOneScore > game.playerTwoScore) {
        Server.sendResults(1, game, "win");
        Server.sendResults(2, game, "lose");
      } else if (game.playerOneScore < game.playerTwoScore) {
        Server.sendResults(1, game, "lose");
        Server.sendResults(2, game, "win");
      } else {
        Server.sendResults(1, game, "draw");
        Server.sendResults(2, game, "draw");
      }
    }

  }
  //Clears any game-ending timers that are still operating
  clearInterval(game.timer);
  clearTimeout(game.playerOneTimer);
  clearTimeout(game.playerTwoTimer);

  //Removes this game from list of active games
  this.removeGame(game);
}

//After getting moves from both players
//Runs infection logic, updates database, updates player scores & sends players the new state.
GameState.prototype.newTurn = function () {
  this.roundNumber++;
  this.performInfections();
  this.addMovesToDatabase();
  this.updateScores();
  this.updateClients();

  //Ends game if #rounds over
  if (this.roundNumber >= Server.RoundLimit) {
    this.killGame(true, this);
  } else {
    //gives players 31s to make a move
    if (this.playerOne != "AI") {
      Server.startTimer(this, 0, 31, true);
    }
    if (this.playerTwo != "AI") {
      Server.startTimer(this, 0, 31, false);
    }
  }
}

//Calculates players' scores based on previous round + nodes infected this round
GameState.prototype.updateScores = function () {
  var playerOnePeepsCount = 0;
  var playerTwoPeepsCount = 0;

  //Records how many nodes owned by each player
  this.formattedPeeps.forEach(function (peep) {
    if (peep[2] == 1) {
      playerOnePeepsCount++;
    } else if (peep[2] == 0) {
      playerTwoPeepsCount++;
    }
  });
  //Each node worth 10 points
  var p1additionalScore = playerOnePeepsCount * 10;
  var p2additionalScore = playerTwoPeepsCount * 10;

  //Applies 5x bonus to the final round
  if (this.roundNumber == 10) {
    p1additionalScore = p1additionalScore * Server.LastRoundBonus;
    p2additionalScore = p2additionalScore * Server.LastRoundBonus;
  }

  this.playerOneScore += p1additionalScore;
  this.playerOneScoreList.push(this.playerOneScore);
  this.playerTwoScore += p2additionalScore;
  this.playerTwoScoreList.push(this.playerTwoScore);
}

//Sends the clients an array of length equal to the number of peeps
//Each element is a pair of (infectedState, enemytokens)
//Where infectedState = 1 if infected, 0 if not (from player 1's perspective)
//-1 is neutral for everyone
//enemytokens is the number of tokens the enemy put on that peep, showing their last move.
GameState.prototype.updateClients = function () {
  var peepsToSend = [];
  var movesToSend = [];

  if (this.playerOne !== "AI" && this.playerOne !== null) {

    this.formattedPeeps.forEach(function (peep) {
      peepsToSend.push(peep[2]);
    })
    this.playerTwoMoves.forEach(function (move) {
      movesToSend.push(move);
    })

    var payload = [peepsToSend, movesToSend, this.playerOneScore];
    Server.sendClientMessage(new Message(payload, "UPDATE_STATE_TOKEN"), this.playerOne);
  }

  if (this.playerTwo !== "AI" && this.playerTwo !== null) {
    //Clears these so we can populate them with the game state from player 2's perspective
    peepsToSend = [];
    movesToSend = [];

    this.formattedPeeps.forEach(function (peep) {
      if (peep[2] == -1) {
        peepsToSend.push(peep[2]);
      }
      //1 - infected status from P1's POV gives infected state for P2's POV
      else {
        peepsToSend.push(1 - peep[2]);
      }
    })
    this.playerOneMoves.forEach(function (move) {
      movesToSend.push(move);
    })

    var payload = [peepsToSend, movesToSend, this.playerTwoScore];
    Server.sendClientMessage(new Message(payload, "UPDATE_STATE_TOKEN"), this.playerTwo);
  }
}

//NB: INFECTED/UNINFECTED IS FROM POV OF PLAYER1!
GameState.prototype.performInfections = function () {
  var updatedPeeps = JSON.parse(JSON.stringify(this.formattedPeeps));
  updatedPeeps.forEach(function (peep) {
    peep.push(0);
    peep.push(0);
  });
  //required as using 'this' in the loop uses the loop's scope, and can't access the variable needed
  var originalPeeps = this.formattedPeeps;

  //Adds to the 'infected friends' ([3]) and 'total friends' ([4]) counts based on the peeps connected via lines.
  this.formattedConnections.forEach(function (connection) {
    var peep1 = updatedPeeps[connection[0]];
    var peep2 = updatedPeeps[connection[1]];
    //NB: It's ok to use the infection stats of updatedPeeps here because we're only calculating the likelihood of infection here.
    //The actual infecting step takes place after, which is the only thing that could cause a difference in calculations.
    //The third item in the peep array is the infected state. 1 = infected by player, 0 = infected by enemy, -1 = neutral
    if (peep2[2] != -1) {
      //Ignore peep if in neutral state
      peep1[3] += peep2[2];
      peep1[4]++;
    }
    if (peep1[2] != -1) {
      peep2[3] += peep1[2];
      peep2[4]++;
    }
  });

  //Adds to friends based on player one's tokens (i.e. always adds to both infected and total friends)
  this.playerOneMoves.forEach(function (move) {
    updatedPeeps[move][3]++;
    updatedPeeps[move][4]++;
  });

  //Adds to friends based on player two's tokens (i.e. always adds to just total friends)
  this.playerTwoMoves.forEach(function (move) {
    updatedPeeps[move][4]++;
  });

  updatedPeeps.forEach(function (peep, index) {
    var rand = this.game.randThreshold(); //we need to call a rand for each node regardless of whether or not we use it to make sure the random numbers generated are the same each time
    //prevents / by 0 error for peeps surrounded by neutral peeps
    if (peep[4] > 0) {
      var ratio = peep[3] / peep[4];
      if (Server.InfectionMode == "majority") { //For the majority model (i.e. only change colour if one side has more sources of influence)
        //If more friendly sources than enemy
        if (ratio > 0.5) {
          peep[2] = 1;
        }
        //If more enemy sources than friendly
        else if (ratio < 0.5) {
          peep[2] = 0;
        }
      } else {
        if (ratio >= rand) { //Adding random element for voter model
          peep[2] = 1;
        } else {
          peep[2] = 0;
        }
      }
    }
  });

  //Updates the record of which nodes have changed colour this round
  var flippedNodes = this.flippedNodes;
  originalPeeps.forEach(function (peep, index) {
    if (peep[2] != updatedPeeps[index][2]) { //Using != also allows us to capture neutral node changes
      if (updatedPeeps[index][2] == 1) {
        flippedNodes.push(index + "p"); //Indicates changes to player nodes
      } else {
        flippedNodes.push(index);
      }
    }
    peep[2] = updatedPeeps[index][2];
  });


}

//Handles logic regarding ai strategies
GameState.prototype.aiTurn = function (aiMoves, friendlyNodeStatus, strategy) {
  aiMoves = []; //Will contain the chosen moves
  //for a previous version where there would be 5 tokens to start, then 1 token moved each time.
  var oneNodeOnly = (this.prevAiMoves.length == 0) ? false : true;
  if (Server.TrialMode && this.isServerPlayer(friendlyNodeStatus)) {
    //Uses the preset moves if running a trial (and is not representing a human player during AI vs AI experiments)
    this.aiTurnPredetermined(aiMoves, oneNodeOnly);
    return;
  }
  switch (strategy) {
    //Has one case for each strategy type
    case "SimpleGreedy":
      var aiTurnSimpleGreedy = require('./MyopicGreedy.js'); //Calls the external file
      var ctx = this; //Allows the external file to access the same resources as from here
      //don't need to remove worst token, so 2nd param false. No anticipation so 5th param ""
      aiTurnSimpleGreedy(aiMoves, false, ctx, friendlyNodeStatus, "");
      break;
    case "GreedyPredictsHigh":
      var aiTurnSimpleGreedy = require('./MyopicGreedy.js');
      var ctx = this;
      var laplacian = clone(laplaciansList[this.laplacianID]);
      aiTurnSimpleGreedy(aiMoves, false, ctx, friendlyNodeStatus, "High", laplacian);
      break;
    case "GreedyPredictsGreedy":
      var aiTurnSimpleGreedy = require('./MyopicGreedy.js');
      var ctx = this;
      aiTurnSimpleGreedy(aiMoves, false, ctx, friendlyNodeStatus, "Greedy"); //don't need to remove worst token, so just false
      break;
    case "Equilibrium":
      this.aiTurnEquilibrium(aiMoves, oneNodeOnly, friendlyNodeStatus);
      break;
    case "DSLow":
      this.aiTurnDegreeSensitive(aiMoves, oneNodeOnly, true, friendlyNodeStatus); //True for low degree preference
      break;
    case "DSHigh":
      this.aiTurnDegreeSensitive(aiMoves, oneNodeOnly, false, friendlyNodeStatus);
      break;
    case "Mirror":
      this.aiTurnMirror(aiMoves, oneNodeOnly, friendlyNodeStatus);
      break;
    case "Random":
      this.aiTurnRandom(aiMoves, oneNodeOnly, friendlyNodeStatus);
      break;
    default:
      console.err("ERROR! INVALID STRATEGY!");
      break;
  }
  if (this.isServerPlayer(friendlyNodeStatus)) {
    this.playerTwoMoves = aiMoves; //Allows server to add moves for either player
  } else {
    return aiMoves[0];
  }
}

//Simple wrapper to determine whether we are playing from the server AI's POV (used in regular games)
//or the experiment opposing AI(fake opponent played by the same type of ai)
GameState.prototype.isServerPlayer = function (friendlyNodeStatus) {
  if (friendlyNodeStatus == 0) {
    return true;
  } else {
    return false;
  }
}

//random strategy
GameState.prototype.aiTurnRandom = function (aiMoves, oneNodeOnly, friendlyNodeStatus) {
  //adds one token when the token protocol is incremental
  if (Server.TokenProtocol == "Incremental") {
    //Selects random node from the list of nodes.
    var peepIndex = Math.floor(Math.random() * this.formattedPeeps.length);
    //Performs logic to add the chosen move to either player
    if (this.isServerPlayer(friendlyNodeStatus)) {
      this.prevAiMoves.push(peepIndex);
      this.prevAiMoves.forEach(function (move) {
        aiMoves.push(move);
      });
    } else {
      aiMoves.push(peepIndex);
    }
    return;
  } else {
    console.log("Temporarily disabling other options."); //Change here if you wish to re-enable other game modes
    return;
  }
  //Previous functionality - e.g. when adding 5 tokens at start

  // if (!oneNodeOnly){
  //   for(i=0 ; i < Server.MAX_TOKENS; i++){
  //       var peepIndex = Math.floor(Math.random()*this.formattedPeeps.length);
  //       aiMoves.push(peepIndex);
  //       if(this.isServerPlayer(friendlyNodeStatus)){
  //         this.prevAiMoves.push(peepIndex);
  //       }
  //   }
  // }
  // else{
  //   var index = Math.floor(Math.random()*Server.MAX_TOKENS);
  //   var peepIndex = Math.floor(Math.random()*this.formattedPeeps.length);
  //   if(this.isServerPlayer(friendlyNodeStatus)){
  //     this.prevAiMoves.splice(index, 1);
  //     this.prevAiMoves.push(peepIndex);
  //     this.prevAiMoves.forEach(function(peep){
  //       aiMoves.push(peep);
  //     });
  //   }
  //   else{
  //     console.error("ERROR: NOT DEVELOPED FOR EXPERIMENTAL AI YET!");
  //   }
  //}
}



//Strategy to maximise score at some time-insensitive equilibrium
GameState.prototype.aiTurnEquilibrium = function (aiMoves, oneNodeOnly, friendlyNodeStatus) {
  //Don't have any opponent moves to base own move off of, so plays randomly.
  if (this.roundNumber == 0) {
    this.aiTurnRandom(aiMoves, oneNodeOnly, friendlyNodeStatus);
    return;
  }

  //adds one token when the token protocol is incremental
  if (Server.TokenProtocol == "Incremental") {
    var friendlyMoves;
    var enemyMoves;

    if (this.isServerPlayer(friendlyNodeStatus)) { //Determines which moves are the current players'
      friendlyMoves = this.playerTwoMoves; //We want to find the best value for this, as we are playing as the AI here.
      enemyMoves = this.playerOneMoves;
    } else {
      friendlyMoves = this.playerOneMoves;
      enemyMoves = this.playerTwoMoves;
    }

    //As moves are stored as a list, we initiallise vectors with zeroes.
    var friendlyMovesVector = [];
    var enemyMovesVector = [];
    for (var i = 0; i < Server.NumberOfNodes; i++) {
      friendlyMovesVector.push(0);
      enemyMovesVector.push(0);
    }

    var laplacian = clone(laplaciansList[this.laplacianID]);

    for (var i = 0; i < friendlyMoves.length; i++) {
      //NB: Player/AI represent perspective of who is running this code - both could be AI.
      laplacian[friendlyMoves[i]][friendlyMoves[i]]++; //adds p_b for the AI player's ith token
      laplacian[enemyMoves[i]][enemyMoves[i]]++; //p_a for player's ith token
      friendlyMovesVector[friendlyMoves[i]]++; //Also updates the vector of ai moves at the same time
      enemyMovesVector[enemyMoves[i]]++;
    }

    var maxScore = 0;
    var bestNode = -1;
    //Loops through all nodes to find the node that will provide best improvement based on the equilibrium strategy
    for (var i = 0; i < Server.NumberOfNodes; i++) {
      //Creates vector of probabilities that each node will be owned by the agent running this code.
      var probabilitiesVector = this.createProbabilitiesVector(laplacian, friendlyMovesVector, i);
      //Sums these probabilities to get a fitness (i.e. maximise score)
      var selectionFitness = this.calculateFitness(probabilitiesVector);
      //Records best node & its score
      if (selectionFitness > maxScore) {
        maxScore = selectionFitness;
        bestNode = i;
      }
    }
    this.createProbabilitiesVector(laplacian, friendlyMovesVector, bestNode);
    var peepIndex = bestNode;

    //As before, performs necessary logic to add the best token to the current agent's moveset.
    if (this.isServerPlayer(friendlyNodeStatus)) {
      this.prevAiMoves.push(peepIndex);
      this.prevAiMoves.forEach(function (move) {
        aiMoves.push(move);
      });
    } else {
      aiMoves.push(peepIndex);
    }
    return;
  } else {
    console.error("ERROR! This algorithm hasn't been developed for non-incremental token protocol yet!");
  }
}

//Creates vector of probabilities that each node will be owned by the agent running this code.
GameState.prototype.createProbabilitiesVector = function (laplacian, friendlyMovesVector, i) {
  laplacian[i][i]++;
  friendlyMovesVector[i]++; //adds the token to test to the node. This affects both L and p_b (ai moves)

  var invLaplacian = extMath.inv(laplacian); //Inverts the matrix
  var probVector = extMath.multiply(friendlyMovesVector, invLaplacian); //Multiplies p_b by inverted L

  laplacian[i][i]--;
  friendlyMovesVector[i]--; //reverts the change to this var to avoid an expensive clone operation
  return probVector;

}

//Determines how good the probability vector is
GameState.prototype.calculateFitness = function (probabilitiesVector) {
  return extMath.sum(probabilitiesVector); //adds all values in the array
}

//Old test method - I kept it in to see how you could go about testing things, but it's mostly overtaken by ExperimentalAi.js
//This examines the impact of different exponent strength (how much the AI prefers to add to high/low degree nodes) and existing token bias
GameState.prototype.aiTurnDegreeSensitiveTest = function (aiMoves, oneNodeOnly, lowDegreeSensitivity, friendlyNodeStatus) {
  return;
  var monteOrig = [];
  for (var i = 0; i < Server.NumberOfNodes; i++) {
    monteOrig.push(0);
  }

  for (var i = 0; i < 6; i++) {
    //Tests with various exponent strengths
    ExponentStrength = 0.25 + i * 0.05;
    for (var j = 0; j < 5; j++) {
      //Tests with various existing token biases (i.e. if already tokens here, less likely to add more)
      Server.ExistingTokensBias = 0 - 0.5 * j;
      var monte = clone(monteOrig);
      //Does many iterations for accuracy
      for (var iter = 0; iter < 10000; iter++) {
        this.prevAiMoves = [];
        for (var round = 0; round < 10; round++) {
          this.aiTurnDegreeSensitive(aiMoves, oneNodeOnly, lowDegreeSensitivity, friendlyNodeStatus, monte);
        }
      }
      for (var x = 0; x < Server.NumberOfNodes; x++) {
        monte[x] = monte[x] / 10000;
      }
    }

  }
}

//Adds tokens based on the degrees of each node.
GameState.prototype.aiTurnDegreeSensitive = function (aiMoves, oneNodeOnly, lowDegreeSensitivity, friendlyNodeStatus, monte) {
  if (Server.TokenProtocol == "Incremental") {
    var nodeWeights = [];
    //I repurpose the laplacian here - taking the diagonal just gives me the degrees of each node!
    var laplacian = clone(laplaciansList[this.laplacianID]);

    //Represents existing tokens as extra/fewer degrees on the node depending on the effect you want extra tokens to have.
    //NOTE: We decided that this makes analysing games too difficult, so you can ignore this block.
    if (Server.ExistingTokensBias != 0) {
      if (this.isServerPlayer(friendlyNodeStatus)) {
        for (var i = 0; i < this.prevAiMoves.length; i++) { //Is agnostic of opponent's moves
          var token = this.prevAiMoves[i];
          laplacian[token][token] += Server.ExistingTokensBias;
        }
      } else { //This is the above but for when the experimental opposition AI is playing.
        for (var i = 0; i < this.length; i++) {
          var token = this.playerOneMoves[i];
          laplacian[token][token] += Server.ExistingTokensBias;
        }
      }
    }
    for (var i = 0; i < Server.NumberOfNodes; i++) {
      var nodeDegree = laplacian[i][i]; //Gets the node degree from the laplacian diagonal

      //Assigns a weight (i.e. relative likelihood of being chosen) to the node depending on # degrees and high/low preference
      if (lowDegreeSensitivity) {
        var nodeWeight = extMath.exp(ExponentStrength * nodeDegree * -1); //negative exponent weights high degree nodes lower
      } else {
        var nodeWeight = extMath.exp(ExponentStrength * nodeDegree); //e^(strength*degree)
      }
      nodeWeights.push(nodeWeight);
    }
    var max = extMath.sum(nodeWeights); //Gets the sum of all the weights to facilitate the choice below.

    //nodeWeights[i] = nodeWeights[i] * 100 / max; //normalises the list, becomes % chance to pick. Use this for debugging if you want.

    // for (var i=0; i < 10000; i++){ //Old testing code - useful for debugging.
    //     monte[this.chooseFromDistribution(nodeWeights, 100)]++;
    // }

    //Samples a node from the weighting distribution
    var peepIndex = this.chooseFromDistribution(nodeWeights, max);

    //As always, assigns the node to the player's moveset.
    if (this.isServerPlayer(friendlyNodeStatus)) {
      this.prevAiMoves.push(peepIndex);
      this.prevAiMoves.forEach(function (move) {
        aiMoves.push(move);
      });
    } else {
      aiMoves.push(peepIndex);
    }
    //monte[peepIndex]++;
    // this.prevAiMoves.forEach(function(move){
    //   aiMoves.push(move);
    // });
    return;
  } else {
    console.error("ERROR! This algorithm hasn't been developed for non-incremental protocol yet!");
  }
}

//Samples a node based on the distribution of weights.
//The weights are summed to give a maxValue, and starting from node 0, we check if the random value is 
//part of each bucket (representing each node's weighting)
GameState.prototype.chooseFromDistribution = function (distribution, maxValue) {
  var rand = Math.random() * maxValue;
  for (var i = 0; i < distribution.length; i++) {
    rand -= distribution[i];
    if (rand < 0) {
      return i;
    }
  }
  console.error("ERROR CHOOSING FROM DISTRIBUTION!");
}

//AI strategy that begins random, then does whatever the opponent did last.
GameState.prototype.aiTurnMirror = function (aiMoves, oneNodeOnly, friendlyNodeStatus) {

  //Places token randomly as don't have any data on the opponent to copy
  if (this.roundNumber == 0) {
    this.aiTurnRandom(aiMoves, oneNodeOnly, friendlyNodeStatus);
    return;
  }
  var peepIndex = -1;
  if (this.isServerPlayer(friendlyNodeStatus)) {
    peepIndex = this.playerOneMoves[this.playerOneMoves.length - 1]; //Gets opponent's last move
    this.prevAiMoves.push(peepIndex); //And adds it to our moveset
    this.prevAiMoves.forEach(function (move) {
      aiMoves.push(move);
    });
  } else {
    peepIndex = this.playerTwoMoves[this.playerTwoMoves.length - 1]; //Same as above but for when AI is representing the player
    aiMoves.push(peepIndex);
  }
}

//Performs moves based on the predetermined moves at the top of this class.
GameState.prototype.aiTurnPredetermined = function (aiMoves, oneNodeOnly) {
  var peepIndex = this.predeterminedAIMoves[this.roundNumber];
  this.prevAiMoves.push(peepIndex);
  this.prevAiMoves.forEach(function (move) {
    aiMoves.push(move);
  });
  //NOTE: Hack because its an insidious problem and this is just needed for the trial
  this.playerTwoMoves = this.prevAiMoves;
  return;
}

//Wrapper for the calls to random, so we can see how many times it's called.
//This is useful for when we're using random seeds, so we can see if we can determine what number is generated when
//We have a separate one for strategy and threshold, as different strategies use different numbers of random calls
//Therefore we can always maintain a predictable set of thresholds even if strategies make different # random calls
GameState.prototype.randStrategy = function () {
  this.rngStratCount++;
  return this.rngStrategy();
}

GameState.prototype.randThreshold = function () {
  this.rngThreshCount++;
  return this.rngThreshold();
}

//Adds a second human player to the game 
GameState.prototype.addPlayerTwo = function (ws) {
  this.PLAYER_TWO_AI = false;
  this.playerTwo = ws;
  this.playerTwo.id = ws.id;
  this.playerTwoScore = 0;
  this.playerTwoLastHeartbeat = Date.now();
  //adds the game to the database now we have a full game.
  this.updateGameDatabaseEntry();
}

//Similar to above, but for adding AIs (e.g. when we want PvAI, or a player 2 hasn't arrived in time)
GameState.prototype.addPlayerTwoAI = function () {
  this.aiCheckTimer = null;
  this.playerTwo = "AI";
  this.playerTwoScore = 0;
}

//When a player doesn't submit a move in time
GameState.prototype.outOfTime = function (isPlayerOne) {
  //Prevents this from happening during demos
  if (!Server.demoMode) {
    console.info("!!!!OUTTATIME: " + isPlayerOne);
    //Sends time up to losing player, 'other player disconnected' to winning player
    if (isPlayerOne) {
      Server.sendResults(1, game, "time");
      Server.sendResults(2, game, "disconnect");
    } else {
      Server.sendResults(1, game, "time");
      Server.sendResults(2, game, "disconnect");
    }
    this.killGame(false, this);
  }
}

//########################################################################################END GAMESTATE

//When a player sends clicks, moves or heartbeats to the server, we find the game and make sure it's still alive
Server.validateGame = function (ws) {

  //Finds the game the current websocket belongs to
  let game = Server.CurrentGames.filter(gameState => {
    return (gameState.playerOne == ws || gameState.playerTwo == ws);
  });

  //If for some reason it is in multiple games, we throw an error (for debugging, this shouldn't happen)
  if (game.length > 1) {
    console.err("ERR: USER IS IN MUPLTIPLE GAMES.");
    return null;
  }

  //If user is in no games, doesn't return any game. Logging this will likely clog the log feed due to heartbeats on the main menu
  if (game.length < 1) {
    return null;
  }

  game = game[0]; //Converts the single-element list to element
  if (game.roundNumber > 10) {
    console.err("ERR: User submit moves but game already over.");
  } else return game;
}

//Receives & stores the players' moves
Server.submitMoves = function (message, ws) {

  //Retrieves game
  game = Server.validateGame(ws);
  if (game == null) {
    return;
  }

  //Validates no. tokens
  if (Server.TokenProtocol == "Incremental" && message.length != game.roundNumber + 1) {
    console.error("ERR ERR WRONG NO OF TOKENS!" + message.length + " " + game.roundNumber);
  }

  //Assigns the moves to the appropriate player
  if (game.playerOne === ws) {
    game.addPlayerOneMoves(message);
  } else {
    game.addPlayerTwoMoves(message);
  }
}

//Creates a config for the next game
//perm = list of players' layout permutations, stored in their websocket. Only for ai vs player
Server.getConfig = function (twoPlayerMode, perm) {
  //If not ai vs player OR player doesn't have a permutation list for whatever reason
  if (perm == undefined) {
    //picks a topology at random
    var topologyID = Server.CurrentTopologyIndex;
    //Lets the server choose the next topology in the looping list next time
    Server.CurrentTopologyIndex = (Server.CurrentTopologyIndex + 1) % serverConfigs.length;
    //P1 Topology
    var layoutID = Server.CurrentTopologyLayoutIndexes[topologyID];
    //Also chooses the next layout of that particular topology's looping list next time
    Server.CurrentTopologyLayoutIndexes[topologyID] = (Server.CurrentTopologyLayoutIndexes[topologyID] + 1) % serverConfigs[topologyID].length;
    var p2LayoutID = Server.CurrentTopologyLayoutIndexes[topologyID];
  } else {
    //Gets the topology & layout from the perm value
    //NOTE: NPerm changes one layer above this in the newgame method
    var mixedTopologyID = perm[0];
    var topologyID = Math.floor(mixedTopologyID / serverConfigs.length);
    var layoutID = mixedTopologyID % serverConfigs.length;
    var p2LayoutID = layoutID; //TODO: make this work outside the trial
  }
  if (twoPlayerMode) {
    //For a 2 player game, we want them to use the same topology but different layout. If there's no player two, the assignment on the previous line won't have any effect.
    Server.CurrentTopologyLayoutIndexes[topologyID] = (Server.CurrentTopologyLayoutIndexes[topologyID] + 1) % serverConfigs[topologyID].length;
  }
  var config = {
    type: "sim",
    //The sim object covers the whole screen, so we start at [0,0]
    x: 0,
    y: 0,
    fullscreen: true,
    network: clone(serverConfigs[topologyID][layoutID]),
    playerTwoNetwork: clone(serverConfigs[topologyID][p2LayoutID]),
    playerOneLayoutID: serverConfigs[topologyID][layoutID].uniqueLayoutID,
    playerTwoLayoutID: serverConfigs[topologyID][p2LayoutID].uniqueLayoutID,
    //Stores laplacian ID for easy retrieval in the AI strategies that use it
    laplacianID: serverConfigs[topologyID][layoutID].laplacianID,
    tokenProtocol: Server.TokenProtocol
  }
  return config;
}

//Boilerplate websocket code. Not much to change here.
wss.on('connection', ((ws) => {
  //Adds unique ID to the websocket so we can uniquely ID players. NOT the same as the one they enter at the beginning.
  ws.id = uuidv4();
  console.info("New Connection: " + ws.id);
  ws.on('message', (message) => {
    //Parses messages received from the client
    Server.ParseMessage(message, ws);
  });
  ws.on('end', () => {});
  ws.send('Successful Connection to Server');
}));

//Sends messages to the client. But you already knew that.
Server.sendClientMessage = function (message, ws) {
  try {
    //Needs to be in JSON format to send
    ws.send(JSON.stringify(message));
  } catch (err) {
    console.error("ERR ERR ERR SENDING MESSAGE FAILURE:");
    console.error(err);
  }
}

//Adds a new player's username to the system when starting a game + gives them a layout permutation set
//Or takes the next permutation if they already exist
Server.processUsername = function (username, ws) {
  var complete = false;
  //If client doesn't submit a username at all
  if (username == undefined) {
    console.error("bad1");
    username = uuidv4();
  }
  //Edge case for above
  if (username == null) {
    console.error("bad2");
    username = uuidv4();
  }
  //Another edge case (empty name string)
  if (!username.length > 0) {
    console.error("bad3");
    username = uuidv4();
  }

  //Player already exists, so we take their next layout permutation
  var found = Server.playerTopologies.find(function (item) {
    if (item[0] == username) {
      ws.permutation = item[1];
      complete = true;
    }
  });

  //Valid username but can't find player - we make them a new permutation list
  if (complete == false) {
    var perm = Server.generatePerm();
    ws.permutation = perm;
    Server.playerTopologies.push([username, perm]);
  }

}

//Creates a new game when a player requests one
Server.newGame = function (username, ws) {
  Server.processUsername(username, ws);
  ws.id = username; //allows for easier tracking in the database
  if (ws.id.length > 36) {
    ws.id = ws.id.substring(0, 36); //prevent too long usernames from making the db fail to record games
  }

  //Gets number of games user is currently in
  let gameTest = Server.CurrentGames.filter(gameState => {
    return (gameState.playerOne == ws || gameState.playerTwo == ws);
  });

  //If we've found at least one game
  if (gameTest.length != 0) {

    if (gameTest.length > 1) {
      //Emails admins about critical failure (user in many games at once)
      Server.sendMail("User in many games at once!!");
    }
    //Kills off a still-running game with this player in (maybe they refreshed mid-game)
    if (gameTest[0].playerOne == ws) {
      gameTest[0].killGame(false, gameTest, "p1");
    } else {
      gameTest[0].killGame(false, gameTest, "p2");
    }
    return;
  }
  //If nobody's waiting for a player 2
  if (Server.AiMode || Server.WaitingGameConfig == null) {

    //If expecting a P2 later, sets up config to be sent to P2 when they arrive
    if (!Server.AiMode) {
      var config = Server.getConfig(true);
      Server.WaitingGameConfig = config;
    }
    //Not expecting a human P2 so gets the config right away (true vs false parameter in getConfig)
    else {
      try {
        var config = Server.getConfig(false, ws.permutation); //Don't need to retain the config for the next player if its vs the AI.
      } catch (e) {
        console.error("TRIGGERED FAILSAFE WITH GETTING CONFIG!");
        config = Server.getConfig(false);
      }
      ws.permutation.push(ws.permutation.shift()); //Shifts the permutation list so the next layout will be picked next time
    }

    var game = new GameState(config.network.peeps, config.network.connections, config.playerOneLayoutID, config.playerTwoLayoutID, config.laplacianID, ws);

    //Adds game to the server's list
    Server.CurrentGames.push(game);
    if (Server.AiMode) {
      game.addPlayerTwoAI();
    }
    game.gameStartTime = Date.now();
    game.addGameToDatabase();

    //Sets limit of 1 token per round if doing an incremental strategy
    config.maxConnections = (Server.TokenProtocol == "Incremental") ? 1 : Server.MAX_TOKENS;
    config.gameID = game.gameID;
    //Removes unneccessary player 2 information from the config
    delete config.playerTwoNetwork;
    delete config.playerTwoLayoutID;
    delete config.playerOneLayoutID; //Don't want to give player any idea of if they're player 1 or 2
    Server.sendClientMessage(new Message(config, "CONFIG_TOKEN"), ws);
    Server.startTimer(game, 0, 61, true);

  }

  //Matches a player when somebody is waiting
  else {
    var config = Server.getConfig(false); //false means we don't use this same config next time
    Server.WaitingGameConfig = null; //TODO: Nowhere are we actually using this value. Interesting we're not using it here. But the game works?
    config.network.peeps.forEach(function (peep) {
      //reverses the infected state for P2
      if (peep[2] != -1) {
        peep[2] = 1 - peep[2];
      }
    });

    //Similar code to above
    var game = Server.CurrentGames[Server.CurrentGames.length - 1];
    game.addPlayerTwo(ws);
    game.playerTwoTimeOffset = Date.now() - game.gameStartTime;
    config.network = clone(config.playerTwoNetwork);
    delete config.playerTwoNetwork;
    delete config.playerTwoLayoutID;
    delete config.playerOneLayoutID;
    Server.sendClientMessage(new Message(config, "CONFIG_TOKEN"), ws);
    Server.startTimer(game, 0, 61, false);
  }
}

//When game ends, send win/lose/draw messages to all players
Server.sendResults = function (playerNo, game, result) {
  try {
    if (playerNo == 1) {
      Server.sendClientMessage(new Message([result, game.playerOneScoreList, game.playerTwoScoreList], "GAME_END_TOKEN"), game.playerOne);
    } else if (playerNo == 2) {
      Server.sendClientMessage(new Message([result, game.playerTwoScoreList, game.playerTwoScoreList], "GAME_END_TOKEN"), game.playerTwo);

    } else {
      console.error("ERROR WHEN SENDING RESULTS!");
    }
  } catch (err) {
    console.error("ERROR WHEN SENDING RESULTS2!");
    console.error(err);
  }
}

//Starts timers for waiting for player 2 to join or either players' moves.
Server.startTimer = function (game, status, duration, isPlayerOne) {

  //Don't need this for experiments as it's Ai vs Ai
  if (Server.ExperimentMode) {
    return;
  }
  //status - 0 is regular round message, 1 is waiting for P2
  //Time is *1000 so we only need to pass the number of seconds in
  //WARN: This assumes that AI is always P2
  if (isPlayerOne) {
    if (!game.playerOne.id.startsWith("Exp_AI_")) { //doesn't set timers for the experiments. They shouldn't be an issue, but just in case!
      game.playerOneTimer = setTimeout((isPlayerOne) => {
        game.outOfTime(isPlayerOne);
      }, duration * 1000, isPlayerOne);
    }
    //Duration -1 to give them a bit of berth if it's down to the wire
    Server.sendClientMessage(new Message([0, duration - 1], "TIMER_TOKEN"), game.playerOne);
  } else {
    game.playerTwoTimer = setTimeout((isPlayerOne) => {
      game.outOfTime(isPlayerOne);
    }, duration * 1000, !isPlayerOne);
    Server.sendClientMessage(new Message([0, duration - 1], "TIMER_TOKEN"), game.playerTwo);
  }
}

//makes sure both players still in game
Server.registerHeartbeat = function (ws) {
  game = Server.validateGame(ws);
  if (game == null) {
    return;
  } else if (game.playerOne === ws) {
    game.playerOneLastHeartbeat = Date.now();
  } else {
    game.playerTwoLastHeartbeat = Date.now();
  }
}

//Stores players' clicks in the database
Server.registerClick = function (payload, ws) {
  game = Server.validateGame(ws);
  if (game == null) {
    return;
  }
  var playerID;
  if (game.playerOne === ws) {
    playerID = 1;
  } else {
    playerID = 2;
  }
  try {
    //2 values for node ID and Left/Right click
    var nodeID = payload[0];
    var action = payload[1];
    game.registerClick(playerID, nodeID, action);
  } catch (err) {
    console.error("Error handling clicks");
  } //NYCON why does this fail on AI? UPDATE: does this still fail?
}

//Gets a completion code from the database and return to client
Server.sendCompletionCodeToClient = async function(username, ws) {
  var completion_code = await Server.getCompletionCodeForPlayer(username, ws);
  if(completion_code) {
    Server.sendClientMessage(new Message(completion_code, "COMPLETION_CODE"), ws);
  }
  else {
    Server.sendClientMessage(new Message("", "COMPLETION_CODE_ERROR"), ws);
    console.log("Error getting completion code for player: " + username);
  }
}

//Retrieves a player's completion code from the database by looking up their unique user id, if no match found, generates and saves new one
Server.getCompletionCodeForPlayer = async function(username, ws) {
  // query db to see if completion code already exists for player id
  var query = "SELECT * FROM mturk_completion_table WHERE player_id = '" + username + "'";
  var result = await Server.sendSqlQuery(query);
  // no completion code for user id found, create one
  if(!result || result.rows.length <= 0) {
    console.log("No completion code for player: " + username + " found, generating new one");
    var completion_code = Server.generateCompletionCode();
    var timestamp = (new Date()).toISOString().slice(0, -1);
    var query = `INSERT INTO mturk_completion_table VALUES ('${timestamp}', '${username}', '${completion_code}');`;
    var result2 = await Server.sendSqlQuery(query);
    // insert failed
    if(!result || result2.rowCount != 1) {
      return false;
    }
    // insert successful
    else {
      return completion_code;
    }
  }
  else {
    return result.rows[0].completion_code;
  }
}

Server.generateCompletionCode = function() {
  var id = "" + uuidv4();
  var shortenedId = id.slice(id.length - 12);
  return shortenedId;
}

//Handles messages from the client
//ws parameter allows us to return a message to the client
Server.ParseMessage = function (message, ws) {
  try {
    message = JSON.parse(message);
  } catch (err) {
    return;
  }
  switch (message.status) { //If you want to send/recieve new types of message between client/server, you can handle the delivery here
    case "SUBMIT_MOVES_TOKEN":
      Server.submitMoves(message.payload, ws);
      break;
    case "NEW_GAME_TOKEN":
      message.payload = message.payload.toString();
      if (message.payload.length > 0) {
        Server.newGame(message.payload, ws);
      } else {
        console.error("Error making new game!");
        Server.newGame(Math.random() * 10000, ws);
      }
      break;
    case "EMERGENCY_AI":
      Server.AiMode = true;
      Server.newGame(message.payload, ws);
    case "CLICK_TOKEN":
      Server.registerClick(message.payload, ws);
      break;
    case "HEARTBEAT":
      Server.registerHeartbeat(ws);
      break;
    case "NEW_COMPLETION_CODE":
      Server.sendCompletionCodeToClient(message.payload, ws);
      break;
  }
}