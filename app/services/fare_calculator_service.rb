class FareCalculatorService
  RATE_PER_KM = 3.2

  def initialize(origin_station, destination_station)
    @origin = origin_station
    @destination = destination_station
  end

  def calculate
    distance_km = @destination.distance_km - @origin.distance_km
    (distance_km * RATE_PER_KM).round
  end
end
