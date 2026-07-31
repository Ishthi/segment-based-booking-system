class AddUniqueIndexToTrainsName < ActiveRecord::Migration[8.1]
  def change
    add_index :trains, :name, unique: true
  end
end
