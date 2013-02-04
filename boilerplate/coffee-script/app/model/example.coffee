Sequelize = require 'sequelize'
module.exports = (sequelize)->
  sequelize.define 'table_name',
    id: Sequelize.INTEGER
  ,
    instanceMethods:
      getId: ()->
        @id
