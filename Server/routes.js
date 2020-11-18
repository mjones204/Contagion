const path = require('path');

const appRouter = function (app) {
	app.get('/', function (req, res) {
		res.sendFile(path.join(__dirname + '/Pages/index.html'));
		//res.status(200).send('Welcome to our restful API');
	});
};

module.exports = appRouter;
