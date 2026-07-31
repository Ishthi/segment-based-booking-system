# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
# frozen_string_literal: true

Station.delete_all
Coach.delete_all
Seat.delete_all
Train.delete_all

train = Train.find_or_create_by!(name: "1005")

reserved_coach_names = %w[R1 R2 R3]
unreserved_coach_names = %w[U1 U2 U3 U4 U5]

reserved_coach_names.each_with_index do |name, index|
  coach = Coach.find_or_create_by!(train: train, coach_number: index + 1) do |record|
    record.coach_type = :reserved
    record.seat_count = 4
  end

  4.times do |seat_index|
    Seat.find_or_create_by!(coach: coach, seat_number: seat_index + 1)
  end
end

unreserved_coach_names.each_with_index do |name, index|
  coach = Coach.find_or_create_by!(train: train, coach_number: reserved_coach_names.size + index + 1) do |record|
    record.coach_type = :unreserved
    record.seat_count = 8
  end

  8.times do |seat_index|
    Seat.find_or_create_by!(coach: coach, seat_number: seat_index + 1)
  end
end

stations = [
  { name: "Colombo Fort", sequence: 0, distance_km: 0.0 },
  { name: "Kandy", sequence: 1, distance_km: 120.74 },
  { name: "Hatton", sequence: 2, distance_km: 173.06 },
  { name: "Nanu Oya", sequence: 3, distance_km: 206.9 },
  { name: "Ella", sequence: 4, distance_km: 271.03 },
  { name: "Badulla", sequence: 5, distance_km: 292.3 }
]

stations.each do |attrs|
  Station.find_or_create_by!(name: attrs[:name]) do |station|
    station.sequence = attrs[:sequence]
    station.distance_km = attrs[:distance_km]
  end
end
