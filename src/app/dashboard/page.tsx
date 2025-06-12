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
import SubjectSelection from '@/components/Auth/SubjectSelection';
import SubjectManager from '@/components/Admin/SubjectManager';

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
            setUsers(usersData);
          }
        }
        
        // Log for debugging
        console.log('User role set to:', userData.role);
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
      setUsers(data);
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
      
      // Create the QAUTHOR account
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
    try {
      console.log('Attempting to sign out');
      await logout();
      console.log('Sign out successful, redirecting to login');
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, try to redirect to login page
      router.push('/login');
    }
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
          <Title level={3} style={{ margin: 0 }}>{userRole === 'QAUTHOR' ? 'QAUTHOR Dashboard' : 'Student Dashboard'}</Title>
          <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
            Sign Out
          </Button>
        </Header>
        <Content style={{ padding: '24px', flex: 1 }}>
          <Card>
            <Title level={4}>Welcome, {user.email}</Title>
            
            {/* QAUTHOR Dashboard Content */}
            {userRole === 'QAUTHOR' && (
              <>
                <Text>
                  As a QAUTHOR, you can create questions for students to practice with.
                  Each question you create will be added to the subject database and made available to students.
                </Text>
                <div style={{ marginTop: 24 }}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="large"
                    onClick={() => router.push('/create-question')}
                  >
                    Create New Question
                  </Button>
                </div>
              </>
            )}
            
            {/* STUDENT Dashboard Content */}
            {userRole === 'STUDENT' && (
              <>
                <Text>
                  As a student, you'll receive 10 new questions daily at 6am from your primary subject.
                  Select your primary subject to start practicing.
                </Text>
                <div style={{ marginTop: 24 }}>
                  {user && <SubjectSelection userId={user.id} />}
                </div>
                <Divider />
                <Button 
                  type="primary" 
                  icon={<BookOutlined />}
                  size="large"
                  onClick={() => router.push('/daily-questions')}
                >
                  View Today's Questions
                </Button>
              </>
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
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'N/A',
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
      <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="User Management">
              <Title level={4}>Create QAUTHOR Account</Title>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleCreateQAUTHOR}
              >
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter an email address' },
                    { type: 'email', message: 'Please enter a valid email address' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="Enter email address" />
                </Form.Item>
                
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter a password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="Enter password" />
                </Form.Item>
                
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={creatingAuthor}
                    icon={<PlusOutlined />}
                  >
                    Create QAUTHOR
                  </Button>
                </Form.Item>
              </Form>
              
              {createError && (
                <Alert
                  message="Error"
                  description={createError}
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              
              {createSuccess && (
                <Alert
                  message="Success"
                  description={createSuccess}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              
              <Divider />
              
              <Title level={4}>User Accounts</Title>
              <Table
                dataSource={users}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Email',
                    dataIndex: 'email',
                    key: 'email',
                  },
                  {
                    title: 'Role',
                    dataIndex: 'role',
                    key: 'role',
                    render: (role) => (
                      <Tag color={
                        role === 'SUPERADMIN' ? 'red' :
                        role === 'QAUTHOR' ? 'blue' :
                        'green'
                      }>
                        {role}
                      </Tag>
                    )
                  },
                  {
                    title: 'Created At',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date) => new Date(date).toLocaleString()
                  }
                ]}
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card title="System Statistics">
              <Paragraph>
                <Text strong>Total Users:</Text> {users.length}
              </Paragraph>
              <Paragraph>
                <Text strong>QAUTHORs:</Text> {users.filter(u => u.role === 'QAUTHOR').length}
              </Paragraph>
              <Paragraph>
                <Text strong>Students:</Text> {users.filter(u => u.role === 'STUDENT').length}
              </Paragraph>
            </Card>
          </Col>
          
          <Col xs={24}>
            <Card title="Subject Management">
              <SubjectManager />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
} 