'use strict';

// モジュールの読み込み
const MeCab = new require('mecab-async');

/* モデルの読み込み */
const Message = require('../models/message');
const unparsableMessage = require('../models/unparsableMessage');
const Reading = require('../models/reading');

// MeCabインスタンスの作成
const mecab = new MeCab();

/* しりとり用チャンネルにメッセージが送信されたときの処理 A ~ F */
module.exports = async function shiritori(message) {
  const [JUDG, parsedContent] = await judg(message);
  const previousData = await getPreviousData(message);
  const formated = formatReading(parsedContent[0][8]);
  switch (JUDG) {
    /* OK */
    case 'A':
      addMessage(message, formated);
      sendMessage(message, `:o:｢ **${message.content}** ｣ はOKです\n次は ｢ **${formated.last}** ｣ から始まる単語です`);
      break;
    /* NG 文章 */
    case 'B':
      addUnparsableMessage(message);
      sendMessage(message, `:x:｢ **${message.content}** ｣ は文章のためNGです\n単語で答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 名詞以外 */
    case 'C':
      addUnparsableMessage(message);
      sendMessage(message, `:x:｢ **${message.content}** ｣ は名詞以外のためNGです\n名詞を答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 解析不能 */
    case 'D':
      addUnparsableMessage(message);
      sendMessage(message, `:x:｢ **${message.content}** ｣ は判定できません\n開発者がそのうち対応します${toggleFirstMessage(previousData)}`);
      break;
    /* NG 直前の単語とつながっていない */
    case 'E':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は直前の単語とつながっていないためNGです\n ｢ **${previousData.message}** ｣ の ｢ **${previousData.last}** ｣ から始まる単語を答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 'ン'で終わる */
    case 'F':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は'ン'で終っているためNGです\n'ン'以外で終わる単語を答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 既出 */
    case 'G':
      sendMessage(message, `:x:｢ **${message.content}** ｣ は既に答えられているためNGです\nまだ答えられていない単語を答えてください${toggleFirstMessage(previousData)}`);
      break;
    /* NG 既出 */
    case 'H':
      sendMessage(message, `｢ **${previousData.last}** ｣から始まる拗音リストがありません｡\n<@!${process.env.ADMIN_USER_ID}>がそのうち追加するので対応までお待ち下さい\n` + '`!cancel`コマンドを利用して直前の単語を削除してください');
      break;
  }
}

/* 初回時用にメッセージを切り替える関数 */
function toggleFirstMessage(previousData){
  let nextText = '';
  if(previousData !== null){
    nextText = `\n次は ｢ **${previousData.message}** ｣ の ｢ **${previousData.last}** ｣ から始まる単語です`;
  }
  return nextText;
}

// TODO 各判定フェーズを有効にするかどうか切り替え可能にする

/* 単語か文章かを判定する関数 */
function judg(message){
  console.log('1次判定処理');
  return new Promise(async(resolve)=>{
    const parsedContent = mecab.parseSync(message.content);
    /* 1単語の場合 OK */
    if(parsedContent.length === 1){
      resolve([await judg2(message, parsedContent[0]), parsedContent]);
    }
    /* 文章の場合 NG */
    else{
      resolve('B');
    }
  });
}

/* 名詞かそれ以外かを判定する関数 */
function judg2(message, parsedContent){
  console.log('2次判定処理');
  return new Promise(async(resolve)=>{
    const lexical = parsedContent[1];
    /* 名詞の場合 OK */
    if(lexical === '名詞'){
      resolve(await judg3(message, parsedContent));
    }
    /* 名詞以外の場合 NG */
    else{
      resolve('C');
    }
  });
}

/* 読み方が解析可能かどうかを判定する関数 */
function judg3(message, parsedContent){
  console.log('3次判定処理');
  return new Promise(async(resolve)=>{
    const reading = parsedContent[8];
    /* 読み方が解析可能な場合 NG */
    if(reading !== undefined){
      resolve(await judg4(message, reading));
    }
    /* 読み方が解析不能な場合 NG */
    else{
      resolve('D');
    }
  });
}

/* 直前の単語とつながっているかどうかを判定する関数 */
function judg4(message, reading){
  console.log('4次判定処理');
  return new Promise(async(resolve)=>{
    const formattedReading = formatReading(reading);
    const previousData = await getPreviousData(message);
    let linkingFlag = 'LINK';
    if(previousData !== null){
      linkingFlag = await linking(formattedReading.first, previousData.last);
    }
    /* 直前の単語とつながっているか､最初の単語の場合 OK */
    if(linkingFlag === 'LINK'){
      resolve(await judg5(message, formattedReading));
    }
    /* 拗音リスト不足 NG */
    else if(linkingFlag === 'H'){
      resolve('H');
    }
    /* 直前の単語とつながっていない場合 NG */
    else{
      resolve('E');
    }
  });
}

/* 読みの最後の文字が"ン"かどうかを判定する関数 */
function judg5(message, formattedReading){
  console.log('5次判定処理');
  return new Promise(async(resolve)=>{
    /* 'ン'で終わらない場合 OK */
    if(formattedReading.last !== 'ン'){
      resolve(await judg6(message));
    }
    /* 'ン'で終わる場合 NG */
    else{
      resolve('F');
    }
  });
}

/* 既出かどうかを判定する関数 A or F */
function judg6(message){
  console.log('6次判定処理');
  return new Promise((resolve)=>{
    Message.findOne({
      where: {
        channel_id: message.channel.id,
        message: message.content
      }
    }).then(Previously=>{
      /* 新規単語の場合 OK */
      if(Previously === null){
        resolve('A');
      }
      /* 既出単語の場合 NG */
      else{
        resolve('G');
      }
    });
  });
}

/* 2つの読みがつながっているかどうかを判定する関数 */
function linking(first, last){
  return new Promise((resolve)=>{
    if(last === first){
      resolve('LINK');
    }else if(last.length === 2){
      Reading.findOne({
        where:{
          1: last
        }
      }).then(lastReading=>{
        if(lastReading !== null){
          for(let i=1;i<7;i++){
            if(lastReading.dataValues[i] === first){
              resolve('LINK');
            }
          }
          resolve('CUT');
        }else{
          resolve('H');
        }
      });
    }else{
      resolve('CUT');
    }
  });
}

/* 読みの最後の文字と最初の文字を返す関数 */
function formatReading(reading){
  const replacedReading = reading.replace(/ー/g, '');
  let first = replacedReading.slice(1, 2);
  if(testKogakimoji(first)){
    first = replacedReading.slice(0, 2);
  }else{
    first = replacedReading.slice(0, 1);
  }
  let last = replacedReading.slice(-1);
  if(testKogakimoji(last)){
    last = replacedReading.slice(-2);
  }
  return {
    first: first,
    last: last
  };
}

/* 小書き文字かどうかを返す関数 */
function testKogakimoji(word){
  const kogakimoji = ['ャ','ュ','ョ'];
  for(let i=0;i<kogakimoji.length;i++){
    let regexp = new RegExp(kogakimoji[i])
    if(regexp.test(word)) return true;
  }
  return false;
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

/* 許可された単語をDBに追加する関数 */
function addMessage(message, formated){
  Message.create({
    channel_id: message.channel.id,
    message: message.content,
    first: formated.first,
    last: formated.last
  });
};

/* 解析不能な単語をDBに追加する関数 */
function addUnparsableMessage(message){
  unparsableMessage.create({
    message: message.content
  });
};

// TODO メンションを含むメッセージを削除しないようにする

/* メッセージを送信する関数 */
function sendMessage(message, text){
  message.channel.fetchMessages({limit: 100}).then(messages=>{
    let botMessages = messages.filter(m=>m.author.bot && m.embeds !== [] && m.content !== '' && m.mentions.users.size === 0);
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
