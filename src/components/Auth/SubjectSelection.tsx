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

  // Fetch subjects and current primary subject on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const supabase = getBrowserClient();
        
        // Fetch subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .order('name', { ascending: true });
          
        if (subjectsError) {
          throw new Error('Failed to load subjects');
        }
        
        setSubjects(subjectsData || []);

        // Fetch current user's primary subject
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('primarysubject')
          .eq('id', userId)
          .single();

        if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw new Error('Failed to load user data');
        }

        if (userData?.primarysubject) {
          setCurrentPrimarySubject(userData.primarysubject);
          setSelectedSubject(userData.primarysubject);
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleSubjectChange = async (subjectId: string) => {
    try {
      setSelectedSubject(subjectId);
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      // Save primary subject to database
      const supabase = getBrowserClient();
      const { error: updateError } = await supabase
        .from('users')
        .update({ primarysubject: subjectId })
        .eq('id', userId);

      if (updateError) {
        throw new Error('Failed to save primary subject');
      }
      
      setCurrentPrimarySubject(subjectId);
      setSuccess(true);
      
      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      // Reset selection on error
      setSelectedSubject(currentPrimarySubject);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spin tip="Loading subjects..." />;
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
      >
        {subjects.map(subject => (
          <Option key={subject.id} value={subject.id}>
            {subject.name}
          </Option>
        ))}
      </Select>
      
      {subjects.length === 0 && !loading && (
        <Alert
          message="No subjects available"
          description="Please contact an administrator to add subjects."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default SubjectSelection; 