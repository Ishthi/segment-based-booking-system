class CreateBookings < ActiveRecord::Migration[8.1]
  def change
    create_table :bookings do |t|
      t.references :journey, null: false, foreign_key: true
      t.references :seat, null: false, foreign_key: true
      t.references :origin_station, null: false, foreign_key: { to_table: :stations }
      t.references :destination_station, null: false, foreign_key: { to_table: :stations }
      t.int4range :segment_range, null: false
      t.decimal :fare, null: false, precision: 10, scale: 2
      t.string :passenger_name, null: false
      t.string :status, null: false, default: "confirmed"

      t.timestamps
    end

    add_index :bookings, [ :seat_id, :journey_id ]

    add_exclusion_constraint :bookings,
      "seat_id WITH =, journey_id WITH =, segment_range WITH &&",
      using: :gist,
      where: "status = 'confirmed'",
      name: "no_overlapping_bookings_per_seat"
  end
end
