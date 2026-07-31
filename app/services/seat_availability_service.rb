class SeatAvailabilityService
  def initialize(journey:, origin_station:, destination_station:)
    @journey = journey
    @range = (origin_station.sequence...destination_station.sequence)
  end

  def available_seats
    Seat.joins(coach: :train)
        .where(coaches: { train_id: @journey.train_id, coach_type: "reserved" })
        .where.not(
          id: Booking.confirmed_only
                     .where(journey: @journey)
                     .where("segment_range && int4range(?, ?)", @range.first, @range.last)
                     .select(:seat_id)
        )
  end
end
