source 'http://rubygems.org'

gem 'rails', '3.0.3'

gem 'devise'

group :deployment do
  gem 'heroku'
end

group :production do
  gem 'bson_ext',               '>= 1.0.9'
  gem 'mm-devise',              '>= 1.1.8'
  gem 'mongo_mapper',           '>= 0.8.2'
end

group :test do
  gem 'capybara'
  gem 'cucumber'
  gem 'cucumber-rails'
  gem 'rspec'
  gem 'rspec-rails'
  gem 'sqlite3-ruby', :require => 'sqlite3'
end
