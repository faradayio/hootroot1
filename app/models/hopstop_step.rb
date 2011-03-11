module HopstopStep
  FIELDS = %w{directions time mode thumbnail_url thumb_height thumb_width _ _ _ _ _ _ stop_id _ coordinates vehicle_id vehicle_name}.map(&:to_sym)

  extend self

  # fields
  # 
  # Take the J train from Chauncey St station heading to Broad St 300 S http://www.hopstop.com/i/3363331474.gif 43  43              25069     3363331474  J
  # directions|time|mode|thumbnail_url|thumb_height|thumb_width|||||||stop_id||start_lat,start_lon,end_lat,end_lon,1,32499,99,1|vehicle_id|vehicle_name
  # 
  #
  def parse(line)
    values = line.split("\t")
    fields = {}
    FIELDS.each_with_index do |field, i|
      fields[field] = values[i]
    end

    { 'instructions' => fields[:directions],
      'start_position' => parse_start_position(fields[:coordinates]),
      'end_position' => parse_end_position(fields[:coordinates]),
      'duration' => fields[:time].to_i,
      'mode' => parse_mode(fields[:mode]) }
  end

  def parse_start_position(tuple)
    parse_position(tuple, 0)
  end

  def parse_end_position(tuple)
    parse_position(tuple, 2)
  end

  def parse_position(tuple, start)
    fields = tuple.to_s.split(',')[start..(start + 1)]
    if fields.nil? || fields.length < 2 || fields.all?(&:nil?)
      nil
    else
      { 'lat' => fields.first, 'lon' => fields.last }
    end
  end

  def parse_mode(field)
    case field
    when 'B' then 'BUSSING'
    when 'S' then 'SUBWAYING'
    when 'W' then 'WALKING'
    when 'E' then 'WALKING'
    end
  end
end
