'use strict';

/* モジュールの読み込み */
const Discord = require('discord.js');

/* モデルの読み込み */
const Message = require('../models/message');
const Channel = require('../models/channel');
const Reading = require('../models/reading');

/* '!xxxx'で実行されるコマンドを処理する関数 */
module.exports = function command(message){
  switch (true) {
    case /!add/.test(message.content):
      if(message.author.id === process.env.ADMIN_USER_ID){
        Channel.upsert({
          id: message.channel.id
        }).then(()=>{
          sendRichEmbed(
            message,
            '00FF00',
            `#${message.channel.name} チャンネルをしりとり用チャンネルに設定しました`,
            '`!help`でコマンド一覧を表示できます｡'
          );
        });
      }else{
        sendRichEmbed(
          message,
          'FF0000',
          `しりとりチャンネルの追加に失敗しました｡`,
          'チャンネルをしりとり用に追加できるのはサーバーのオーナーのみです｡サーバーのオーナーに連絡してください｡\n`!help`でコマンド一覧を表示できます｡'
        );
      }
      break;
    case /!remove/.test(message.content):
      if(message.author.id === process.env.ADMIN_USER_ID){
        Channel.destroy({
          where: {
            id: message.channel.id
          }
        }).then(()=>{
          sendRichEmbed(
            message,
            '00FF00',
            `#${message.channel.name} チャンネルをしりとり用チャンネルにから削除しました`,
            'もう一度しりとり用に設定するには`!add`を実行してください｡'
          );
        });
      }else{
        sendRichEmbed(
          message,
          'FF0000',
          `しりとりチャンネルの削除に失敗しました｡`,
          'チャンネルをしりとり用から削除できるのはサーバーのオーナーのみです｡サーバーのオーナーに連絡してください｡\n`!help`でコマンド一覧を表示できます｡'
        );
      }
      break;
    case /!reset/.test(message.content):
      Message.destroy({
        where: {
          channel_id: message.channel.id
        }
      }).then(()=>{
        sendRichEmbed(
          message,
          'FF0000',
          `過去の記録を削除しました`,
          '次の発言から記録が再開されます'
        );
      });
      break;
    case /!cancel/.test(message.content):
      Message.findOne({
        where: {
          channel_id: message.channel.id
        },
        order:[['id','DESC']]
      }).then(previousMessage=>{
        if(previousMessage !== null){
          Message.destroy({
            where: {
              channel_id: message.channel.id,
              message: previousMessage.dataValues.message
            }
          }).then(()=>{
            sendRichEmbed(
              message,
              '0000FF',
              '直近1件のログを削除しました',
              'ひとつ前の発言から続けてください'
            );
          });
        }else{
          sendRichEmbed(
            message,
            'FF0000',
            'ログが存在しません',
            '次の発言から記録されます'
          );
        }
      })
      break;
    case /!set yomi(.*)/.test(message.content):
      if(message.content.match(/!set yomi (.*)/) === null){
        sendRichEmbed(
          message,
          'FF0000',
          `拗音リストの追加に失敗しました｡`,
          '!set yomiに続けて追加する拗音を記述してください\n`!help`でコマンド一覧を表示できます｡'
        );
      }else if(message.author.id === process.env.ADMIN_USER_ID){
        const values = message.content.match(/!set yomi (.*)/)[1];
        const re = /^(..?)\s?(.*)/;
        let yomi = [];
        let testValues = values;
        for(let i=0;i<5;i++){
          let result = re.exec(testValues);
          if(result !== null){
            yomi[i] = result[1];
            testValues = result[2];
          }else{
            yomi[i] = '';
          }
        }
        console.log(yomi);
        Reading.upsert({
          1: yomi[0],
          2: yomi[1],
          3: yomi[2],
          4: yomi[3],
          5: yomi[4],
        }).then(()=>{
          sendRichEmbed(
            message,
            '0000FF',
            `${values}を拗音リストに追加しました`,
            `${yomi[0]} からは ${yomi[1]} ${yomi[2]} ${yomi[3]} ${yomi[4]} につなぐことができます`
          );
        });
      }else{
        sendRichEmbed(
          message,
          'FF0000',
          `拗音リストの追加に失敗しました｡`,
          '拗音リストを追加できるのは管理者のみです\n`!help`でコマンド一覧を表示できます｡'
        );
      }
      break;
    case /!help/.test(message.content):
      sendRichEmbed(
        message,
        '00FF00',
        `コマンド一覧`,
        '`!add` : 発言されたチャンネルをしりとり用に設定します'
        + '\n`!remove` : 発言されたチャンネルをしりとり用から設定解除します'
        + '\n`!reset` : 今までのしりとりの内容を削除します'
        + '\n`!cancel` : 直近1件のログを削除します'
        + '\n`!set yomi [youon]` : 拗音リストに新規追加します'
        + '\n`!help` : コマンド一覧を表示します'
      );
      break;
    default:
      message.channel.send(message.content + 'コマンドは存在しません｡`!help`でコマンド一覧を表示する｡');
      break;
  }
};

/* RichEmbedを送信する関数 */
function sendRichEmbed(message, color, title, description){
  const embed = new Discord.RichEmbed()
    .setColor(color)
    .setTitle(title)
    .setDescription(description);
  message.channel.send(embed);
}
