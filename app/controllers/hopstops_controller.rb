class HopstopsController < ApplicationController
  def index
    begin
      route = Hopstop.route params[:x1], params[:y1],
        params[:x2], params[:y2], params[:mode], params[:when]

      respond_to do |format|
        format.json { render :json => route.to_json }
        format.js { render :json => route.to_json }
      end
    rescue HopstopDirections::RouteNotFound
      json = { 'error' => 'Route not found' }.to_json
      respond_to do |format|
        format.json { render :json => json, :status => :not_found }
        format.js { render :json => json, :status => :not_found }
        format.all { render :text => 'Not Found', :status => :not_found }
      end
    end
  end
end
