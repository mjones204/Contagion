function ConnectorCutter(config){

	var self = this;
	self.config = config;
	self.sim = config.sim;
	if (ConnectorCutter.MAX_CONNECTIONS == undefined){ //uses this to set intial value. If get a new one from the server, this prevents it from being overwritten.
		ConnectorCutter.MAX_CONNECTIONS = 5;
		ConnectorCutter.CONNECTIONS_REMAINING = ConnectorCutter.MAX_CONNECTIONS;
	}


	// Connecting/Cutting
	self.connectFrom = null;
	self.connectTo = null;
	self.isCutting = false;
	self.cutTrail = [];

	// SNIP & PLUCK SOUND
	var _SNIP_SOUND = 0;
	var _SNIP = function(){
		_SNIP_SOUND = (_SNIP_SOUND+1)%3;
		SOUNDS["snip"+_SNIP_SOUND].play();
		console.log(ConnectorCutter.CONNECTIONS_REMAINING);
		publish("sim/connection_update");
	};
	var _PLUCK_SOUND_INDEX = 0;
	var _PLUCK_SOUND = [0,1,2,3,2,1];
	var _PLUCK = function(){
		var soundName = "pluck"+_PLUCK_SOUND[_PLUCK_SOUND_INDEX];
		SOUNDS[soundName].play();
		_PLUCK_SOUND_INDEX++;
		if(_PLUCK_SOUND_INDEX >= _PLUCK_SOUND.length) _PLUCK_SOUND_INDEX=0;
	};

	// Update!
	self.state = 0; // 0-nothing | 1-connecting | 2-cutting
	self.sandbox_state = 0; // 0-pencil | 1-add_peep | 2-add_infected | 3-move | 4-delete | 5-bomb
	self.update = function(){

		var mouse = self.sim.mouse;


		// IF SANDBOX STATE = PENCIL, complex mouse shtuff
		if(self.sandbox_state==0){

			// only if sim is NOT RUNNING
			if(!Simulations.IS_RUNNING){

				// JUST CLICKED, and state=0... can either start connecting or cutting!
				if(mouse.justPressed && self.state===0){

					// Clicked on a peep?
					var peepClicked = self.sim.getHoveredPeep(20);
					if(peepClicked && !Simulations.DisableOrbits){
						var action = 'L';
						//right clicks
						if(mouse.rightClick){
							action = 'R';
							//TODO: Signal to player that trying to take orbit when not there! IIRC bug here, says move only one at a time
							if(!Simulations.validateMoves(true, peepClicked.id)){ //i.e. when on non-starting round and you're trying to change more than one connection
								publish("sim/out_of_connections");
							}
							else if(peepClicked.playerOrbits.length > 0){
								self.sim.removeOrbitConnection(peepClicked, true);
								SOUNDS.pencil.volume(0.37);
								SOUNDS.pencil.play();
								ConnectorCutter.CONNECTIONS_REMAINING++;
								publish("sim/connection_update");
							}

						}
						//left click, and sufficient connections
						else if (ConnectorCutter.CONNECTIONS_REMAINING > 0){
								// SOUND!
								self.sim.addOrbitConnection(peepClicked, true);
								SOUNDS.pencil.volume(0.37);
								SOUNDS.pencil.play();
								ConnectorCutter.CONNECTIONS_REMAINING--;
								publish("sim/connection_update");
						}
						//left click, but out of connections
						else{
							publish("sim/out_of_connections");
							_PLUCK();
						}
						self.sim.sendClick(peepClicked.id, action);
					}

					// SOUND!
					SOUNDS.pencil_short.volume(0.37);
					SOUNDS.pencil_short.play();

					}

				}


			// In "NORMAL" state... tell Pencil what frame to go to
			if(self.state==0){
				if(!Simulations.IS_RUNNING){
					var peepHovered = self.sim.getHoveredPeep(20);
					pencil.gotoFrame( peepHovered ? 1 : 0 );
					if (peepHovered){
						self.sim.highlightEdges(peepHovered, true);
					}
					else{
						self.sim.resetEdges();
					}
				}else{
					pencil.gotoFrame(0);
				}
			}



			// In "CUTTING" state... cut intersected lines! & add to trail
			if(self.state==2){

				// Try cutting
				var line = [mouse.lastX, mouse.lastY, mouse.x, mouse.y];
				var wasLineCut = self.sim.tryCuttingConnections(line);
				if(wasLineCut==1){ // snip!
					_SNIP();
				}
				if(wasLineCut==-1){ // uncuttable
					_PLUCK();
				}

				// Add to trail
				self.cutTrail.unshift([mouse.x,mouse.y]); // add to start

				// Pencil's always RED
				pencil.gotoFrame(2);

			}

		}else{
			self.state=0;
		}

		// IF SANDBOX STATE = ADD/DELETE PEEP or BOMB, just click to activate!
		if(self.sandbox_state!=0){
			if(mouse.justPressed){

				// Add Peep
				if(self.sandbox_state==1){
					self.sim._addPeepAtMouse(false); // not infected
				}

				// Add Infected Peep
				if(self.sandbox_state==2){
					self.sim._addPeepAtMouse(true); // IS infected
				}

				// Delete Peep
				if(self.sandbox_state==4){
					self.sim._deletePeep();
				}

				// BOMB
				if(self.sandbox_state==5){
					var contagionLevel = self.sim.contagion; // hack for sandbox: keep contagion the same
					self.sim.clear();
					self.sim.contagion = contagionLevel;

					// Sound!
					SOUNDS.boom.play();

				}

			}
		}

		// IF SANDBOX STATE = MOVE...
		if(self.sandbox_state==3){
			if(mouse.justPressed) self.sim._startMove();
			if(mouse.justReleased) self.sim._stopMove();
		}

		// If trail too long, or NOT cutting, pop trail from end
		if(self.cutTrail.length>10 || self.state!=2 || self.sandbox_state!=0){
			self.cutTrail.pop();
		}

	};

	// Draw
	self.draw = function(ctx){

		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		// Connecting!
		if(self.state==1){
			var tempConnection = new Connection({
				from:self.connectFrom, to:self.connectTo,
				sim:self.sim
			});
			ctx.save();
			ctx.globalAlpha = 0.5;
			tempConnection.draw(ctx);
			ctx.restore();
		}

		// Cutting!
		if(self.cutTrail.length>0){
			ctx.strokeStyle = "#dd4040";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(self.cutTrail[0][0], self.cutTrail[0][1]);
			for(var i=1; i<self.cutTrail.length; i++){
				ctx.lineTo(self.cutTrail[i][0], self.cutTrail[i][1]);
			}
			ctx.stroke();
		}

	};

}
