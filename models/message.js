'use strict';
const loader = require('./_sequelize-loader');
const Sequelize = loader.Sequelize;

const Message = loader.database.define('messages', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  channel_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  message: {
    type: Sequelize.STRING,
    allowNull: false
  },
  reading: {
    type: Sequelize.STRING,
    allowNull: false
  },
  created_at:Sequelize.DATE,
  deleted_at:Sequelize.DATE
}, {
  freezeTableName: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  deletedAt: 'deleted_at',
  paranoid: true
});

module.exports = Message;
