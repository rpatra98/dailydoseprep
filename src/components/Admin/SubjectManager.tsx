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
  Empty,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ReloadOutlined 
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      console.log('Fetching subjects...');
      const response = await fetch('/api/subjects', {
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to fetch subjects');
      }
      
      const data = await response.json();
      console.log('Subjects fetched successfully:', data.length);
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load subjects');
      message.error('Failed to load subjects');
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
      setErrorMessage(null);
      console.log(`Deleting subject ${id}...`);
      
      const response = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to delete subject');
      }
      
      console.log(`Subject ${id} deleted successfully`);
      message.success('Subject deleted successfully');
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete subject');
      message.error(error instanceof Error ? error.message : 'Failed to delete subject');
    }
  };
  
  const handleModalOk = async () => {
    try {
      setErrorMessage(null);
      const values = await form.validateFields();
      
      if (isEditing && currentSubject?.id) {
        // Update existing subject
        console.log(`Updating subject ${currentSubject.id}...`);
        const response = await fetch(`/api/subjects/${currentSubject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify(values),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response from API:', errorData);
          throw new Error(errorData.error || errorData.details || 'Failed to update subject');
        }
        
        console.log(`Subject ${currentSubject.id} updated successfully`);
        message.success('Subject updated successfully');
      } else {
        // Create new subject
        console.log('Creating new subject...');
        const response = await fetch('/api/subjects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify(values),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response from API:', errorData);
          throw new Error(errorData.error || errorData.details || 'Failed to create subject');
        }
        
        console.log('Subject created successfully');
        message.success('Subject created successfully');
      }
      
      setIsModalVisible(false);
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save subject');
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
        <Space>
          <Button
            onClick={fetchSubjects}
            icon={<ReloadOutlined />}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddNew}
          >
            Add New Subject
          </Button>
        </Space>
      </div>
      
      {errorMessage && (
        <Alert
          message="Error"
          description={errorMessage}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMessage(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      
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