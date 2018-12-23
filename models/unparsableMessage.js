'use strict';
const loader = require('./_sequelize-loader');
const Sequelize = loader.Sequelize;

const UnparsableMessage = loader.database.define('unparsable_message', {
  message: {
    type: Sequelize.STRING,
    allowNull: false
  },
  created_at:Sequelize.DATE
}, {
  freezeTableName: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = UnparsableMessage;
