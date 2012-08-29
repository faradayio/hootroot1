host = ENV['STATSD_HOST']
host ||= (Rails.env.production? ? 'stats.brighterplanet.com' : '127.0.0.1')
port = ENV['STATSD_PORT'] || '8125'
Stats = Statsd.new(host, port)
Stats.namespace = 'hootroot'
