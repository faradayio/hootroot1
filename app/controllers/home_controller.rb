class HomeController < ApplicationController
  caches_page :index
  layout nil

  def index
    Stats.increment 'visits'
  end
end
