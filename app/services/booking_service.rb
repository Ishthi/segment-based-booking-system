class BookingService
  Result = Struct.new(:success?, :booking, :error, :status)

  def initialize(train:, travel_date:, seat:, coach_type:, origin_station:, destination_station:, passenger_name:, expected_seat_version: nil)
    @train = train
    @travel_date = travel_date
    @seat = seat
    @coach_type = coach_type.to_s
    @origin = origin_station
    @destination = destination_station
    @passenger_name = passenger_name
    @expected_seat_version = expected_seat_version
  end

  def call
    fare = FareCalculatorService.new(@origin, @destination, @coach_type).calculate
    range = (@origin.sequence...@destination.sequence)

    if @coach_type == "reserved" && @seat.blank?
      return Result.new(false, nil, "Seat is required for reserved coaches", :unprocessable_entity)
    end

    if @seat.present?
      already_booked = Booking.confirmed_only
        .where(train_id: @train.id, travel_date: @travel_date)
        .where("segment_range && int4range(?, ?)", range.first, range.last)
        .where(seat_id: @seat.id)
        .exists?

      if already_booked
        return Result.new(false, nil, "Selected seat is already booked", :conflict)
      end
    end

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
