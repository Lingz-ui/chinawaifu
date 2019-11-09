let Discord = require('discord.js');
let dbHelper = require('../helpers/dbhelper');
let maxClaim = 5;
let maxTime = 30*30*1000;

exports.createAndSendClaimEmbed = (rollList, message, bot) => {
    let rand = Math.floor(Math.random() * 100);

    if (rand < 5) {
        createNSFWClaimEmbed(rollList, message, bot);
    } else {
        createSFWClaimEmbed(rollList, message, bot);
    }
};

let createClaimEmbed = (waifu, messageAuthor) => {
    return new Discord.RichEmbed()
        .setTitle(`${waifu.name}`)
        .setColor(0x00AE86)
        .setDescription(`${waifu.series}\n\nRolled by: ${messageAuthor}`)
        .setImage(`${waifu.img[0]}`)
        .setFooter(`${nsfwEmbed(waifu)}`);
};

let createSFWClaimEmbed = (rollList, message, bot) => {
    let rollType = rollList;
    let series = Object.keys(rollType)[Math.floor(Math.random() * Object.keys(rollType).length)];
    let seriesWaifus = rollType[series].datalist;
    let waifu = seriesWaifus[Object.keys(rollType[series].datalist)[Math.floor(Math.random()
        * Object.keys(seriesWaifus).length)]];

    let embed = createClaimEmbed(waifu, message.author.username);

    message.channel.send(embed).then(
        // Create the reactionCollector
        msg => {
            //message.react(message.guild.emojis.get('492394595393732618'));
            msg.react('💖');
            //message.react('💓');
            let filter = (reaction, user) => reaction.emoji.name === '💖' && user.id !== bot.user.id;
            let collector = msg.createReactionCollector(filter, {time: 15000});
            collector.on('collect', r => {
                collector.stop();
                msg.clearReactions().then();
            });
            collector.on('end', collected => {
                if (collected.get('💖')) {
                    let userID = collected.get('💖').users.lastKey();
                    let claimingUser = collected.get('💖').users.get(userID);
                    
                    checkClaimRestrict(bot,message).then(res=>{
                        msg.channel.send('<@' + userID + '>' + ' has claimed ' + waifu.name + '!');
                        let claimedEmbed = new Discord.RichEmbed()
                            .setTitle(`${waifu.name}`)
                            .setColor(0xE06666)
                            .setDescription(`${waifu.series}\n\nRolled by: ${claimingUser.username}`)
                            .setImage(`${waifu.img[0]}`)
                            .setFooter(`Claimed by ${claimingUser.username}`,
                                claimingUser.avatarURL);
    
                        claimingUser.serverid = message.guild.id;
                        dbHelper.claimWaifu(claimingUser, waifu).then(e => msg.edit(claimedEmbed));
                    }).catch(rej=>{
                        msg.channel.send(rej);
                    })
                }
                msg.clearReactions().then();
            });
        }
    );
};

let createNSFWClaimEmbed = (rollList, message, bot) => {

    let rollType = rollList;
    let series = Object.keys(rollType)[Math.floor(Math.random() * Object.keys(rollType).length)];
    let seriesWaifus = rollType[series].datalist;
    let waifu = seriesWaifus[Object.keys(rollType[series].datalist)[Math.floor(Math.random()
        * Object.keys(seriesWaifus).length)]];

    let embed = createClaimEmbed(waifu, message.author.username);
    let danbooruTag = checkIfCharacterHasNSFW(waifu);
    fetchNSFWImage(danbooruTag).then(imgUrl => {
        message.channel.send(embed).then(
            // Create the reactionCollector
            msg => {
                let reactedList = {};
                msg.react('💖').then(e => {
                    if (danbooruTag !== false) {
                        msg.react('😳');
                    }
                });

                let filter = (reaction, user) => user.id !== bot.user.id;
                let collector = msg.createReactionCollector(filter, {time: 15000});
                collector.on('collect', r => {
                    if (r.emoji.name === '😳') {
                        // Send nsfw pm and return
                        let nsfwEmbed = new Discord.RichEmbed()
                            .setTitle(`${waifu.name}`)
                            .setColor(0xE06666)
                            .setDescription(`Fetched from: ${imgUrl.src}`)
                            .setImage(imgUrl.img);

                        r.users.forEach((user) => {
                            if (user.bot === false) {
                                if (!reactedList.hasOwnProperty(user.id)) {
                                    reactedList[user.id] = true;
                                    console.log(`sent nudes to ${user.username}`);
                                    user.send(nsfwEmbed);
                                }
                            }
                        });
                        return;
                    }
                    if (r.emoji.name === '💖') {
                        collector.stop();
                        msg.clearReactions().then();
                    }
                });
                collector.on('end', collected => {
                    if (collected.get('💖')) {
                        let userID = collected.get('💖').users.lastKey();
                        checkClaimRestrict(bot,message).then(res=>{
                            msg.channel.send('<@' + userID + '>' + ' has claimed ' + waifu.name + '!');
                            let claimingUser = collected.get('💖').users.get(userID);
                            let claimedEmbed = new Discord.RichEmbed()
                                .setTitle(`${waifu.name}`)
                                .setColor(0xE06666)
                                .setDescription(`${waifu.series}\n\nRolled by: ${claimingUser.username}`)
                                .setImage(`${waifu.img[0]}`)
                                .setFooter(`Claimed by ${claimingUser.username}`,
                                    claimingUser.avatarURL);

                            claimingUser.serverid = message.guild.id;
                            dbHelper.claimWaifu(claimingUser, waifu).then(e => msg.edit(claimedEmbed));
                        }).catch(rej=>{
                            msg.channel.send(rej);
                        })
                    }
                    msg.clearReactions().then();
                });
            }
        );
    });

};

let checkIfCharacterHasNSFW = (character) => {
    let nsfwlist = require('../helpers/loadwaifu').nsfwList;
    if (nsfwlist.hasOwnProperty(character.series.toLowerCase())) {
        if (nsfwlist[character.series.toLowerCase()].hasOwnProperty(character.name.toLowerCase())) {
            return nsfwlist[character.series.toLowerCase()][character.name.toLowerCase()]['tag'];
        }
    }
    return false;
};

let nsfwEmbed = (waifu) => {
    let nsfwList = require('../helpers/loadwaifu').nsfwList;
    if (nsfwList.hasOwnProperty(waifu.series.toLowerCase())) {
        if (nsfwList[waifu.series.toLowerCase()].hasOwnProperty(waifu.name.toLowerCase())) {
            return '😳️ possible';
        }
    }
    return '';
};

async function fetchNSFWImage(tag) {
    if (tag === null || tag === undefined || tag.length < 0 || tag === false) {
        return;
    }

    let Booru = require('booru');

    let danbooru = Booru('db');


    let res = await danbooru.search([tag, '-rating:s'], {limit: 25});
    return {
        src: 'Danbooru',
        img: res[Math.floor(Math.random() * res.length)]._data.file_url
    };
}

function checkClaimRestrict(bot,message){
    return new Promise((resolve,reject)=>{
        //--------------Start claimRestrict---------------//
        let now = Date.now();
        let uid = message.author.id;
        if(bot.claimRestrict.has(uid)){
            // Registed in collection
            let restrictor = bot.claimRestrict.get(uid);
            if(restrictor.exp_time < now){
                // Expired
                restrictor.counter = 1;
                restrictor.exp_time = now + maxTime;
                bot.claimRestrict.set(uid,restrictor);
            }else{
                if(restrictor.counter == maxClaim){
                    let delta = restrictor.exp_time - Date.now();
                    let sec = (delta/1000).toFixed(0);
                    let min = (delta/60000).toFixed(0);
                    let waitTime = "";
                    if(sec < 60){
                        waitTime = sec+"s"
                    }else{
                        waitTime = min+"m"
                    }
                    reject(`>>> Max claim. Next claim reset in about ${waitTime}`);
                }else{
                    restrictor.counter++;
                    bot.claimRestrict.set(uid,restrictor);
                }
            }
        }else{
            // Not registed in collection
            bot.claimRestrict.set(uid,{
                counter: 1, // Init counter = 1
                exp_time: Date.now() + maxTime  // expire after one hour
            })
        }
        resolve(1);
        //-----------End claimRestrict------------//
    })
}