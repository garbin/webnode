Webnode = require 'webnode'
module.exports = (app)->
  class IndexController extends Webnode.Controller
    index: (req, res)->
      res.send 'Hello Webnode!'
