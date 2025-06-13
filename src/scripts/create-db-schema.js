// Script to create database schema in Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSchema() {
  try {
    console.log('Reading schema file...');
    const schemaFilePath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaFilePath, 'utf8');
    
    console.log('Executing SQL schema...');
    const { error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('Error creating schema:', error);
      process.exit(1);
    }
    
    console.log('Database schema created successfully!');
    
    // Create initial SUPERADMIN user if needed
    const email = 'superadmin@ddp.com'; // Change this to your desired admin email
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('role', 'SUPERADMIN')
      .single();
      
    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('Error checking for existing admin:', userCheckError);
    }
    
    if (!existingUser) {
      console.log('Creating initial SUPERADMIN user...');
      // Note: In a real application, you would use the admin API to create the user
      // This is just a placeholder to remind you to create an admin user
      console.log(`Please create a user with email ${email} and set their role to SUPERADMIN in the Supabase dashboard.`);
    } else {
      console.log('SUPERADMIN user already exists.');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

createSchema(); 