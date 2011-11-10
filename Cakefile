path = require 'path'
fs = require 'fs'

rails_root = __dirname

node_paths = [
  path.resolve(rails_root, 'app', 'assets', 'javascripts'),
  path.resolve(rails_root, 'lib', 'assets', 'javascripts'),
  path.resolve(rails_root, 'vendor', 'assets', 'javascripts')
].join(':')

task 'build', ->
  console.log 'Browserifying...'
  browserify = require 'dkastner-browserify'
  b = browserify()
  b.require('jquery-browserify')
  b.require('dkastner-http-browserify')
  b.alias('jquery', 'jquery-browserify')
  b.alias('http', 'dkastner-http-browserify')
  b.addEntry('app/assets/javascripts/application.js')
  fs.writeFileSync('public/javascripts/application.js', b.bundle())
  console.log 'Done'

task 'examples', 'Run Jasmine examples', ->
  child = require 'child_process'
  child_env = process.env
  child_env.NODE_PATH = node_paths
  cmd = './node_modules/.bin/jasmine-node --color spec/javascripts'
  child.exec cmd, { env: child_env }, (error, stdout, stderr) =>
    console.log stdout
    console.error stderr
