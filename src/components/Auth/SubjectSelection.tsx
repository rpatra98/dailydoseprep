import { useState, useEffect } from 'react';
import { Select, Alert, Spin, Typography, Button, Modal } from 'antd';
import { Subject } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

interface SubjectSelectionProps {
  userId: string;
  onComplete?: () => void;
  initialSubjectId?: string;
}

interface UserData {
  id: string;
  email: string;
  role: string;
  primarysubject: string | null;
  primarySubjectData?: {
    id: string;
    name: string;
  } | null;
}

export const SubjectSelection = ({ userId, initialSubjectId, onComplete }: SubjectSelectionProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(initialSubjectId || null);
  const [currentPrimarySubject, setCurrentPrimarySubject] = useState<string | null>(null);
  const [primarySubjectName, setPrimarySubjectName] = useState<string | null>(null);
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
        
        // Fetch subjects from API
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

        // Fetch current user data including primary subject from API
        console.log('👤 SubjectSelection: Fetching user data from API...');
        const userResponse = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user data: ${userResponse.status} ${userResponse.statusText}`);
        }

        const userData: UserData = await userResponse.json();
        console.log('✅ SubjectSelection: User data fetched from API:', userData);

        if (userData.primarysubject) {
          console.log('📌 SubjectSelection: Primary subject found:', userData.primarysubject);
          setCurrentPrimarySubject(userData.primarysubject);
          setSelectedSubject(userData.primarysubject);
          
          // Set primary subject name from the API response or find it in subjects
          if (userData.primarySubjectData?.name) {
            setPrimarySubjectName(userData.primarySubjectData.name);
          } else {
            // Fallback: find subject name from subjects list
            const subjectName = subjectsData.find((s: Subject) => s.id === userData.primarysubject)?.name || 'Unknown Subject';
            setPrimarySubjectName(subjectName);
          }
        } else {
          console.log('📌 SubjectSelection: No primary subject selected yet');
          setCurrentPrimarySubject(null);
          setPrimarySubjectName(null);
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
      
      // Save primary subject via API
      const response = await fetch('/api/auth/update-primary-subject', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          primarySubjectId: pendingSubjectId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update primary subject');
      }

      const result = await response.json();
      console.log('✅ SubjectSelection: Subject saved successfully via API');
      
      setCurrentPrimarySubject(pendingSubjectId);
      setSelectedSubject(pendingSubjectId);
      
      // Set subject name
      const subjectName = subjects.find(s => s.id === pendingSubjectId)?.name || 'Unknown Subject';
      setPrimarySubjectName(subjectName);
      
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
    const displayName = primarySubjectName || 'Unknown Subject';
    
    return (
      <div>
        <Title level={4}>Your Primary Subject</Title>
        <Alert
          message="Primary Subject Selected"
          description={
            <div>
              <Text strong>{displayName}</Text>
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

      {/* Confirmation Modal */}
      <Modal
        title="Confirm Subject Selection"
        open={showConfirmModal}
        onOk={confirmSubjectSelection}
        onCancel={cancelSubjectSelection}
        okText="Confirm Selection"
        cancelText="Cancel"
        confirmLoading={saving}
      >
        <Alert
          message="Important Decision"
          description="Once you confirm this selection, your primary subject cannot be changed. Are you sure you want to proceed?"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Text>
          You are about to select <Text strong>
            {subjects.find(s => s.id === pendingSubjectId)?.name}
          </Text> as your primary subject.
        </Text>
      </Modal>
    </div>
  );
};

export default SubjectSelection; 