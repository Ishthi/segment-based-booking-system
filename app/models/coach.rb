class Coach < ApplicationRecord
  belongs_to :train
  has_many :seats, dependent: :destroy

  enum :coach_type, { reserved: "reserved", unreserved: "unreserved" }

  validates :coach_number, presence: true, uniqueness: { scope: :train_id }
  validates :seat_count, presence: true, numericality: { greater_than: 0 }
end
