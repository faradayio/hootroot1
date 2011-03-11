class Hopstop
  include HTTParty
  base_uri 'www.hopstop.com/ws' 
  
  attr_accessor :licenseKey, :origin, :destination, :day, :time, :mode,
    :directions, :x1, :y1, :x2, :y2, :mode_name

  def self.route(origin, destination, mode = 'PUBLICTRANSIT')
    hopstop = new :origin => origin, :destination => destination, :mode => mode
    hopstop.get_route 
  end

  def initialize(attributes = {})
    attributes.each do |name, value|
      self.send "#{name}=", value
    end
  end

  def mode
    case mode_name
    when 'PUBLICTRANSIT' then 'a'
    when 'BUS'           then 'b'
    when 'SUBWAY'        then 's'
    else
      mode_name
    end
  end

  def params
    [:licenseKey, :x1, :y1, :x2, :y2, :day, :time, :mode].inject({}) do |hsh, name|
      hsh[name] = self.send name
      hsh
    end
  end

  def get_route
    result = self.class.get '/GetRoute', params
    self.directions = HopstopDirections.parse result
  end

  def to_hash
    directions
  end
end
