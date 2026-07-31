class Station < ApplicationRecord
  has_many :bookings_as_origin, class_name: "Booking", foreign_key: :origin_station_id, inverse_of: :origin_station
  has_many :bookings_as_destination, class_name: "Booking", foreign_key: :destination_station_id, inverse_of: :destination_station

  validates :name, presence: true
  validates :sequence, presence: true, uniqueness: true
  validates :distance_km, presence: true, numericality: { greater_than_or_equal_to: 0 }

  default_scope { order(:sequence) }
end
