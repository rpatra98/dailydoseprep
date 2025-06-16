// Simplified reset script for subjects table with just names
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

async function resetSimpleSubjects() {
  try {
    console.log('🧹 Starting simplified subjects reset...');
    
    // Step 1: Clear existing data
    console.log('🗑️  Clearing existing data...');
    const tables = ['student_attempts', 'daily_question_sets', 'questions', 'subjects'];
    
    for (const table of tables) {
      try {
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
    
    // Step 2: Add simple subjects
    console.log('📚 Adding simple subjects...');
    const simpleSubjects = [
      { name: 'General Studies' },
      { name: 'Mathematics' },
      { name: 'Physics' },
      { name: 'Chemistry' },
      { name: 'Biology' },
      { name: 'General Knowledge' }
    ];
    
    const { error: subjectsError } = await supabase
      .from('subjects')
      .insert(simpleSubjects);
    
    if (subjectsError) {
      console.error('❌ Error adding subjects:', subjectsError.message);
    } else {
      console.log('✅ Simple subjects added successfully');
    }
    
    // Step 3: Verify SUPERADMIN exists
    console.log('👑 Checking SUPERADMIN user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'superadmin@ddp.com')
      .single();
      
    if (adminError || !adminUser) {
      console.log('❌ SUPERADMIN user not found, creating...');
      
      // Create SUPERADMIN if doesn't exist
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'superadmin@ddp.com',
        password: '05tattva',
        email_confirm: true,
        user_metadata: { role: 'SUPERADMIN' }
      });
      
      if (authError) {
        console.error('❌ Error creating SUPERADMIN auth user:', authError.message);
      } else {
        const { error: userError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: 'superadmin@ddp.com',
          role: 'SUPERADMIN'
        });
        
        if (userError) {
          console.error('❌ Error creating SUPERADMIN user record:', userError.message);
        } else {
          console.log('✅ SUPERADMIN user created successfully');
        }
      }
    } else {
      console.log('✅ SUPERADMIN user exists');
    }
    
    console.log('\n🎉 Simplified reset completed successfully!');
    console.log('\n📋 Credentials:');
    console.log('   Email: superadmin@ddp.com');
    console.log('   Password: 05tattva');
    console.log('\n🚀 You can now test login at your application');
    
  } catch (error) {
    console.error('❌ Simplified reset failed:', error);
    process.exit(1);
  }
}

resetSimpleSubjects(); 