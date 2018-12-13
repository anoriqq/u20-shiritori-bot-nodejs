'use strict';
const Sequelize = require('sequelize');
const sequelize = new Sequelize('postgres://postgres:postgres@localhost/u20_shiritori_bot_nodejs', {logging: true, operatorsAliases: false, timezone: 'UTC'});

module.exports = {
  database: sequelize,
  Sequelize: Sequelize
};
