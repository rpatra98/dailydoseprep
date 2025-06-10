'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { User, UserRole } from '@/types';
import { 
  Layout, 
  Typography, 
  Button, 
  Card, 
  Form, 
  Input, 
  Alert, 
  Table, 
  Tag, 
  Spin, 
  Row, 
  Col,
  Divider
} from 'antd';
import {
  LogoutOutlined,
  PlusOutlined,
  BookOutlined,
  MailOutlined,
  LockOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const { user, logout, createQAUTHOR } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // For creating new QAUTHOR
  const [creatingAuthor, setCreatingAuthor] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Function to fetch user role and data
    async function fetchData() {
      // Get user ID safely
      const userId = user?.id;
      if (!userId) {
        return;
      }
      
      // 1. Get user role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user role:', userError);
        return;
      }
      
      if (userData?.role) {
        setUserRole(userData.role as UserRole);
        
        // 2. If SUPERADMIN, fetch all users
        if (userData.role === 'SUPERADMIN') {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (usersError) {
            console.error('Error fetching users:', usersError);
            return;
          }
          
          if (usersData) {
            setUsers(usersData as User[]);
          }
        }
      }
    }

    // Call the fetch function
    fetchData();
  }, [user, router]);

  const refreshUsers = async () => {
    if (userRole !== 'SUPERADMIN') return;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error refreshing users:', error);
      return;
    }
    
    if (data) {
      setUsers(data as User[]);
    }
  };

  const handleCreateQAUTHOR = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setCreateError('');
    setCreateSuccess('');
    
    if (!email || !password) {
      setCreateError('Email and password are required');
      return;
    }

    try {
      setCreatingAuthor(true);
      await createQAUTHOR(email, password);
      setCreateSuccess(`QAUTHOR account created for ${email}`);
      form.resetFields();
      
      // Refresh user list
      refreshUsers();
    } catch (error) {
      console.error('Error creating QAUTHOR:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create QAUTHOR');
    } finally {
      setCreatingAuthor(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  // If not logged in, don't render anything (will redirect in useEffect)
  if (!user) {
    return <div style={{ height: '100%', background: '#f0f2f5' }}></div>;
  }

  // If role not fetched yet, render minimal content with loading indicator
  if (!userRole) {
    return (
      <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
          <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
            Sign Out
          </Button>
        </Header>
        <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ textAlign: 'center' }}>
            <Spin tip="Loading user data..." />
            <Paragraph style={{ marginTop: 16 }}>Welcome, {user.email}</Paragraph>
          </Card>
        </Content>
      </Layout>
    );
  }

  // User role-specific dashboard
  if (userRole !== 'SUPERADMIN') {
    return (
      <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
          <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
            Sign Out
          </Button>
        </Header>
        <Content style={{ padding: '24px', flex: 1 }}>
          <Card>
            <Title level={4}>Welcome, {user.email}</Title>
            <Paragraph>
              <Text strong>Your role:</Text> <Tag color={userRole === 'QAUTHOR' ? 'blue' : 'green'}>{userRole}</Tag>
            </Paragraph>
            
            {userRole === 'QAUTHOR' && (
              <div style={{ marginTop: 24 }}>
                <Divider orientation="left">QAUTHOR Features</Divider>
                <Paragraph>
                  As a QAUTHOR, you can create questions for students to practice.
                </Paragraph>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => router.push('/questions/create')}
                >
                  Create Questions
                </Button>
              </div>
            )}

            {userRole === 'STUDENT' && (
              <div style={{ marginTop: 24 }}>
                <Divider orientation="left">Student Features</Divider>
                <Paragraph>
                  As a student, you can practice questions from various competitive exams.
                </Paragraph>
                <Button 
                  type="primary" 
                  icon={<BookOutlined />}
                  onClick={() => router.push('/practice')}
                >
                  Practice Questions
                </Button>
              </div>
            )}
          </Card>
        </Content>
      </Layout>
    );
  }

  // SUPERADMIN Dashboard
  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => {
        let color = 'green';
        if (role === 'SUPERADMIN') color = 'purple';
        if (role === 'QAUTHOR') color = 'blue';
        
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>SUPERADMIN Dashboard</Title>
        <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
          Sign Out
        </Button>
      </Header>
      <Content style={{ padding: '24px', flex: 1 }}>
        <Row gutter={[24, 24]}>
          {/* Create QAUTHOR Section */}
          <Col xs={24} lg={12}>
            <Card title="Create QAUTHOR Account" bordered={false} style={{ height: '100%' }}>
              {createError && (
                <Alert 
                  message={createError} 
                  type="error" 
                  showIcon 
                  style={{ marginBottom: 16 }}
                />
              )}
              
              {createSuccess && (
                <Alert 
                  message={createSuccess} 
                  type="success" 
                  showIcon 
                  style={{ marginBottom: 16 }}
                />
              )}
              
              <Form
                form={form}
                layout="vertical"
                onFinish={handleCreateQAUTHOR}
              >
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please input an email!' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />} 
                    placeholder="Email address" 
                  />
                </Form.Item>
                
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please input a password!' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                  extra="Password must be at least 6 characters."
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="Password" 
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={creatingAuthor}
                    block
                  >
                    Create QAUTHOR
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
          
          {/* User Management Section */}
          <Col xs={24} lg={12}>
            <Card title="User Management" bordered={false} style={{ height: '100%' }}>
              <Table 
                dataSource={users} 
                columns={columns} 
                rowKey="id"
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: "No users found" }}
                scroll={{ y: 320 }}
                size="middle"
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
} 