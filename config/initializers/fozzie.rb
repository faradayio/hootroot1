Fozzie.configure do |config|
  config.appname = 'hootroot'
  config.host    = ENV['STATSD_HOST'] || '127.0.0.1'
  config.port    = ENV['STATSD_PORT'] || '8125'
end
