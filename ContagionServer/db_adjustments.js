var Server = require('./server.js');

dbAdjust = async function() {
    console.log('Adjusting database');
    //await adjustMasterGamesTable();
    //await adjustPlayerActionsTable();
}

adjustMasterGamesTable  = async function() {
    var query = "SELECT * FROM master_games_table";
    var result = await Server.sendSqlQuery(query);
    //console.log(result);
    for(var i = 0; i < result.rows.length; i++) {
        var row = result.rows[i];
        //console.log(row.game_id);
        var p1_str = row.player_one_topology_id.replace("Topology_newer", "").split("_");
        var p2_str = row.player_two_topology_id.replace("Topology_newer", "").split("_");
        query = `UPDATE master_games_table SET p1_topology_id = ${p1_str[0]}, p2_topology_id = ${p2_str[0]}, p1_layout_id = ${p1_str[1]}, p2_layout_id = ${p2_str[1]} WHERE game_id = '${row.game_id}';`;
        console.log(query);
        var updateResult = await Server.sendSqlQuery(query);
    }
}

adjustPlayerActionsTable  = async function() {
    var query = "SELECT * FROM player_actions_table";
    var result = await Server.sendSqlQuery(query);
    //console.log(result);
    for(var i = 0; i < result.rows.length; i++) {
        var row = result.rows[i];
        //console.log(row.p1_moves);
        //console.log(row.p2_moves);
        var p1_last_move = "";
        var p2_last_move = "";
        if(row.p1_moves.includes(",")) {
            var p1_moves = row.p1_moves.split(",");
            p1_last_move = p1_moves[p1_moves.length - 1];
        }
        else {
            p1_last_move = row.p1_moves;
        }
        if(row.p2_moves.includes(",")) {
            var p2_moves = row.p2_moves.split(",");
            p2_last_move = p2_moves[p2_moves.length - 1];
        }
        else {
            p2_last_move = row.p2_moves;
        }
        query = `UPDATE player_actions_table SET p1_moves = '${p1_last_move}', p2_moves = '${p2_last_move}' WHERE game_id = '${row.game_id}' AND round_number = ${row.round_number};`;
        console.log(query);
        var updateResult = await Server.sendSqlQuery(query);
    }
}

dbAdjust();