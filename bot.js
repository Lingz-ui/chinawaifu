let botToken = require('./config').botToken;

"use strict";

const Discord = require('discord.js');
const bot = new Discord.Client();
module.exports = bot;

require('./events/onMessage');
require('./events/onError');
require('./helpers/loadcommands').load();
bot.login("NTYyMTAyODE2NDQ2MDg3MTc5.XcH6Fg.MOk0RSI8LhBeeFwT4KMNtiQGxxo");

bot.conf = {
	prefix: '^',
	claimTimeout: '15'
};
