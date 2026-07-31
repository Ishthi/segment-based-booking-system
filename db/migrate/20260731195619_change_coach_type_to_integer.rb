class ChangeCoachTypeToInteger < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL
      UPDATE coaches
      SET coach_type = CASE coach_type
        WHEN 'reserved' THEN 0
        WHEN 'unreserved' THEN 1
        ELSE NULL
      END
      WHERE coach_type IS NOT NULL
    SQL

    execute <<~SQL
      ALTER TABLE coaches
      ALTER COLUMN coach_type TYPE integer
      USING coach_type::integer
    SQL
  end

  def down
    execute <<~SQL
      ALTER TABLE coaches
      ALTER COLUMN coach_type TYPE varchar
    SQL

    execute <<~SQL
      UPDATE coaches
      SET coach_type = CASE coach_type
        WHEN '0' THEN 'reserved'
        WHEN '1' THEN 'unreserved'
        ELSE NULL
      END
      WHERE coach_type IS NOT NULL
    SQL
  end
end
