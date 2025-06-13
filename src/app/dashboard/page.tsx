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
  Divider,
  message
} from 'antd';
import {
  LogoutOutlined,
  PlusOutlined,
  BookOutlined,
  MailOutlined,
  LockOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import SubjectSelection from '@/components/Auth/SubjectSelection';
import SubjectManager from '@/components/Admin/SubjectManager';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const { user, logout, createQAUTHOR, authInitialized } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // For creating new QAUTHOR
  const [creatingAuthor, setCreatingAuthor] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Handle authentication and data loading
  useEffect(() => {
    console.log('Dashboard useEffect - Auth state:', { 
      authInitialized, 
      userExists: !!user,
      userRole,
      loadAttempts
    });

    // Wait for auth to initialize before doing anything
    if (!authInitialized) {
      console.log('Auth not initialized yet, waiting...');
      return;
    }

    // Redirect if not logged in
    if (!user) {
      console.log('User not logged in, redirecting to login page');
      router.push('/login');
      return;
    }

    // If we have a user but no role yet, fetch user data
    if (user && !userRole) {
      fetchUserData();
    } else {
      // If we have both user and role, we're done loading
      setIsLoading(false);
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading && loadAttempts > 0 && !userRole) {
        console.warn('Loading user data timed out, showing fallback UI');
        setIsLoading(false);
        setLoadError('Failed to load user data. Please try refreshing the page.');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [user, authInitialized, userRole, router, loadAttempts, isLoading]);

  // Function to fetch user role and data
  const fetchUserData = async () => {
    try {
      console.log('Fetching user data for dashboard');
      setIsLoading(true);
      setLoadError(null);
      setLoadAttempts(prev => prev + 1);
      
      // Get user ID safely
      const userId = user?.id;
      if (!userId) {
        console.error('No user ID available for fetching data');
        setLoadError('User ID not available');
        setIsLoading(false);
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
        setLoadError(`Error fetching user role: ${userError.message}`);
        setIsLoading(false);
        return;
      }
      
      if (userData?.role) {
        console.log('User role fetched:', userData.role);
        setUserRole(userData.role as UserRole);
        
        // 2. If SUPERADMIN, fetch all users
        if (userData.role === 'SUPERADMIN') {
          console.log('Fetching all users for SUPERADMIN');
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (usersError) {
            console.error('Error fetching users:', usersError);
            message.error('Failed to load users list');
          } else if (usersData) {
            setUsers(usersData);
            console.log(`Fetched ${usersData.length} users`);
          }
        }
      } else {
        console.warn('User record found but role is missing');
        setLoadError('Your user account is missing role information');
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setLoadError('An unexpected error occurred while loading user data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUsers = async () => {
    if (userRole !== 'SUPERADMIN') return;
    
    try {
      console.log('Refreshing users list');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error refreshing users:', error);
        message.error('Failed to refresh users list');
        return;
      }
      
      if (data) {
        setUsers(data);
        console.log(`Refreshed ${data.length} users`);
        message.success('Users list refreshed');
      }
    } catch (error) {
      console.error('Error in refreshUsers:', error);
      message.error('Failed to refresh users list');
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
      // No need to manually redirect, AuthContext will handle it
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, try to redirect to login page
      router.push('/login');
    }
  };

  const handleRetry = () => {
    console.log('Retrying data fetch');
    fetchUserData();
  };

  // If auth is still initializing or we're loading data, show loading spinner
  if (!authInitialized || isLoading) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: '#f0f2f5' 
      }}>
        <Spin size="large" tip={authInitialized ? "Loading user data..." : "Initializing..."} />
      </div>
    );
  }

  // If not logged in, don't render anything (will redirect in useEffect)
  if (!user) {
    return <div style={{ height: '100%', background: '#f0f2f5' }}></div>;
  }

  // If we have a user but encountered an error or couldn't load role
  if (loadError || (!userRole && loadAttempts > 0)) {
    return (
      <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
          <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
            Sign Out
          </Button>
        </Header>
        <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ textAlign: 'center', maxWidth: 500 }}>
            <Alert
              message="Error Loading Dashboard"
              description={loadError || "Failed to load your user data. Please try again."}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <Paragraph>
              Welcome, {user.email}. We encountered an issue while loading your dashboard.
            </Paragraph>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={handleRetry}
              style={{ marginTop: 16 }}
            >
              Retry
            </Button>
          </Card>
        </Content>
      </Layout>
    );
  }

  // If we have a user but no role yet, show basic loading state (this should rarely happen with the improvements)
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
            <Button 
              type="link" 
              icon={<ReloadOutlined />} 
              onClick={handleRetry}
              style={{ marginTop: 16 }}
            >
              Retry Loading
            </Button>
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