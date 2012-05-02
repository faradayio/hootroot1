require 'uri'

class Mapquest
  include HTTParty
  base_uri 'http://www.mapquestapi.com'
  
  def self.directions(from, to)
    params = {
      :from => from, :to => to,
      :ambiguities => 'ignore', :avoidTimedConditions => 'true',
      :doReverseGeocode => 'false', :routeType => 'multimodal',
      :timeType => '1', :enhancedNarrative => 'true',
      :shapeFormat => 'raw', :generalize => '0', :unit => 'm'
    }
    params[:key] = ENV['MAPQUEST_KEY'] ? URI.decode(ENV['MAPQUEST_KEY']) : ''
    puts "get http://www.mapquestapi.com/directions/v1/route #{params.inspect}"
    get '/directions/v1/route', :query => params
  end
end
