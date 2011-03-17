class HopstopStep
  FIELDS = %w{directions time travel_mode thumbnail_url thumb_height thumb_width _ _ _ _ _ _ stop_id _ coordinates vehicle_id vehicle_name}.map(&:to_sym)

  # fields
  # 
  # Take the J train from Chauncey St station heading to Broad St 300 S http://www.hopstop.com/i/3363331474.gif 43  43              25069     3363331474  J
  # directions|time|mode|thumbnail_url|thumb_height|thumb_width|||||||stop_id||start_lat,start_lon,end_lat,end_lon,1,32499,99,1|vehicle_id|vehicle_name
  # 
  #
  def self.parse(line)
    values = line.split("\t")
    fields = {}
    FIELDS.each_with_index do |field, i|
      fields[field] = values[i]
    end

    new :instructions => fields[:directions],
      :start_position => parse_start_position(fields[:coordinates]),
      :end_position => parse_end_position(fields[:coordinates]),
      :duration => fields[:time].to_i,
      :travel_mode => parse_travel_mode(fields[:travel_mode])
  end

  def self.parse_start_position(tuple)
    parse_position(tuple, 0)
  end

  def self.parse_end_position(tuple)
    parse_position(tuple, 2)
  end

  def self.parse_position(tuple, start)
    fields = tuple.to_s.split(',')[start..(start + 1)]
    if fields.nil? || fields.length < 2 || fields.all?(&:nil?)
      nil
    else
      { 'lat' => fields.last, 'lon' => fields.first }
    end
  end

  def self.parse_travel_mode(field)
    case field
    when 'B','C' then 'BUSSING'
    when 'S' then 'SUBWAYING'
    when 'W','T' then 'WALKING'
    when 'E' then 'ENTRANCEEXIT'
    when 'L' then 'LIGHTRAILING'
    end
  end

  attr_accessor :instructions, :start_position, :end_position, :duration, :travel_mode

  def initialize(attrs = {})
    attrs.each do |name, value|
      self.send "#{name}=", value
    end
  end

  def to_hash
    [:instructions, :start_position, :end_position, :duration, :travel_mode].inject({}) do |hash, field|
      hash[field.to_s] = self.send field
      hash
    end
  end

  def merge!(other)
    self.duration += other.duration
    instruction_parts = self.instructions.split(/,\s*/)
    instruction_parts[1] = other.instructions
    self.instructions = instruction_parts.join(', ')
  end

  def mergable?(mergist)
    mergist.travel_mode == travel_mode
  end
end
