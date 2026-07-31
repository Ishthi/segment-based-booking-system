class Journey < ApplicationRecord
  belongs_to :train
  has_many :bookings, dependent: :destroy

  validates :travel_date, presence: true, uniqueness: { scope: :train_id }
end
