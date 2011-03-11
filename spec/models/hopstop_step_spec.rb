require 'spec_helper'

describe HopstopStep do
  let(:walking_line) { "Start out going North West on Broadway towards Mother Gaston Blvd	99	W	http://www.hopstop.com/i/walk.gif	23	34									-73.90871,40.6819,-73.91002,40.68265,1,32499,99,1		walk" }
  let(:walking_step) { HopstopStep.parse walking_line }

  let(:subway_line) { "Take the 6 train from Canal Street station heading Uptown / to Pelham Bay Park	300	S	http://www.hopstop.com/i/2446024837.gif	43	43							744			2446024837	6" }
  let(:subway_step) { HopstopStep.parse subway_line }
  
  let(:subway_enroute_line) { "Pass Spring Street	94	S													0	" }
  let(:subway_enroute_step) { HopstopStep.parse subway_enroute_line }

  let(:exit_line) { "Exit near intersection of E 32nd St and Park Ave S	120	E													0	6" }
  let(:exit_step) { HopstopStep.parse exit_line }

  describe '.parse' do
    it 'returns a hash' do
      walking_step.should be_an_instance_of(Hash)
    end
    it 'parses a walking step' do
      walking_step['instructions'].should == 'Start out going North West on Broadway towards Mother Gaston Blvd'
      walking_step['start_position']['lat'].should == '-73.90871'
      walking_step['start_position']['lon'].should == '40.6819'
      walking_step['end_position']['lat'].should == '-73.91002'
      walking_step['end_position']['lon'].should == '40.68265'
      walking_step['duration'].should == 99
      walking_step['mode'].should == 'WALKING'
    end
    it 'parses a subway step' do
      subway_step['instructions'].should == 'Take the 6 train from Canal Street station heading Uptown / to Pelham Bay Park'
      subway_step['start_position'].should be_nil
      subway_step['end_position'].should be_nil
      subway_step['duration'].should == 300
      subway_step['mode'].should == 'SUBWAYING'
    end
    it 'parses a subway en-route step' do
      subway_enroute_step['instructions'].should == 'Pass Spring Street'
      subway_enroute_step['start_position'].should be_nil
      subway_enroute_step['end_position'].should be_nil
      subway_enroute_step['duration'].should == 94
      subway_enroute_step['mode'].should == 'SUBWAYING'
    end
    it 'parses an exit step' do
      exit_step['instructions'].should == 'Exit near intersection of E 32nd St and Park Ave S'
      exit_step['start_position'].should be_nil
      exit_step['end_position'].should be_nil
      exit_step['duration'].should == 120
      exit_step['mode'].should == 'WALKING'
    end
  end

  describe '.parse_start_position' do
    it 'returns nil if there is no parseable data' do
      HopstopStep.parse_start_position('ooga').should be_nil
    end
    it 'returns a CSV of start latitude and longitude' do
      pos = HopstopStep.
        parse_start_position('-73.90871,40.6819,-73.91002,40.68265,1,32499,99,1')
      pos['lat'].should == '-73.90871'
      pos['lon'].should == '40.6819'
    end
  end
  describe '.parse_end_position' do
    it 'returns nil if there is no parseable data' do
      HopstopStep.parse_end_position('ooga').should be_nil
    end
    it 'returns a CSV of end latitude and longitude' do
      pos = HopstopStep.
        parse_end_position('-73.90871,40.6819,-73.91002,40.68265,1,32499,99,1')
      pos['lat'].should == '-73.91002'
      pos['lon'].should == '40.68265'
    end
  end
  describe '.parse_position' do
    it 'returns nil if the requested field positions are empty' do
      HopstopStep.parse_position('ooga', 1).should be_nil
    end
    it 'returns nil if the field positions are nil' do
      HopstopStep.parse_position(',,,,,', 1).should be_nil
    end
    it 'returns a CSV of requested fields' do
      pos = HopstopStep.
        parse_position('-73.90871,40.6819,-73.91002,40.68265,1,32499,99,1', 2)
      pos['lat'].should == '-73.91002'
      pos['lon'].should == '40.68265'
    end
  end

  describe '.parse_mode' do
    it 'returns WALKING for a walking segment' do
      HopstopStep.parse_mode('W')
    end
    it 'returns SUBWAYING for a subway segment' do
      HopstopStep.parse_mode('S')
    end
    it 'returns SUBWAYING for a subway en-route segment' do
      HopstopStep.parse_mode('S')
    end
    it 'returns BUSSING for a bus segment' do
      HopstopStep.parse_mode('B')
    end
    it 'returns WALKING for an entrance/exit segment' do
      HopstopStep.parse_mode('E')
    end
  end
end

