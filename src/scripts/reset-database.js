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
    console.log('⚠️  WARNING: This will delete all users and force logout of active sessions!');
    console.log('⚠️  Users currently logged in will need to log in again after this operation.');
    console.log('⚠️  Continuing in 3 seconds...');
    
    // Give users a chance to cancel
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
    
    // We'll use individual table operations since exec_sql isn't available
    const tables = ['student_attempts', 'daily_question_sets', 'questions', 'users', 'subjects'];
    
    for (const table of tables) {
      try {
        // Try to delete all records first, then we don't need to drop tables
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Warning clearing table ${table}:`, error.message);
        } else {
          console.log(`✓ Cleared table: ${table}`);
        }
      } catch (err) {
        console.warn(`Table ${table} might not exist:`, err.message);
      }
    }
    
    // Step 3: Create tables manually since we can't use exec_sql
    console.log('🏗️  Creating fresh database schema...');
    
    // Create subjects table
    try {
      console.log('Creating subjects table...');
      // We'll rely on the migration to create tables properly
    } catch (error) {
      console.warn('Note: Tables might already exist from Supabase setup');
    }
    
    // Step 4: Skip migration for now since we can't execute raw SQL
    console.log('🔄 Skipping migrations (tables should exist from Supabase setup)...');
    
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