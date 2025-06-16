import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface TableInfo {
  exists: boolean;
  hasData?: boolean;
  columns?: string[];
  sampleData?: any;
  error?: string;
  insertError?: string;
  insertCode?: string;
  insertDetails?: string;
  insertHint?: string;
  testInsertSucceeded?: boolean;
  insertedData?: any;
  note?: string;
}

interface InspectionResults {
  timestamp: string;
  tables: Record<string, TableInfo>;
  errors: Array<{
    table: string;
    error?: string;
    code?: string;
    exception?: string;
  }>;
  postgresSchema?: any;
  analysis?: {
    tablesFound: number;
    tablesWithData: number;
    questionsTableStatus: string;
    questionsColumns: string[] | null;
    recommendedAction: string;
    schemaIssue?: string;
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('=== DEEP DATABASE INSPECTION ===');
    
    const results: InspectionResults = {
      timestamp: new Date().toISOString(),
      tables: {},
      errors: []
    };
    
    // Check each table and get actual structure
    const tablesToCheck = ['questions', 'subjects', 'users', 'student_attempts', 'daily_question_sets'];
    
    for (const tableName of tablesToCheck) {
      console.log(`\n--- Inspecting ${tableName} table ---`);
      
      try {
        // Try to get existing data to see actual columns
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.log(`❌ ${tableName} error:`, tableError.message);
          results.errors.push({
            table: tableName,
            error: tableError.message,
            code: tableError.code
          });
          results.tables[tableName] = {
            exists: false,
            error: tableError.message
          };
        } else {
          console.log(`✅ ${tableName} accessible`);
          
          if (tableData && tableData.length > 0) {
            const columns = Object.keys(tableData[0]);
            console.log(`${tableName} columns:`, columns);
            results.tables[tableName] = {
              exists: true,
              hasData: true,
              columns: columns,
              sampleData: tableData[0]
            };
          } else {
            console.log(`${tableName} exists but is empty`);
            
            // Try a minimal insert to discover required columns
            let testData: Record<string, any> = {};
            if (tableName === 'questions') {
              testData = {
                // Try different possible column names
                title: 'test',
                question: 'test',
                question_text: 'test',
                content: 'test',
                subject: 'test-subject-id',
                subject_id: 'test-subject-id',
                options: { A: 'test', B: 'test', C: 'test', D: 'test' },
                correct_answer: 'A',
                correctAnswer: 'A',
                answer: 'A',
                explanation: 'test',
                difficulty: 'EASY',
                created_by: 'test-user-id',
                createdBy: 'test-user-id',
                author: 'test-user-id'
              };
            } else if (tableName === 'subjects') {
              testData = {
                name: 'Test Subject',
                examCategory: 'OTHER',
                exam_category: 'OTHER',
                description: 'Test description'
              };
            } else if (tableName === 'users') {
              testData = {
                email: 'test@example.com',
                role: 'STUDENT',
                primarySubject: 'test-subject-id',
                primary_subject: 'test-subject-id'
              };
            }
            
            if (Object.keys(testData).length > 0) {
              const { data: insertData, error: insertError } = await supabase
                .from(tableName)
                .insert(testData)
                .select('*');
              
              if (insertError) {
                console.log(`Insert test failed for ${tableName}:`, insertError.message);
                results.tables[tableName] = {
                  exists: true,
                  hasData: false,
                  insertError: insertError.message,
                  insertCode: insertError.code,
                  insertDetails: insertError.details,
                  insertHint: insertError.hint
                };
              } else {
                console.log(`Insert test succeeded for ${tableName}`);
                const columns = Object.keys(insertData[0]);
                results.tables[tableName] = {
                  exists: true,
                  hasData: false,
                  columns: columns,
                  testInsertSucceeded: true,
                  insertedData: insertData[0]
                };
                
                // Clean up test data
                await supabase.from(tableName).delete().eq('id', insertData[0].id);
              }
            } else {
              results.tables[tableName] = {
                exists: true,
                hasData: false,
                note: 'No test data defined for this table'
              };
            }
          }
        }
      } catch (e) {
        console.log(`Exception inspecting ${tableName}:`, e);
        results.errors.push({
          table: tableName,
          exception: e instanceof Error ? e.message : 'Unknown exception'
        });
      }
    }
    
    // Try to get PostgreSQL table information directly
    try {
      console.log('\n--- Trying PostgreSQL information_schema ---');
      const { data: schemaInfo, error: schemaError } = await supabase
        .rpc('get_table_schema_info');
      
      if (!schemaError && schemaInfo) {
        results.postgresSchema = schemaInfo;
      } else {
        console.log('PostgreSQL schema query failed:', schemaError?.message);
      }
    } catch (e) {
      console.log('PostgreSQL schema exception:', e);
    }
    
    // Summary analysis
    const analysis: {
      tablesFound: number;
      tablesWithData: number;
      questionsTableStatus: string;
      questionsColumns: string[] | null;
      recommendedAction: string;
      schemaIssue?: string;
    } = {
      tablesFound: Object.keys(results.tables).filter(t => results.tables[t].exists).length,
      tablesWithData: Object.keys(results.tables).filter(t => results.tables[t].hasData).length,
      questionsTableStatus: results.tables.questions?.exists ? 'exists' : 'missing',
      questionsColumns: results.tables.questions?.columns || null,
      recommendedAction: 'unknown'
    };
    
    if (!results.tables.questions?.exists) {
      analysis.recommendedAction = 'run_database_setup';
    } else if (results.tables.questions?.insertError) {
      analysis.recommendedAction = 'fix_schema_mismatch';
      analysis.schemaIssue = results.tables.questions.insertError;
    } else {
      analysis.recommendedAction = 'schema_appears_correct';
    }
    
    results.analysis = analysis;
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (err) {
    console.error('Deep inspection error:', err);
    return NextResponse.json({
      error: 'Deep inspection failed',
      details: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 