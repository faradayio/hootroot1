require 'spec_helper'

describe Hopstop do
  let(:hopstop) { Hopstop.new }

  before do
    FakeWeb.allow_net_connect = false
    FakeWeb.register_uri :any, "http://www.hopstop.com/ws/GetRoute",
      :response => File.expand_path('../../fixtures/hopstop_directions.xml',__FILE__)
  end

  it 'fetches a Hopstop route' do
    route = Hopstop.route(
      '1800 Broadway, New York, NY','162 Madison Ave, New York, NY',
      'SUBWAYING')
    hash = route.to_hash

    hash['duration']['value'].should == 3154
    puts hash['steps'].first.inspect
    hash['steps'].first['mode'].should == 'WALKING'
  end
  it 'raises an error if a route cannot be found' do
    FakeWeb.register_uri :any, "http://www.hopstop.com/ws/GetRoute",
      :response => "HTTP/1.1 200 OK\nContent-Type: application/xml\n\n" + File.read(File.expand_path('../../fixtures/hopstop_directions_failure.xml',__FILE__))
    expect do
      Hopstop.route 'Candy Mountain', "Charlie's field", 'BUS'
    end.should raise_error(HopstopDirections::Failure)
  end

  describe '.route' do
    it 'returns a Hash' do
      Hopstop.route('1800 Broadway, New York, NY','162 Madison Ave, New York, NY').
        should be_an_instance_of(Hash)
    end
  end

  describe '#get_route' do
    it 'fetches and parses directions from HopStop' do
      hopstop = Hopstop.new :x1 => 12.3, :y1 => 45.3,
        :x2 => 12.4, :y2 => 45.4, :licenseKey => 'abc123',
        :day => 3, :time => '9:30'

      hopstop.get_route.should be_an_instance_of(Hash)
    end
  end

  describe '#mode' do
    it 'converts PUBLICTRANSIT to "a"' do
      hopstop.mode_name = 'PUBLICTRANSIT'
      hopstop.mode.should == 'a'
    end
    it 'converts BUS to "b"' do
      hopstop.mode_name = 'BUS'
      hopstop.mode.should == 'b'
    end
    it 'converts SUBWAY to "s"' do
      hopstop.mode_name = 'SUBWAY'
      hopstop.mode.should == 's'
    end
    it 'does not convert any other values' do
      hopstop.mode_name = 's'
      hopstop.mode.should == 's'
    end
  end
end

