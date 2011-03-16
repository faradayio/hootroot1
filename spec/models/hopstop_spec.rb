require 'spec_helper'
require 'time'

describe Hopstop do
  let(:hopstop) { Hopstop.new }

  before :each do
    FakeWeb.allow_net_connect = false
    FakeWeb.register_uri :any, /http:\/\/www.hopstop.com\/ws\/GetRoute/,
      :response => File.expand_path('../../fixtures/hopstop_directions.xml',__FILE__)
  end

  it 'fetches a Hopstop route' do
    route = Hopstop.route(40.767436, -73.98117, 40.746932, -73.98378, 'SUBWAYING', 'now')
    hash = route.to_hash

    hash['duration']['value'].should == 3154
    hash['steps'].first['travel_mode'].should == 'WALKING'
  end
  it 'raises an error if a route cannot be found' do
    FakeWeb.register_uri :any, /http:\/\/www.hopstop.com\/ws\/GetRoute/,
      :response => "HTTP/1.1 200 OK\nContent-Type: application/xml\n\n" + File.read(File.expand_path('../../fixtures/hopstop_directions_failure.xml',__FILE__))
    expect do
      Hopstop.route 0, 0, 90, 90, 'BUS'
    end.should raise_error(HopstopDirections::Failure)
  end

  describe '.route' do
    it 'returns a Hash' do
      Hopstop.route(40.767436, -73.98117, 40.746932, -73.98378).
        should be_an_instance_of(Hash)
    end
  end

  describe '#get_route' do
    it 'fetches and parses directions from HopStop' do
      hopstop = Hopstop.new :x1 => 12.3, :y1 => 45.3,
        :x2 => 12.4, :y2 => 45.4, :licenseKey => 'abc123',
        :when_string => 'today'

      hopstop.get_route.should be_an_instance_of(Hash)
    end
  end

  describe '#mode' do
    it 'converts PUBLICTRANSIT to "a"' do
      hopstop.mode_name = 'PUBLICTRANSIT'
      hopstop.mode.should == 'a'
    end
    it 'converts BUSSING to "b"' do
      hopstop.mode_name = 'BUSSING'
      hopstop.mode.should == 'b'
    end
    it 'converts SUBWAYING to "s"' do
      hopstop.mode_name = 'SUBWAYING'
      hopstop.mode.should == 's'
    end
    it 'does not convert any other values' do
      hopstop.mode_name = 's'
      hopstop.mode.should == 's'
    end
  end

  describe '#whenever' do
    it 'fails if the date/time string cannot be parsed' do
      hopstop.when_string = 'spiders'
      expect { hopstop.whenever }.should raise_error
    end
  end

  describe '#day' do
    it 'gets the day of week specified by when_string' do
      Timecop.freeze(Time.parse('2011-03-12 12:34:00')) do
        hopstop.day.should == 7
      end
    end
  end
  describe '#time' do
    it 'gets the current time if today is specified' do
      Timecop.freeze(Time.parse('2011-03-12 18:34:00')) do
        hopstop.when_string = 'today'
        hopstop.time.should == '18:34'
      end
    end
    it 'gets the current time of another day' do
      Timecop.freeze(Time.parse('2011-03-15 09:34:00')) do
        hopstop.when_string = 'tomorrow'
        hopstop.time.should == '09:34'
      end
    end
    it 'uses a user-set time' do
      hopstop.when_string = 'april 3rd at 1:45pm'
      hopstop.time.should == '13:45'
    end
    it 'uses military time' do
      hopstop.when_string = '5:25pm'
      hopstop.time.should == '17:25'
    end
  end
end

