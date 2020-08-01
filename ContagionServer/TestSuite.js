var ctx;
var ws;
var game;
var p1Strategy;
var p2Strategy;
var moves = [];
const clone = require('clone');
const Message = require('./Message');
const Server = require('./server');
module.exports.setupTest = setupTest;

//Wrapper for each pairwise experiment
function setupTest(context) {
    //COULD do this without websockets. Not sure of the value of rewriting though.
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
    //newTest("Random", "Mirror", 2, 1);
    runSimpleGames();
}

function runSimpleGames() {
    const SimpleGame = require('./SimpleGame');
    const configData = Server.getConfigData();
    const topologyID = 1;
    const layoutID = 0;
    const network = clone(configData.configs[topologyID][layoutID]);
    const gameSettings = {
        peeps: network.peeps,
        connections: network.connections,
    };

    const gamesToRun = 50000;
    let p1Scores = 0;
    let p2Scores = 0;
    for (let i = 0; i < gamesToRun; i++) {
        let game = new SimpleGame(gameSettings);
        for (let r = 0; r < 10; r++) {
            game.submitMove(1, game.getRandomNode());
            game.submitMove(2, game.getRandomNode());
        }
        p1Scores += game.getPlayerScore(1);
        p2Scores += game.getPlayerScore(2);
        if (i % 1000 == 0) {
            console.log("Games completed: " + i);
        }
    }
    console.log("p1 average score: " + p1Scores / gamesToRun);
    console.log("p2 average score: " + p2Scores / gamesToRun);
}

function newTest(p1Strat, p2Strat, topologyID = null, layoutID = null) {
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
    console.log(
        "[TEST] Game Started with p1_strategy: '" +
        p1Strategy +
        "' & p2_strategy: '" +
        p2Strategy +
        "'",
    );
}

function updateState() {
    //We are using the state already held on the server
    //This sends moves back to the main server
    console.log(
        '[TEST] UpdateState: p1Moves: ' +
        game.playerOneMoves +
        ' p2Moves: ' +
        game.playerTwoMoves,
    );
    moves.push(game.aiTurn(game.playerOneMoves, 1, p1Strategy));
    sendServerMessage(new Message(moves, 'SUBMIT_MOVES_TOKEN'));
}

function gameOver(payload) {
    //Mostly just for logging final results from this AI's POV to ensure consistency
    moves = [];
    game = null;
    if (payload[0] == 'draw') {}
    var myScore = payload[1][9]; //9 is because it's a list of 10 vaules, one for score at each round. 9 is the last.
    var opponentScore = payload[2][9];
    console.log('[TEST] Game Over');
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