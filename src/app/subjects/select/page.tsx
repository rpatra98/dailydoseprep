'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Button, 
  Typography, 
  Alert, 
  Spin, 
  Checkbox, 
  Row, 
  Col, 
  Space,
  Divider,
  message,
  Modal,
  Grid
} from 'antd';
import { 
  BookOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface Subject {
  id: string;
  name: string;
  description?: string;
  examcategory?: string;
}

interface UserSubject {
  subject_id: string;
  is_primary: boolean;
}

export default function SubjectSelection() {
  const { user } = useAuth();
  const router = useRouter();
  const screens = useBreakpoint();
  const isMobile = screens.xs || !screens.sm;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [primarySubject, setPrimarySubject] = useState<string>('');
  const [existingSelections, setExistingSelections] = useState<UserSubject[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'STUDENT') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all subjects
      const subjectsResponse = await fetch('/api/subjects', {
        method: 'GET',
        credentials: 'include',
      });

      if (!subjectsResponse.ok) {
        throw new Error('Failed to fetch subjects');
      }

      const subjectsData = await subjectsResponse.json();
      setSubjects(subjectsData || []);

      // Fetch user's existing subject selections
      const userSubjectsResponse = await fetch('/api/student/subjects', {
        method: 'GET',
        credentials: 'include',
      });

      if (userSubjectsResponse.ok) {
        const userSubjectsData = await userSubjectsResponse.json();
        setExistingSelections(userSubjectsData.subjects || []);
        
        // Set current selections (ensure uniqueness)
        const currentSelections: string[] = userSubjectsData.subjects?.map((us: UserSubject) => us.subject_id) || [];
        const uniqueSelections = [...new Set(currentSelections)]; // Remove duplicates
        setSelectedSubjects(uniqueSelections);
        
        // Set primary subject
        const primary = userSubjectsData.subjects?.find((us: UserSubject) => us.is_primary);
        if (primary) {
          setPrimarySubject(primary.subject_id);
        }
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjects(prev => {
        // Prevent duplicates
        if (prev.includes(subjectId)) {
          return prev;
        }
        const newSelection = [...prev, subjectId];
        // If this is the first subject, make it primary
        if (prev.length === 0) {
          setPrimarySubject(subjectId);
        }
        return newSelection;
      });
    } else {
      setSelectedSubjects(prev => {
        const newSelection = prev.filter(id => id !== subjectId);
        // If removing primary subject, set new primary
        if (primarySubject === subjectId) {
          setPrimarySubject(newSelection.length > 0 ? newSelection[0] : '');
        }
        return newSelection;
      });
    }
  };

  const handlePrimaryChange = (subjectId: string) => {
    setPrimarySubject(subjectId);
  };

  const handleSave = () => {
    if (selectedSubjects.length === 0) {
      message.error('Please select at least one subject');
      return;
    }

    if (!primarySubject) {
      message.error('Please select a primary subject');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    try {
      setSaving(true);
      setShowConfirmModal(false);

      const response = await fetch('/api/student/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subjectIds: selectedSubjects,
          primarySubjectId: primarySubject
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save subjects');
      }

      message.success('Subjects saved successfully!');
      router.push('/dashboard');

    } catch (err) {
      console.error('Error saving subjects:', err);
      message.error(err instanceof Error ? err.message : 'Failed to save subjects');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" tip="Loading subjects..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Subjects"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchData}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => router.push('/dashboard')}
            style={{ marginBottom: '16px' }}
          >
            Back to Dashboard
          </Button>
          
          <Title level={2}>Select Your Subjects</Title>
          <Paragraph>
            Choose the subjects you want to practice. You can select multiple subjects for comprehensive exam preparation.
            Your primary subject will be used for daily questions and main focus.
          </Paragraph>
          
          {existingSelections.length > 0 && (
            <Alert
              message="Update Your Subjects"
              description="You can modify your subject selection at any time. Changes will be reflected in your dashboard and practice sessions."
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />
          )}
        </div>

        {/* Subject Selection Grid */}
        <Row gutter={[16, 16]}>
          {subjects.map((subject) => {
            const isSelected = selectedSubjects.includes(subject.id);
            const isPrimary = primarySubject === subject.id;
            
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={subject.id}>
                <Card
                  size="small"
                  className={isSelected ? 'selected-subject' : ''}
                  style={{
                    border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    backgroundColor: isSelected ? '#f6ffed' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={(e) => {
                    // Prevent double-triggering when clicking on checkbox
                    if ((e.target as HTMLElement).closest('.ant-checkbox-wrapper')) {
                      return;
                    }
                    handleSubjectToggle(subject.id, !isSelected);
                  }}
                >
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSubjectToggle(subject.id, e.target.checked);
                      }}
                      style={{ marginBottom: '8px' }}
                    />
                    
                    <Title level={5} style={{ margin: '8px 0' }}>
                      {subject.name}
                    </Title>
                    
                    {subject.examcategory && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {subject.examcategory}
                      </Text>
                    )}
                    
                    {isPrimary && (
                      <div style={{ marginTop: '8px' }}>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text style={{ color: '#52c41a', fontSize: '12px', marginLeft: '4px' }}>
                          Primary
                        </Text>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* Primary Subject Selection */}
        {selectedSubjects.length > 1 && (
          <div style={{ marginTop: '32px' }}>
            <Divider />
            <Title level={4}>Select Primary Subject</Title>
            <Paragraph type="secondary">
              Your primary subject will be used for daily questions and will be your main focus area.
            </Paragraph>
            
            <Row gutter={[16, 16]}>
              {selectedSubjects.map((subjectId) => {
                const subject = subjects.find(s => s.id === subjectId);
                if (!subject) return null;
                
                return (
                  <Col xs={12} sm={8} md={6} key={subjectId}>
                    <Card
                      size="small"
                      style={{
                        border: primarySubject === subjectId ? '2px solid #52c41a' : '1px solid #d9d9d9',
                        cursor: 'pointer'
                      }}
                      onClick={() => handlePrimaryChange(subjectId)}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <Checkbox
                          checked={primarySubject === subjectId}
                          onChange={() => handlePrimaryChange(subjectId)}
                        />
                        <Text style={{ marginLeft: '8px' }}>{subject.name}</Text>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        )}

        {/* Summary */}
        {selectedSubjects.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <Divider />
            <Title level={4}>Selection Summary</Title>
            <Space direction="vertical" size="small">
              <Text>
                <strong>Selected Subjects:</strong> {selectedSubjects.length} subjects
              </Text>
              <Text>
                <strong>Primary Subject:</strong> {
                  primarySubject ? subjects.find(s => s.id === primarySubject)?.name : 'None selected'
                }
              </Text>
            </Space>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Space size="large">
            <Button size="large" onClick={() => router.push('/dashboard')}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={selectedSubjects.length === 0}
              loading={saving}
            >
              Save Subjects
            </Button>
          </Space>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        title="Confirm Subject Selection"
        open={showConfirmModal}
        onOk={confirmSave}
        onCancel={() => setShowConfirmModal(false)}
        okText="Confirm"
        cancelText="Cancel"
        confirmLoading={saving}
      >
        <div>
          <Paragraph>
            You are about to save the following subject selection:
          </Paragraph>
          <ul>
            {selectedSubjects.map(subjectId => {
              const subject = subjects.find(s => s.id === subjectId);
              return (
                <li key={subjectId}>
                  {subject?.name} {primarySubject === subjectId && <Text type="success">(Primary)</Text>}
                </li>
              );
            })}
          </ul>
          <Paragraph type="secondary">
            You can modify these selections later from your dashboard.
          </Paragraph>
        </div>
      </Modal>
    </div>
  );
} 