class ClientToServerPeep {
  constructor(id, numOrbits) {
    this.id = id;
    this.numOrbits = numOrbits;
  }
}

/*
What needs to be stored on the server?
Do we really need the infected state sent from the client? I don't think so. It's not directly used in calculations (and validation is used
on the server side to prevent tampering), and we store the post-calclation infected states any to collect data.

NEED TO STORE FOR GAME LOGIC:
Ratio
ID

NEED TO STORE FOR DATA COLLECTION:
Infected
ID
Both Players' Moves

Final Thoughts:
Yes, we should send infected state, this way we can prove which player is cheating if there is discrepancy.
ID is needed to track which node is which both on the server (so it can recreate the network) and the client (so we can see how each node is affected btwn rounds)
Ratio is the least data needed to make the necessary calculations. It could be open to sabotage, BUT if we compare values from player A and B...
Wait no, let's not store this at all. Keep this server-side. No risk of sabotage, no need to compare, means I can easily reuse code when AI is playing.
Players' Moves are necessary for data collection. Strictly, we could work this out server-side, but validation is very easy (only way to cheat it to player advantage
is to add more, simple length check.) and cheap.

FINAL RESULTS:
Player -> Server = ID, Player Moves
Server -> Player = ID, Infected, Other Player's Last Move?

 */
