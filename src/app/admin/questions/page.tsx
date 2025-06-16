'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase-browser';
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
  Alert
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
const { Title, Text } = Typography;

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
  const { user, authInitialized } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (authInitialized && !user) {
      router.push('/login');
    }
  }, [user, router, authInitialized]);

  // Check user role and fetch data
  useEffect(() => {
    if (!user || !authInitialized) return;

    const checkRoleAndFetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user role
        const supabase = getBrowserClient();
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (userError) {
          throw new Error(`Failed to load user data: ${userError.message}`);
        }
        
        if (!userData) {
          throw new Error('User not found in database');
        }
        
        const role = userData.role as UserRole;
        setUserRole(role);
        
        // Only SUPERADMIN can access this page
        if (role !== 'SUPERADMIN') {
          router.push('/dashboard');
          return;
        }

        // Fetch all questions with QAUTHOR and subject details
        await fetchAllQuestions();
        
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    checkRoleAndFetchData();
  }, [user, authInitialized, router]);

  const fetchAllQuestions = async () => {
    try {
      const supabase = getBrowserClient();
      
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          subjects (
            name
          ),
          users (
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Failed to fetch questions: ' + error.message);
      }

      setQuestions(data || []);
    } catch (error) {
      message.error('Failed to fetch questions');
      setError(error instanceof Error ? error.message : 'Failed to fetch questions');
    }
  };

  const handlePreview = (question: Question) => {
    setSelectedQuestion(question);
    setPreviewVisible(true);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  // Show loading while checking auth
  if (!authInitialized || loading) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Loading questions..." />
        </div>
      </AspectRatioLayout>
    );
  }

  // Show error if any
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
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </Card>
          </Content>
        </Layout>
      </AspectRatioLayout>
    );
  }

  // Redirect non-SUPERADMIN users
  if (userRole !== 'SUPERADMIN') {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Redirecting..." />
        </div>
      </AspectRatioLayout>
    );
  }

  const columns = [
    {
      title: 'Question',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Question) => (
        <div>
          <Text strong>{title}</Text>
          <br />
          <Text type="secondary" ellipsis style={{ fontSize: '12px' }}>
            {record.content.substring(0, 80)}...
          </Text>
        </div>
      ),
      width: 300,
    },
    {
      title: 'Subject',
      dataIndex: ['subjects', 'name'],
      key: 'subject',
      render: (subject: string) => (
        <Tag color="blue" icon={<BookOutlined />}>
          {subject || 'Unknown'}
        </Tag>
      ),
      width: 120,
    },
    {
      title: 'QAUTHOR',
      dataIndex: ['users', 'email'],
      key: 'qauthor',
      render: (email: string) => (
        <Tag color="purple" icon={<UserOutlined />}>
          {email ? email.split('@')[0] : 'Unknown'}
        </Tag>
      ),
      width: 150,
    },
    {
      title: 'Difficulty',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: string) => {
        const color = difficulty === 'EASY' ? 'green' : difficulty === 'MEDIUM' ? 'orange' : 'red';
        return <Tag color={color}>{difficulty}</Tag>;
      },
      width: 100,
    },
    {
      title: 'Category',
      dataIndex: 'exam_category',
      key: 'exam_category',
      render: (category: string) => (
        <Tag>{category}</Tag>
      ),
      width: 100,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <div>
          <CalendarOutlined style={{ marginRight: 4 }} />
          <Text style={{ fontSize: '12px' }}>
            {new Date(date).toLocaleDateString()}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(date).toLocaleTimeString()}
          </Text>
        </div>
      ),
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Question) => (
        <Space>
          <Tooltip title="Preview Question">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
        </Space>
      ),
      width: 80,
    },
  ];

  return (
    <AspectRatioLayout>
      <Layout className="full-height">
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
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
          </div>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchAllQuestions}
            loading={loading}
          >
            <span className="hidden-mobile">Refresh</span>
          </Button>
        </Header>
        <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Title level={4}>Questions Overview</Title>
              <Text type="secondary">
                Monitor all questions created by QAUTHORs. Total questions: {questions.length}
              </Text>
            </div>
            
            <Table
              dataSource={questions}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} questions`,
              }}
              scroll={{ x: 'max-content' }}
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
                <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                  <Space>
                    <Tag color="purple" icon={<UserOutlined />}>
                      {selectedQuestion.users?.email?.split('@')[0] || 'Unknown QAUTHOR'}
                    </Tag>
                    <Tag color="blue" icon={<BookOutlined />}>
                      {selectedQuestion.subjects?.name || 'Unknown Subject'}
                    </Tag>
                    <Tag icon={<CalendarOutlined />}>
                      {new Date(selectedQuestion.created_at).toLocaleString()}
                    </Tag>
                  </Space>
                </div>

                <Title level={5}>{selectedQuestion.title}</Title>
                <Text>{selectedQuestion.content}</Text>
                
                <div style={{ marginTop: 16 }}>
                  <Text strong>Options:</Text>
                  <ul style={{ marginTop: 8 }}>
                    <li>A. {selectedQuestion.option_a}</li>
                    <li>B. {selectedQuestion.option_b}</li>
                    <li>C. {selectedQuestion.option_c}</li>
                    <li>D. {selectedQuestion.option_d}</li>
                  </ul>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Text strong>Correct Answer: </Text>
                  <Tag color="green">{selectedQuestion.correct_option}</Tag>
                </div>

                {selectedQuestion.explanation && (
                  <div style={{ marginTop: 16 }}>
                    <Text strong>Explanation:</Text>
                    <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                      <Text>{selectedQuestion.explanation}</Text>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <Text strong>Difficulty: </Text>
                    <Tag color={selectedQuestion.difficulty === 'EASY' ? 'green' : selectedQuestion.difficulty === 'MEDIUM' ? 'orange' : 'red'}>
                      {selectedQuestion.difficulty}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Category: </Text>
                    <Tag>{selectedQuestion.exam_category}</Tag>
                  </div>
                  {selectedQuestion.year && (
                    <div>
                      <Text strong>Year: </Text>
                      <Tag>{selectedQuestion.year}</Tag>
                    </div>
                  )}
                </div>

                {selectedQuestion.source && (
                  <div style={{ marginTop: 16 }}>
                    <Text strong>Source: </Text>
                    <Text>{selectedQuestion.source}</Text>
                  </div>
                )}
              </div>
            )}
          </Modal>
        </Content>
      </Layout>
    </AspectRatioLayout>
  );
} 