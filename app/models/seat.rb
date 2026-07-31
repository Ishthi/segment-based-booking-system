class Seat < ApplicationRecord
  belongs_to :coach
  has_many :bookings, dependent: :restrict_with_error

  validates :seat_number, presence: true, uniqueness: { scope: :coach_id }
end
