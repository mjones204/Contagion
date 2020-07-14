NETWORK_CONFIGS = [];
NETWORK_LAPLACIANS = [];

NETWORK_CONFIGS.Xscale = 1 //1200; //Input topologies have x/y coordinates between 0 and 1. This scales it to a typical player's screen.
NETWORK_CONFIGS.Yscale = 1 //700;
NETWORK_CONFIGS.Xoffset = 0 //75;//-100;
NETWORK_CONFIGS.Yoffset = 0 //150;//-25;
const csv = require('csvtojson');
Server = require('./server.js');
const uuidv4 = require('uuid/v4');
const fs = require('fs');


processConfig = async (rawPeeps, rawConnections, uniqueLayoutName, list, topologyIndex) => {
	//validate input configs
	if (rawPeeps.length % 2 !== 0) {
		//console.log("ERR! Must be even number of peeps!");
		return;
	}

	var randomInfection = [];
	if (Server.NeutralMode) {
		//makes all nodes neutral to start
		for (var x = 0; x < rawPeeps.length; x++) {
			randomInfection.push(-1);
		}
	} else {
		//console.log("NOT NEUTRAL");
		for (var x = 0; x < rawPeeps.length / 2; x++) {
			randomInfection.push(0);
			randomInfection.push(1);
		}
		shuffle(randomInfection); //shuffles the list so the initial layout is random
	}

	var peepData = [];
	var connectionData = [];

	//Scales the x and y co-ordinates of the nodes to fit the container. This could possibly be implemented on client side.
	for (var i = 0; i < rawPeeps.length; i++) {
		peepData.push([(rawPeeps[i][0] * NETWORK_CONFIGS.Xscale) + NETWORK_CONFIGS.Xoffset, (rawPeeps[i][1] * NETWORK_CONFIGS.Yscale) + NETWORK_CONFIGS.Yoffset, randomInfection[i]]);
	}

	//Isn't this just recreating the list? This was from a while ago so not too sure if needed.
	for (var i = 0; i < rawConnections.length; i++) {
		connectionData.push(rawConnections[i]);
	}

	list.push({
		"peeps": peepData,
		"connections": connectionData, //TODO: Slight performance ehancement performed on laplacian but could be applied here. Connections are same for layouts of same topology, so could use topologyIndex to fetch conenctions from a list, preventing duplicate data
		"uniqueLayoutID": uniqueLayoutName,
		"laplacianID": topologyIndex,
	});
}

async function loadConfigs() {
	var csvPeeps = null;
	var csvConnections = null;
	var spliceAmount = -1;
	if (!Server.LocalMode) {
		csvPeepsDirectory = 'ContagionServer/Config_Files/';
		sliceAmount = 29; //removes this prefix when saving unique ID
	} else { //depending where it's started from, can be already inside ContagionServer
		//console.log("Running on Local Mode.");
		csvPeepsDirectory = 'Config_Files/';
		sliceAmount = 13;
	}

	var topologies = [];
	//from https://stackoverflow.com/questions/2727167/how-do-you-get-a-list-of-the-names-of-all-files-present-in-a-directory-in-node-j?rq=1
	fs.readdirSync(csvPeepsDirectory).forEach(file => {
		topologies.push(csvPeepsDirectory + file + "/");
	});

	//FORMAT OF TOPOLOGIES:
	//Each must be in Config_Files with a different folder for each different topology (multiple layouts can be in one folder)
	//In this folder is n*2 folders, where n=number of layouts for this topology. Each topology has one positions_[index] and edges_[index] csv
	for (var i = 0; i < topologies.length; i++) {
		var numLayouts = -1; //there is one edges file, so number of layouts is #files - 1
		fs.readdirSync(String(topologies[i])).forEach(file => { //String() is needed as the elements are stored as objects and need conversion for file traversal
			numLayouts++;
		});
		var topologyLayoutsList = [];

		var edgesPath = topologies[i] + "edges.csv";
		var connections = null;
		await csv({
			noheader: true,
			output: "csv"
		}).fromFile(edgesPath).then((jsonObj) => {
			connections = jsonObj;
		});

		var topologyLaplacian = createLaplacian(connections);
		NETWORK_LAPLACIANS.push(topologyLaplacian);

		for (var j = 0; j < numLayouts; j++) {
			var positionsPath = topologies[i] + "positions_" + j + ".csv";
			var uniqueLayoutName = topologies[i].slice(sliceAmount, -1) + "_" + j;

			var rawPeeps = null;
			////console.log(positionsPath);
			await csv({
				noheader: true,
				output: "csv"
			}).fromFile(positionsPath).then((jsonObj) => {
				rawPeeps = jsonObj;
			});


			processConfig(rawPeeps, connections, uniqueLayoutName, topologyLayoutsList, i); //slice removes the Config_Files part to give the name of the folder
		}
		shuffle(topologyLayoutsList); //random order of layouts
		NETWORK_CONFIGS.push(topologyLayoutsList); //Changes the original usage! Now contains LISTS of configs
	}

	shuffle(NETWORK_CONFIGS); //random order of topologies
	Server.initialiseTopologyLayoutIndexes(); // initialises Server.CurrentTopologyLayoutIndexes and Server.CurrentTopologyIndices
	////console.log(NETWORK_CONFIGS);
	console.log("ready");
}

function createLaplacian(connections) {

	var laplacian = [];
	for (var y = 0; y < Server.NumberOfNodes; y++) {
		var arr = [];
		for (var x = 0; x < Server.NumberOfNodes; x++) {
			arr.push(0);
		}
		laplacian.push(arr);
	}

	////console.log(connections);
	for (var i = 0; i < connections.length; i++) {

		var node1 = connections[i][0];
		var node2 = connections[i][1];

		laplacian[node1][node1]++;
		laplacian[node2][node2]++; //adds to the degree matrix

		laplacian[node1][node2]--;
		laplacian[node2][node1]--; //subtracts the adjacency matrix

	}
	//console.log("-----------------------------");
	//console.log(connections);
	//console.log(laplacian);

	return laplacian;
}

//Fisher-Yates shuffle. Credit: https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

loadConfigs();

module.exports.configs = NETWORK_CONFIGS;
module.exports.laplacians = NETWORK_LAPLACIANS;