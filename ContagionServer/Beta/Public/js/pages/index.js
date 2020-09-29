// data
let testData = [];
// colors
let strategyColors = {};
// charts
let stratVoteShareChart;
let stratWinRatioChart;
let allStratVoteShareChart;
let allStratWinRatioChart;
// chart configs
let stratVoteShareChartConfig;
let stratWinRatioChartConfig;
let allStratVoteShareChartConfig;
let allStratWinRatioChartConfig;

window.onload = function () {
	// data
	fetch('../../data/multipleGameTestResults.json')
		.then((response) => response.json())
		.then((json) => {
			testData = json;
			// assign colours to strategies
			assignColors();
			// populate selection dropdowns
			populateStrategySelectionDropdowns();
			// populate charts
			initChartConfigs();
			var ctx_1 = document.getElementById('canvas').getContext('2d');
			stratVoteShareChart = new Chart(ctx_1, stratVoteShareChartConfig);
			var ctx_2 = document.getElementById('canvas_2').getContext('2d');
			stratWinRatioChart = new Chart(ctx_2, stratWinRatioChartConfig);
			var ctx_3 = document.getElementById('canvas_3').getContext('2d');
			allStratVoteShareChart = new Chart(
				ctx_3,
				allStratVoteShareChartConfig,
			);
			var ctx_4 = document.getElementById('canvas_4').getContext('2d');
			allStratWinRatioChart = new Chart(
				ctx_4,
				allStratWinRatioChartConfig,
			);
			populateStratChartsWithTestData('Random', 'Random');
			populateAllStratChartsWithTestData('Random');
		});
};

function assignColors() {
	// get all strategy names into a set
	var strategyList = new Set();
	testData.forEach((matchup) => {
		strategyList.add(matchup.p1Strategy);
		strategyList.add(matchup.p2Strategy);
	});
	// for each strategy
	let index = 0;
	strategyList.forEach((strategy) => {
		strategyColors[strategy] = getColorFromIndex(index);
		index++;
	});
}

function initChartConfigs() {
	var color = Chart.helpers.color;

	// vote share chart config
	stratVoteShareChartConfig = {
		type: 'line',
		data: {
			labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
			datasets: [],
		},
		options: {
			responsive: false,
			title: {
				display: true,
				text: 'Chart.js Line Chart - Stacked Area',
			},
			tooltips: {
				mode: 'index',
			},
			hover: {
				mode: 'index',
			},
			scales: {
				xAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: 'Round Number',
						},
					},
				],
				yAxes: [
					{
						stacked: false,
						scaleLabel: {
							display: true,
							labelString: 'Vote Share (Average)',
						},
						ticks: {
							beginAtZero: true,
							max: 1,
						},
					},
				],
			},
		},
	};

	// outcome bar chart config
	var winRatioChartData = {
		labels: [''],
		datasets: [
			{
				label: 'P1 Wins',
				backgroundColor: color(window.chartColors.blue)
					.alpha(0.8)
					.rgbString(),
				borderColor: window.chartColors.blue,
				borderWidth: 1,
				data: [450],
			},
			{
				label: 'P2 Wins',
				backgroundColor: color(window.chartColors.red)
					.alpha(0.8)
					.rgbString(),
				borderColor: window.chartColors.red,
				borderWidth: 1,
				data: [300],
			},
			{
				label: 'Draws',
				backgroundColor: color(window.chartColors.grey)
					.alpha(0.8)
					.rgbString(),
				borderColor: window.chartColors.grey,
				borderWidth: 1,
				data: [250],
			},
		],
	};

	stratWinRatioChartConfig = {
		type: 'bar',
		data: winRatioChartData,
		options: {
			responsive: false,
			legend: {
				position: 'top',
			},
			title: {
				display: true,
				text: 'Chart.js Bar Chart',
			},
			tooltips: {
				mode: 'index',
			},
			hover: {
				mode: 'index',
			},
			scales: {
				xAxes: [
					{
						scaleLabel: {
							display: false,
							labelString: 'Outcomes',
						},
					},
				],
				yAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: 'Game Win Ratio',
						},
						ticks: {
							beginAtZero: true,
							max: 1,
						},
					},
				],
			},
		},
	};

	// all strategies vs strategy
	// vote share chart config
	allStratVoteShareChartConfig = {
		type: 'line',
		data: {
			labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
			datasets: [],
		},
		options: {
			responsive: false,
			title: {
				display: true,
				text: 'Chart.js Line Chart - Stacked Area',
			},
			tooltips: {
				mode: 'index',
			},
			hover: {
				mode: 'index',
			},
			scales: {
				xAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: 'Round Number',
						},
					},
				],
				yAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: 'Vote Share (Average)',
						},
						ticks: {
							beginAtZero: false,
						},
					},
				],
			},
		},
	};

	// outcome bar chart config
	var allStratWinRatioChartData = {
		labels: [''],
		datasets: [
			{
				label: 'P1 Wins',
				backgroundColor: color(window.chartColors.blue)
					.alpha(0.8)
					.rgbString(),
				borderColor: window.chartColors.blue,
				borderWidth: 1,
				data: [450],
			},
			{
				label: 'P2 Wins',
				backgroundColor: color(window.chartColors.red)
					.alpha(0.8)
					.rgbString(),
				borderColor: window.chartColors.red,
				borderWidth: 1,
				data: [300],
			},
			{
				label: 'Draws',
				backgroundColor: color(window.chartColors.grey)
					.alpha(0.8)
					.rgbString(),
				borderColor: window.chartColors.grey,
				borderWidth: 1,
				data: [250],
			},
		],
	};

	allStratWinRatioChartConfig = {
		type: 'bar',
		data: allStratWinRatioChartData,
		options: {
			responsive: false,
			legend: {
				position: 'top',
			},
			title: {
				display: true,
				text: 'Chart.js Bar Chart',
			},
			tooltips: {
				mode: 'index',
			},
			hover: {
				mode: 'index',
			},
			scales: {
				xAxes: [
					{
						scaleLabel: {
							display: false,
							labelString: 'Outcomes',
						},
					},
				],
				yAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: 'Game Win Percentage Gain (%)',
						},
						ticks: {
							beginAtZero: true,
						},
					},
				],
			},
		},
	};
}

function selectStrategy() {
	var strategy_1 = document.getElementById('strategy_dropdown_1').value;
	var strategy_2 = document.getElementById('strategy_dropdown_2').value;
	if (!strategy_1) {
		strategy_1 = 'Random';
	}
	if (!strategy_2) {
		strategy_2 = 'Random';
	}
	populateStratChartsWithTestData(strategy_1, strategy_2);
}

function selectAllStrategy() {
	var strategy = document.getElementById('strategy_dropdown_all').value;
	if (!strategy) {
		strategy = 'Random';
	}
	populateAllStratChartsWithTestData(strategy);
}

function populateStrategySelectionDropdowns() {
	// add strategy names to dropdowns
	var strategyList = new Set();
	testData.forEach((matchup) => {
		strategyList.add(matchup.p1Strategy);
		strategyList.add(matchup.p2Strategy);
	});
	var content = '';
	strategyList.forEach((strategy) => {
		content += `<option value="${strategy}">${strategy}</option>`;
	});
	document.getElementById('strategy_dropdown_1').innerHTML = content;
	document.getElementById('strategy_dropdown_2').innerHTML = content;
	document.getElementById('strategy_dropdown_all').innerHTML = content;
}

function populateStratChartsWithTestData(p1Strategy, p2Strategy) {
	console.log(p1Strategy, p2Strategy);
	var p1Color = window.chartColors.blue;
	var p2Color = window.chartColors.red;
	var drawColor = window.chartColors.grey;

	// lookup strategy matchup from test data
	let matchupData;
	testData.forEach((matchup) => {
		if (
			(matchup.p1Strategy === p1Strategy &&
				matchup.p2Strategy === p2Strategy) ||
			(matchup.p1Strategy === p2Strategy &&
				matchup.p2Strategy === p1Strategy)
		) {
			if (!matchupData) {
				let correctedMatchup = JSON.parse(JSON.stringify(matchup));
				// need to swap the strategies so they match the dropdown order
				if (matchup.p1Strategy !== p1Strategy) {
					correctedMatchup.p1Strategy = matchup.p2Strategy;
					correctedMatchup.p1Wins = matchup.p2Wins;
					correctedMatchup.p1AverageVoteShares =
						matchup.p2AverageVoteShares;
					correctedMatchup.p2Strategy = matchup.p1Strategy;
					correctedMatchup.p2Wins = matchup.p1Wins;
					correctedMatchup.p2AverageVoteShares =
						matchup.p1AverageVoteShares;
					correctedMatchup.p1WinRatio = matchup.p2WinRatio;
					correctedMatchup.p2WinRatio = matchup.p1WinRatio;
				}
				matchupData = correctedMatchup;
			}
		}
	});
	// player 1 data
	var newDatasetP1 = {
		label: matchupData.p1Strategy,
		borderColor: p1Color,
		backgroundColor: p1Color,
		data: matchupData.p1AverageVoteShares,
	};
	// player 2 data
	var newDatasetP2 = {
		label: matchupData.p2Strategy,
		borderColor: p2Color,
		backgroundColor: p2Color,
		data: matchupData.p2AverageVoteShares,
	};

	// add data
	stratVoteShareChartConfig.data.datasets = [];
	stratVoteShareChartConfig.data.datasets.push(newDatasetP1, newDatasetP2);

	// change chart title
	stratVoteShareChartConfig.options.title.text = `${matchupData.p1Strategy} vs ${matchupData.p2Strategy} - ${matchupData.gamesPlayed} games`;
	// update chart
	stratVoteShareChart.update();

	// now populate win ratio bar chart
	console.log('populating outcome chart, matchupData:', matchupData);
	// player 1 win data
	var newDatasetP1Wins = {
		label: `${matchupData.p1Strategy} Wins (${matchupData.p1WinRatio})`,
		borderColor: p1Color,
		backgroundColor: p1Color,
		data: [matchupData.p1WinRatio],
	};
	// player 2 win data
	var newDatasetP2Wins = {
		label: `${matchupData.p2Strategy} Wins (${matchupData.p2WinRatio})`,
		borderColor: p2Color,
		backgroundColor: p2Color,
		data: [matchupData.p2WinRatio],
	};
	// draws
	var newDatasetDraws = {
		label: `Draws (${matchupData.drawRatio})`,
		borderColor: drawColor,
		backgroundColor: drawColor,
		data: [matchupData.drawRatio],
	};

	// add data
	stratWinRatioChartConfig.data.datasets = [];
	stratWinRatioChartConfig.data.datasets.push(
		newDatasetP1Wins,
		newDatasetP2Wins,
		newDatasetDraws,
	);

	// change chart title
	stratWinRatioChartConfig.options.title.text = `${matchupData.p1Strategy} vs ${matchupData.p2Strategy} - ${matchupData.gamesPlayed} games`;
	// update chart
	stratWinRatioChart.update();
}

function populateAllStratChartsWithTestData(strategy) {
	// lookup strategy matchup from test data
	let matchups = [];
	testData.forEach((matchup) => {
		if (
			matchup.p1Strategy === strategy ||
			matchup.p2Strategy === strategy
		) {
			let correctedMatchup = JSON.parse(JSON.stringify(matchup));
			// need to swap the strategies so p2 always has the non-selected strategy
			if (matchup.p1Strategy !== strategy) {
				correctedMatchup.p1Strategy = matchup.p2Strategy;
				correctedMatchup.p1Wins = matchup.p2Wins;
				correctedMatchup.p1AverageVoteShares =
					matchup.p2AverageVoteShares;
				correctedMatchup.p2Strategy = matchup.p1Strategy;
				correctedMatchup.p2Wins = matchup.p1Wins;
				correctedMatchup.p2AverageVoteShares =
					matchup.p1AverageVoteShares;
				correctedMatchup.p1WinRatio = matchup.p2WinRatio;
				correctedMatchup.p2WinRatio = matchup.p1WinRatio;
			}
			// percentage gain playing p2 strategy vs strategy (how much more the p2 strategy wins vs the strategy)
			// e.g: 'p2 strategy wins 200% more games than random when head to head'
			correctedMatchup.p2WinRatioEdge = Math.round(
				parseFloat(
					(correctedMatchup.p2WinRatio -
						correctedMatchup.p1WinRatio) /
						correctedMatchup.p1WinRatio,
				) * 100,
			);
			matchups.push(correctedMatchup);
		}
	});

	// add data
	allStratVoteShareChartConfig.data.datasets = [];
	matchups.forEach((matchup, index) => {
		// player 2 data
		var dataset = {
			label: matchup.p2Strategy,
			borderColor: getStrategyColor(matchup.p2Strategy),
			backgroundColor: getStrategyColor(matchup.p2Strategy),
			data: matchup.p2AverageVoteShares,
			fill: false,
		};
		// add dataset to graph
		allStratVoteShareChartConfig.data.datasets.push(dataset);
	});

	// change chart title
	allStratVoteShareChartConfig.options.title.text = `All Strategies vs ${strategy} - ${matchups[0].gamesPlayed} games`;
	// update chart
	allStratVoteShareChart.update();

	// sort by win ratio edge (i.e. how much more the p2 strategy wins vs the strategy)
	matchups.sort((a, b) => b.p2WinRatioEdge - a.p2WinRatioEdge); // for descending sort

	// now populate win ratio bar chart
	// add data
	allStratWinRatioChartConfig.data.datasets = [];
	matchups.forEach((matchup, index) => {
		// player 2 data
		var dataset = {
			label: `${matchup.p2Strategy} (${matchup.p2WinRatioEdge}%)`,
			borderColor: getStrategyColor(matchup.p2Strategy),
			backgroundColor: getStrategyColor(matchup.p2Strategy),
			data: [matchup.p2WinRatioEdge],
		};
		// add dataset to graph
		allStratWinRatioChartConfig.data.datasets.push(dataset);
	});

	// change chart title
	allStratWinRatioChartConfig.options.title.text = `Game Win Percentage gain playing strategy X vs ${strategy} - ${matchups[0].gamesPlayed} games`;
	// update chart
	allStratWinRatioChart.update();
}

function getColorFromIndex(i) {
	const colors = [
		'rgb(54, 162, 235)',
		'rgb(75, 192, 192)',
		'rgb(201, 203, 207)',
		'rgb(255, 159, 64)',
		'rgb(153, 102, 255)',
		'rgb(255, 99, 132)',
		'rgb(255, 205, 86)',
		'rgb(40, 40, 40)',
	];
	if (i >= colors.length) {
		i = 0;
	}
	return colors[i];
}

function getStrategyColor(strategy) {
	const color = strategyColors[strategy];
	if (!color) {
		return 'rgb(0, 0, 0)';
	}
	return color;
}
