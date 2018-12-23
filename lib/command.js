'use strict';

/* モジュールの読み込み */
const Discord = require('discord.js');

/* モデルの読み込み */
const Message = require('../models/message');
const Channel = require('../models/channel');

/* '!xxxx'で実行されるコマンドを処理する関数 */
module.exports = function command(message){
  switch (message.content) {
    case '!add':
      if(message.author.id === process.env.ADMIN_USER_ID || message.author.id === message.guild.owner.guild.ownerID){
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
    case '!remove':
      if(message.author.id === message.guild.owner.guild.ownerID || message.author.id === process.env.ADMIN_USER_ID){
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
    case '!reset':
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
    case '!cancel':
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
    case '!help':
      sendRichEmbed(
        message,
        '00FF00',
        `コマンド一覧`,
        '`!add` : 発言されたチャンネルをしりとり用に設定します\n`!remove` : 発言されたチャンネルをしりとり用から設定解除します\n`!reset` : 今までのしりとりの内容を削除します\n`!cancel` : 直近1件のログを削除します\n`!help` : コマンド一覧を表示します'
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
