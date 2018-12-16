'use strict';

// モジュールの読み込み
const MeCab = new require('mecab-async');

/* モデルの読み込み */
const Message = require('../models/message');

// MeCabインスタンスの作成
const mecab = new MeCab();

/* しりとり用チャンネルにメッセージが送信されたときの処理 */
module.exports = async function shiritori(message) {
  const [judg] = await judgMessage(message);
  switch (judg) {
    case 'A':
      addMessage(message);
      sendMessage(message, `｢ **${message.content}** ｣ はOKです\n次は ｢ **${message.content.slice(-1)}** ｣ から始まる単語です`);
      break;
    case 'B':
      Message.findOne({
        where: {
          channel_id: message.channel.id
        },
        order:[['id','DESC']]
      }).then(previousMessage=>{
        let nextText = '｢ **ん** ｣ 以外で終わる単語から始めてください';
        if(previousMessage !== null){
          nextText = `次は ｢ **${previousMessage.dataValues.message.slice(-1)}** ｣ から始まる単語です`;
        }
        sendMessage(message, `｢ **${message.content}** ｣ は ｢ **ん** ｣ で終わっています\n${nextText}`);
      });
      break;
    case 'C':
      Message.findOne({
        where: {
          channel_id: message.channel.id
        },
        order:[['id','DESC']]
      }).then(previousMessage=>{
        sendMessage(message, `｢ **${message.content}** ｣ は ｢ **${previousMessage.dataValues.message}** ｣ の ｢ **${previousMessage.dataValues.message.slice(-1)}** ｣ から始まっていません\n次は ｢ **${previousMessage.dataValues.message.slice(-1)}** ｣ から始まる単語です`);
      });
      break;
    case 'D':
      Message.findOne({
        where: {
          channel_id: message.channel.id
        },
        order:[['id','DESC']]
      }).then(previousMessage=>{
        sendMessage(message, `｢ **${message.content}** ｣ は既に出ています\n次は ｢ **${previousMessage.dataValues.message.slice(-1)}** ｣ から始まる単語です`);
      });
      break;
    default:
      break;
  }
}

/* メッセージの1次判別関数 */
function judgMessage(message){
  console.log('1次判定処理');
  return new Promise(async(resolve)=>{
    let judg = 'A';
    /* 'ん'で終わっている */
    if(message.content.slice(-1) === 'ん'){
      judg = 'B';
    }
    /* 'ん'で終わっていない */
    else{
      judg = await judgMessage2(message, judg);
    }
    resolve([judg]);
  });
}

/* メッセージの2次判別関数 */
function judgMessage2(message, judg){
  console.log('2次判定処理');
  return new Promise((resolve)=>{
    Message.findOne({
      where: {
        channel_id: message.channel.id
      },
      order:[['id','DESC']]
    }).then(previousMessage=>{
      if(previousMessage !== null){
        /* 直前の単語とつながっている */
        if(message.content.slice(0, 1) === previousMessage.dataValues.message.slice(-1)){
          judg = judg;
        }
        /* 直前の単語とつながっていない */
        else{
          judg = 'C';
        }
        Message.findAll({
          where: {
            channel_id: message.channel.id,
            message: message.content
          }
        }).then(previousFlag=>{
          /* 新規単語 */
          if(previousFlag[0] === undefined){
            judg = judg;
          }
          /* 既出単語 */
          else{
            judg = 'D';
          }
          resolve([judg]);
        });
      }
      /* 1つ目の単語 */
      else{
        judg = judg;
        resolve([judg]);
      }
    });
  });
}

/* DBに単語を追加する関数 */
function addMessage(message){
  Message.create({
    channel_id: message.channel.id,
    message: message.content
  });
};

/* メッセージを送信する関数 */
function sendMessage(message, text){
  message.channel.fetchMessages({limit: 100}).then(messages=>{
    let botMessages = messages.filter(m=>m.author.bot && m.embeds !== [] && m.content !== '');
    if(Array.from(botMessages)[0]){
      let botMessage = Array.from(botMessages)[0][1];
      message.channel.send(text).then(botMessage.delete());
    }else{
      message.channel.send(text);
    }
  });
}
