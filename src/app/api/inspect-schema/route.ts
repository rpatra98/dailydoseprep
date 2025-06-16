import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('=== COMPREHENSIVE SCHEMA INSPECTION ===');
    
    const results = {
      timestamp: new Date().toISOString(),
      tables: {} as any,
      informationSchema: {} as any,
      analysis: {} as any
    };
    
    // Inspect subjects table
    console.log('📋 Inspecting subjects table...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .limit(1);
    
    results.tables.subjects = {
      accessible: !subjectsError,
      error: subjectsError?.message,
      columns: subjects?.[0] ? Object.keys(subjects[0]) : null,
      sampleData: subjects?.[0] || null
    };
    
    // Inspect users table
    console.log('👤 Inspecting users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    results.tables.users = {
      accessible: !usersError,
      error: usersError?.message,
      columns: users?.[0] ? Object.keys(users[0]) : null,
      sampleData: users?.[0] || null
    };
    
    // Inspect questions table - this is the problematic one
    console.log('❓ Inspecting questions table...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    results.tables.questions = {
      accessible: !questionsError,
      error: questionsError?.message,
      columns: questions?.[0] ? Object.keys(questions[0]) : null,
      sampleData: questions?.[0] || null,
      isEmpty: !questions || questions.length === 0
    };
    
    // If questions table is empty, try to get schema info using a different approach
    if (results.tables.questions.isEmpty && !questionsError) {
      console.log('🔍 Questions table is empty, trying to get schema info...');
      
      // Try to insert a minimal test record to see what columns are expected
      const minimalTest = {
        id: '00000000-0000-0000-0000-000000000000' // This will fail but show us the schema
      };
      
      const { data: testInsert, error: testError } = await supabase
        .from('questions')
        .insert(minimalTest)
        .select('*');
      
      results.tables.questions.schemaTest = {
        error: testError?.message,
        code: testError?.code,
        details: testError?.details,
        hint: testError?.hint
      };
    }
    
    // Try to get table structure using information_schema if possible
    console.log('🗂️ Trying to get table structure from information_schema...');
    try {
      const { data: tableStructure, error: structureError } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .in('table_name', ['subjects', 'users', 'questions']);
      
      if (!structureError && tableStructure) {
        results.informationSchema = {};
        tableStructure.forEach((col: any) => {
          if (!results.informationSchema[col.table_name]) {
            results.informationSchema[col.table_name] = [];
          }
          results.informationSchema[col.table_name].push({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable
          });
        });
      } else {
        results.informationSchema = {
          error: structureError?.message || 'Could not access information_schema'
        };
      }
    } catch (infoError) {
      results.informationSchema = {
        error: 'Exception accessing information_schema: ' + (infoError instanceof Error ? infoError.message : 'Unknown error')
      };
    }
    
    // Summary and recommendations
    results.analysis = {
      tablesAccessible: Object.values(results.tables).filter((t: any) => t.accessible).length,
      totalTables: 3,
      questionsTableExists: results.tables.questions.accessible,
      questionsTableEmpty: results.tables.questions.isEmpty,
      hasSchemaInfo: !!results.informationSchema && !results.informationSchema.error,
      recommendation: 'unknown'
    };
    
    if (!results.tables.questions.accessible) {
      results.analysis.recommendation = 'Questions table does not exist - run supabase-manual-setup.sql';
    } else if (results.tables.questions.isEmpty && !results.tables.questions.columns) {
      results.analysis.recommendation = 'Questions table exists but schema is unknown - may need to recreate';
    } else if (results.tables.questions.columns) {
      results.analysis.recommendation = 'Questions table has data - check column names';
    } else {
      results.analysis.recommendation = 'Run complete database setup';
    }
    
    console.log('✅ Schema inspection completed');
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (err) {
    console.error('Schema inspection error:', err);
    return NextResponse.json({
      error: 'Schema inspection failed',
      details: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 