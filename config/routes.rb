Hootroot::Application.routes.draw do
  resource :mapquest, :only => :show
  root :to => "home#index"
end
