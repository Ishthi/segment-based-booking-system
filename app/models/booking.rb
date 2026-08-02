class Booking < ApplicationRecord
  belongs_to :train
  belongs_to :seat, optional: true
  belongs_to :origin_station, class_name: "Station", inverse_of: :bookings_as_origin
  belongs_to :destination_station, class_name: "Station", inverse_of: :bookings_as_destination

  enum :status, { confirmed: "confirmed", cancelled: "cancelled" }

  validates :passenger_name, presence: true
  validates :train, presence: true
  validates :travel_date, presence: true
  validates :fare, presence: true, numericality: { greater_than: 0 }

  before_validation :set_segment_range

  scope :confirmed_only, -> { where(status: "confirmed") }

  private

  def set_segment_range
    return if origin_station.blank? || destination_station.blank?

    self.segment_range = (origin_station.sequence...destination_station.sequence)
  end
end
