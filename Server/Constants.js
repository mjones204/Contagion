module.exports = Object.freeze({
	/* Database */
	DISABLE_DATABASE_WRITE: false, // methods that write to the database will be disabled if true
	ONLY_WRITE_HUMAN_GAMES: true, // if false, AI vs AI games will be saved - if running tests this could very quickly clutter the database so best to leave it as true
	USE_HTTPS: true, // set to false when running locally for testing and development (so that local client can communicate)
});
