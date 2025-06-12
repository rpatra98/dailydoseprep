import { useState, useEffect } from 'react';
import { Select, Alert, Spin, Typography } from 'antd';
import { supabase } from '@/utils/supabase';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name', { ascending: true });
          
        if (error) {
          throw new Error('Failed to load subjects');
        }
        
        setSubjects(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleSubjectChange = async (subjectId: string) => {
    try {
      setSelectedSubject(subjectId);
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      // Update user profile with selected subject
      const { error } = await supabase
        .from('users')
        .update({ primarySubject: subjectId })
        .eq('id', userId);
        
      if (error) {
        throw new Error('Failed to update primary subject');
      }
      
      setSuccess(true);
      
      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spin tip="Loading subjects..." />;
  }

  return (
    <div>
      <Title level={4}>Select Your Primary Subject</Title>
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
          description="Primary subject updated successfully!"
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
            {subject.name} ({subject.examCategory})
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