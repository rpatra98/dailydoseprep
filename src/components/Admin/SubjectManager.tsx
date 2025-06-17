'use client';

import { useState, useEffect } from 'react';
import { Card, Button, List, Input, Form, Modal, message, Popconfirm, Typography, Space, Grid } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { useBreakpoint } = Grid;

interface Subject {
  id: string;
  name: string;
  created_at: string;
}

interface SubjectManagerProps {
  onSubjectChange?: () => Promise<void>;
}

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

const SubjectManager = ({ onSubjectChange }: SubjectManagerProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form] = Form.useForm();
  const screens = useBreakpoint();

  // Check if we're on mobile
  const isMobile = screens.xs || !screens.sm;

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subjects');
      
      if (!response.ok) {
        const errorData = await response.json();
        if (isDev) {
          console.error('Error response from API:', errorData);
        }
        
        // Handle authentication errors
        if (response.status === 401) {
          message.error('Your session has expired. Please log out and log back in.');
          // Optionally force logout
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              window.location.href = '/login?error=session_expired';
            }, 2000);
          }
          return;
        }
        
        throw new Error(errorData.error || 'Failed to fetch subjects');
      }
      
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      if (isDev) {
        console.error('Error fetching subjects:', error);
      }
      message.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (isDev) {
          console.error('Error response from API:', errorData);
        }
        throw new Error(errorData.error || 'Failed to delete subject');
      }
      
      message.success('Subject deleted successfully');
      fetchSubjects();
      
      // Notify parent component about the change
      if (onSubjectChange) {
        await onSubjectChange();
      }
    } catch (error) {
      if (isDev) {
        console.error('Error deleting subject:', error);
      }
      message.error('Failed to delete subject');
    }
  };

  const handleSave = async (values: { name: string }) => {
    try {
      if (editingSubject) {
        // Update existing subject
        const response = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: values.name }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (isDev) {
            console.error('Error response from API:', errorData);
          }
          throw new Error(errorData.error || 'Failed to update subject');
        }
        
        message.success('Subject updated successfully');
      } else {
        // Create new subject
        const response = await fetch('/api/subjects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: values.name }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (isDev) {
            console.error('Error response from API:', errorData);
          }
          
          // Handle authentication errors
          if (response.status === 401) {
            message.error('Your session has expired. Please log out and log back in.');
            if (typeof window !== 'undefined') {
              setTimeout(() => {
                window.location.href = '/login?error=session_expired';
              }, 2000);
            }
            return;
          }
          
          throw new Error(errorData.error || 'Failed to create subject');
        }
        
        message.success('Subject created successfully');
      }
      
      setModalVisible(false);
      setEditingSubject(null);
      form.resetFields();
      fetchSubjects();
      
      // Notify parent component about the change
      if (onSubjectChange) {
        await onSubjectChange();
      }
    } catch (error) {
      if (isDev) {
        console.error('Error saving subject:', error);
      }
      message.error('Failed to save subject');
    }
  };

  const openModal = (subject?: Subject) => {
    setEditingSubject(subject || null);
    if (subject) {
      form.setFieldsValue({ name: subject.name });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // Responsive header content
  const headerContent = isMobile ? (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
        Subject Management
      </Title>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => openModal()}
        block
        size="middle"
      >
        Add Subject
      </Button>
    </Space>
  ) : (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <Title level={4} style={{ margin: 0, flex: 1, minWidth: '200px' }}>
        Subject Management
      </Title>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => openModal()}
        size="middle"
      >
        Add Subject
      </Button>
    </div>
  );

  return (
    <Card
      title={headerContent}
      style={{ marginBottom: 24 }}
      bodyStyle={{ padding: isMobile ? '12px' : '24px' }}
    >
      <List
        loading={loading}
        dataSource={subjects}
        renderItem={(subject) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                type="text"
                icon={<EditOutlined />}
                onClick={() => openModal(subject)}
                size={isMobile ? "small" : "middle"}
                title="Edit Subject"
              />,
              <Popconfirm
                key="delete"
                title="Are you sure you want to delete this subject?"
                onConfirm={() => handleDelete(subject.id)}
                okText="Yes"
                cancelText="No"
                placement={isMobile ? "topRight" : "top"}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size={isMobile ? "small" : "middle"}
                  title="Delete Subject"
                />
              </Popconfirm>,
            ]}
            style={{ 
              padding: isMobile ? '8px 0' : '12px 0',
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}
          >
            <List.Item.Meta
              title={
                <span style={{ 
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 500
                }}>
                  {subject.name}
                </span>
              }
              description={
                <span style={{ 
                  fontSize: isMobile ? '12px' : '14px',
                  color: '#666'
                }}>
                  Created: {new Date(subject.created_at).toLocaleDateString()}
                </span>
              }
            />
          </List.Item>
        )}
        locale={{
          emptyText: (
            <div style={{ 
              textAlign: 'center', 
              padding: isMobile ? '20px 10px' : '40px 20px',
              color: '#999'
            }}>
              <Title level={5} style={{ color: '#999', margin: 0 }}>
                No subjects yet
              </Title>
              <p style={{ margin: '8px 0 0 0', fontSize: isMobile ? '12px' : '14px' }}>
                Click "Add Subject" to create your first subject
              </p>
            </div>
          )
        }}
      />

      <Modal
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingSubject(null);
          form.resetFields();
        }}
        footer={null}
        width={isMobile ? '90%' : 520}
        style={{ top: isMobile ? 20 : undefined }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="name"
            label="Subject Name"
            rules={[
              { required: true, message: 'Please enter subject name' },
              { min: 2, message: 'Subject name must be at least 2 characters' },
            ]}
          >
            <Input 
              placeholder="Enter subject name" 
              size={isMobile ? "middle" : "large"}
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingSubject(null);
                  form.resetFields();
                }}
                size={isMobile ? "middle" : "large"}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                size={isMobile ? "middle" : "large"}
              >
                {editingSubject ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SubjectManager; 