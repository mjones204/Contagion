const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

const server = app.listen(3000, function () {
	console.log('Server API running on port', server.address().port);
});

// game server
const { GameServer } = require('./GameServer');
const gameServerPort = process.env.PORT || 5001;
const gameServer = new GameServer(gameServerPort);
