SLIDES.push(
	{
		//PART ONE: PEEP
		chapter: "Tutorial_Peep",

		clear:true,
		add:[

			// The top instructions
			{
				type:"box",
				text:"tutorial_1", x:270, y:400, w:440, h:70, align:"center"
			},

			// The fullscreen simulation
			{
				type:"sim",
				x:0, y:10,
				fullscreen: true,
				network: {
					"contagion":0,
					"peeps":[[488,200,0]],
					//"connections":[[5,6,0]],
					"connections":[]
				}
			},
		]
	},

	{
		//PART 2: NETWORKS, HOW TO INFECT, CONTROLS---------------------------------------------------------------------------
		chapter: "Tutorial_Network",
		clear:true,
		add:[

			// The top instructions
			{
				type:"box",
				id: "tutorial_2_1",
				text:"tutorial_2_1", x:270, y:400, w:440, h:70, align:"center"
			},

			// The fullscreen simulation
			{
				type:"sim",
				x:0, y:10,
				fullscreen: true,
				network: {
					"peeps":[[331,49,0],[634,323,0],[632,53,0],[334,321,0]],
					"connections":[[0,2,0],[2,3,0],[1,3,0]]
				}
			},
			//NOTE: These are here to prevent errors as we're using a non-standard implementation of the simulation class
			//These are all hidden and will have no impact on the player
			{
				id:"connections_dialog",
				type:"box",
				text:"sandbox_caption",
				x:440, y:40, w:300, h:40,
				align:"center",
				hidden:true
			},
			{
				id:"timer_dialog",
				type:"box",
				text:"timer_caption_2",
				x:700, y:40, w:300, h:40,
				align:"center",
				hidden:true
			},
			{
				id:"round_dialog",
				type:"box",
				text:"round_caption",
				x:0, y:40, w:300, h:40,
				align:"center",
				hidden:true
			}
		],
		onstart:function(slideshow, state){
			ConnectorCutter.MAX_CONNECTIONS = 0;
			ConnectorCutter.CONNECTIONS_REMAINING = ConnectorCutter.MAX_CONNECTIONS;
			state.addedOrbit = false;
			state.removedOrbit = false;
			state.peepChosen = false;
			state.newRound = false;
		}
},

{
	remove:[
		{ type:"box", id:"tutorial_2_1" }
	],

	add:[
			{
				type:"box",
				id: "tutorial_2_2",
				text:"tutorial_2_2", x:270, y:400, w:440, h:70, align:"center"
			}
	]
},
{
	remove:[
		{ type:"box", id:"tutorial_2_2" }
	],

	add:[
			{
				type:"box",
				id: "tutorial_2_3",
				text:"tutorial_2_3", x:270, y:400, w:440, h:70, align:"center"
			},
			{
				type:"box",
				id: "tutorial_2_3_1",
				text:"tutorial_2_3_1", x:
				70, y:500, w:500, h:70, align:"center"
			},
			{
				type:"box",
				id: "tutorial_2_3_2",
				text:"tutorial_2_3_2", x:470, y:500, w:500, h:70, align:"center",
				hidden:true
			},
			{
				type:"box",
				id: "tutorial_2_4",
				text:"tutorial_2_4", x:270, y:500, w:440, h:70, align:"center",
				hidden:true
			},
			{
				type:"box",
				id: "tutorial_2_5",
				text:"tutorial_2_5", x:270, y:600, w:440, h:70, align:"center",
				hidden:true
			},
			{
				type:"box",
				id: "tutorial_2_6",
				text:"tutorial_2_6", x:700, y:155, w:440, h:70, align:"center",
				hidden:true
			},
			{
				type:"box",
				id:"beginbutton",
				x:390, y:-100,
				sim_ui:"red",
				hidden:true
			},
			{
				type:"box",
				id: "tutorial_2_7",
				text:"tutorial_2_7", x:700, y:135, w:440, h:70, align:"center",
				hidden:true
			},
		],

		onstart:function(slideshow, state){
			ConnectorCutter.MAX_CONNECTIONS = 1;
			ConnectorCutter.CONNECTIONS_REMAINING = ConnectorCutter.MAX_CONNECTIONS;
		},
		// Logic to fade in/out words & stuff
		onupdate:function(slideshow, state){
			var boxes = slideshow.boxes;
			var button;

			if (!state.addedOrbit && ConnectorCutter.CONNECTIONS_REMAINING < ConnectorCutter.MAX_CONNECTIONS){
				state.addedOrbit = true;
				boxes.removeChildByID("tutorial_2_3_1", true);
				boxes.showChildByID("tutorial_2_3_2", true);
			}
			else if(state.addedOrbit && !state.removedOrbit && ConnectorCutter.CONNECTIONS_REMAINING == ConnectorCutter.MAX_CONNECTIONS){
				state.removedOrbit = true;
				boxes.removeChildByID("tutorial_2_3_2", true);
				boxes.showChildByID("tutorial_2_4", true);
			}
			else if(state.removedOrbit && !state.peepChosen && ConnectorCutter.CONNECTIONS_REMAINING < ConnectorCutter.MAX_CONNECTIONS){
				state.peepChosen = true;
				boxes.showChildByID("tutorial_2_5", true);
				boxes.showChildByID("beginbutton", true);
				button = document.getElementById("beginbutton");
				console.log(button);
				button.onclick = function(){
					state.buttonClicked = true;
				};
			}
			else if(!state.subsequentRound && state.buttonClicked){
				state.subsequentRound = true;
				boxes.showChildByID("tutorial_2_6", true);
			}
		}
},
{
	remove:[
		{ type:"box", id:"tutorial_2_3" },
		{ type:"box", id:"tutorial_2_3_1" },
		{ type:"box", id:"tutorial_2_3_2" },
		{ type:"box", id:"tutorial_2_4" },
		{ type:"box", id:"tutorial_2_5" },
		{ type:"box", id:"tutorial_2_6" },
		{ type:"box", id:"tutorial_2_7" }
	],
	add:[
			{
				type:"box",
				id: "tutorial_2_8",
				text:"tutorial_2_8", x:230, y:400, w:500, h:70, align:"center",
			},
			{
				type:"box",
				id: "tutorial_2_9",
				text:"tutorial_2_9", x:230, y:500, w:500, h:70, align:"center",
				hidden:true
			}
		],

		// Logic to fade in/out words & stuff
		onupdate:function(slideshow, state){
			var boxes = slideshow.boxes;
			var peeps = slideshow.simulations.sims[0].peeps;
			var allInfected = true;
			peeps.forEach(function(peep){
				if(peep.neutral == true){
					allInfected = false;
				}
			});
			if (allInfected && !state.displayedText){
				console.log(peeps);
				state.displayedText = true;
				console.log(boxes);
				setTimeout((boxes) => {
					boxes.showChildByID("tutorial_2_9", true);
				},1000, boxes);
			}
		}

},

{
		//PART 3: ADVERSARIES & HOW TO WIN------------------------------------------------------------------------------------------------
		chapter: "Tutorial_Adversary",

		clear:true,
		add:[

			{
				type:"box",
				id: "tutorial_3_1",
				text:"tutorial_3_1", x:230, y:300, w:500, h:70, align:"center"
			},
			// The fullscreen simulation
			{
				type:"sim",
				x:0, y:10,
				fullscreen: true,
				network: {
					"contagion":0,
					"peeps":[[300,185,0],[475,185,0],[650,185,0]],
					"connections":[[0,1,0],[1,2,0]]
				}
			},

		],

		onstart:function(slideshow,state){
			Simulations.DisableOrbits = true;
			ConnectorCutter.MAX_CONNECTIONS = 0;
			ConnectorCutter.CONNECTIONS_REMAINING = ConnectorCutter.MAX_CONNECTIONS;
			var peeps = slideshow.simulations.sims[0].peeps;
			var enemyPeep = peeps[2];
			var playerPeep = peeps[0];
			slideshow.simulations.sims[0].addOrbitConnection(playerPeep, true);
			slideshow.simulations.sims[0].addOrbitConnection(enemyPeep, false);
		},

},
{
	remove:[
		{ type:"box", id:"tutorial_3_1" }
	],

	add:[
		{
			type:"box",
			id: "tutorial_3_2",
			text:"tutorial_3_2", x:230, y:-50, w:500, h:70, align:"center",
		},
		{
			type:"box",
			id: "tutorial_3_2_2",
			text:"tutorial_3_2_2", x:230, y:300, w:500, h:70, align:"center",
			hidden:true
		},
		{
			type:"box",
			id: "tutorial_3_3_1",
			text:"tutorial_3_3_1", x:700, y:150, w:500, h:70, align:"center",
			hidden:true
		},
		{
			type:"box",
			id: "tutorial_3_3_2",
			text:"tutorial_3_3_2", x:230, y:500, w:500, h:70, align:"center",
			hidden:true
		},
		{
			type:"box",
			id:"beginbutton",
			x:390, y:-120,
			sim_ui:"red",
			hidden:true
		}
	],


	onstart:function(slideshow, state){
		state.partway = false;
		state.finished = false;
		var boxes = slideshow.boxes;
		setTimeout((boxes) => {
			boxes.showChildByID("tutorial_3_2_2", true);
			boxes.showChildByID("beginbutton", true);
			console.log(slideshow.simulations.sims[0].peeps);
		},3000, boxes);
	},

	onupdate:function(slideshow, state){
		var boxes = slideshow.boxes;
		console.log(slideshow.simulations.sims[0].peeps[0].neutral);
		if (!slideshow.simulations.sims[0].peeps[0].neutral && !state.partway){
			state.partway = true;
			boxes.showChildByID("tutorial_3_3_1", true);
		}
		if (!slideshow.simulations.sims[0].peeps[1].neutral && !state.finished){
			state.finished = true;
			boxes.showChildByID("tutorial_3_3_2", true);
		}
	}

},
{
	remove:[
		{ type:"box", id:"tutorial_3_2" },
		{ type:"box", id:"tutorial_3_2_2" },
		{ type:"box", id:"tutorial_3_3_1" },
		{ type:"box", id:"tutorial_3_3_2" }
	],

	add:[
		{
			type:"box",
			id: "tutorial_3_4",
			text:"tutorial_3_4", x:230, y:250, w:500, h:70, align:"center",

		},
	],

	onstart:function(slideshow, state){
		Simulations.DisableOrbits = false;
	}

},
{
onstart:function(slideshow, state){
	Simulations.TutorialMode = false;
	publish("START");
}
}
);
