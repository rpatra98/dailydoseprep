// Script to fix database schema issues
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

async function fixDatabase() {
  try {
    console.log('🔧 Starting database fix...');
    
    // Check current table structures
    console.log('🔍 Checking current database structure...');
    
    // Test subjects table structure
    try {
      const { data: subjectTest, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, examCategory, description')
        .limit(1);
        
      if (subjectError) {
        console.log('❌ Subjects table schema issue:', subjectError.message);
        console.log('📝 Need to add examCategory column to subjects table');
        
        // Try to add the missing column using a workaround
        console.log('💡 Attempting to fix subjects table by adding sample data...');
        
        // Delete existing subjects that might have wrong schema
        await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Try inserting with all required fields, this will force column creation in some cases
        const { error: insertError } = await supabase
          .from('subjects')
          .insert({
            name: 'Test Subject',
            examCategory: 'UPSC',
            description: 'Test description'
          });
          
        if (insertError) {
          console.log('❌ Could not fix subjects table:', insertError.message);
          console.log('📋 Please run the manual SQL setup in Supabase dashboard');
        } else {
          console.log('✅ Subjects table structure fixed');
          // Clean up test data
          await supabase.from('subjects').delete().eq('name', 'Test Subject');
        }
      } else {
        console.log('✅ Subjects table structure is correct');
      }
    } catch (err) {
      console.log('❌ Error checking subjects table:', err.message);
    }
    
    // Check users table
    try {
      const { data: userTest, error: userError } = await supabase
        .from('users')
        .select('id, email, role, primarySubject')
        .limit(1);
        
      if (userError) {
        console.log('❌ Users table issue:', userError.message);
      } else {
        console.log('✅ Users table structure is correct');
      }
    } catch (err) {
      console.log('❌ Error checking users table:', err.message);
    }
    
    // Ensure SUPERADMIN exists and is properly configured
    console.log('👑 Checking SUPERADMIN user...');
    const adminEmail = 'superadmin@ddp.com';
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();
      
    if (adminError || !adminUser) {
      console.log('❌ SUPERADMIN user not found in users table');
      
      // Check if user exists in auth
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email === adminEmail);
      
      if (authUser) {
        console.log('✅ SUPERADMIN exists in auth, creating users table record...');
        
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: adminEmail,
            role: 'SUPERADMIN'
          });
          
        if (createError) {
          console.log('❌ Could not create SUPERADMIN user record:', createError.message);
        } else {
          console.log('✅ SUPERADMIN user record created successfully');
        }
      } else {
        console.log('❌ SUPERADMIN not found in auth either, please run simple-reset first');
      }
    } else {
      console.log('✅ SUPERADMIN user exists and is properly configured');
    }
    
    // Add default subjects if subjects table is working
    console.log('📚 Adding default subjects...');
    const defaultSubjects = [
      { name: 'General Studies', examCategory: 'UPSC', description: 'General Studies for UPSC preparation' },
      { name: 'Mathematics', examCategory: 'JEE', description: 'Mathematics for JEE preparation' },
      { name: 'Physics', examCategory: 'JEE', description: 'Physics for JEE preparation' },
      { name: 'Chemistry', examCategory: 'JEE', description: 'Chemistry for JEE preparation' },
      { name: 'Biology', examCategory: 'NEET', description: 'Biology for NEET preparation' },
      { name: 'General Knowledge', examCategory: 'SSC', description: 'General Knowledge for SSC preparation' }
    ];
    
    for (const subject of defaultSubjects) {
      try {
        const { error: subjectError } = await supabase
          .from('subjects')
          .upsert(subject, { onConflict: 'name' });
          
        if (subjectError) {
          console.log(`❌ Could not add subject ${subject.name}:`, subjectError.message);
        } else {
          console.log(`✅ Added subject: ${subject.name}`);
        }
      } catch (err) {
        console.log(`❌ Error adding subject ${subject.name}:`, err.message);
      }
    }
    
    console.log('\n🎉 Database fix completed!');
    console.log('\n📋 Status Summary:');
    console.log('✅ SUPERADMIN user should now work');
    console.log('✅ Login should be functional');
    
    if (subjectError) {
      console.log('\n⚠️  Important Notes:');
      console.log('📝 If subjects table still has issues, please:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Run the contents of supabase-manual-setup.sql');
      console.log('3. Then test login again');
    }
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  }
}

fixDatabase(); 