import { useState, useEffect } from 'react';
import { Select, Alert, Spin, Typography, Button } from 'antd';
import { getBrowserClient } from '@/lib/supabase-browser';
import { Subject } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

interface SubjectSelectionProps {
  userId: string;
  onComplete?: () => void;
  initialSubjectId?: string;
}

export const SubjectSelection = ({ userId, initialSubjectId, onComplete }: SubjectSelectionProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(initialSubjectId || null);
  const [currentPrimarySubject, setCurrentPrimarySubject] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingSubjectId, setPendingSubjectId] = useState<string | null>(null);

  // Fetch subjects and current primary subject on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 SubjectSelection: Starting data fetch for userId:', userId);
        setLoading(true);
        setError(null);
        
        // Validate userId
        if (!userId) {
          throw new Error('User ID is required');
        }
        
        // Fetch subjects from API instead of direct database access
        console.log('📋 SubjectSelection: Fetching subjects from API...');
        const subjectsResponse = await fetch('/api/subjects', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!subjectsResponse.ok) {
          throw new Error(`Failed to fetch subjects: ${subjectsResponse.status} ${subjectsResponse.statusText}`);
        }
        
        const subjectsData = await subjectsResponse.json();
        console.log('✅ SubjectSelection: Subjects fetched from API:', subjectsData?.length || 0, 'subjects');
        console.log('✅ SubjectSelection: Subjects data:', subjectsData);
        setSubjects(subjectsData || []);

        // Get supabase client for user data fetch
        const supabase = getBrowserClient();

        // Fetch current user's primary subject
        console.log('👤 SubjectSelection: Fetching user primary subject for userId:', userId);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('primarysubject')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('❌ SubjectSelection: User fetch error:', userError);
          // Don't throw error if user not found - they might be new
          if (userError.code !== 'PGRST116') {
            throw new Error('Failed to load user data: ' + userError.message);
          }
        }

        console.log('✅ SubjectSelection: User data fetched:', userData);

        if (userData?.primarysubject) {
          console.log('📌 SubjectSelection: Primary subject found:', userData.primarysubject);
          setCurrentPrimarySubject(userData.primarysubject);
          setSelectedSubject(userData.primarysubject);
        } else {
          console.log('📌 SubjectSelection: No primary subject selected yet');
          setCurrentPrimarySubject(null);
        }
        
      } catch (err) {
        console.error('❌ SubjectSelection: Fatal error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        console.log('✅ SubjectSelection: Data fetch completed, setting loading to false');
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleSubjectChange = (subjectId: string) => {
    console.log('🔄 SubjectSelection: User selected subject:', subjectId);
    setPendingSubjectId(subjectId);
    setShowConfirmModal(true);
  };

  const confirmSubjectSelection = async () => {
    if (!pendingSubjectId) return;
    
    try {
      console.log('🔄 SubjectSelection: Confirming subject selection:', pendingSubjectId);
      setSaving(true);
      setError(null);
      setSuccess(false);
      setShowConfirmModal(false);
      
      // Save primary subject to database
      const supabase = getBrowserClient();
      const { error: updateError } = await supabase
        .from('users')
        .update({ primarysubject: pendingSubjectId })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ SubjectSelection: Save error:', updateError);
        throw new Error('Failed to save primary subject: ' + updateError.message);
      }
      
      console.log('✅ SubjectSelection: Subject saved successfully');
      setCurrentPrimarySubject(pendingSubjectId);
      setSelectedSubject(pendingSubjectId);
      setSuccess(true);
      
      // Call the onComplete callback if provided
      if (onComplete) {
        setTimeout(() => onComplete(), 1000);
      }
    } catch (err) {
      console.error('❌ SubjectSelection: Save failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setSaving(false);
      setPendingSubjectId(null);
    }
  };

  const cancelSubjectSelection = () => {
    console.log('🔄 SubjectSelection: User cancelled subject selection');
    setShowConfirmModal(false);
    setPendingSubjectId(null);
    setSelectedSubject(currentPrimarySubject);
  };

  // Show error state
  if (error && !loading) {
    return (
      <div>
        <Title level={4}>Subject Selection</Title>
        <Alert
          message="Error Loading Subjects"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin size="large" tip="Loading subjects..." />
        <div style={{ marginTop: '10px' }}>
          <Text type="secondary">Please wait while we load available subjects...</Text>
        </div>
      </div>
    );
  }

  // If primary subject is already selected, show read-only view
  if (currentPrimarySubject) {
    const selectedSubjectName = subjects.find(s => s.id === currentPrimarySubject)?.name || 'Unknown Subject';
    
    return (
      <div>
        <Title level={4}>Your Primary Subject</Title>
        <Alert
          message="Primary Subject Selected"
          description={
            <div>
              <Text strong>{selectedSubjectName}</Text>
              <br />
              <Text type="secondary">
                Your primary subject cannot be changed once selected. You will receive daily questions from this subject.
              </Text>
            </div>
          }
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      </div>
    );
  }

  return (
    <div>
      <Title level={4}>Select Your Primary Subject</Title>
      <Alert
        message="Important"
        description="Choose carefully! Once you select your primary subject, it cannot be changed. You will receive daily questions from this subject."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Text>Choose the main subject you'd like to focus on. This will determine which questions you receive daily.</Text>
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 16, marginBottom: 16 }}
        />
      )}
      
      {success && (
        <Alert
          message="Success"
          description="Primary subject selected successfully! You can now access your daily questions."
          type="success"
          showIcon
          style={{ marginTop: 16, marginBottom: 16 }}
        />
      )}
      
      <Select
        placeholder="Select a subject"
        style={{ width: '100%', marginTop: 16 }}
        onChange={handleSubjectChange}
        value={selectedSubject}
        loading={saving}
        disabled={saving}
        size="large"
      >
        {subjects.map(subject => (
          <Option key={subject.id} value={subject.id}>
            {subject.name}
          </Option>
        ))}
      </Select>
      
      {subjects.length === 0 && !loading && (
        <Alert
          message="No Subjects Available"
          description="No subjects are currently available. Please contact an administrator."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default SubjectSelection; 