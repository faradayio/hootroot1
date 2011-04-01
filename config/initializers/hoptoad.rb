require 'hoptoad_notifier'

HoptoadNotifier.configure do |config|
  config.api_key = ENV['HOPTOAD_KEY']
end
