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
    it 'returns a HopstopStep' do
      walking_step.should be_an_instance_of(HopstopStep)
    end
    it 'parses a walking step' do
      walking_step.instructions.should == 'Start out going North West on Broadway towards Mother Gaston Blvd'
      walking_step.start_position['lat'].should == '40.6819'
      walking_step.start_position['lon'].should == '-73.90871'
      walking_step.end_position['lat'].should == '40.68265'
      walking_step.end_position['lon'].should == '-73.91002'
      walking_step.duration['value'].should == 99
      walking_step.travel_mode.should == 'WALKING'
    end
    it 'parses a subway step' do
      subway_step.instructions.should == 'Take the 6 train from Canal Street station heading Uptown / to Pelham Bay Park'
      subway_step.start_position.should be_nil
      subway_step.end_position.should be_nil
      subway_step.duration['value'].should == 300
      subway_step.travel_mode.should == 'SUBWAYING'
    end
    it 'parses a subway en-route step' do
      subway_enroute_step.instructions.should == 'Pass Spring Street'
      subway_enroute_step.start_position.should be_nil
      subway_enroute_step.end_position.should be_nil
      subway_enroute_step.duration['value'].should == 94
      subway_enroute_step.travel_mode.should == 'SUBWAYING'
    end
    it 'parses an exit step' do
      exit_step.instructions.should == 'Exit near intersection of E 32nd St and Park Ave S'
      exit_step.start_position.should be_nil
      exit_step.end_position.should be_nil
      exit_step.duration['value'].should == 120
      exit_step.travel_mode.should == 'ENTRANCEEXIT'
    end
  end

  describe '.parse_start_position' do
    it 'returns nil if there is no parseable data' do
      HopstopStep.parse_start_position('ooga').should be_nil
    end
    it 'returns a CSV of start latitude and longitude' do
      pos = HopstopStep.
        parse_start_position('-73.90871,40.6819,-73.91002,40.68265,1,32499,99,1')
      pos['lat'].should == '40.6819'
      pos['lon'].should == '-73.90871'
    end
  end
  describe '.parse_end_position' do
    it 'returns nil if there is no parseable data' do
      HopstopStep.parse_end_position('ooga').should be_nil
    end
    it 'returns a CSV of end latitude and longitude' do
      pos = HopstopStep.
        parse_end_position('-73.90871,40.6819,-73.91002,40.68265,1,32499,99,1')
      pos['lat'].should == '40.68265'
      pos['lon'].should == '-73.91002'
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
      pos['lat'].should == '40.68265'
      pos['lon'].should == '-73.91002'
    end
  end

  describe '.parse_travel_mode' do
    it 'returns WALKING for a walking segment' do
      HopstopStep.parse_travel_mode('W').
        should == 'WALKING'
    end
    it 'returns SUBWAYING for a subway segment' do
      HopstopStep.parse_travel_mode('S').
        should == 'SUBWAYING'
    end
    it 'returns SUBWAYING for a subway en-route segment' do
      HopstopStep.parse_travel_mode('S').
        should == 'SUBWAYING'
    end
    it 'returns BUSSING for a bus segment (B)' do
      HopstopStep.parse_travel_mode('B').
        should == 'BUSSING'
    end
    it 'returns BUSSING for a bus segment (C)' do
      HopstopStep.parse_travel_mode('C').
        should == 'BUSSING'
    end
    it 'returns ENTRANCEEXIT for an entrance/exit segment (E)' do
      HopstopStep.parse_travel_mode('E').
        should == 'ENTRANCEEXIT'
    end
    it 'returns LIGHTRAILING for a light rail segment (L)' do
      HopstopStep.parse_travel_mode('L').
        should == 'LIGHTRAILING'
    end
    it 'returns WALKING for a transfer segment (T)' do
      HopstopStep.parse_travel_mode('T').
        should == 'WALKING'
    end
    it 'returns AMTRAKING for an Amtrak segment (U)' do
      HopstopStep.parse_travel_mode('U').
        should == 'AMTRAKING'
    end
  end

  describe '#merge!' do
    it 'combines two steps into one, preserving position and travel_mode' do
      a = HopstopStep.new :instructions => 'Take subway', :start_position => 12.3, 
        :end_position => 13.4, :duration => { 'value' => 123 }, :travel_mode => 'SUBWAYING'
      b = HopstopStep.new :instructions => 'Pass X St', :duration => { 'value' => 62 }, :travel_mode => 'SUBWAYING'

      a.merge!(b)
      a.start_position.should == 12.3
      a.end_position.should == 13.4
      a.duration['value'].should == 185
      a.travel_mode.should == 'SUBWAYING'
    end
    it 'combines instructions of two steps with the same mode' do
      a = HopstopStep.new :instructions => 'Take subway', :start_position => 12.3, 
        :end_position => 13.4, :duration => { 'value' => 123 }, :travel_mode => 'SUBWAYING'
      b = HopstopStep.new :instructions => 'Pass X St', :duration => { 'value' => 62 }, :travel_mode => 'SUBWAYING'
      a.merge!(b)
      a.instructions.should == 'Take subway, Pass X St'
    end
  end

  describe '#mergable?' do
    it 'returns true if the mergee has the same travel_mode as the merger' do
      a = HopstopStep.new :travel_mode => 'WALKING'
      b = HopstopStep.new :travel_mode => 'WALKING'
      b.mergable?(a).should be_true
    end
    it 'returns false if the mergee has a different travel_mode than the merger' do
      a = HopstopStep.new :travel_mode => 'WALKING'
      b = HopstopStep.new :travel_mode => 'SUBWAYING'
      b.mergable?(a).should be_false
    end
  end
end

