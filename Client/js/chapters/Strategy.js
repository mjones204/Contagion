SLIDES.push({
	chapter: 'Strategy',
	clear: true,
	contagion: 0.5,

	add: [
		// Words
		{
			id: 'connections_dialog',
			type: 'box',
			text: 'sandbox_caption',
			x: 440,
			y: 40,
			w: 300,
			h: 40,
			align: 'center',
		},
		{
			id: 'timer_dialog',
			type: 'box',
			text: 'timer_caption_2',
			x: 700,
			y: 40,
			w: 300,
			h: 40,
			align: 'center',
			hidden: true, // hide timer
		},
		{
			id: 'round_dialog',
			type: 'box',
			text: 'round_caption',
			x: 0,
			y: 40,
			w: 300,
			h: 40,
			align: 'center',
		},
		// Simulation UI
		{
			type: 'box',
			x: 275,
			y: 30,
			sim_ui: 'red',
		},
	],
});
