SLIDES.push(

{
	chapter: "Introduction",

	remove:[
		{type:"box", id:"title"},
		{type:"box", id:"button"}
	],

	add:[

		// Splash
		{
			ONLY_IF_IT_DOESNT_ALREADY_EXIST: true,
			type:"sim",
			id:"tempo",
			x:960/2, y:540/2,
			fullscreen: true,
			network: SPLASH_NETWORK,
			options:{
				splash: true,
				randomStart: 20
			}
		},

		// Words
		{
			type:"box",
			id:"intro",
			text:"intro", x:180, y:0, w:600, h:540, align:"center"
		},

	]

},

{
	remove:[
		{ type:"box", id:"intro" }
	],
	add:[
		{
			type:"box",
			id:"intro_2",
			text:"intro_2", x:180, y:0, w:600, h:540, align:"center"
		}
	]
},
{
	remove:[
		{ type:"box", id:"intro_2" }
	],
	add:[
		{
			type:"box",
			id:"intro_3",
			text:"intro_3", x:180, y:0, w:600, h:540, align:"center"
		}
	]
},
{
	remove:[
		{ type:"box", id:"intro_3" }
	],
	add:[
		{
			type:"box",
			id:"intro_ex",
			text:"intro_ex", x:180, y:0, w:600, h:540, align:"center"
		}
	]
},
{
	remove:[
		{ type:"box", id:"intro_ex" }
	],
	add:[
		{
			type:"box",
			id:"intro_4",
			text:"intro_4", x:180, y:0, w:600, h:540, align:"center"
		}
	]
},
{
	remove:[
		{ type:"box", id:"intro_4" }
	],
	add:[
		{
			type:"box",
			id:"intro_5",
			text:"intro_5", x:180, y:0, w:600, h:540, align:"center"
		}
	]
},
{
	remove:[
		{ type:"box", id:"intro_5" }

	],

	onstart: function(slideshow){
		// START, FOR REAL
			publish("START");
			publish("sound/button");
		},
},




);
