-- Add 'type' column to lpr_records to indicate entry or exit
ALTER TABLE lpr_records
  ADD COLUMN `type` ENUM('entry','exit') NOT NULL DEFAULT 'entry' AFTER `status`;
