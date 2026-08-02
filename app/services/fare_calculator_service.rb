class FareCalculatorService
  RATE_PER_KM = 3.2
  RATE_PER_KM_UNRESERVED = 2.0

  def initialize(origin_station, destination_station, coach_type = "reserved")
    @origin = origin_station
    @destination = destination_station
    @coach_type = coach_type.to_s
  end

  def calculate
    distance_km = @destination.distance_km - @origin.distance_km
    (distance_km * rate_per_km).round
  end

  private

  def rate_per_km
    @coach_type == "unreserved" ? RATE_PER_KM_UNRESERVED : RATE_PER_KM
  end
end
