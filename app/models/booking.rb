class Booking < ApplicationRecord
  belongs_to :journey
  belongs_to :seat
  belongs_to :origin_station, class_name: "Station", inverse_of: :bookings_as_origin
  belongs_to :destination_station, class_name: "Station", inverse_of: :bookings_as_destination

  enum :status, { confirmed: "confirmed", cancelled: "cancelled" }

  validates :passenger_name, presence: true
  validates :fare, presence: true, numericality: { greater_than: 0 }
  validate :destination_after_origin

  before_validation :set_segment_range

  scope :confirmed_only, -> { where(status: "confirmed") }

  private

  def destination_after_origin
    return if origin_station.blank? || destination_station.blank?

    if destination_station.sequence <= origin_station.sequence
      errors.add(:destination_station, "must come after the origin station on the route")
    end
  end

  def set_segment_range
    return if origin_station.blank? || destination_station.blank?

    self.segment_range = (origin_station.sequence...destination_station.sequence)
  end
end
