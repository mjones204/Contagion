const { Game, Player, Graph, Node, Edge, Token } = require('./GameClasses');
const { AI, Strategies } = require('./AI');

const network = {
	nodes: [0, 1, 2, 3, 4],
	edges: [
		[0, 1],
		[0, 4],
		[1, 3],
		[1, 2],
	],
};

const newGame = () => {
	const graph = new Graph(network);
	const players = [
		new Player({ id: 0, color: 'green' }),
		new Player({ id: 1, color: 'red' }),
	];
	const aiStrategy = 'Random';
	const game = new Game({ players, graph, aiStrategy });
	const [p1, p2] = game.players;
	const ai = new AI({
		game,
		strategy: Strategies.SimpleGreedy,
		player: p2,
	});
	console.log(game);
	console.log(game.graph.nodes);
	game.beginRound();
	game.playerMove(p1, 0);
	game.playerMove(p2, ai.move({}));
	game.beginRound();
	console.log(game.playerVoteShares);
	game.playerMove(p1, 0);
	game.playerMove(p2, ai.move({}));
	game.beginRound();
	console.log(game.playerVoteShares);
	game.playerMove(p1, 0);
	game.playerMove(p2, ai.move({}));
	game.beginRound();
	console.log(game.playerVoteShares);
	//console.log(game);
	//console.log(game.graph.nodes);
};

newGame();
