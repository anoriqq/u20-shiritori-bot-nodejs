'use strict';
const loader = require('./_sequelize-loader');
const Sequelize = loader.Sequelize;

const Reading = loader.database.define('reading', {
  1: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  2: {
    type: Sequelize.STRING
  },
  3: {
    type: Sequelize.STRING
  },
  4: {
    type: Sequelize.STRING
  },
  5: {
    type: Sequelize.STRING
  }
}, {
  freezeTableName: true,
  timestamps: false
});

module.exports = Reading;
