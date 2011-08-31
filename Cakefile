path = require 'path'

rails_root = __dirname

node_paths = [
  path.resolve(rails_root, 'app', 'assets', 'javascripts'),
  path.resolve(rails_root, 'lib', 'assets', 'javascripts'),
  path.resolve(rails_root, 'vendor', 'assets', 'javascripts')
].join(':')

task 'examples', 'Run Jasmine examples', ->
  child = require 'child_process'
  child_env = process.env
  child_env.NODE_PATH = node_paths
  cmd = './node_modules/.bin/jasmine-node --color spec/javascripts'
  child.exec cmd, { env: child_env }, (error, stdout, stderr) =>
    console.log stdout
    console.error stderr
