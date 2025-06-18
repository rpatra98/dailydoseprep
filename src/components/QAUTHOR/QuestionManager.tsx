'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Modal, 
  message, 
  Tooltip,
  Typography,
  Popconfirm,
  Alert,
  Spin,
  Result,
  Empty,
  Form,
  Input
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  ReloadOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  UserOutlined
} from '@ant-design/icons';
import { QuestionForm } from '@/components/Question/QuestionForm';

const { Title, Text } = Typography;

interface User {
  id: string;
  email: string;
  role: 'SUPERADMIN' | 'QAUTHOR' | 'STUDENT';
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
    id: string;
    name: string;
  };
}

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

export default function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // New state for secure delete functionality
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteForm] = Form.useForm();

  // New state for edit functionality
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);

  const addDebug = (message: string) => {
    if (isDev) {
      const timestamp = new Date().toLocaleTimeString();
      const logMessage = `[${timestamp}] ${message}`;
      console.log(logMessage);
      setDebugInfo(prev => [...prev.slice(-9), logMessage]);
    }
  };

  // Check authentication and fetch user data
  useEffect(() => {
    setIsMounted(true);
    
    const checkAuth = async () => {
      try {
        addDebug('🔄 Checking QAUTHOR authentication...');
        
        // Check if user is authenticated via session
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          addDebug('❌ Not authenticated');
          setError('Authentication required. Please log out and log back in.');
          return;
        }

        const userData = await response.json();
        addDebug(`✅ User authenticated: ${userData.email} (${userData.role})`);
        
        setUser(userData);
        
        // Only QAUTHORs can use this component
        if (userData.role !== 'QAUTHOR') {
          addDebug('❌ Access denied - not QAUTHOR');
          setError('Access denied. Only QAUTHORs can manage questions.');
          return;
        }

        // Fetch user's questions
        addDebug('🔄 Fetching QAUTHOR questions...');
        await fetchQuestions(userData.id);
        addDebug('✅ Questions loaded');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        addDebug(`❌ Auth error: ${errorMessage}`);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchQuestions = async (userId?: string) => {
    try {
      setError(null);
      addDebug('🔄 Fetching questions from API...');
      
      const response = await fetch('/api/qauthor/questions', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch questions');
      }

      const data = await response.json();
      addDebug(`✅ Questions fetched: ${data.questions?.length || 0} questions`);
      setQuestions(data.questions || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch questions';
      addDebug(`❌ Failed to fetch questions: ${errorMessage}`);
      setError(errorMessage);
    }
  };

  // Secure delete with second factor authentication
  const handleSecureDelete = (question: Question) => {
    setQuestionToDelete(question);
    setDeleteModalVisible(true);
    deleteForm.resetFields();
  };

  const handleDeleteConfirm = async (values: { email: string; password: string }) => {
    if (!questionToDelete || !user) return;

    try {
      setDeleteLoading(true);
      addDebug(`🔄 Attempting secure delete for question: ${questionToDelete.id}`);

      // Verify credentials before deletion
      const authResponse = await fetch('/api/auth/verify-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      if (!authResponse.ok) {
        const authError = await authResponse.json();
        throw new Error(authError.error || 'Invalid credentials');
      }

      const authData = await authResponse.json();
      
      // Verify the authenticated user matches the current user
      if (authData.user.id !== user.id || authData.user.email !== user.email) {
        throw new Error('Authentication failed: User mismatch');
      }

      addDebug('✅ Credentials verified, proceeding with deletion...');

      // Proceed with deletion
      const deleteResponse = await fetch(`/api/qauthor/questions/${questionToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!deleteResponse.ok) {
        const deleteError = await deleteResponse.json();
        throw new Error(deleteError.error || 'Failed to delete question');
      }

      addDebug('✅ Question deleted successfully');
      message.success('Question deleted successfully');
      
      // Close modal and refresh questions
      setDeleteModalVisible(false);
      setQuestionToDelete(null);
      deleteForm.resetFields();
      
      if (user) {
        await fetchQuestions(user.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete question';
      addDebug(`❌ Secure delete failed: ${errorMessage}`);
      message.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalVisible(false);
    setQuestionToDelete(null);
    deleteForm.resetFields();
  };

  const handlePreview = (question: Question) => {
    setSelectedQuestion(question);
    setPreviewVisible(true);
  };

  const handleRefresh = async () => {
    if (user) {
      setLoading(true);
      await fetchQuestions(user.id);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  // Convert database question format to form format
  const convertQuestionForForm = (question: Question) => {
    return {
      id: question.id,
      title: question.title,
      content: question.content,
      optionA: question.option_a,
      optionB: question.option_b,
      optionC: question.option_c,
      optionD: question.option_d,
      correctOption: question.correct_option as 'A' | 'B' | 'C' | 'D',
      explanation: question.explanation,
      difficulty: question.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      examCategory: question.exam_category as 'UPSC' | 'JEE' | 'NEET' | 'SSC' | 'OTHER',
      subject: question.subjects?.id || '',
      year: question.year,
      source: question.source,
      createdBy: '',
      createdAt: new Date(question.created_at),
      updatedAt: new Date()
    };
  };

  // Handle edit question
  const handleEdit = (question: Question) => {
    setQuestionToEdit(question);
    setEditModalVisible(true);
  };

  const handleEditComplete = async (updatedQuestion: any) => {
    addDebug('✅ Question updated successfully');
    setEditModalVisible(false);
    setQuestionToEdit(null);
    
    // Refresh questions list
    if (user) {
      await fetchQuestions(user.id);
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setQuestionToEdit(null);
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Spin size="large" tip="Loading questions..." />
        </div>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            <Title level={4} style={{ margin: 0 }}>My Questions</Title>
          </div>
        }
      >
        <Alert
          message="Error Loading Questions"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <div style={{ textAlign: 'center' }}>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={handleRetry}
          >
            Retry
          </Button>
        </div>
        
        {/* Debug Info Panel - Only show in development */}
        {isDev && debugInfo.length > 0 && (
          <Card 
            title="Debug Information"
            size="small"
            style={{ marginTop: 16 }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '12px', maxHeight: '150px', overflowY: 'auto' }}>
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
      </Card>
    );
  }

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (title: string, record: Question) => (
        <div>
          <Text strong>{title}</Text>
          <br />
          <Text type="secondary" ellipsis style={{ fontSize: '12px' }}>
            {record.content.substring(0, 80)}...
          </Text>
        </div>
      ),
    },
    {
      title: 'Subject',
      dataIndex: ['subjects', 'name'],
      key: 'subject',
      width: 120,
      render: (subject: string) => (
        <Tag color="blue">{subject || 'Unknown'}</Tag>
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
      title: 'Category',
      dataIndex: 'exam_category',
      key: 'exam_category',
      width: 120,
      render: (category: string) => (
        <Tag color="green">{category}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: Question) => (
        <Space>
          <Tooltip title="Preview Question">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handlePreview(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit Question">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Secure Delete Question">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              onClick={() => handleSecureDelete(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>My Questions</Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
            size="small"
          >
            Refresh
          </Button>
        </div>
      }
    >
      <Table
        dataSource={questions}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} questions`,
        }}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <BookOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <Title level={4} style={{ color: '#999' }}>No Questions Yet</Title>
              <Text type="secondary">
                You haven't created any questions yet. Click "Create New Question" to get started.
              </Text>
            </div>
          )
        }}
      />

      {/* Secure Delete Confirmation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <LockOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            <span>Secure Delete Confirmation</span>
          </div>
        }
        open={deleteModalVisible}
        onCancel={handleDeleteCancel}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Alert
          message="Security Verification Required"
          description={`To delete the question "${questionToDelete?.title}", please verify your identity by entering your email and password.`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        <Form
          form={deleteForm}
          layout="vertical"
          onFinish={handleDeleteConfirm}
        >
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter your email address' },
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />}
              placeholder="Enter your email address"
              autoComplete="email"
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </Form.Item>
          
          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                danger 
                htmlType="submit"
                loading={deleteLoading}
                icon={<DeleteOutlined />}
              >
                Confirm Delete
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

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
            <Title level={4}>{selectedQuestion.title}</Title>
            <Text strong>Question:</Text>
            <p>{selectedQuestion.content}</p>

            <div style={{ marginTop: 16 }}>
              <Text strong>Options:</Text>
              <div style={{ marginLeft: 16, marginTop: 8 }}>
                <p><strong>A.</strong> {selectedQuestion.option_a}</p>
                <p><strong>B.</strong> {selectedQuestion.option_b}</p>
                <p><strong>C.</strong> {selectedQuestion.option_c}</p>
                <p><strong>D.</strong> {selectedQuestion.option_d}</p>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>Correct Answer: </Text>
              <Tag color="green">{selectedQuestion.correct_option}</Tag>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>Explanation:</Text>
              <p>{selectedQuestion.explanation}</p>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <Text strong>Difficulty: </Text>
                <Tag color={selectedQuestion.difficulty === 'EASY' ? 'green' : selectedQuestion.difficulty === 'MEDIUM' ? 'orange' : 'red'}>
                  {selectedQuestion.difficulty}
                </Tag>
              </div>
              <div>
                <Text strong>Category: </Text>
                <Tag color="green">{selectedQuestion.exam_category}</Tag>
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

      {/* Edit Question Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <EditOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            <span>Edit Question</span>
          </div>
        }
        open={editModalVisible}
        onCancel={handleEditCancel}
        footer={null}
        width={900}
        destroyOnClose
      >
        {questionToEdit && (
          <QuestionForm
            mode="edit"
            initialData={convertQuestionForForm(questionToEdit)}
            onComplete={handleEditComplete}
            onCancel={handleEditCancel}
          />
        )}
      </Modal>
      
      {/* Debug Info Panel - Only show in development */}
      {debugInfo.length > 0 && (
        <Card 
          title="Debug Information"
          size="small"
          style={{ marginTop: 16 }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: '12px', maxHeight: '150px', overflowY: 'auto' }}>
            {debugInfo.map((info, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                {info}
              </div>
            ))}
          </div>
        </Card>
      )}
    </Card>
  );
} 