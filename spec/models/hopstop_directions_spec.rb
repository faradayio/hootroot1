require 'spec_helper'

describe HopstopDirections do
  let(:crack_hash) do
    Crack::XML.parse File.read(
      File.expand_path('../../fixtures/hopstop_directions.xml', __FILE__))
  end

  describe '.parse' do
    let(:parsing) { HopstopDirections.parse(crack_hash) }

    it 'parses response status' do
      parsing['result_code'].should == 200
      parsing['result_string'].should == 'Route found.'
    end
    it 'fails if a non-200 result code is encountered' do
      crack_hash = Crack::XML.parse File.read(
        File.expand_path('../../fixtures/hopstop_directions_failure.xml', __FILE__))
      expect do
        HopstopDirections.parse(crack_hash)
      end.should raise_error(HopstopDirections::Failure)
    end
    it 'parses duration' do
      parsing['duration']['text'].should == '53 mins'
      parsing['duration']['value'].should == 3154
    end
    it 'parses direciton steps' do
      parsing['steps'].should_not be_empty
    end
  end

  describe '.parse_steps' do
    it 'parses directions into an array of hashes' do
      route = crack_hash['HopStopResponse']['RouteInfo']['Route']
      parsing = HopstopDirections.parse_steps route
      parsing.should_not be_empty
      parsing.each { |step| step.should be_a_kind_of(Hash) }
    end
    it 'combines sets of related steps into a single step' do
      route = crack_hash['HopStopResponse']['RouteInfo']['Route']
      parsing = HopstopDirections.parse_steps route
      parsing.size.should == 7
      parsing[0]['duration']['value'].should == 99
      parsing[0]['instructions'].should == 'Start out going North West on Broadway towards Mother Gaston Blvd'
      parsing[1]['duration']['value'].should == 120
      parsing[1]['instructions'].should == 'Entrance near intersection of Chauncey St and Broadway'
      parsing[2]['duration']['value'].should == 300 + 105 + 98 + 116 + 112 + 256 + 301 + 91 + 100
      parsing[2]['instructions'].should == 'Take the J train from Chauncey St station heading to Broad St, Get off at Canal St'
      parsing[3]['duration']['value'].should == 120 + 120
      parsing[3]['instructions'].should == 'Exit near intersection of Canal St and Lafayette St, Entrance near intersection of Canal St and Lafayette St'
      parsing[4]['duration']['value'].should == 300 + 94 + 88 + 94 + 95 + 111 + 83 + 83
      parsing[4]['instructions'].should == 'Take the 6 train from Canal Street station heading Uptown / to Pelham Bay Park, Get off at 33 Street'
      parsing[5]['duration']['value'].should == 120
      parsing[5]['instructions'].should == 'Exit near intersection of E 32nd St and Park Ave S'
      parsing[6]['duration']['value'].should == 117 + 32
      parsing[6]['instructions'].should == 'Start out going North West on E 32nd St towards Park Ave S, Turn right onto Madison Ave'
    end
  end
end

