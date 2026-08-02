# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_01_134154) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "pg_catalog.plpgsql"

  create_table "bookings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "destination_station_id", null: false
    t.decimal "fare", precision: 10, scale: 2, null: false
    t.bigint "origin_station_id", null: false
    t.string "passenger_name", null: false
    t.bigint "seat_id"
    t.int4range "segment_range", null: false
    t.string "status", default: "confirmed", null: false
    t.bigint "train_id"
    t.date "travel_date"
    t.datetime "updated_at", null: false
    t.index ["destination_station_id"], name: "index_bookings_on_destination_station_id"
    t.index ["origin_station_id"], name: "index_bookings_on_origin_station_id"
    t.index ["seat_id"], name: "index_bookings_on_seat_id"
  end

  create_table "coaches", force: :cascade do |t|
    t.string "coach_number", null: false
    t.integer "coach_type", null: false
    t.datetime "created_at", null: false
    t.integer "seat_count", null: false
    t.bigint "train_id", null: false
    t.datetime "updated_at", null: false
    t.index ["train_id", "coach_number"], name: "index_coaches_on_train_id_and_coach_number", unique: true
    t.index ["train_id"], name: "index_coaches_on_train_id"
  end

  create_table "idempotency_keys", force: :cascade do |t|
    t.bigint "booking_id", null: false
    t.datetime "created_at", null: false
    t.string "key"
    t.string "request_hash"
    t.datetime "updated_at", null: false
    t.index ["booking_id"], name: "index_idempotency_keys_on_booking_id"
  end

  create_table "journeys", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "train_id", null: false
    t.date "travel_date", null: false
    t.datetime "updated_at", null: false
    t.index ["train_id", "travel_date"], name: "index_journeys_on_train_id_and_travel_date", unique: true
    t.index ["train_id"], name: "index_journeys_on_train_id"
  end

  create_table "seats", force: :cascade do |t|
    t.bigint "coach_id", null: false
    t.datetime "created_at", null: false
    t.string "seat_number", null: false
    t.datetime "updated_at", null: false
    t.index ["coach_id", "seat_number"], name: "index_seats_on_coach_id_and_seat_number", unique: true
    t.index ["coach_id"], name: "index_seats_on_coach_id"
  end

  create_table "stations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.decimal "distance_km", precision: 8, scale: 2, null: false
    t.string "name", null: false
    t.integer "sequence", null: false
    t.datetime "updated_at", null: false
    t.index ["sequence"], name: "index_stations_on_sequence", unique: true
  end

  create_table "trains", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_trains_on_name", unique: true
  end

  add_foreign_key "bookings", "seats"
  add_foreign_key "bookings", "stations", column: "destination_station_id"
  add_foreign_key "bookings", "stations", column: "origin_station_id"
  add_foreign_key "bookings", "trains", validate: false
  add_foreign_key "coaches", "trains"
  add_foreign_key "idempotency_keys", "bookings"
  add_foreign_key "journeys", "trains"
  add_foreign_key "seats", "coaches"
end
