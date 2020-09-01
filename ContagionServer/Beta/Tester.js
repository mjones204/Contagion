const { Game, Player, Graph, Node, Edge, Token } = require('./Classes.js');

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
	const game = new Game({ players, graph });
	console.log(game);
	console.log(game.graph.nodes);
	game.beginRound();
	console.log(game.playerVoteShares);
	const [p1, p2] = game.players;
	game.playerMove(p1, 0);
	game.playerMove(p2, 4);
	game.beginRound();
	console.log(game.playerVoteShares);
	game.beginRound();
	console.log(game.playerVoteShares);
	game.beginRound();
	console.log(game.playerVoteShares);
	game.beginRound();
	console.log(game.playerVoteShares);
	console.log(game);
	console.log(game.graph.nodes);
};

newGame();
