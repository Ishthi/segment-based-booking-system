class SeatAvailabilityService
  def initialize(train_id:, travel_date:, origin_station:, destination_station:)
    @train_id = train_id
    @travel_date = travel_date
    @range = (origin_station.sequence...destination_station.sequence)
  end

  def coach_availability
    Coach.where(train_id: @train_id).includes(:seats).map do |coach|
      booked_seat_ids = Booking.confirmed_only
        .where(train_id: @train_id, travel_date: @travel_date)
        .where("segment_range && int4range(?, ?)", @range.first, @range.last)
        .where(seat_id: coach.seat_ids)
        .pluck(:seat_id)

      available_seats = coach.seats.where.not(id: booked_seat_ids)

      {
        coach_id: coach.id,
        coach_number: coach.coach_number,
        coach_type: coach.coach_type,
        available_seat_count: available_seats.count,
        seats: available_seats
      }
    end
  end
end
