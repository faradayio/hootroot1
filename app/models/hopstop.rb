require 'chronic'

class Hopstop
  class InvalidDateTime < StandardError; end

  include HTTParty
  base_uri 'www.hopstop.com/ws' 
  
  attr_accessor :licenseKey,
    :directions, :x1, :y1, :x2, :y2, :mode_name, :when_string

  def self.route(x1, y1, x2, y2, mode = 'PUBLICTRANSIT', when_string = 'now')
    hopstop = new :x1 => x1, :y1 => y1, :x2 => x2, :y2 => y2, :mode_name => mode,
      :when_string => when_string
    hopstop.get_route 
  end

  def initialize(attributes = {})
    attributes.each do |name, value|
      self.send "#{name}=", value
    end
  end

  def when_string
    @when_string ||= 'today'
  end

  def mode
    case mode_name
    when 'PUBLICTRANSIT' then 'a'
    when 'BUSSING'       then 'b'
    when 'SUBWAYING'     then 's'
    else
      mode_name
    end
  end

  def whenever
    return @whenever unless @whenever.nil?
    return nil if when_string.nil?
    @whenever = Chronic.parse when_string, :context => :future
    fail InvalidDateTime, "Could not parse #{when_string}" if @whenever.nil?
    @whenever
  end

  def day
    whenever.wday + 1
  end

  def time
    if when_string == 'tomorrow' || when_string == 'today'
      Time.now.strftime('%H:%M')
    else 
      whenever.strftime('%H:%M')
    end
  end

  def licenseKey
    @licenseKey ||= ENV['LICENSE_KEY']
  end

  def params
    [:licenseKey, :x1, :y1, :x2, :y2, :day, :time, :mode].inject({}) do |hsh, name|
      hsh[name] = self.send name
      hsh
    end
  end

  def get_route
    result = self.class.get '/GetRoute', :query => params
    self.directions = HopstopDirections.parse result
  end

  def to_hash
    directions
  end
end
