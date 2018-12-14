'use strict';
const loader = require('./_sequelize-loader');
const Sequelize = loader.Sequelize;

const Channel = loader.database.define('channel', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  created_at:Sequelize.DATE
}, {
  freezeTableName: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = Channel;
