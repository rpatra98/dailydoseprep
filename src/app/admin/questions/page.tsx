'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';
import { 
  Layout, 
  Typography, 
  Button, 
  Card, 
  Table, 
  Tag,
  Space,
  Modal,
  Tooltip,
  message,
  Spin,
  Alert,
  Grid
} from 'antd';
import { 
  ArrowLeftOutlined,
  EyeOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  BookOutlined
} from '@ant-design/icons';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface User {
  id: string;
  email: string;
  role: UserRole;
}

interface Question {
  id: string;
  title: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  difficulty: string;
  exam_category: string;
  year: number;
  source: string;
  created_at: string;
  subjects?: {
    name: string;
  };
  users?: {
    email: string;
  };
}

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const screens = useBreakpoint();

  // Only log in development
  const isDev = process.env.NODE_ENV === 'development';

  // Add debug logging
  const addDebug = (message: string) => {
    if (isDev) {
      console.log(message);
      setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
    }
  };

  // Handle mounting
  useEffect(() => {
    addDebug('🔄 Admin Questions page mounting...');
    setIsMounted(true);
    addDebug('✅ Admin Questions page mounted');
  }, []);

  // Check authentication and fetch user data
  useEffect(() => {
    if (!isMounted) return;

    const checkAuth = async (retryCount = 0) => {
      try {
        addDebug('🔄 Checking authentication...');
        
        // Check if user is authenticated via session
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          // Retry once in case session is still being established
          if (retryCount === 0) {
            addDebug('⚠️ Auth check failed, retrying in 2 seconds...');
            setTimeout(() => checkAuth(1), 2000);
            return;
          }
          
          addDebug('❌ Not authenticated, redirecting to login');
          router.push('/login');
          return;
        }

        const userData = await response.json();
        addDebug(`✅ User authenticated: ${userData.email} (${userData.role})`);
        
        setUser(userData);
        setUserRole(userData.role);
        
        // Only SUPERADMIN can access this page
        if (userData.role !== 'SUPERADMIN') {
          addDebug('❌ Access denied - not SUPERADMIN');
          router.push('/dashboard');
          return;
        }

        // Fetch all questions
        addDebug('🔄 Fetching questions...');
        await fetchAllQuestions();
        addDebug('✅ Questions loaded');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        addDebug(`❌ Auth error: ${errorMessage}`);
        setError(errorMessage);
        // Redirect to login on auth failure
        setTimeout(() => router.push('/login'), 1000);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [isMounted, router]);

  const fetchAllQuestions = async () => {
    try {
      const response = await fetch('/api/questions', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch questions';
      addDebug(`❌ Failed to fetch questions: ${errorMessage}`);
      setError(errorMessage);
    }
  };

  const handlePreview = (question: Question) => {
    setSelectedQuestion(question);
    setPreviewVisible(true);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Loading questions..." />
        </div>
      </AspectRatioLayout>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Loading questions..." />
          {process.env.NODE_ENV === 'development' && (
            <div style={{ 
              marginTop: 20, 
              fontFamily: 'monospace', 
              fontSize: '12px',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              {debugInfo.slice(-3).map((info, index) => (
                <div key={index} style={{ marginBottom: '4px', color: '#666' }}>
                  {info}
                </div>
              ))}
            </div>
          )}
        </div>
      </AspectRatioLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBackToDashboard}
              style={{ marginRight: 8 }}
            >
              <span className="hidden-mobile">Back</span>
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">All Questions</span>
              <span className="visible-mobile">Questions</span>
            </Title>
          </Header>
          <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card style={{ textAlign: 'center', maxWidth: 500 }}>
              <Alert
                message="Error Loading Questions"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={handleRetry}
              >
                Retry
              </Button>
            </Card>
          </Content>
        </Layout>
      </AspectRatioLayout>
    );
  }

  const isMobile = isMounted ? screens.xs : false;

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text strong>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subjects',
      key: 'subject',
      width: 120,
      render: (subjects: any) => (
        <Tag color="blue">
          {subjects?.name || 'Unknown'}
        </Tag>
      ),
    },
    {
      title: 'Exam Category',
      dataIndex: 'exam_category',
      key: 'exam_category',
      width: 120,
      render: (category: string) => (
        <Tag color="green">{category}</Tag>
      ),
    },
    {
      title: 'Difficulty',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty: string) => {
        const color = difficulty === 'EASY' ? 'green' : difficulty === 'MEDIUM' ? 'orange' : 'red';
        return <Tag color={color}>{difficulty}</Tag>;
      },
    },
    {
      title: 'Created By',
      dataIndex: 'users',
      key: 'created_by',
      width: 150,
      render: (users: any) => (
        <Space>
          <UserOutlined />
          <Text>{users?.email || 'Unknown'}</Text>
        </Space>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          <Text>{new Date(date).toLocaleDateString()}</Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: Question) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handlePreview(record)}
        >
          <span className="hidden-mobile">Preview</span>
        </Button>
      ),
    },
  ];

  return (
    <AspectRatioLayout>
      <Layout className="full-height">
        <Header style={{ 
          background: '#fff', 
          padding: '0 16px', 
          display: 'flex', 
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToDashboard}
            style={{ marginRight: 8 }}
            size={isMobile ? "middle" : "large"}
          >
            <span className="hidden-mobile">Back</span>
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            <span className="hidden-mobile">All Questions</span>
            <span className="visible-mobile">Questions</span>
          </Title>
          <div style={{ marginLeft: 'auto' }}>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchAllQuestions}
              size={isMobile ? "middle" : "large"}
            >
              <span className="hidden-mobile">Refresh</span>
            </Button>
          </div>
        </Header>

        <Content style={{ padding: isMobile ? '16px' : '24px', flex: 1, overflowY: 'auto' }}>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Title level={4}>
                <BookOutlined style={{ marginRight: 8 }} />
                Questions Database ({questions.length} questions)
              </Title>
              <Text type="secondary">
                As SUPERADMIN, you can view all questions created by QAUTHORs to monitor content quality.
              </Text>
            </div>

            <Table
              dataSource={questions}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} questions`,
              }}
              scroll={{ x: 'max-content' }}
              loading={loading}
              locale={{
                emptyText: (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <BookOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <Title level={4} style={{ color: '#999' }}>No Questions Yet</Title>
                    <Text type="secondary">
                      No questions have been created yet. QAUTHORs can create questions from their dashboard.
                    </Text>
                  </div>
                )
              }}
            />
          </Card>

          {/* Question Preview Modal */}
          <Modal
            title="Question Preview"
            open={previewVisible}
            onCancel={() => setPreviewVisible(false)}
            footer={[
              <Button key="close" onClick={() => setPreviewVisible(false)}>
                Close
              </Button>
            ]}
            width={800}
          >
            {selectedQuestion && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Space wrap>
                    <Tag color="blue">{selectedQuestion.subjects?.name || 'Unknown Subject'}</Tag>
                    <Tag color="green">{selectedQuestion.exam_category}</Tag>
                    <Tag color={selectedQuestion.difficulty === 'EASY' ? 'green' : selectedQuestion.difficulty === 'MEDIUM' ? 'orange' : 'red'}>
                      {selectedQuestion.difficulty}
                    </Tag>
                    {selectedQuestion.year && <Tag color="purple">Year: {selectedQuestion.year}</Tag>}
                  </Space>
                </div>

                <Title level={4}>{selectedQuestion.title}</Title>
                <Paragraph style={{ fontSize: '16px', marginBottom: 24 }}>
                  {selectedQuestion.content}
                </Paragraph>

                <div style={{ marginBottom: 24 }}>
                  <Title level={5}>Options:</Title>
                  <div style={{ paddingLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong={selectedQuestion.correct_option === 'A'}>
                        A. {selectedQuestion.option_a}
                        {selectedQuestion.correct_option === 'A' && <Tag color="green" style={{ marginLeft: 8 }}>Correct</Tag>}
                      </Text>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong={selectedQuestion.correct_option === 'B'}>
                        B. {selectedQuestion.option_b}
                        {selectedQuestion.correct_option === 'B' && <Tag color="green" style={{ marginLeft: 8 }}>Correct</Tag>}
                      </Text>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong={selectedQuestion.correct_option === 'C'}>
                        C. {selectedQuestion.option_c}
                        {selectedQuestion.correct_option === 'C' && <Tag color="green" style={{ marginLeft: 8 }}>Correct</Tag>}
                      </Text>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong={selectedQuestion.correct_option === 'D'}>
                        D. {selectedQuestion.option_d}
                        {selectedQuestion.correct_option === 'D' && <Tag color="green" style={{ marginLeft: 8 }}>Correct</Tag>}
                      </Text>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Title level={5}>Explanation:</Title>
                  <Paragraph>{selectedQuestion.explanation}</Paragraph>
                </div>

                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                  <Space>
                    <Text type="secondary">Created by: {selectedQuestion.users?.email || 'Unknown'}</Text>
                    <Text type="secondary">•</Text>
                    <Text type="secondary">Created: {new Date(selectedQuestion.created_at).toLocaleDateString()}</Text>
                    {selectedQuestion.source && (
                      <>
                        <Text type="secondary">•</Text>
                        <Text type="secondary">Source: {selectedQuestion.source}</Text>
                      </>
                    )}
                  </Space>
                </div>
              </div>
            )}
          </Modal>

          {/* Debug Info Panel - Only show in development */}
          {isDev && (
            <Card 
              title="Debug Information"
              size="small"
              style={{ 
                marginTop: 24,
                maxWidth: 600
              }}
            >
              <div style={{ fontFamily: 'monospace', fontSize: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                {debugInfo.map((info, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {info}
                  </div>
                ))}
                {debugInfo.length === 0 && (
                  <div style={{ color: '#999' }}>No debug info yet...</div>
                )}
              </div>
            </Card>
          )}
        </Content>
      </Layout>
    </AspectRatioLayout>
  );
} 