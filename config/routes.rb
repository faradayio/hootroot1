Mapprint::Application.routes.draw do
  resources :hopstops, :only => :index

  root :to => "home#index"
end
