const { App } = require('./src/app.js');
const { sessions } = require('./token.json');

var session = sessions[0];

App.sharedApp.run(session.token, session.clientId, session.guildId);
