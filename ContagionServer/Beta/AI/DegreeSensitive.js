class DegreeSensitive {
	constructor({ game, exponentStrength = 0.468, lowDegree = false }) {
		this.game = game;
		this.exponentStrength = exponentStrength;
		if (lowDegree) {
			// exponent strength is flipped for low degree sensitivity
			this.exponentStrength *= -1;
		}
	}

	getMove() {
		// probability distribution functions
		const pdfs = [];
		this.game.graph.nodes.forEach((node) => {
			const nodeDegree = this.game.graph.getDegree(node);
			// assigns a weight (i.e. relative likelihood of being chosen) to the node depending on # degrees
			const pdf = Math.exp(this.exponentStrength * nodeDegree);
			pdfs.push(pdf);
		});

		// samples a node from the weighting distribution
		return this.chooseNodeFromDistribution(pdfs).id;
	}

	chooseNodeFromDistribution(pdfs) {
		// random number between 0 and 1
		const rand = Math.random();
		// gets the max pdf in the array
		const max = Math.max(...pdfs);
		// get normalised pdf values
		const pdfNorms = pdfs.map((pdf) => {
			return pdf / max;
		});
		// add node indexes to pdf norms (so we can still lookup node after shuffling)
		let pdfNormsIndex = pdfNorms.map((pdfNorm, index) => {
			return {
				index,
				degree: this.game.graph.getDegree(index),
				pdf: pdfs[index],
				pdfNorm,
			};
		});
		// shuffle to randomise node order
		pdfNormsIndex = this.shuffleArray(pdfNormsIndex);
		// sort by pdfNorm value in ascending order
		pdfNormsIndex.sort(function (a, b) {
			if (a.pdfNorm < b.pdfNorm) {
				return -1;
			}
			if (a.pdfNorm > b.pdfNorm) {
				return 1;
			}
			return 0;
		});

		// nodes are picked when their normalised pdf value is nearest to the random number
		let lowestDifference = Number.MAX_SAFE_INTEGER;
		let lowestDifferenceNodeIndex = -1;

		pdfNormsIndex.forEach((pdfNI) => {
			const pdfNorm = pdfNI.pdfNorm;
			const nodeIndex = pdfNI.index;
			const difference = Math.abs(pdfNorm - rand);

			// new nearest node
			if (difference < lowestDifference) {
				lowestDifference = difference;
				lowestDifferenceNodeIndex = nodeIndex;
			}
		});

		// something went wrong
		if (lowestDifferenceNodeIndex < 0) {
			console.log(
				'ERROR: DegreeSensitive AI ChooseFromDistribution failed',
			);
			lowestDifferenceNodeIndex = 0;
		}
		// return node by index
		return this.game.graph.nodes[lowestDifferenceNodeIndex];
	}

	shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * i);
			const temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
		return array;
	}
}

exports.DegreeSensitive = DegreeSensitive;
