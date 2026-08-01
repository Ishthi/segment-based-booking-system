class SeatAvailabilityService
  def initialize(train_id:, travel_date:, origin_station:, destination_station:)
    @train_id = train_id
    @travel_date = travel_date
    @range = (origin_station.sequence...destination_station.sequence)
  end

  def available_seats
    Seat.joins(coach: :train)
        .where(coaches: { train_id: @train_id, coach_type: :reserved })
        .where.not(
          id: Booking.confirmed_only
                     .where(train_id: @train_id, travel_date: @travel_date)
                     .where("segment_range && int4range(?, ?)", @range.first, @range.last)
                     .select(:seat_id)
        )
  end
end
