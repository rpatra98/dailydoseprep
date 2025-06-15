// Script to completely reset the database and create a clean setup
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

async function resetDatabase() {
  try {
    console.log('🧹 Starting database reset...');
    
    // Step 1: Delete all existing users from auth (this will cascade to our users table)
    console.log('🗑️  Deleting all existing users...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
    } else if (existingUsers?.users?.length > 0) {
      for (const user of existingUsers.users) {
        console.log(`Deleting user: ${user.email}`);
        await supabase.auth.admin.deleteUser(user.id);
      }
    }
    
    // Step 2: Drop all custom tables (in reverse dependency order)
    console.log('🗂️  Dropping existing tables...');
    const dropTables = [
      'DROP TABLE IF EXISTS student_attempts CASCADE;',
      'DROP TABLE IF EXISTS daily_question_sets CASCADE;',
      'DROP TABLE IF EXISTS questions CASCADE;',
      'DROP TABLE IF EXISTS users CASCADE;',
      'DROP TABLE IF EXISTS subjects CASCADE;'
    ];
    
    for (const dropSQL of dropTables) {
      const { error } = await supabase.rpc('exec_sql', { sql: dropSQL });
      if (error) {
        console.warn('Warning dropping table:', error.message);
      }
    }
    
    // Step 3: Create fresh schema
    console.log('🏗️  Creating fresh database schema...');
    const schemaFilePath = path.join(__dirname, '..', 'db', 'schema.sql');
    let schemaSQL = fs.readFileSync(schemaFilePath, 'utf8');
    
    // Remove the problematic SUPERADMIN insert from schema
    schemaSQL = schemaSQL.replace(/-- Create initial SUPERADMIN user[\s\S]*?VALUES \([^;]*\);/g, '');
    
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (schemaError) {
      console.error('Error creating schema:', schemaError);
      throw schemaError;
    }
    
    // Step 4: Apply migration updates
    console.log('🔄 Applying migrations...');
    const migrationPath = path.join(__dirname, '..', '..', 'migrations', '01_schema_update.sql');
    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL });
      
      if (migrationError) {
        console.warn('Warning applying migration:', migrationError.message);
      }
    }
    
    // Step 5: Create SUPERADMIN user
    console.log('👑 Creating SUPERADMIN user...');
    const adminEmail = 'superadmin@ddp.com';
    const adminPassword = '05tattva';
    
    // Create the auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { 
        role: 'SUPERADMIN',
        created_by: 'system'
      }
    });
    
    if (authError || !authData.user) {
      console.error('Error creating SUPERADMIN auth user:', authError);
      throw authError;
    }
    
    console.log('✅ SUPERADMIN auth user created with ID:', authData.user.id);
    
    // Step 6: Create the user record in our users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        role: 'SUPERADMIN'
      });
    
    if (userError) {
      console.error('Error creating SUPERADMIN user record:', userError);
      // Try to cleanup the auth user if user table insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw userError;
    }
    
    // Step 7: Verify the user was created correctly
    console.log('🔍 Verifying SUPERADMIN user...');
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (verifyError || !verifyUser) {
      console.error('Error verifying SUPERADMIN user:', verifyError);
      throw new Error('SUPERADMIN user verification failed');
    }
    
    console.log('✅ SUPERADMIN user verified:', {
      id: verifyUser.id,
      email: verifyUser.email,
      role: verifyUser.role
    });
    
    // Step 8: Create some default subjects
    console.log('📚 Creating default subjects...');
    const defaultSubjects = [
      { name: 'General Studies', examCategory: 'UPSC', description: 'General Studies for UPSC preparation' },
      { name: 'Mathematics', examCategory: 'JEE', description: 'Mathematics for JEE preparation' },
      { name: 'Physics', examCategory: 'JEE', description: 'Physics for JEE preparation' },
      { name: 'Biology', examCategory: 'NEET', description: 'Biology for NEET preparation' },
      { name: 'General Knowledge', examCategory: 'SSC', description: 'General Knowledge for SSC preparation' }
    ];
    
    const { error: subjectsError } = await supabase
      .from('subjects')
      .insert(defaultSubjects);
    
    if (subjectsError) {
      console.warn('Warning creating default subjects:', subjectsError.message);
    } else {
      console.log('✅ Default subjects created');
    }
    
    console.log('\n🎉 Database reset completed successfully!');
    console.log('\n📋 SUPERADMIN Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️  Please change the password after first login for security!');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

resetDatabase(); 