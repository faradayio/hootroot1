require 'spec_helper'
require 'json'

describe MapquestController do
  describe 'get /mapquest' do
    it 'returns mapquest json' do
      VCR.use_cassette 'mapquest', :record => :once do
        get :show, :from => '323 East Wacker Drive, Chicago, IL',
          :to => '3324 North California Avenue, Chicago, IL'
      end
      JSON.parse(response.body).should be_a(Hash)
    end
  end
end
