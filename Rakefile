# Add your own tasks in files placed in lib/tasks ending in .rake,
# for example lib/tasks/capistrano.rake, and they will automatically be available to Rake.

require File.expand_path('../config/application', __FILE__)
require 'rake'

Mapprint::Application.load_tasks

require 'jasmine'
load 'jasmine/tasks/jasmine.rake'

task :default => [:features, :spec]

namespace :js do
  task :build do
    `echo '' > public/javascripts/application.js` # N.B. this doesn't work on windows, you have to manually remove the first line of application.js afterwards
    jss = Dir.glob('public/javascripts/**/*.js') - ['public/javscripts/google_maps.js','public/javascripts/application.js']
    jss = %w{
      public/javascripts/jquery-1.5.min.js
      public/javascripts/lib/jquery.placeholdize.min.js
      public/javascripts/lib/jquery-ui-1.8.11.custom.min.js
      public/javascripts/app/models/Directions.js
      public/javascripts/app/models/FlyingDirections.js
      public/javascripts/app/models/GoogleDirections.js
      public/javascripts/app/models/GoogleDirectionsRoute.js
      public/javascripts/app/models/HopStopDirections.js
      public/javascripts/app/models/Segment.js
      public/javascripts/app/models/HopStopSegment.js
      public/javascripts/lib/Carbon.js
      public/javascripts/lib/TimeFormatter.js
      public/javascripts/app/models/AmtrakingSegment.js
      public/javascripts/app/models/BicyclingSegment.js
      public/javascripts/app/models/BussingSegment.js
      public/javascripts/app/models/DrivingSegment.js
      public/javascripts/app/models/FlyingSegment.js
      public/javascripts/app/models/LightRailingSegment.js
      public/javascripts/app/models/SubwayingSegment.js
      public/javascripts/app/models/WalkingSegment.js
      public/javascripts/app/views/MapView.js
      public/javascripts/app/views/RouteView.js
      public/javascripts/app/models/FlightPath.js
      public/javascripts/app/controllers/HootBarController.js
      public/javascripts/app/controllers/IndexController.js
      public/javascripts/lib/Url.js
    }
    jss.each do |js|
      puts "Adding #{js}"
      `cat #{js} >> public/javascripts/application.js`
    end
  end
end
