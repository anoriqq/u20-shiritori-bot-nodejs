'use strict';

// モジュールの読み込み
const MeCab = new require('mecab-async');

/* モデルの読み込み */
const Message = require('../models/message');

// MeCabインスタンスの作成
const mecab = new MeCab();

// TODO NG判定の言葉を判定結果と共にDBに保存する

/* しりとり用チャンネルにメッセージが送信されたときの処理 A ~ F */
module.exports = async function shiritori(message) {
  const [judg, reading, previousData] = await judgMessage(message);
  switch (judg) {
    /* OK */
    case 'A':
      addMessage(message, reading);
      sendMessage(message, `:o:｢ **${message.content}** ｣ はOKです\n次は ｢ **${reading.slice(-1)}** ｣ から始まる単語です`);
      break;
    /* NG 文章 */
    case 'B':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は文章のためNGです\n単語で答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 名詞以外 */
    case 'C':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は名詞以外のためNGです\n名詞を答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 'ン'で終わる */
    case 'D':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は'ン'で終っているためNGです\n'ン'以外で終わる単語を答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 直前の単語とつながっていない */
    case 'E':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は直前の単語とつながっていないためNGです\n ｢ **${previousData.message}** ｣ の ｢ **${previousData.reading.slice(-1)}** ｣ から始まる単語を答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 既出 */
    case 'F':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は既に答えられているためNGです\nまだ答えられていない単語を答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 解析不能 */
    case 'G':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は判定できません\n開発者がそのうち対応します${toggleFirstMessage(previousData)}`);
      break;
  }
}

/* 初回時用にメッセージを切り替える関数 */
function toggleFirstMessage(previousData){
  let nextText = '';
  if(previousData !== null){
    nextText = `\n次は ｢ **${previousData.message}** ｣ の ｢ **${previousData.reading.slice(-1)}** ｣ から始まる単語です`;
  }
  return nextText;
}

// TODO 各判定フェーズを有効にするかどうか切り替え可能にする

/* 単語か文章かを判定する関数 A or B */
function judgMessage(message){
  console.log('1次判定処理');
  return new Promise(async(resolve)=>{
    const parsedContent = mecab.parseSync(message.content);
    let judg = 'A', reading = parsedContent[0][8], previousData = await getPreviousData(message);
    /* 1単語の場合 OK */
    if(parsedContent.length === 1){
      [judg, previousData] = await judgMessage2(message, judg, parsedContent[0], previousData);
    }
    /* 文章の場合 NG */
    else{
      judg = 'B';
    }
    resolve([judg, reading, previousData]);
  });
}

/* 名詞かそれ以外かを判定する関数 A or C */
function judgMessage2(message, judg, parsedContent, previousData){
  console.log('2次判定処理');
  return new Promise(async(resolve)=>{
    /* 名詞の場合 OK */
    if(parsedContent[1] === '名詞'){
      [judg, previousData] = await judgMessage3(message, judg, parsedContent, previousData);
    }
    /* 名詞以外の場合 NG */
    else{
      judg = 'C';
    }
    resolve([judg, previousData]);
  });
}

/* 読みの最後の文字を判定する関数 A or D */
function judgMessage3(message, judg, parsedContent, previousData){
  console.log('3次判定処理');
  return new Promise(async(resolve)=>{

    // TODO "ー"で終わる単語の処理

    /* 読み方が分からない場合 NG */
    if(parsedContent[8] == undefined){
      judg = 'G';
    }
    /* 'ン'で終わらない場合 OK */
    else if(parsedContent[8].slice(-1) !== 'ン'){
      [judg, previousData] = await judgMessage4(message, judg, parsedContent, previousData);
    }
    /* 'ン'で終わる場合 NG */
    else{
      judg = 'D';
    }
    resolve([judg, previousData]);
  });
}

/* 直前の単語とつながっているかどうかを判定する関数 A or E */
function judgMessage4(message, judg, parsedContent, previousData){
  console.log('4次判定処理');
  return new Promise((resolve)=>{
    Message.findOne({
      where: {
        channel_id: message.channel.id
      },
      order:[['id','DESC']]
    }).then(async(previousMessage)=>{
      /* DBに単語が保存されていない場合 OK */
      if(previousMessage === null){
        judg = judg;
      }
      /* 直前の単語とつながっている場合 OK */
      else if(previousMessage.dataValues.reading.slice(-1) === parsedContent[8].slice(0, 1)){
        judg = await judgMessage5(message, judg);
        previousData = previousMessage.dataValues;
      }
      /* 直前の単語とつながっていない場合 NG */
      else{
        judg = 'E';
      }
      resolve([judg, previousData]);
    });
  });
}

/* 既出かどうかを判定する関数 A or F */
function judgMessage5(message, judg){
  console.log('5次判定処理');
  return new Promise((resolve)=>{
    Message.findOne({
      where: {
        channel_id: message.channel.id,
        message: message.content
      }
    }).then(Previously=>{
      /* 新規単語の場合 OK */
      if(Previously === null){
        judg = judg;
      }
      /* 既出単語の場合 NG */
      else{
        judg = 'F'
      }
      resolve(judg);
    });
  });
}

/* 直前の単語をDBから取り出す関数 */
function getPreviousData(message){
  return new Promise((resolve)=>{
    Message.findOne({
      where: {
        channel_id: message.channel.id
      },
      order:[['id','DESC']]
    }).then(previousMessage=>{
      if(previousMessage !== null){
        resolve(previousMessage.dataValues);
      }else{
        resolve(null);
      }
    })
  });
}

/* DBに単語を追加する関数 */
function addMessage(message, reading){
  Message.create({
    channel_id: message.channel.id,
    message: message.content,
    reading: reading
  });
};

/* メッセージを送信する関数 */
function sendMessage(message, text){
  message.channel.fetchMessages({limit: 100}).then(messages=>{
    let botMessages = messages.filter(m=>m.author.bot && m.embeds !== [] && m.content !== '');
    let botMessagesArray = Array.from(botMessages);
    if(botMessagesArray.length){
      message.channel.send(text).then(()=>{
        for(let i=0;i<botMessagesArray.length;i++){
          botMessagesArray[i][1].delete();
        }
      });
    }else{
      message.channel.send(text);
    }
  });
}
