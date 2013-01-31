module.exports = (Webnode, app)->
  class IndexController extends Webnode.Controller
    index: (req, res)->
      res.send 'Hello Webnode!'
