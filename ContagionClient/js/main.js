window.onload = function(){
	// Start Preloading!
	publish("prepreload");

}

subscribe("prepreload/done", function(){

	// Bye Pre-Preloader!
	var pre_preloader = $("#pre_preloader");
	pre_preloader.parentNode.removeChild(pre_preloader);

	// Setting up the main stuff
	window.slideshow = new Slideshow();
	window.pencil = new Pencil();
	window.navigation = new Navigation();

	// Initializing the Mouse
	Mouse.init(document.body);

	// Animation loop IS update loop for now, whatever
	function update(){

		// Update
		slideshow.update();
		pencil.update();
		Mouse.update();

		// Draw
		slideshow.draw();
		pencil.draw();

		// Update
		publish("update");

		window.requestAnimationFrame(update);

	}
	window.requestAnimationFrame(update);

	// Go to THE SPLASH
	slideshow.gotoChapter("Preloader");


	// HACK - MOBILE IS HORRIBLE
	$all("a").forEach(function(a){
		a.ontouchstart = function(event){
			event.stopPropagation();
		}; // so you CAN click links
	});


});
subscribe("STARTTUTORIAL", function(){
	Simulations.TutorialMode = true;
	if(Simulations.connectedToServer){
		slideshow.gotoChapter("Tutorial_Peep");
	}
	else{
		Simulations.popupDialogue("Can't connect. Try again or refresh.");
	}
});

subscribe("START", function(){
	console.log("STARTO");
	Simulations.TutorialMode = false;
	if(Simulations.connectedToServer){
		//SOUNDS.bg_music.stop();
		//SOUNDS.bg_music.volume(0.5);
		//SOUNDS.bg_music.loop(true);
		//SOUNDS.bg_music.play();

		// Hide translations, show navigation
		$("#navigation").style.display = "block";

		// Introduction
		slideshow.gotoChapter("Strategy");
	}
	else{
		Simulations.popupDialogue("Can't connect. Try again or refresh.");
	}

});
