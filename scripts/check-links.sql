-- Check if links exist in the database
SELECT * FROM note_links 
WHERE note_id = 'fafa840e-19a1-4108-bd1b-05199df9c152' 
   OR target_note_id = 'fafa840e-19a1-4108-bd1b-05199df9c152';

-- Check the most recent links
SELECT * FROM note_links 
ORDER BY created_at DESC 
LIMIT 10;
