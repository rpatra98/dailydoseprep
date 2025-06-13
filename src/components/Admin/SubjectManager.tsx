import { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Popconfirm, 
  message,
  Typography,
  Space,
  Tag,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined 
} from '@ant-design/icons';
import { Subject, ExamCategory } from '@/types';

const { Title } = Typography;

export const SubjectManager = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject> | null>(null);
  const [form] = Form.useForm();
  
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subjects');
      
      if (!response.ok) {
        throw new Error('Failed to fetch subjects');
      }
      
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Don't show an error message for empty subjects, as we'll handle that in the UI
      if (error instanceof Error && error.message !== 'No subjects available') {
        message.error('Failed to load subjects');
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSubjects();
  }, []);
  
  const handleAddNew = () => {
    form.resetFields();
    setCurrentSubject(null);
    setIsEditing(false);
    setIsModalVisible(true);
  };
  
  const handleEdit = (subject: Subject) => {
    form.setFieldsValue({
      name: subject.name
    });
    setCurrentSubject(subject);
    setIsEditing(true);
    setIsModalVisible(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete subject');
      }
      
      message.success('Subject deleted successfully');
      fetchSubjects();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete subject');
    }
  };
  
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (isEditing && currentSubject?.id) {
        // Update existing subject
        const response = await fetch(`/api/subjects/${currentSubject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update subject');
        }
        
        message.success('Subject updated successfully');
      } else {
        // Create new subject
        const response = await fetch('/api/subjects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create subject');
        }
        
        message.success('Subject created successfully');
      }
      
      setIsModalVisible(false);
      fetchSubjects();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to save subject');
    }
  };
  
  const handleModalCancel = () => {
    setIsModalVisible(false);
  };
  
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Exam Category',
      dataIndex: 'examCategory',
      key: 'examCategory',
      render: (text: ExamCategory) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Subject) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this subject?"
            description="This action cannot be undone if the subject has no questions."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4}>Subject Management</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddNew}
        >
          Add New Subject
        </Button>
      </div>
      
      <Table
        dataSource={subjects}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: <Empty description="No subjects available yet" />
        }}
      />
      
      <Modal
        title={isEditing ? 'Edit Subject' : 'Add New Subject'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={isEditing ? 'Update' : 'Create'}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Subject Name"
            rules={[{ required: true, message: 'Please enter subject name' }]}
          >
            <Input placeholder="Enter subject name" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubjectManager; 