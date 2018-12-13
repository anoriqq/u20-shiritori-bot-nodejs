'use strict';
require('dotenv').config()

/* モジュールの読み込み */
const Discord = require('discord.js');

/* Discord Client 作成 */
const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN;

/* メッセージを受け取ったときの処理 */
client.on('message', message=>{
  /* bot自信の発言を無視 */
  if(message.author.bot){
    return;
  }
});

/* ログイン */
client.login(token);
