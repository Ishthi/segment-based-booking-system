class AddNoOverlappingBookingsConstraint < ActiveRecord::Migration[8.1]
  # The original constraint from CreateBookings was keyed on journey_id and was dropped
  # along with that column in MigrateJourneysToBookingTripDetails. This restores it over
  # the replacement columns, so overlapping segments for the same seat cannot be inserted
  # even when two requests race past the check in BookingService.
  #
  # Rows with a NULL seat_id (unreserved standing bookings) are skipped by the
  # constraint, which is intended — they are not tied to a seat.
  def change
    add_exclusion_constraint :bookings,
      "seat_id WITH =, train_id WITH =, travel_date WITH =, segment_range WITH &&",
      using: :gist,
      where: "status = 'confirmed'",
      name: "no_overlapping_bookings_per_seat"
  end
end
