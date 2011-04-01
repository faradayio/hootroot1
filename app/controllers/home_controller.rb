class HomeController < ApplicationController
  caches_page :index
  layout nil

  def index; end
end
