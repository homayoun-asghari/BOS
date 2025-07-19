-- Check posts table schema
SELECT 
    c.relname as table_name,
    a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
    CASE WHEN a.attnotnull THEN 'NOT NULL' ELSE 'NULL' END as is_nullable,
    COALESCE(pg_catalog.col_description(a.attrelid, a.attnum), '') as description
FROM 
    pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
WHERE 
    c.relname = 'posts'
    AND a.attnum > 0
    AND NOT a.attisdropped
ORDER BY 
    a.attnum;

-- Check foreign key relationships
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    a1.attname as column_name,
    a2.attname as referenced_column
FROM 
    pg_constraint c
    JOIN pg_attribute a1 ON a1.attnum = ANY(c.conkey) AND a1.attrelid = c.conrelid
    JOIN pg_attribute a2 ON a2.attnum = ANY(c.confkey) AND a2.attrelid = c.confrelid
WHERE 
    conrelid::regclass = 'posts'::regclass
ORDER BY 
    conname;
