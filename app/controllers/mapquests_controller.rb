class MapquestsController < ApplicationController
  def show
    directions = Stats.time 'directions' do
      Mapquest.directions(params[:from], params[:to])
    end
    Stats.increment 'mapquest_directions'
    render :json => directions
  end
end
