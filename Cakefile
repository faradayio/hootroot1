task 'package', 'Package javascript into a deployable file', ->
  console.log 'Browserifying...'
  browserify = require('browserify')
  entry = 'lib/native-route.js'
  mount = 'public/javascripts/native-route.js'
    
  b = browserify {
    entry: entry,
    mount: mount
  }

  fs = require('fs')
  fs.writeFileSync mount, b.bundle()
