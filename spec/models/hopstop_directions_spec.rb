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
  end
end

