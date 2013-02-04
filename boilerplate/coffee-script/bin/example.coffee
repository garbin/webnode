#!/usr/bin/env coffee
Webnode = require 'webnode'
app = new Webnode "#{__dirname}/.."

class ExampleCommand extends Webnode.Command
  version: '1.0.0'
  usage: ()->
    @commander.option '-t --test [value]', "测试选项"
  exec: ()->
    console.log @commander.test

app.exec ExampleCommand
