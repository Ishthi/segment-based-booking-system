class MigrateJourneysToBookingTripDetails < ActiveRecord::Migration[8.1]
  def up
    add_column :bookings, :train_id, :bigint unless column_exists?(:bookings, :train_id)
    add_column :bookings, :travel_date, :date unless column_exists?(:bookings, :travel_date)

    if table_exists?(:journeys) && column_exists?(:bookings, :journey_id)
      execute <<~SQL
        UPDATE bookings
        SET train_id = journeys.train_id,
            travel_date = journeys.travel_date
        FROM journeys
        WHERE bookings.journey_id = journeys.id
      SQL
    end

    remove_column :bookings, :journey_id if column_exists?(:bookings, :journey_id)
    add_foreign_key :bookings, :trains, validate: false unless foreign_key_exists?(:bookings, :trains)
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
