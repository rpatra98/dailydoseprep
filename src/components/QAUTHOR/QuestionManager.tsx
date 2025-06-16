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
  Popconfirm
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { getBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/context/AuthContext';

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
}

export default function QuestionManager() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (user) {
      fetchQuestions();
    }
  }, [user]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const supabase = getBrowserClient();
      
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          subjects (
            name
          )
        `)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        message.error('Failed to fetch questions: ' + error.message);
        return;
      }

      setQuestions(data || []);
    } catch (error) {
      message.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      const supabase = getBrowserClient();
      
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)
        .eq('created_by', user?.id); // Ensure user can only delete their own questions

      if (error) {
        message.error('Failed to delete question: ' + error.message);
        return;
      }

      message.success('Question deleted successfully');
      fetchQuestions(); // Refresh the list
    } catch (error) {
      message.error('Failed to delete question');
    }
  };

  const handlePreview = (question: Question) => {
    setSelectedQuestion(question);
    setPreviewVisible(true);
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Question) => (
        <div>
          <Text strong>{title}</Text>
          <br />
          <Text type="secondary" ellipsis style={{ fontSize: '12px' }}>
            {record.content.substring(0, 100)}...
          </Text>
        </div>
      ),
    },
    {
      title: 'Subject',
      dataIndex: ['subjects', 'name'],
      key: 'subject',
      render: (subject: string) => (
        <Tag color="blue">{subject || 'Unknown'}</Tag>
      ),
    },
    {
      title: 'Difficulty',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: string) => {
        const color = difficulty === 'EASY' ? 'green' : difficulty === 'MEDIUM' ? 'orange' : 'red';
        return <Tag color={color}>{difficulty}</Tag>;
      },
    },
    {
      title: 'Category',
      dataIndex: 'exam_category',
      key: 'exam_category',
      render: (category: string) => (
        <Tag>{category}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
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
          <Popconfirm
            title="Delete Question"
            description="Are you sure you want to delete this question?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Question">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
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
            onClick={fetchQuestions}
            loading={loading}
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
      />

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

            <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
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
    </Card>
  );
} 