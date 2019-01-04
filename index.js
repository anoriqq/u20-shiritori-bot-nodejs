'use strict';
require('dotenv').config()

/* モジュールの読み込み */
const Discord = require('discord.js');
const shiritori = require('./lib/shiritori');
const command = require('./lib/command');

/* clientインスタンス作成 */
const client = new Discord.Client();

/* モデルの読み込み */
const Message = require('./models/message');
const Channel = require('./models/channel');
const unparsableMessage = require('./models/unparsableMessage');
const Reading = require('./models/reading');
Message.sync();
Channel.sync();
unparsableMessage.sync();
Reading.sync();

// エラー処理
client.on('error', console.error);

/* メッセージを受け取ったときの処理 */
client.on('message', message=>{
  /* bot自身の発言を無視 */
  if(message.author.bot || message.mentions.users.size > 0) return;
  /* しりとり用チャンネル以外の発言を無視 */
  Channel.findOne({
    where: {
      id: message.channel.id
    }
  }).then(channel=>{
    /* しりとりチャンネルでの発言の場合 */
    if(channel !== null){
      /* '//'から始まる発言を無視 */
      if(message.content.startsWith('//')) return;
      /* 最新の単語の最初の文字が'!'の場合 コマンド実行 */
      if(message.content.startsWith('!')){
        command(message);
        return;
      }
      shiritori(message);
    }else
    /* 最新の単語の最初の文字が'!add'の場合 コマンド実行 */
    if(message.content.startsWith('!add')){
      command(message);
    }
  });
});

/* 起動時の処理 */
client.on('ready', ()=>{
  /* ログ出力 */
  console.log(`Logged in as ${client.user.tag}`);

  /* botにゲームを追加 */
  client.user.setPresence({ game: { name: '!help : ヘルプを表示', type: 'PLAYING' }})
})

/* ログイン */
const token = process.env.DISCORD_TOKEN;
client.login(token);
