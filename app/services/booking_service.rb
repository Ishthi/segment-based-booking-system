class BookingService
  Result = Struct.new(:success?, :booking, :error, :status)

  def initialize(train:, travel_date:, seat:, origin_station:, destination_station:, passenger_name:, expected_seat_version: nil)
    @train = train
    @travel_date = travel_date
    @seat = seat
    @origin = origin_station
    @destination = destination_station
    @passenger_name = passenger_name
    @expected_seat_version = expected_seat_version
  end

  def call
    fare = FareCalculatorService.new(@origin, @destination).calculate

    booking = ActiveRecord::Base.transaction do
      Booking.create!(
        train: @train,
        travel_date: @travel_date,
        seat: @seat,
        origin_station: @origin,
        destination_station: @destination,
        fare: fare,
        passenger_name: @passenger_name
      )
    end

    Result.new(true, booking, nil, :ok)
  end
end
