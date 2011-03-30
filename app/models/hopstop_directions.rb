module HopstopDirections
  class Failure < StandardError; end

  extend self

  def parse(crack_hash)
    response = crack_hash['HopStopResponse']
    simplified_hash = {}

    simplified_hash['result_code'] = response['ResponseStatus']['ResultCode'].to_i
    simplified_hash['result_string'] = response['ResponseStatus']['ResultString']

    fail Failure, simplified_hash['result_string'] if simplified_hash['result_code'] != 200

    route_info = response['RouteInfo']

    simplified_hash['duration'] = {
      'text' => route_info['TotalTimeVerb'],
      'value' => route_info['TotalTime'].to_i
    }

    simplified_hash['steps'] = parse_steps(route_info['Route'])

    simplified_hash
  end

  def parse_steps(step_list)
    steps = []
    step_list.split("\n").each do |line|
      step = HopstopStep.parse(line)
      previous_step = steps.last
      if previous_step && step.mergable?(previous_step)
        previous_step.merge!(step) 
      else
        steps << step
      end
    end
    steps.map(&:to_hash)
  end
end
