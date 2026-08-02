class MakeBookingSeatOptional < ActiveRecord::Migration[8.1]
  def change
    change_column_null :bookings, :seat_id, true
  end
end
