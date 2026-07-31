class SeatVersionService
  def initialize(seat)
    @seat = seat
  end

  def version
    bookings = Booking.confirmed_only.where(seat_id: @seat.id).order(:id)
    return "empty" if bookings.none?

    Digest::SHA256.hexdigest(
      bookings.map { |b| "#{b.id}:#{b.updated_at.to_f}" }.join("|")
    )
  end
end
