const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const path = require('path');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'Public'))); // for static files used by web pages

routes(app);

const server = app.listen(3000, function () {
	console.log('Server API running on port', server.address().port);
});

// game server
const { GameServer } = require('./GameServer');
const gameServerPort = process.env.PORT || 5001;
const gameServer = new GameServer(gameServerPort);
