class Message{
  constructor(payload, status){
    this.payload = payload;
    this.status = status;
  }
}
//Required for Node.js, try/catch suppresses error on frontend.
try{
  module.exports = Message;
}
catch(err){}
