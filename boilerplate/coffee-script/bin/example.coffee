#!/usr/bin/env coffee
Webnode = require 'webnode'

# 实例化CLI App
app = new Webnode "#{__dirname}/.."
app.exec class ExampleCommand extends Webnode.Command
  # 版本
  version: '1.0.0'

  # 参数列表
  usage: ()->
    @commander.option '-t --test [value]', "测试选项"

  # 主体执行代码放置于此
  exec: ()->
    console.log @commander.test
