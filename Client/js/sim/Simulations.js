/******************************
NB: While 'Sim' is used in such a way to allow for multiple sims running at once, in practice this is prevented even by the base program
I have made an attempt to refactor things into the overall Simulations class, but much still remains.
******************************/

//SIM DELARED AT 167
function Simulations() {
	Simulations.ServerURL = 'wss://contagiongame.xyz:5001/';
	Simulations.LocalMode = false;
	Simulations.DebugMode = false;
	Simulations.DrawPieCharts = false; // draw pie charts inside nodes to represent vote share
	Simulations.EnablePieSpinners = false; // show pie spinners after each round
	Simulations.Username = '';

	function cookieManager() {
		if (document.cookie.length <= 0) {
			console.log(document.cookie);
			console.log('no cookie found. Setting now.');
			var required = Math.floor(100000 * Math.random());
			// var user = '';
			// while (user != required && user != 'wowee') {
			// 	user = prompt(
			// 		'Your random ID is: ' +
			// 			required +
			// 			'. Please write it on your questionnaire and enter it below.',
			// 		'',
			// 	);
			// }
			var user = required;

			document.cookie = user;
			Simulations.Username = user;
		} else {
			console.log('Reading from cookie');
			Simulations.Username = document.cookie;
		}
		Simulations.Username = 'DEMO' + Simulations.Username;
		console.log(Simulations.Username);
	}

	cookieManager();

	function formatMoney(number, decPlaces, decSep, thouSep) {
		(decPlaces = isNaN((decPlaces = Math.abs(decPlaces))) ? 2 : decPlaces),
			(decSep = typeof decSep === 'undefined' ? '.' : decSep);
		thouSep = typeof thouSep === 'undefined' ? ',' : thouSep;
		var sign = number < 0 ? '-' : '';
		var i = String(
			parseInt(
				(number = Math.abs(Number(number) || 0).toFixed(decPlaces)),
			),
		);
		var j = (j = i.length) > 3 ? j % 3 : 0;

		return (
			sign +
			(j ? i.substr(0, j) + thouSep : '') +
			i.substr(j).replace(/(\decSep{3})(?=\decSep)/g, '$1' + thouSep) +
			(decPlaces
				? decSep +
				  Math.abs(number - i)
						.toFixed(decPlaces)
						.slice(2)
				: '')
		);
	}

	//const uuidv4 = require('uuid/v4');

	var self = this;
	self.dom = $('#simulations');

	self.sims = [];
	Simulations.TestMode = false;
	Simulations.inProgress = false;
	Simulations.gameInProgress = false;
	Simulations.PERCENTAGE_INFECTED = 0;
	//TODO In Slideshow.js, do a wait for serverResponse to have value, then set serverResponse to null again.
	Simulations.awaitingResponse = false;
	Simulations.WinState = -1;
	Simulations.GamesWon = 0;
	Simulations.GamesPlayed = 0;
	Simulations.Score = 0;
	Simulations.PreviousMoves = [];
	Simulations.TutorialMode = true; //Defaults to true, quickly changes to false if server detects we want to play a game
	Simulations.EmergencyAIMode = false;
	Simulations.Chart = null;
	Simulations.ScoreLists = [];
	Simulations.pieSpinnersActive = false; // when true - pie spinners are drawn - usually true for only a few seconds
	Simulations.p1OwnedNodes = [];
	Simulations.p2OwnedNodes = [];

	if (Simulations.LocalMode) {
		Simulations.ServerLocation = 'ws://127.0.0.1:5001';
	} else {
		Simulations.ServerLocation = Simulations.ServerURL;
	}

	parseEvent = function (message) {
		try {
			message = JSON.parse(message.data);
		} catch (err) {
			if (message.data === 'Connected') {
				console.log('Connected to server');
				Simulations.connectedToServer = true;
			} else {
				console.log("Can't parse JSON:" + message.data);
			}
			return;
		}
		console.log('Message Received: ' + message.status);
		switch (message.status) {
			case 'CONFIG_TOKEN':
				Simulations.receivedConfig = message.payload;
				console.log('config', Simulations.receivedConfig);
				break;
			case 'DEFERRED_STATE_TOKEN':
				console.log('FIRST Waiting for P2...');
				break;
			case 'UPDATE_STATE_TOKEN':
				// add some fake delay so AI is perceived as more human
				const minDelay = 1;
				const maxDelay = 1400;
				Simulations.updateDelay =
					Math.floor(Math.random() * (maxDelay - minDelay + 1)) +
					minDelay;
				setTimeout(function () {
					Simulations.handleUpdateState(message.payload);
				}, Simulations.updateDelay);
				break;
			case 'GAME_END_TOKEN':
				// delay the game end by the amount the last update was delayed (so it doesn't overlap)
				setTimeout(function () {
					Simulations.gameOver(message.payload);
				}, Simulations.updateDelay);
				break;
			case 'TIMER_TOKEN':
				if (!Simulations.awaitingResponse) {
					var payload = [0, message.payload[1] - 1];
					//Timeout to allow for visual transitions
					setTimeout(Simulations.startTimer, 1000, payload);
				} else {
					Simulations.startTimer(message.payload);
				}
				break;
			case 'MTURK_INFO':
				// delay the game end by the amount the last update was delayed (so it doesn't overlap)
				console.log('Your MTurk Info: ');
				console.log(message.payload);
				Simulations.updateGameOverModalInformation(message.payload);
				break;
			case 'COMPLETION_CODE':
				console.log('Your Completion Code: ' + message.payload);
				Simulations.showCashOutModal(message.payload);
				break;
			case 'COMPLETION_CODE_ERROR':
				console.log('Error getting completion code');
				break;
			case 'TEST_MODE_STATUS':
				var testModeInfo = message.payload;
				Simulations.TestMode = testModeInfo.TestMode;
				if (Simulations.TestMode) {
					console.log('TEST MODE ENABLED');
					testingToolsInit(testModeInfo); // TestingTools.js
				}
				break;
			case 'TEST_PLAYER_NEXT_MOVE':
				var moveInfo = message.payload;
				console.log(moveInfo);
				testPlayerNextMoveInfoReceived(moveInfo);
				break;
		}
	};

	self.serverSetup = function () {
		self.ws = new WebSocket(Simulations.ServerLocation);
		self.ws.onopen = function (event) {
			self.ws.send('Connection Recieved.');
			setInterval(Simulations.heartbeat, 250);
			setTimeout(Simulations.requestServerInTestMode, 700, ''); // loads client testing tools if Server.TestMode is true
		};
		self.ws.onerror = function (err) {
			console.log('err: ', err);
		};
		self.ws.onmessage = function (event) {
			parseEvent(event);
		};
	};
	self.serverSetup();

	Simulations.p1OwnsNode = function (nodeID) {
		Simulations.p1OwnedNodes.forEach((node) => {
			if (nodeID == node) {
				return true;
			}
		});
		return false;
	};

	Simulations.p2OwnsNode = function (nodeID) {
		Simulations.p2OwnedNodes.forEach((node) => {
			if (nodeID == node) {
				return true;
			}
		});
		return false;
	};

	Simulations.handleUpdateState = function (state) {
		// set owned nodes so pie spinners can determine winner
		Simulations.p1OwnedNodes = state[3];
		Simulations.p2OwnedNodes = state[4];

		console.log('handleUpdateState', state);
		// pie spinners before actual state is updated
		if (
			Simulations.DrawPieCharts &&
			Simulations.EnablePieSpinners &&
			SimUI.RoundNumber > 1
		) {
			Simulations.pieSpinnersActive = true;
			console.log('Simulations: pieSpinnersActive == true');
			// enable pie spinners for 3 seconds
			setTimeout(() => {
				Simulations.pieSpinnersActive = false;
				console.log('Simulations: pieSpinnersActive == false');

				Simulations.updateState(state);
			}, 3000);
		} else {
			Simulations.updateState(state);
		}
	};

	Simulations.checkServerConnected = function () {
		return self.ws.readyState == 1 ? true : false;
	};

	//Keeps connection to server alive
	Simulations.heartbeat = function () {
		Simulations.sendServerMessageOverride(new Message(null, 'HEARTBEAT'));
	};

	Simulations.sendServerMessage = function (msg) {
		if (Simulations.TutorialMode) {
			return;
		}
		if (self.ws.readyState != 1) {
			Simulations.popupDialogue(
				'Error connecting to server. Please refresh!',
			);
		} else {
			//Simulations.popupDialogue(""); //clears any existing text
			//console.log(msg);
			self.ws.send(JSON.stringify(msg));
		}
	};

	Simulations.sendServerMessageOverride = function (msg) {
		self.ws.send(JSON.stringify(msg));
	};

	//Sends request to server, then sets awaiting response flag to true, to halt certain other parts of code until the config is returned.
	Simulations.requestConfig = function () {
		if (Simulations.receivedConfig == null) {
			if (Simulations.EmergencyAIMode) {
				Simulations.sendServerMessageOverride(
					new Message(Simulations.Username, 'EMERGENCY_AI'),
				); //aimode
			} else {
				Simulations.sendServerMessage(
					new Message(Simulations.Username, 'NEW_GAME_TOKEN'),
				);
			}
			Simulations.awaitingResponse = true;
		}
	};

	//Test Mode - Request to see whether server is in test mode
	Simulations.requestServerInTestMode = function () {
		console.log('Requesting server Test Mode status');
		Simulations.sendServerMessageOverride(
			new Message(Simulations.Username, 'GET_TEST_MODE_STATUS'),
		);
	};

	// Test Mode - Request
	Simulations.requestPlayerNextMove = function (playerNumber, strategy) {
		// only fire a request if we're in game
		if (Simulations.gameInProgress) {
			console.log(
				'Requesting P' +
					playerNumber +
					' Next Move with Strategy: ' +
					strategy,
			);
			var info = {};
			info.username = Simulations.Username;
			info.playerNumber = playerNumber;
			info.strategy = strategy;
			Simulations.sendServerMessageOverride(
				new Message(info, 'GET_TEST_PLAYER_NEXT_MOVE'),
			);
		} else {
			console.log(
				'requestPlayerNextMove() - Blocked - !Simulations.gameInProgress',
			);
		}
	};

	//Request MTurk completion code from server
	Simulations.requestCompletionCode = function () {
		Simulations.sendServerMessage(
			new Message(Simulations.Username, 'NEW_COMPLETION_CODE'),
		);
	};

	//Request MTurk info from server
	Simulations.requestMTurkInfo = function (game_id, player_no) {
		var payload = {
			username: Simulations.Username,
			last_game_id: game_id,
			last_game_player_no: player_no,
		};
		Simulations.sendServerMessage(new Message(payload, 'GET_MTURK_INFO'));
	};

	Simulations.showCashOutModal = function (completionCode) {
		// add content to modal container
		//var container = document.getElementById('completion_code');
		//container.innerHTML = completionCode;
		//setTimeout(Modal.showAll, 100, "cashout");
		window.prompt(
			'Your completion code is shown below. Enter this code in the MTurk HIT form so that we can confirm your work and pay your reward.',
			completionCode,
		);
	};

	Simulations.updateGameOverModalInformation = function (info) {
		// set string values based on mturkInfo
		var headingText = 'Game Over!';
		if (info.lastGameWon) {
			headingText = 'Congratulations!';
		}
		var content = '';
		content += '<h3>' + headingText + '</h3>';
		content +=
			'<h2> Game Reward: $' + formatMoney(info.lastGameReward) + '</h2>';
		content +=
			'<h2> Total Rewards: $' + formatMoney(info.totalReward) + '</h2>';
		content += '<div>';
		content += '<div>';
		content +=
			'You have won ' +
			info.gamesWon +
			' of ' +
			info.gamesPlayed +
			' games.';
		content += '<div>';
		content +=
			'There are bonus rewards for winning a game and for achieving a high score.';
		content += '<div>';
		content += 'Try to beat your opponent!';
		content += '<div>';
		content += 'You must play at least 10 games before you can cash out.';
		content += '<div>';

		// add content to modal container
		var container = document.getElementById('endgame_content');
		container.innerHTML = content;
	};

	Simulations.formatConfig = function (config) {
		var sim = self.sims[0];
		var peeps = config.network.peeps;
		var scaledPeeps = [];
		var Xscale,
			Yscale = 0;
		var Xoffset = 75;
		var Yoffset = 150;
		Xscale = $('#simulations_container').clientWidth - 2 * Xoffset; //subtration to provide symmetry of gap for both sides
		Yscale = $('#simulations_container').clientHeight - 1.2 * Yoffset; //don't need the symmetry vertically, since it's asymmetric by design. Want some empty space at bottom though

		peeps.forEach(function (peep) {
			scaledPeeps.push([
				peep[0] * Xscale + Xoffset,
				peep[1] * Yscale + Yoffset,
				peep[2],
			]);
		});
		config.network.peeps = scaledPeeps;

		ConnectorCutter.MAX_CONNECTIONS = config.maxConnections;
		ConnectorCutter.CONNECTIONS_REMAINING = config.maxConnections;
		ConnectorCutter.TOKEN_PROTOCOL = config.tokenProtocol;
		console.log(ConnectorCutter.TOKEN_PROTOCOL);
		publish('sim/connection_update');
		Simulations.receivedConfig = config;
		Simulations.awaitingResponse = false;
	};

	Simulations.getConfig = function () {
		return Simulations.receivedConfig;
	};

	Simulations.startTimer = function (payload) {
		//payload[0] is 0 if new round timer, 1 if waiting for player timer.
		//payload[1] is timer duration
		try {
			SimUI.updateTimer(payload);
		} catch (err) {
			//if can't start the timer because UI hasn't loaded yet, try again. Reduces timer time to compensate.
			payload = [payload[0], payload[1] - 0.5];
			setTimeout(Simulations.startTimer, 500, payload);
		}
	};

	Simulations.gameOver = function (payload) {
		Simulations.gameInProgress = false;
		console.log(payload); // [result, myscores, theirscores, game_id, playerNo]
		// request mturk info which is displayed in the modal
		var game_id = payload[3];
		var playerNo = payload[4];
		Simulations.requestMTurkInfo(game_id, playerNo);

		var verdict = payload[0]; //"win" "lose" or "draw"
		if (payload[1] != null) {
			var noRounds = payload[1].length;
			Simulations.Score = payload[1][noRounds - 1];
		}
		//Lose
		Simulations.GamesPlayed++;
		if (verdict == 'lose') {
			Simulations.WinState = 0;
			self.sims[0].lose();
		}
		//Win
		else if (verdict == 'win') {
			Simulations.GamesWon++;
			Simulations.WinState = 2;
			self.sims[0].win();
		} else if (verdict == 'disconnect') {
			Simulations.WinState = 3;
			self.sims[0].win();
		} else if (verdict == 'time') {
			Simulations.WinState = 4;
			self.sims[0].lose();
		}
		//Draw ("tie") to prevent confusion with the draw func
		else if (verdict == 'tie') {
			Simulations.WinState = 1;
			self.sims[0].tie();
		} else {
			console.log('ERR UNKNOWN OUTCOME!');
		}
		Simulations.ScoreLists = [payload[1], payload[2]];
		setTimeout(Modal.showAll, 3000, 'endgame');
	};

	Simulations.newGame = function () {
		Simulations.receivedConfig = null; //clears old config so we can start new game
		Simulations.requestConfig();
		SimUI.RoundNumber = 0;
		Simulations.PreviousMoves = [];
		Simulations.Score = 0;
		Simulations.ScoreLists = [];
		Simulations.PERCENTAGE_INFECTED = 0;
		Simulations.Chart = 0;
		slideshow.gotoChapter('Strategy');
	};

	// Clear All Sims
	self.clear = function () {
		Simulations.IS_RUNNING = false;
		$('#container').removeAttribute('sim_is_running');

		self.sims.forEach(function (sim) {
			self.dom.removeChild(sim.canvas);
			sim.kill();
		});
		self.sims = [];
	};

	// Add Sims
	self.add = function (config) {
		if (Simulations.receivedConfig == null && !Simulations.TutorialMode) {
			Simulations.requestConfig();
			setTimeout(
				(config) => {
					try {
						var temp = Simulations.getConfig();
						if (temp == null) {
							console.log('getConfig null');
							publish('START');
							return;
						} else {
							console.log('getConfig notnull');
							config = temp;
						}
					} catch (err) {
						Simulations.popupDialogue(
							'An error has occurred. Please restart.',
						);
						return;
					}
				},
				1000,
				config,
			);
		}
		if (config == null) {
			if (Simulations.receivedConfig == null) {
				var testo = setTimeout(this.add, 500, config);
				return;
			}
			config = cloneObject(Simulations.receivedConfig);
		}

		if (Simulations.receivedConfig != null) {
			Simulations.formatConfig(config);
		}

		//config = cloneObject(config); wat
		config.container = self;
		Simulations.WinState = -1;
		Simulations.Score = 0;
		Simulations.ScoreLists = [];
		var sim = new Sim(config);
		self.dom.appendChild(sim.canvas);
		self.sims.push(sim);

		Simulations.startedGame();
	};

	self.beginRound = function () {
		Simulations.awaitingResponse = true;
		Simulations.requestStart = false;
		Simulations.inProgress = true;
		// Step all sims!
		self.sims.forEach(function (sim) {
			//Sends moves to the server and waits for a response
			var movesToSubmit = sim.filterNewTokens(); //adds latest tokens onto the end of the list
			console.log(movesToSubmit);
			Simulations.sendServerMessage(
				new Message(movesToSubmit, 'SUBMIT_MOVES_TOKEN'),
			);
			Simulations.waitForServerMoves(sim);
		});
	};

	Simulations.startedGame = function () {
		Simulations.gameInProgress = true;
		Simulations.startedNewRound();
	};

	Simulations.startedNewRound = function () {
		// in test mode on new round we request the next potential move for both players (based on selected test strategies - so we can populate test UI)
		if (Simulations.TestMode && SimUI.RoundNumber < 10) {
			testModalRequestNextMove(1, testP1SelectedStrategy);
			testModalRequestNextMove(2, testP2SelectedStrategy);
		}
	};

	Simulations.waitForServerMoves = function (sim) {
		if (!Simulations.awaitingResponse) {
			Simulations.IS_RUNNING = false;
			publish('sim/round_over');
			Simulations.inProgress = false;
		} else {
			var testo = setTimeout(Simulations.waitForServerMoves, 1000, sim);
		}
	};

	Simulations.updateStateTutorial = function () {
		var sim = self.sims[0];
		var peeps = sim.peeps;
		peeps.forEach(function (peep) {
			if (peep.numInfectedFriends > 0 || peep.playerOrbits.length > 0) {
				peep.isPastThreshold = true;
			} else if (peep.numFriends > 0 || peep.aiOrbits.length > 0) {
				peep.isPastThreshold = false;
			}
		});
		sim.nextStep();
	};

	//Updates the client variables to reflect the enemy's turn and subsequent infections.
	Simulations.updateState = function (gameState) {
		if (ConnectorCutter.TOKEN_PROTOCOL == 'Incremental') {
			ConnectorCutter.MAX_CONNECTIONS++;
			ConnectorCutter.CONNECTIONS_REMAINING++;
			publish('sim/connection_update');
		}
		var updatedPeeps = gameState[0];
		var enemyMoves = gameState[1];
		Simulations.Score = gameState[2];
		self.sims.forEach(function (sim) {
			var peepsList = sim.peeps;
			if (peepsList.length !== updatedPeeps.length) {
				console.log('ERR! DIFFERRING NUMBER OF PEEPS!');
			}
			for (i = 0; i < peepsList.length; i++) {
				sim.removeOrbitConnection(peepsList[i], false);
				if (updatedPeeps[i] == 1) {
					peepsList[i].isPastThreshold = true;
				} else if (updatedPeeps[i] == 0) {
					peepsList[i].isPastThreshold = false;
				}
			}
			enemyMoves.forEach(function (move) {
				sim.addOrbitConnection(peepsList[move], false);
			});
			sim.nextStep();
			sim.calculatePercentage();
		});
		Simulations.awaitingResponse = false;
		Simulations.startedNewRound();
	};

	Simulations.validateMoves = function (orbits, id) {
		//ignores this requirement if you're removing orbits
		if (!orbits && ConnectorCutter.CONNECTIONS_REMAINING != 0) {
			Simulations.popupDialogue('You have remaining tokens!');
			publish('sim/out_of_connections'); //slight misnomer, alerts the user that they have remaining connections they have to use
			return false;
		}
		if (SimUI.RoundNumber != 1) {
			var currMoves = self.sims[0].formatPeeps();
			if (orbits) {
				var tempIndex = currMoves.indexOf(id);
				if (tempIndex == -1) {
					//Prevents 'can only move one per turn' from appearing if you're not clicking a node with orbits.
					return false;
				}
				currMoves.splice(tempIndex, 1);
			}
			var differences = 0;
			Simulations.PreviousMoves.forEach(function (move) {
				var index = currMoves.indexOf(move);
				if (index > -1) {
					currMoves.splice(index, 1);
				} else {
					differences++;
				}
			});
			if (ConnectorCutter.TOKEN_PROTOCOL == 'Incremental') {
				if (orbits && differences != 0) {
					Simulations.popupDialogue("You can't remove old tokens!");
					return false;
				}
			} else if (differences > 1) {
				Simulations.popupDialogue(
					'You can only move one token per turn!',
				);
				publish('sim/out_of_connections');
				return false;
			}
		}
		return true;
	};

	Simulations.resetMoves = function () {
		var game;
		self.peeps.forEach(function (peep) {
			for (i = 0; i < peep.playerOrbits.length; i++) {
				formattedPeeps.push(peep.id);
			}
		});
		return formattedPeeps;
	};

	// Update
	self.update = function () {
		if (Simulations.requestStart) {
			self.beginRound();
		}

		// Update all sims
		self.sims.forEach(function (sim) {
			sim.update();
		});
	};

	// Draw
	self.draw = function () {
		self.sims.forEach(function (sim) {
			sim.draw();
		});
	};

	////////////////////////
	// SIMULATION RUNNING //
	////////////////////////

	self.CLOCK = -1;
	subscribe('sim/start', function () {
		Simulations.IS_RUNNING = true;
		$('#container').setAttribute('sim_is_running', true);

		self.CLOCK = 0;
		// save for later resetting
		self.sims.forEach(function (sim) {
			sim.save();
		});
	});
	subscribe('sim/stop', function () {
		Simulations.IS_RUNNING = false;
		$('#container').removeAttribute('sim_is_running');

		// reload the network pre-sim
		self.sims.forEach(function (sim) {
			sim.reload();
		});
	});

	///////////////////////
	// HELPERS AND STUFF //
	///////////////////////

	// Get Child!
	self.getChildByID = function (id) {
		return self.sims.find(function (sim) {
			return sim.id == id;
		});
	};
}

// On resize, adjust the fullscreen sim (if any).
window.addEventListener(
	'resize',
	function () {
		if (slideshow.simulations.sims.length > 0) {
			slideshow.simulations.sims[0].resize();
		}
	},
	false,
);

function Sim(config) {
	var self = this;
	self.config = config;
	self.networkConfig = cloneObject(config.network);
	self.container = config.container;
	self.options = config.options || {};

	var _PLAY_CONTAGION_SOUND = function () {
		SOUNDS.contagion.volume(0.75);
		SOUNDS.contagion.play();
	};

	// Canvas
	var container = $('#simulations_container');
	self.canvas = createCanvas(container.clientWidth, container.clientHeight);

	//self.canvas.style.border = "1px solid #ccc";
	self.ctx = self.canvas.getContext('2d');

	// Mouse, offset!
	self.mouse = {
		x: 0,
		y: 0,
	};

	// Connector-Cutter
	self.connectorCutter = new ConnectorCutter({
		sim: self,
	});

	// Resize
	var simOffset;

	//This returns the ID for each orbit. If node has 2 orbits, will appear twice, etc.
	self.formatPeeps = function () {
		var formattedPeeps = [];
		self.peeps.forEach(function (peep) {
			for (i = 0; i < peep.playerOrbits.length; i++) {
				formattedPeeps.push(peep.id);
			}
		});
		return formattedPeeps;
	};

	self.filterNewTokens = function () {
		//NB: If want to do more than one in future, here is a good place to change
		var currentPeeps = self.formatPeeps();
		var prevPeeps = cloneObject(Simulations.PreviousMoves);
		prevPeeps.forEach(function (p) {
			var index = currentPeeps.indexOf(p);
			currentPeeps.splice(index, 1);
		});
		console.log(currentPeeps);
		Simulations.PreviousMoves.push(currentPeeps[0]);
		return Simulations.PreviousMoves;
	};

	self.resize = function () {
		var container = $('#simulations_container');
		simOffset = _getBoundingClientRect(self.container.dom);
		self.canvas.style.left = -simOffset.x + 'px';
		self.canvas.style.top = -simOffset.y + 'px';

		// Set difference in width & height
		var width = container.clientWidth;
		var height = container.clientHeight;
		self.canvas.width = width * 2;
		self.canvas.height = height * 2;
		self.canvas.style.width = width + 'px';
		self.canvas.style.height = height + 'px';
	};
	self.resize();

	// Networks... clear/init
	self.clear = function () {
		self.peeps = [];
		self.connections = [];
		self.contagion = 0;
	};
	self.init = function () {
		// Clear!
		self.clear();

		// Peeps
		self.networkConfig.peeps.forEach(function (p) {
			var x = p[0],
				y = p[1],
				infected = p[2];
			self.addPeep(x, y, infected);
		});

		// Connections
		self.networkConfig.connections.forEach(function (c) {
			var from = self.peeps[c[0]],
				to = self.peeps[c[1]],
				uncuttable = c[2] || false;
			self.addConnection(from, to, uncuttable);
		});
	};

	// Update
	self.onupdate = config.onupdate || function () {};
	self.update = function () {
		// "Mouse", offset!
		var canvasBounds = _getBoundingClientRect(self.canvas);
		self.mouse = cloneObject(Mouse);
		self.mouse.x -= canvasBounds.x;
		self.mouse.y -= canvasBounds.y;
		self.mouse.lastX -= canvasBounds.x;
		self.mouse.lastY -= canvasBounds.y;
		if (config.fullscreen) {
			var fullscreenOffsetX = config.x + simOffset.x;
			var fullscreenOffsetY = config.y + simOffset.y;
			self.mouse.x -= fullscreenOffsetX;
			self.mouse.y -= fullscreenOffsetY;
			self.mouse.lastX -= fullscreenOffsetX;
			self.mouse.lastY -= fullscreenOffsetY;
		}

		// Connector-Cutter
		self.connectorCutter.update();

		// Connections & Peeps
		self.connections.forEach(function (connection) {
			connection.update();
		});
		self.peeps.forEach(function (peep) {
			peep.update();
		});

		// secret editor...
		// drag Peep
		if (_draggingPeep) {
			_draggingPeep.x = self.mouse.x + _draggingOffset.x;
			_draggingPeep.y = self.mouse.y + _draggingOffset.y;
			_draggingPeep.velocity.x = 0;
			_draggingPeep.velocity.y = 0;
		}

		// update confetti & winword...
		self.confetti.forEach(function (confetti) {
			confetti.x += confetti.vx;
			confetti.y += confetti.vy;
			confetti.spin += confetti.spinSpeed;

			confetti.vy += confetti.g;

			confetti.vx *= 0.95;
			confetti.vy *= 0.95;
		});
		if (self.winWord.ticker >= 0) {
			self.winWord.ticker += 1 / 60;
			if (self.winWord.ticker > 3) {
				self.winWord.ticker = -1;
			}
		}

		if (self.popupWord.ticker >= 0) {
			self.popupWord.ticker += 1 / 60;
			if (self.popupWord.ticker > 3) {
				self.popupWord.ticker = -1;
			}
		}

		// On update! (for arbitrary sim-specific logic)
		self.onupdate(self);
	};

	Simulations.popupDialogue = function (text) {
		//NOTE: Simulations. or self. ? maybe call from above/below
		self.popupLabel = text;
		self.popupWord.ticker = 0;
	};

	// Draw
	self.draw = function () {
		// Retina
		var ctx = self.ctx;
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.save();
		ctx.scale(2, 2);
		if (config.fullscreen) {
			var fullscreenOffsetX = config.x + simOffset.x;
			var fullscreenOffsetY = config.y + simOffset.y;
			ctx.translate(fullscreenOffsetX, fullscreenOffsetY);
		}

		// Draw all of it!
		self.connectorCutter.draw(ctx);
		self.connections.forEach(function (connection) {
			connection.draw(ctx);
		});
		self.peeps.forEach(function (peep) {
			peep.draw(ctx);
		});

		ctx.restore();

		// Draw confetti - NOT AFFECTED BY TRANSFORMS.
		self.confetti.forEach(function (confetti) {
			ctx.save();
			var offsetX = -Math.sin(confetti.spin) * 9;
			ctx.translate(confetti.x + offsetX, confetti.y);
			ctx.rotate(Math.sin(confetti.spin) * 0.2);
			if (confetti.flip) ctx.scale(-1, 1);
			self.confettiSprite.gotoFrame(confetti.frame);
			self.confettiSprite.draw(ctx);
			ctx.restore();
		});

		// Draw WIN WORD
		if (self.winWord.ticker >= 0) {
			ctx.save();
			ctx.translate(self.winWord.x, self.winWord.y);
			ctx.scale(2, 2); // retina

			// expand
			if (self.winWord.ticker < 0.2) {
				var scale = self.winWord.ticker / 0.2;
				ctx.scale(scale, scale);
			}

			// fade away
			if (self.winWord.ticker > 2) {
				var alpha = -(self.winWord.ticker - 3);
				ctx.globalAlpha = alpha;
			}

			ctx.font = '100px PatrickHand';
			ctx.fillStyle = '#000';
			ctx.textBaseline = 'middle';
			ctx.fontWeight = 'bold';
			ctx.textAlign = 'center';
			var label;
			if (Simulations.WinState == 0) {
				label = 'Finished!';
			} else if (Simulations.WinState == 2) {
				label = 'Finished!';
			} else if (Simulations.WinState == 1) {
				label = 'Finished!';
			} else if (Simulations.WinState == 3) {
				label = 'OPPONENT LEFT!';
			} else if (Simulations.WinState == 4) {
				label = 'OUT OF TIME!';
			}
			ctx.fillText(label, 0, 0);
			ctx.fillText(label, 350, 350);
			ctx.fillText(label, 350, -350);
			ctx.fillText(label, -350, -350);
			ctx.fillText(label, -350, 350);

			ctx.restore();
		}

		if (self.popupWord.ticker >= 0) {
			ctx.save();

			var bounds = getBoundsOfPoints(self.peeps); // OPTIONAL BOUNDS
			var cx = bounds.x + bounds.width / 2;
			var cy = bounds.y + bounds.height * 0.96;
			//Bounds work a little differently in the splash screen. This ensures the text is in the right place.
			if (!Simulations.connectedToServer) {
				cy = cy * 0.8;
			}
			cx += fullscreenOffsetX;
			cy += fullscreenOffsetY;
			cx *= 2; // retina
			cy *= 2; // retina

			ctx.translate(cx, cy);
			ctx.scale(2, 2); // retina

			// expand
			if (self.popupWord.ticker < 0.2) {
				var scale = self.popupWord.ticker / 0.2;
				ctx.scale(scale, scale);
			}

			// fade away
			if (self.popupWord.ticker > 2) {
				var alpha = -(self.popupWord.ticker - 3);
				ctx.globalAlpha = alpha;
			}

			ctx.font = '100px PatrickHand';
			ctx.fillStyle = '#000';
			ctx.textBaseline = 'middle';
			ctx.fontWeight = 'bold';
			ctx.textAlign = 'center';
			ctx.fillText(self.popupLabel, 0, 0);

			ctx.restore();
		}
	};

	// Kill
	self.kill = function () {
		self.clear();

		// key handlers, too
		_keyHandlers.forEach(function (_handler) {
			unsubscribe(_handler);
		});
	};

	///////////////////
	// WINNER WINNER //
	///////////////////

	self.wonBefore = false;
	self.confetti = [];
	self.winWord = {
		x: 0,
		y: 0,
		ticker: -1,
	};
	self.popupWord = {
		x: 0,
		y: 0,
		ticker: -1,
	};

	self.win = function (bounds) {
		// Confetti Sprite
		self.confettiSprite = new Sprite({
			img: 'confetti',
			frames: 3,
			sw: 100,
			sh: 50,
		});
		self.confettiSprite.pivotX = 50;
		self.confettiSprite.pivotY = 50;
		self.confettiSprite.scale = 0.5;

		// ONLY ONCE
		if (self.wonBefore) return;
		self.wonBefore = true;

		// SOUND!
		if (bounds && bounds.small) {
			SOUNDS.party_short.play();
		} else {
			SOUNDS.party.play();
		}

		// AMOUNT OF CONFETTI
		var AMOUNT_OF_CONFETTI = 150;

		// Get center of peeps
		var fullscreenOffsetX = config.x + simOffset.x;
		var fullscreenOffsetY = config.y + simOffset.y;
		if (!bounds || !bounds.x) bounds = getBoundsOfPoints(self.peeps); // OPTIONAL BOUNDS
		var cx = bounds.x + bounds.width / 2;
		var cy = bounds.y + bounds.height / 2;
		cx += fullscreenOffsetX;
		cy += fullscreenOffsetY;
		cx *= 2; // retina
		cy *= 2; // retina

		// Place Win Word
		self.winWord.x = cx;
		self.winWord.y = cy;
		self.winWord.ticker = 0;

		// Place confetti
		for (var i = 0; i < AMOUNT_OF_CONFETTI; i++) {
			var angle = Math.random() * Math.TAU;
			var burst = bounds.width / 15;
			var frame = Math.floor(Math.random() * 5);
			var spinSpeed = 0.03 + Math.random() * 0.03;
			var confetti = {
				x: cx,
				y: cy,
				vx: Math.cos(angle) * Math.random() * burst,
				vy: Math.sin(angle) * Math.random() * burst - burst * 0.25,
				frame: frame,
				spinSpeed: spinSpeed,
				spin: Math.random() * Math.TAU,
				g: 0.1 + Math.random() * 0.1,
				flip: Math.random() < 0.5,
			};
			self.confetti.push(confetti);
		}
	};

	self.lose = function (bounds) {
		// Confetti Sprite
		self.confettiSprite = new Sprite({
			img: 'sadconfetti',
			frames: 3,
			sw: 100,
			sh: 50,
		});
		self.confettiSprite.pivotX = 50;
		self.confettiSprite.pivotY = 50;
		self.confettiSprite.scale = 0.5;

		SOUNDS.boom.play();
		// AMOUNT OF CONFETTI
		var AMOUNT_OF_CONFETTI = 20;

		// Get center of peeps
		var fullscreenOffsetX = config.x + simOffset.x;
		var fullscreenOffsetY = config.y + simOffset.y;
		if (!bounds || !bounds.x) bounds = getBoundsOfPoints(self.peeps); // OPTIONAL BOUNDS
		var cx = bounds.x + bounds.width / 2;
		var cy = bounds.y + bounds.height / 2;
		cx += fullscreenOffsetX;
		cy += fullscreenOffsetY;
		cx *= 2; // retina
		cy *= 2; // retina

		// Place Win Word
		self.winWord.x = cx;
		self.winWord.y = cy;
		self.winWord.ticker = 0;

		// Place confetti
		for (var i = 0; i < AMOUNT_OF_CONFETTI; i++) {
			var angle = Math.random() * Math.TAU;
			var burst = bounds.width / 30;
			var frame = Math.floor(Math.random() * 5);
			var spinSpeed = 0.0 + Math.random() * 0.02;
			var confetti = {
				x: cx,
				y: cy,
				vx: Math.cos(angle) * Math.random() * burst,
				vy: Math.sin(angle) * Math.random() * burst - burst * 0.25,
				frame: frame,
				spinSpeed: spinSpeed,
				spin: Math.random() * Math.TAU,
				g: 0.6 + Math.random() * 0.4,
				flip: Math.random() < 0.5,
			};
			self.confetti.push(confetti);
		}
	};

	self.tie = function (bounds) {
		// Confetti Sprite
		self.confettiSprite = new Sprite({
			img: 'sadconfetti',
			frames: 3,
			sw: 100,
			sh: 50,
		});
		self.confettiSprite.pivotX = 50;
		self.confettiSprite.pivotY = 50;
		self.confettiSprite.scale = 0.5;

		SOUNDS.boom.play();
		// AMOUNT OF CONFETTI
		var AMOUNT_OF_CONFETTI = 30;

		// Get center of peeps
		var fullscreenOffsetX = config.x + simOffset.x;
		var fullscreenOffsetY = config.y + simOffset.y;
		if (!bounds || !bounds.x) bounds = getBoundsOfPoints(self.peeps); // OPTIONAL BOUNDS
		var cx = bounds.x + bounds.width / 2;
		var cy = bounds.y + bounds.height / 2;
		cx += fullscreenOffsetX;
		cy += fullscreenOffsetY;
		cx *= 2; // retina
		cy *= 2; // retina

		// Place Win Word
		self.winWord.x = cx;
		self.winWord.y = cy;
		self.winWord.ticker = 0;

		// Place confetti
		for (var i = 0; i < AMOUNT_OF_CONFETTI; i++) {
			var angle = Math.random() * Math.TAU;
			var burst = bounds.width / 25;
			var frame = Math.floor(Math.random() * 5);
			var spinSpeed = 0.02 + Math.random() * 0.03;
			var confetti = {
				x: cx,
				y: cy,
				vx: Math.cos(angle) * Math.random() * burst,
				vy: Math.sin(angle) * Math.random() * burst - burst * 0.25,
				frame: frame,
				spinSpeed: spinSpeed,
				spin: Math.random() * Math.TAU,
				g: 0.3 + Math.random() * 0.1,
				flip: Math.random() < 0.5,
			};
			self.confetti.push(confetti);
		}
	};

	////////////////////////
	// SIMULATION RUNNING //
	////////////////////////

	self.STEP = 0;

	self.save = function () {
		self.STEP = 0;
		self.networkConfig = self.getCurrentNetwork();
	};

	self._canPlayBonkSound = true;

	self.reload = function () {
		var contagionLevel = self.contagion; // hack for sandbox: keep contagion the same
		self.STEP = 0;
		self._canPlayBonkSound = true;
		self.init();
		self.contagion = contagionLevel;
	};

	self.nextStep = function () {
		// SOUND! If anyone can be infected, play Contagion sound.
		// Otherwise play Bonk sound ONCE
		var canBeInfected = self.peeps.filter(function (peep) {
			return !peep.infected && peep.isPastThreshold;
		}).length;
		if (canBeInfected > 0) {
			_PLAY_CONTAGION_SOUND();
		} else if (self._canPlayBonkSound) {
			// && !isEveryoneInfected){
			self._canPlayBonkSound = false;

			if (!self.options.NO_BONK) {
				SOUNDS.bonk.play();
			}
		}

		// "Infect" the peeps who need to get infected
		setTimeout(function () {
			self.STEP++;
		}, 400);

		// CONNECTIONS: IF one is INFECTED and the other is PAST THRESHOLD, then ANIMATE
		self.connections.forEach(function (c) {
			c.animate();
		});

		// PEEPS: If not already infected & past threshold, infect
		self.peeps.forEach(function (peep) {
			if (
				(!peep.infected || peep.neutral) &&
				peep.isPastThreshold === true
			) {
				// timeout for animation
				setTimeout(function () {
					peep.infect();
				}, 333);
			} else if (
				(peep.infected || peep.neutral) &&
				peep.isPastThreshold === false
			) {
				setTimeout(function () {
					peep.uninfect();
				}, 333);
			}
		});

		// PEEPS: If NOT infected, NOT past threshold, and a friend IS INFECTED, then SHAKE
		self.peeps.forEach(function (peep) {
			if (!peep.infected && !peep.isPastThreshold) {
				var friends = self.getFriendsOf(peep);
				var infectedFriends = friends.filter(function (f) {
					return f.infected;
				});
				if (infectedFriends.length > 0) {
					peep.shake();
				}
			}
		});
	};

	self.calculatePercentage = function () {
		var totalInfected = 0;
		self.peeps.forEach(function (peep) {
			if (peep.isPastThreshold) {
				totalInfected++;
			}
		});
		Simulations.PERCENTAGE_INFECTED = Math.round(
			100 * (totalInfected / self.peeps.length),
		);
	};

	///////////////////////////////
	// secret keyboard interface //
	///////////////////////////////

	var _draggingPeep = null;
	var _draggingOffset = {
		x: 0,
		y: 0,
	};
	var _keyHandlers = [];
	var _resetConnectorCutter = function () {
		self.connectorCutter.sandbox_state = 0;
	};
	_keyHandlers.push(
		subscribe('key/down/space', function () {
			_resetConnectorCutter();
			self._startMove();
		}),
	);
	self._startMove = function () {
		if (!_draggingPeep) {
			// prevent double-activation
			var hoveredPeep = self.getHoveredPeep(0);
			if (hoveredPeep) {
				_draggingPeep = hoveredPeep;
				_draggingOffset.x = _draggingPeep.x - self.mouse.x;
				_draggingOffset.y = _draggingPeep.y - self.mouse.y;

				// Sound!
				SOUNDS.squeak_down.volume(0.6);
				SOUNDS.squeak_down.play();
			}
		}
	};
	_keyHandlers.push(
		subscribe('key/up/space', function () {
			self._stopMove();
		}),
	);
	self._stopMove = function () {
		// Sound!
		SOUNDS.squeak_up.volume(0.6);
		SOUNDS.squeak_up.play();

		_draggingPeep = null;
	};
	_keyHandlers.push(
		subscribe('key/down/1', function () {
			//_resetConnectorCutter(); //NOTE: Uncomment these if you want to add the shortcuts back for testing
			//self._addPeepAtMouse(false);
		}),
	);
	_keyHandlers.push(
		subscribe('key/down/2', function () {
			//_resetConnectorCutter();
			//self._addPeepAtMouse(true);
		}),
	);
	self._addPeepAtMouse = function (infected) {
		// SOUND
		SOUNDS.pop.play();

		self.addPeep(self.mouse.x, self.mouse.y, infected);
	};
	_keyHandlers.push(
		subscribe('key/down/delete', function () {
			//_resetConnectorCutter();
			//self._deletePeep();
		}),
	);
	self._deletePeep = function () {
		// SOUND
		SOUNDS.trash.play();

		var toDeletePeep = self.getHoveredPeep(0);
		if (toDeletePeep) self.removePeep(toDeletePeep);
	};

	self.getCurrentNetwork = function () {
		var savedNetwork = {
			contagion: self.contagion,
			peeps: [],
			connections: [],
		};
		self.peeps.forEach(function (peep) {
			savedNetwork.peeps.push([
				Math.round(peep.x),
				Math.round(peep.y),
				peep.infected ? 1 : 0,
			]);
		});
		self.connections.forEach(function (c) {
			var fromIndex = self.peeps.indexOf(c.from);
			var toIndex = self.peeps.indexOf(c.to);
			var uncuttable = c.uncuttable ? 1 : 0;
			savedNetwork.connections.push([fromIndex, toIndex, uncuttable]);
		});
		return savedNetwork;
	};
	self.serialize = function () {
		var savedNetwork = self.getCurrentNetwork();
		return (
			'{\n' +
			'\t"contagion":' +
			savedNetwork.contagion +
			',\n' +
			'\t"peeps":' +
			JSON.stringify(savedNetwork.peeps) +
			',\n' +
			'\t"connections":' +
			JSON.stringify(savedNetwork.connections) +
			'\n' +
			'}'
		);
	};

	////////////////
	// HELPERS... //
	////////////////

	// Add Peeps/Connections
	self.addPeep = function (x, y, infected) {
		//ID of peep is the nth one added to the network, zero indexed.
		var peepID = self.peeps.length;
		var peep = new Peep({
			x: x,
			y: y,
			infected: infected,
			id: peepID,
			sim: self,
		});
		self.peeps.push(peep);
		return peep;
	};
	self.removePeep = function (peep) {
		self.removeAllConnectedTo(peep); // delete all connections
		removeFromArray(self.peeps, peep); // BYE peep
	};
	self.addConnection = function (from, to, uncuttable) {
		// Don't allow connecting to self...
		if (from == to) return;

		// ...or if already exists, in either direction
		for (var i = 0; i < self.connections.length; i++) {
			var c = self.connections[i];
			if (c.from == from && c.to == to) return;
			if (c.from == to && c.to == from) return;
		}

		// Otherwise, go ahead and add it!
		var connection = new Connection({
			from: from,
			to: to,
			uncuttable: uncuttable,
			sim: self,
		});
		self.connections.push(connection);
		return connection;
	};

	self.orbitStartPosition = function (target, isPlayer) {
		var playerOrbitLength = target.playerOrbits.length;
		var enemyOrbitLength = target.aiOrbits.length;
		//+1 to represent newest addition, also avoids divide by zero later
		var totalLength = 1 + playerOrbitLength + enemyOrbitLength;
		if (totalLength == 2) {
			var existingNodeLocation =
				playerOrbitLength == 1
					? target.playerOrbits[0].a
					: target.aiOrbits[0].a;
			return 3.142 + existingNodeLocation;
		}
		var counter = 0;
		for (; counter < playerOrbitLength; counter++) {
			//places each orbit equally around the peep
			target.playerOrbits[counter].a =
				3.142 - (6.284 * counter) / totalLength;
		}
		var returnValue = 3.142 - (6.284 * counter) / totalLength;
		counter++;
		//calculate this in the middle, as in between the two players' peeps, the middle peep can justifiably be either player's.
		for (; counter < totalLength; counter++) {
			//places each orbit equally around the peep
			target.aiOrbits[counter - (playerOrbitLength + 1)].a =
				3.142 - (6.284 * counter) / totalLength;
		}
		return returnValue;
	};

	self.addOrbitConnection = function (target, isPlayer) {
		var orbiter = {
			elt: null,
			a: self.orbitStartPosition(target, isPlayer), // in radian. original position. pi=north
			r: 45, // radius
			da: 0.03, // in radian. speed of orbit
			x: 0,
			y: 0,
			// Center is actualy center (100, 100) minus
			// half the size of the orbiting object 15x15
			center: {
				x: 0,
				y: 0,
			},
		};
		if (isPlayer) {
			target.playerOrbits.push(orbiter);
		} else target.aiOrbits.push(orbiter);
	};

	//removes one orbits if player, removes all if enemy
	//this is because player can only change one at a time, but we need to clear all enemy tokens to show the new state.
	self.removeOrbitConnection = function (target, isPlayer) {
		if (isPlayer) {
			target.playerOrbits.pop();
		} else target.aiOrbits = [];
	};

	self.highlightEdges = function (peep, recursive) {
		var peepsToRecurse = []; //Stores peeps that are one degree away
		for (var i = self.connections.length - 1; i >= 0; i--) {
			var c = self.connections[i];
			if (c.from == peep || c.to == peep) {
				// in either direction
				if (recursive) {
					c.sprite.opacity = 1;
					c.sprite.extraThickness = 0.25;
					if (c.from == peep) {
						self.highlightEdges(c.to, false);
					} else {
						self.highlightEdges(c.from, false);
					}
				} else {
					if (c.sprite.opacity < 0.9) {
						//prevents overwriting 1st degree connection thickness
						c.sprite.opacity = 0.7;
						c.sprite.extraThickness = 0;
					}
				}
			} else {
				if (recursive) {
					if (c.sprite.opacity < 0.7) {
						//prevents overwriting 2nd degree connection thickness
						c.sprite.opacity = 0.2;
						c.sprite.extraThickness = -0.3;
					}
				}
			}
		}
	};

	self.resetEdges = function () {
		for (var i = self.connections.length - 1; i >= 0; i--) {
			var c = self.connections[i];
			c.sprite.opacity = 0.5;
			c.sprite.extraThickness = 0;
		}
	};

	self.sendClick = function (nodeID, action) {
		var payload = [];
		payload.push(nodeID);
		payload.push(action);
		Simulations.sendServerMessage(new Message(payload, 'CLICK_TOKEN'));
	};

	self.getFriendsOf = function (peep) {
		var friends = [];
		for (var i = 0; i < self.connections.length; i++) {
			// in either direction
			var c = self.connections[i];

			if (c.from == peep && !c.to.neutral) {
				friends.push(c.to);
			}
			if (c.to == peep && !c.from.neutral) friends.push(c.from);
		}
		return friends;
	};
	self.getHoveredPeep = function (mouseBuffer) {
		mouseBuffer = mouseBuffer || 0;
		return self.peeps.find(function (peep) {
			return peep.hitTest(self.mouse.x, self.mouse.y, mouseBuffer);
		});
	};
	self.tryCuttingConnections = function (line) {
		var wasLineCut = 0;
		for (var i = self.connections.length - 1; i >= 0; i--) {
			// going BACKWARDS coz killing connections
			var c = self.connections[i];
			if (c.hitTest(line)) {
				if (c.uncuttable) {
					// can't cut uncuttables!
					wasLineCut = -1;
					c.shake();
				} else {
					wasLineCut = 1;
					self.connections.splice(i, 1);
				}
			}
		}
		return wasLineCut;
	};
	self.removeAllConnectedTo = function (peep) {
		for (var i = self.connections.length - 1; i >= 0; i--) {
			// backwards index coz we're deleting
			var c = self.connections[i];
			if (c.from == peep || c.to == peep) {
				// in either direction
				self.connections.splice(i, 1); // remove!
			}
		}
	};

	//////////////
	// INIT NOW //
	//////////////

	// Start Uncuttable?
	if (self.options.startUncuttable) {
		self.networkConfig.connections.forEach(function (c) {
			c[2] = 1;
		});
	}

	self.init();

	// Start randomize positions?
	if (self.options.randomStart) {
		var r = {
			x: self.options.randomStart,
			y: 0,
		};
		self.peeps.forEach(function (peep) {
			var randomPush = rotateVector(r, Math.random() * Math.TAU);
			peep.x += randomPush.x;
			peep.y += randomPush.y;
		});
	}
}
