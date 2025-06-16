// Manual cleanup script to remove all auth users and recreate clean SUPERADMIN
const { createClient } = require('@supabase/supabase-js');

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

async function manualCleanup() {
  try {
    console.log('🧹 Starting manual cleanup...');
    
    // Step 1: List and delete ALL auth users
    console.log('🗑️  Deleting ALL auth users...');
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
    } else if (allUsers?.users?.length > 0) {
      console.log(`Found ${allUsers.users.length} auth users to delete`);
      for (const user of allUsers.users) {
        console.log(`Deleting auth user: ${user.email} (${user.id})`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError.message);
        }
      }
    } else {
      console.log('No auth users found');
    }
    
    // Step 2: Clear users table
    console.log('🗂️  Clearing users table...');
    const { error: clearError } = await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (clearError) {
      console.error('Error clearing users table:', clearError.message);
    } else {
      console.log('✅ Users table cleared');
    }
    
    // Step 3: Create ONE clean SUPERADMIN
    console.log('👑 Creating clean SUPERADMIN...');
    const adminEmail = 'superadmin@ddp.com';
    const adminPassword = '05tattva';
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { 
        role: 'SUPERADMIN',
        created_by: 'manual_cleanup'
      }
    });
    
    if (authError || !authData.user) {
      console.error('❌ Error creating SUPERADMIN auth user:', authError);
      return;
    }
    
    console.log(`✅ Created auth user: ${authData.user.id}`);
    
    // Step 4: Create users table record
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        role: 'SUPERADMIN'
      });
    
    if (userError) {
      console.error('❌ Error creating users table record:', userError.message);
      // Clean up auth user if users table insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }
    
    console.log('✅ Created users table record');
    
    // Step 5: Verify everything
    console.log('🔍 Verifying setup...');
    
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    console.log(`Auth users count: ${authUsers?.users?.length || 0}`);
    
    const { data: dbUsers, error: dbError } = await supabase.from('users').select('*');
    if (dbError) {
      console.error('Error checking users table:', dbError.message);
    } else {
      console.log(`Users table count: ${dbUsers?.length || 0}`);
      if (dbUsers && dbUsers.length > 0) {
        dbUsers.forEach(user => {
          console.log(`  - ${user.email} (${user.role}) - ID: ${user.id}`);
        });
      }
    }
    
    console.log('\n🎉 Manual cleanup completed!');
    console.log('\n📋 SUPERADMIN Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n🚀 You can now test login at your application');
    console.log('💡 Clear browser cache/cookies and try again if still having issues');
    
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    process.exit(1);
  }
}

manualCleanup(); 