#!/usr/bin/env coffee
WebnodeApp = require 'webnode'
WebnodeApp.Cluster.run ->
  global.app = new WebnodeApp(__dirname)
  global.app.run()
