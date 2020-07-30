var testP1SelectedStrategy = "";
var testP2SelectedStrategy = "";

function testingToolsInit(info) {
    var testingToolsBtn = document.getElementById("test_button");
    var testingToolsModal = document.getElementById("test_tools_modal");
    testingToolsBtn.style.removeProperty('display');
    testingToolsBtn.onclick = function(event){
        publish("sound/button");
		testingToolsBtn.setAttribute("active",true);
        setTimeout((testingToolsBtn) => {testingToolsBtn.removeAttribute("active");},500, testingToolsBtn);
        if(testingToolsModal.style.display == "none") {
            testingToolsModal.style.display = "block";
        }
        else {
            testingToolsModal.style.display = "none";
        }
        console.log("Test Button Click");
    };
    _stopPropButton(testingToolsBtn);

    // generate topology dropdown options
    var contents = "";
    for(var i = 0; i < info.configs.length; i++) {
        var config = info.configs[i];
        for(var j = 0; j < config.length; j++) {
            var topologyName = config[j].uniqueLayoutID;
            contents += '<option value="' + topologyName + '">' + topologyName + '</option>';
        }
    }
    // populate topology dropdown
    var topologyDropdownContainer = document.getElementById("tm_topologies_dropdown");
    topologyDropdownContainer.innerHTML = contents;

    // set selected topology dropdown as currently set on the server
    topologyDropdownContainer.value = "Topology_newer" + info.topologyID + "_" + info.layoutID;

    // generate strategy selection lists
    for(var p = 1; p <= 2; p++) {
        contents = "";
        for(i = 0; i < info.strategyList.length; i++) {
            var strategy = info.strategyList[i];

            var disabledStr = ""; // for disabling 'Manual' strategy for p2
            if(p == 2 && strategy == "Manual") {
                disabledStr = " disabled";
            }

            var checkedStr = "";
            // p1 select strategy as currently set on the server
            if(p == 1 && strategy == info.p1Strategy) {
                checkedStr = ' checked="checked"';
            }
            // p2 select strategy as currently set on the server
            else if(p == 2 && strategy == info.p2Strategy) {
                checkedStr = ' checked="checked"';
            }
            contents += '<div class="tm_strategies_rb"><input type="radio" name="p' + p + '_strat_radio" value="' + strategy + '"' + checkedStr + ' onclick="testModalStrategyRadioSelection(' + p + ', this.value)"' + disabledStr + '> ' + strategy + '</div>';
            if(i + 1 != info.strategyList.length) {
                contents += '\n';
            }
        }
         // populate strategy lists
         var stratListContainer = document.getElementById("tm_p" + p + "_strategy_list");
         stratListContainer.innerHTML = contents;
    }

    // set selected strategies for both players
    testP1SelectedStrategy = info.p1Strategy;
    testP2SelectedStrategy = info.p2Strategy;
    //testModalRequestNextMove(1, testP1SelectedStrategy);
    //testModalRequestNextMove(2, testP2SelectedStrategy);
    console.log(info);
}

function testModalTopologySelection(selected) {
    console.log(selected);
}

function testModalStrategyRadioSelection(playerNumber, selected) {
    if(playerNumber == 1) {
        testP1SelectedStrategy = selected;
    }
    else {
        testP2SelectedStrategy = selected;
    }
    console.log(playerNumber, selected);
    testModalRequestNextMove(playerNumber, selected);
}

function testModalRequestNextMove(playerNumber, strategy) {
    Simulations.requestPlayerNextMove(playerNumber, strategy);
}

function testPlayerNextMoveInfoReceived(info) {
    // we have received a valid next move
    if(info.playerNumber) {
        var valid = false;
        // set the next move label if it matches the strategy we have currently selected
        if(info.playerNumber == 1 && info.strategy == testP1SelectedStrategy) {
            valid = true;
        }
        else if(info.playerNumber == 2 && info.strategy == testP2SelectedStrategy) {
            valid = true;
        }

        if(valid) {
            document.getElementById("p" + info.playerNumber + "_next_move").innerHTML = info.nextMove;
        }
    }
}

// returns true if the use is hovering over the test modal - needed so we can disable inadvertant node clicks when selecting test options
function userMouseIsOverTestModal() {
    var btn = document.getElementById("test_button");
    var modal = document.getElementById("test_tools_modal");
    // modal isn't displayed
    if(modal.style.display == "none") {
        return false;
    }
    // modal is displayed
    else {
        if(btn.parentNode.querySelector(":hover") == btn || modal.parentNode.querySelector(":hover") == modal) {
            // mouse is inside btn/modal
            return true;
        } else {
            return false;
        }
    }
}
