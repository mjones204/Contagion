function Sprite(config) {
	var self = this;
	self.config = config;

	// Properties...
	self.x = 0;
	self.y = 0;
	self.pivotX = 0;
	self.pivotY = 0;
	self.scale = null;
	self.scaleX = 1;
	self.scaleY = 1;
	self.rotation = 0; // radians
	self.drawPie = false;
	self.pieSegments = [];
	self.drawPieSpinner = false;
	self.pieSpinnerStopped = false;
	self.pieSpinnerDefaultAngle = -0.5 * Math.PI;
	self.pieSpinnerAngle = self.pieSpinnerDefaultAngle;
	self.pieSpinnerWidth = Math.PI * 2 * 0.03;
	self.pieSpinnerDefaultSpeed = Math.PI * 2 * 0.1;
	self.pieSpinnerLowestSpeed = Math.PI * 2 * 0.0015;
	self.pieSpinnerSpeed = self.pieSpinnerDefaultSpeed;
	self.pieSpinnerTargetAngleMin = 0;
	self.pieSpinnerTargetAngleMax = 0;
	self.pieSpinnerColor = 'rgb(249, 149, 49)';

	// Frames
	self.currentFrame = 0;
	self.totalFrames = config.frames;
	self.nextFrame = function () {
		self.currentFrame = (self.currentFrame + 1) % self.totalFrames;
	};
	self.gotoFrame = function (frame) {
		self.currentFrame = frame;
	};

	self.drawPieChart = function (probabilityRed, probabilityGreen) {
		self.currentFrame = 0; // reset frame to default
		self.pieSegments = [];
		self.pieSegments.push({
			probability: probabilityGreen,
			color: 'rgba(60, 208, 0, 0.94)',
			id: 'green',
		});
		self.pieSegments.push({
			probability: probabilityRed,
			color: 'rgba(247, 60, 80, 0.94)',
			id: 'red',
		});
		self.drawPie = true;
	};

	self.stopDrawPieChart = function () {
		self.drawPie = false;
		self.pieSegments = [];
	};

	self.startPieSpinner = function (greenOwnsNode) {
		// re-init angles if its the first call
		if (!self.drawPieSpinner) {
			self.pieSpinnerStopped = false; // true when the spinner reaches final position
			self.pieSpinnerAngle = self.pieSpinnerDefaultAngle;
			self.pieSpinnerSpeed = self.pieSpinnerDefaultSpeed;
			self.pieSpinnerTargetAngleMin = 0;
			self.pieSpinnerTargetAngleMax = Math.PI * 2;

			// however that doesnt account for a spinner w/ variable speed
			// get a min ok angle
			// max ok angke
			// spin for 2 secs
			// then gradually decrease speed to some reasonable min speed
			// if speed = min speed and in acceptable range
			// speed = 0
			let currentAngle = self.pieSpinnerDefaultAngle;
			let endAngle = currentAngle;
			self.pieSegments.forEach((segment) => {
				// endAngle is the end angle of the current segment
				endAngle = currentAngle + Math.PI * 2 * segment.probability;

				// the spinner needs to land on green
				if (greenOwnsNode) {
					// green segment
					if (segment.id === 'green') {
						self.pieSpinnerTargetAngleMin = currentAngle;
						self.pieSpinnerTargetAngleMax = endAngle;
					}
				}
				// the spinner needs to land on red
				else {
					// red segment
					if (segment.id === 'red') {
						self.pieSpinnerTargetAngleMin = currentAngle;
						self.pieSpinnerTargetAngleMax = endAngle;
					}
				}

				// current angle set to end angle - ready for next segment
				currentAngle = endAngle;
			});
		}
		self.drawPieSpinner = true;
	};

	self.stopDrawPieSpinner = function () {
		self.drawPieSpinner = false;
	};

	// Draw
	self.draw = function (ctx) {
		var sw = config.sw;
		var sh = config.sh;
		var sx = self.currentFrame * sw;
		var sy = 0;

		ctx.save();
		ctx.translate(self.x, self.y);
		ctx.rotate(self.rotation);
		if (self.scale) {
			ctx.scale(self.scale, self.scale);
		} else {
			ctx.scale(self.scaleX, self.scaleY);
		}
		ctx.translate(-self.pivotX, -self.pivotY);
		var image = IMAGES[config.img];
		ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
		ctx.restore();

		let twoSegments = false;
		if (self.drawPie) {
			let lastEnd = -0.5 * Math.PI;
			// draw a slice for each color
			self.pieSegments.forEach((segment) => {
				if (segment.probability > 0) {
					if (segment.probability < 1) {
						twoSegments = true;
					}
					ctx.fillStyle = segment.color;
					ctx.beginPath();
					ctx.moveTo(0, 0);
					// Arc Parameters: x, y, radius, startingAngle (radians), endingAngle (radians), antiClockwise (boolean)
					ctx.arc(
						0,
						0,
						20,
						lastEnd,
						lastEnd + Math.PI * 2 * segment.probability,
						false,
					);
					ctx.lineTo(0, 0);
					ctx.fill();
					lastEnd += Math.PI * 2 * segment.probability;
				}
			});

			if (twoSegments && self.drawPieSpinner) {
				ctx.fillStyle = self.pieSpinnerColor;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.arc(
					0,
					0,
					20,
					self.pieSpinnerAngle,
					self.pieSpinnerAngle + self.pieSpinnerWidth,
					false,
				);
				ctx.lineTo(0, 0);
				ctx.fill();
				self.pieSpinnerAngle += self.pieSpinnerSpeed;

				console.log(
					'lowestSpeed: ' +
						self.pieSpinnerLowestSpeed +
						' currentSpeed: ' +
						self.pieSpinnerSpeed,
				);

				// speed still has room to decrease
				if (self.pieSpinnerSpeed > self.pieSpinnerLowestSpeed) {
					self.pieSpinnerSpeed -= self.pieSpinnerSpeed * 0.01;
				}
				// speed is at the lowest - now wait for target angle to be in range
				else if (self.pieSpinnerSpeed <= self.pieSpinnerLowestSpeed) {
					// set to lowest speed
					self.pieSpinnerSpeed = self.pieSpinnerLowestSpeed;
					// spinner is in target range
					if (
						self.pieSpinnerAngle >= self.pieSpinnerTargetAngleMin &&
						self.pieSpinnerAngle <= self.pieSpinnerTargetAngleMax
					) {
						// stop spinner
						self.pieSpinnerStopped = true;
					}
					// spinner has been stopped - no speed
					if (self.pieSpinnerStopped) {
						self.pieSpinnerSpeed = 0;
					}
				}
			}
		}
	};
}
