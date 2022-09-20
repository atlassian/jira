'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('TestDbMigrationTable1', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      field1: {
        type: Sequelize.STRING
      },
      field2: {
        type: Sequelize.STRING
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('TestDbMigrationTable1')
  }
}
