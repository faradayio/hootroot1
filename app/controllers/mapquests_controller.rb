class MapquestsController < ApplicationController
  def show
    render :json => Mapquest.directions(params[:from], params[:to])
  end
end
