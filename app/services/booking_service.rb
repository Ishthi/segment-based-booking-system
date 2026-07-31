class BookingService
  Result = Struct.new(:success?, :booking, :error, :status)

  def initialize(journey:, seat:, origin_station:, destination_station:, passenger_name:, expected_seat_version: nil)
    @journey, @seat = journey, seat
    @origin, @destination = origin_station, destination_station
    @passenger_name = passenger_name
    @expected_seat_version = expected_seat_version
  end

  def call
    if @expected_seat_version.present?
      current_version = SeatVersionService.new(@seat).version
      if current_version != @expected_seat_version
        return Result.new(false, nil, "Seat availability changed — please refresh and try again", :conflict)
      end
    end

    fare = FareCalculatorService.new(@origin, @destination).calculate

    booking = ActiveRecord::Base.transaction do
      Booking.create!(
        journey: @journey,
        seat: @seat,
        origin_station: @origin,
        destination_station: @destination,
        fare: fare,
        passenger_name: @passenger_name
      )
    end

    Result.new(true, booking, nil, :ok)
  rescue ActiveRecord::ExclusionViolation, ActiveRecord::StatementInvalid => e
    if e.message.include?("no_overlapping_bookings_per_seat")
      Result.new(false, nil, "Seat no longer available for this segment", :conflict)
    else
      raise
    end
  end
end
