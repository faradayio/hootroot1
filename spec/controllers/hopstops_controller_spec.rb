require 'spec_helper'

describe HopstopsController do
  describe 'GET /hopstops.json' do
    let(:params) do
      {
        :y1 => 40.767436, :x1 => -73.98117, :y2 => 40.746932, :x2 => -73.98378, 
        :mode => 'PUBLICTRANSIT', :when => 'now',
        :format => 'js'
      }
    end
    before do
      FakeWeb.allow_net_connect = false
      FakeWeb.register_uri :any, /http:\/\/www.hopstop.com\/ws\/GetRoute/,
        :response => File.expand_path('../../fixtures/hopstop_directions.xml',__FILE__)
    end

    it 'serves JSON' do
      get :index, params

      json = JSON.parse response.body
      json['steps'].should_not be_empty
    end
    it 'finds directions from <origin> to <destination>' do
      Hopstop.should_receive(:route).
        with(-73.98117, 40.767436, -73.98378, 40.746932, 'PUBLICTRANSIT', 'now').
        and_return :foo => :bar

      get :index, params
    end
  end
end

