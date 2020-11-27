function SimUI(container, color) {
	var self = this;
	self.container = container;
	self.container.classList.add('sim_ui');

	// START / NEXT
	var startButton = document.createElement('div');
	//var resetButton = document.createElement("div");
	var roundDisplay = document.getElementById('round_dialog');
	var connectionsDisplay = document.getElementById('connections_dialog');
	var timerDisplay = document.getElementById('timer_dialog');
	var percentageInfectedDisplay = document.getElementById(
		'percent_infected_dialog',
	);
	var scoreDisplay = document.getElementById('score_dialog');
	//SimUI.timeRemaining = -1;
	var timerTimeout = null;

	SimUI.RoundNumber = 0;

	startButton.id = 'start_button';
	//resetButton.id = "reset_button";
	self.container.appendChild(startButton);
	//self.container.appendChild(resetButton);
	//resetButton.onclick = function(event){
	//publish("sound/button");
	//Simulations.resetMoves();
	//};
	startButton.onclick = function (event) {
		if (event.ctrlKey) {
			Simulations.newGame();
		} else {
			publish('sound/button');
			if (Simulations.TutorialMode) {
				Simulations.updateStateTutorial();
				startButton.innerHTML = 'Processing Round...';
				self.container.setAttribute('active', true);
				setTimeout(
					(startButton) => {
						startButton.innerHTML = getWords('sim_start');
						self.container.removeAttribute('active');
					},
					500,
					startButton,
				);
			} else if (SimUI.RoundNumber < 11) {
				if (
					Simulations.validateMoves(false, -1) &&
					!Simulations.inProgress
				) {
					timerDisplay.innerHTML =
						getWords('timer_caption_2') + ' ' + SimUI.timeRemaining;
					timerDisplay.style.color = 'black';
					Simulations.IS_RUNNING = true;
					Simulations.requestStart = true;
					publish('sim/start');
				}
			}
		}
	};
	_stopPropButton(startButton);

	//Separating into 2 functions prevents bug that can occur when toggling UI
	//buttons in small networks
	var _roundEnd = function () {
		startButton.innerHTML = getWords('sim_start');
		//resetButton.innerHTML = ("Reset Moves");
		if (!Simulations.TutorialMode) {
			self.container.removeAttribute('active');
			if (SimUI.RoundNumber < 10) {
				SimUI.RoundNumber++;
			}
			roundDisplay.innerHTML =
				getWords('round_caption') +
				' ' +
				'<b>' +
				SimUI.RoundNumber +
				'</b>';
			roundDisplay.style.fontSize = '50px';
			percentageInfectedDisplay.innerHTML =
				'Percentage Infected: ' + Simulations.PERCENTAGE_INFECTED + '%';
			scoreDisplay.innerHTML = 'SCORE: ' + ' ' + Simulations.Score;
		}
	};

	var _roundStart = function () {
		startButton.innerHTML = getWords('sim_stop');
		self.container.setAttribute('active', true);
	};

	var _updateConnectionBox = function () {
		if (!Simulations.TutorialMode) {
			connectionsDisplay.innerHTML =
				getWords('sandbox_caption') +
				' ' +
				ConnectorCutter.CONNECTIONS_REMAINING;
		}
	};

	SimUI.timerTick = function () {
		SimUI.timeRemaining--;
		var text = Simulations.awaitingResponse
			? getWords('timer_caption_2')
			: getWords('timer_caption_1');
		try {
			if (SimUI.timeRemaining > -1) {
				timerDisplay.innerHTML = text + ' ' + SimUI.timeRemaining;
				if (SimUI.timeRemaining < 11 && !Simulations.awaitingResponse) {
					timerDisplay.style.color = 'red';
				}
			}
			SimUI.timerTimeout = setTimeout(
				(text) => {
					SimUI.timerTick(text);
				},
				1000,
				text,
			);
		} catch (err) {
			setTimeout(
				(text) => {
					SimUI.timerTick(text);
				},
				1000,
				text,
			);
		}
	};

	SimUI.updateTimer = function (payload) {
		// disable timer for trials
		if (true) {
			return;
		}
		var status = payload[0]; // note this needs to be implemented serverside
		var duration = Math.floor(payload[1]);
		if (duration > 0) {
			var text;
			//If waiting for player 2. Player 1 should already have recieved their timer, but not progressed to round 2.
			timerDisplay.innerHTML = text + ' ' + duration;
			timerDisplay.style.color = 'black';
			SimUI.timeRemaining = duration + 1;
			clearTimeout(SimUI.timerTimeout);
			SimUI.timerTick();
		}
	};

	var _outOfConnections = function () {
		if (!Simulations.TutorialMode) {
			connectionsDisplay.style.color = 'red';
			setTimeout(function () {
				connectionsDisplay.style.color = 'black';
			}, 1000);
		}
	};

	_roundEnd();
	_updateConnectionBox();

	var _handler1 = subscribe('sim/start', _roundStart);
	var _handler2 = subscribe('sim/round_over', _roundEnd);
	var _handler3 = subscribe('sim/connection_update', _updateConnectionBox);
	var _handler4 = subscribe('sim/out_of_connections', _outOfConnections);

	self.container.kill = function () {
		unsubscribe(_handler1);
		unsubscribe(_handler2);
		unsubscribe(_handler3);
		unsubscribe(_handler4);
	};
}
