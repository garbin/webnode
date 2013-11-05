Webnode = require 'webnode'
module.exports = (app)->
  class IndexController extends Webnode.Controller
    # 获取资源列表
    index: (req, res)->
      res.send 'Hello Webnode!'

    # 创建资源
    create: (req, res)->
      res.send 201, '资源创建成功'

    # 获取指定资源
    get: (req, res)->
      res.send {id: 1, name: 'New resource'}

    # 替换资源
    put: (req, res)->
      res.send 201, {id: 2, name: 'New resource'}

    # 更新资源
    patch: (req, res)->
      res.send 204, {id: 1, name: 'New resource'}

    # 删除指定资源
    delete: (req, res)->
      res.send 204
