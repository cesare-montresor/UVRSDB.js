const { Bot } = require("./bot.js")

class App {

  

  static get sharedApp(){
    if (!App.__sharedApp) {
      App.__sharedApp = new App();
    }
    return App.__sharedApp;
  }

  
  constructor(){
    this.bot = new Bot();
  }
  

  run(token, clientId, guildId) {
    this.bot.connect(token, clientId, guildId);
  }
}


module.exports = {App}