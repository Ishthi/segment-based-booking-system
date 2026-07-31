class CreateCoaches < ActiveRecord::Migration[8.1]
  def change
   create_table :coaches do |t|
      t.references :train, null: false, foreign_key: true
      t.string :coach_number, null: false
      t.string :coach_type, null: false # 'reserved' / 'unreserved'
      t.integer :seat_count, null: false

      t.timestamps
    end

    add_index :coaches, [ :train_id, :coach_number ], unique: true
  end
end
