class CreateStations < ActiveRecord::Migration[8.1]
  def change
    create_table :stations do |t|
      t.string :name, null: false
      t.integer :sequence, null: false
      t.decimal :distance_km, null: false, precision: 8, scale: 2

      t.timestamps
    end

    add_index :stations, :sequence, unique: true
  end
end
