class HopstopsController < ApplicationController
  def index
    route = Hopstop.route params[:x1], params[:y1],
      params[:x2], params[:y2], params[:mode], params[:when]

    respond_to do |format|
      format.json { render :json => route.to_json }
      format.js { render :json => route.to_json }
    end
  end
end
