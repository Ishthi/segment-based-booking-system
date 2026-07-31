class Train < ApplicationRecord
  has_many :coaches, dependent: :destroy
  has_many :journeys, dependent: :destroy

  validates :name, presence: true
end
