-- Check RLS status for note_links table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'note_links';

-- Check existing policies on note_links
SELECT * FROM pg_policies 
WHERE tablename = 'note_links';

-- Check if the user has the right to insert into note_links
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM 
    information_schema.role_table_grants
WHERE 
    grantee = 'authenticated'
    AND table_name = 'note_links'
    AND privilege_type = 'INSERT';
