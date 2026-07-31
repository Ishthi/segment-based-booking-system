class CreateSeats < ActiveRecord::Migration[8.1]
  def change
    create_table :seats do |t|
      t.references :coach, null: false, foreign_key: true
      t.string :seat_number, null: false

      t.timestamps
    end

    add_index :seats, [ :coach_id, :seat_number ], unique: true
  end
end
