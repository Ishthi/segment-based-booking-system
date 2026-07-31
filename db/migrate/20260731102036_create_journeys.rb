class CreateJourneys < ActiveRecord::Migration[8.1]
  def change
    create_table :journeys do |t|
      t.references :train, null: false, foreign_key: true
      t.date :travel_date, null: false

      t.timestamps
    end

    add_index :journeys, [ :train_id, :travel_date ], unique: true
  end
end
