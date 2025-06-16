'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { UserRole } from '@/types';
import { 
  Layout, 
  Typography, 
  Button, 
  Card, 
  Spin, 
  Alert, 
  Divider, 
  Row, 
  Col, 
  Tag,
  Form,
  Input,
  Table,
  message
} from 'antd';
import { 
  LogoutOutlined, 
  UserAddOutlined, 
  BookOutlined, 
  PlusOutlined,
  ReloadOutlined,
  MailOutlined,
  LockOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import SubjectSelection from '@/components/Auth/SubjectSelection';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const { user, logout, authInitialized } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  // Redirect if not logged in
  useEffect(() => {
    if (authInitialized && !user) {
      console.log('No user found, redirecting to login');
      router.push('/login');
    }
  }, [user, router, authInitialized]);

  // Fetch user role and additional data
  useEffect(() => {
    if (!user || !authInitialized) return;

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        console.log('Fetching user data for:', user.id);
        
        // Get user role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (userError) {
          console.error('Error fetching user role:', userError);
          throw new Error(`Failed to load user data: ${userError.message}`);
        }
        
        if (!userData) {
          throw new Error('User not found in database');
        }
        
        const role = userData.role as UserRole;
        setUserRole(role);
        console.log('User role:', role);
        
        // If SUPERADMIN, fetch all users
        if (role === 'SUPERADMIN') {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email, role, created_at')
            .order('created_at', { ascending: false });
            
          if (usersError) {
            console.error('Error fetching users:', usersError);
          } else {
            setAllUsers(usersData || []);
          }
        }
        
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, authInitialized]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const handleRetry = () => {
    window.location.reload();
  };

  const handleCreateQAUTHOR = async (values: { email: string; password: string }) => {
    try {
      setCreateLoading(true);
      
      // Register new user as QAUTHOR
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      
      if (authError) {
        message.error(`Failed to create account: ${authError.message}`);
        return;
      }
      
      if (authData.user) {
        // Insert user with QAUTHOR role
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: values.email,
              role: 'QAUTHOR'
            }
          ]);
        
        if (insertError) {
          message.error(`Failed to set user role: ${insertError.message}`);
          return;
        }
        
        message.success('QAUTHOR account created successfully!');
        form.resetFields();
        
        // Refresh users list
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, role, created_at')
          .order('created_at', { ascending: false });
        
        if (usersData) {
          setAllUsers(usersData);
        }
      }
    } catch (error) {
      console.error('Error creating QAUTHOR:', error);
      message.error('Failed to create QAUTHOR account');
    } finally {
      setCreateLoading(false);
    }
  };

  // If auth is still initializing or we're loading data, show loading spinner
  if (!authInitialized || isLoading) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip={authInitialized ? "Loading user data..." : "Initializing..."} />
        </div>
      </AspectRatioLayout>
    );
  }

  // If not logged in, don't render anything (will redirect in useEffect)
  if (!user) {
    return (
      <AspectRatioLayout>
        <div className="full-height" style={{ background: '#f0f2f5' }}></div>
      </AspectRatioLayout>
    );
  }

  // If we have a user but encountered an error or couldn't load role
  if (loadError) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
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
      </AspectRatioLayout>
    );
  }

  // QAUTHOR Dashboard
  if (userRole === 'QAUTHOR') {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>QAUTHOR Dashboard</Title>
            <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
              Sign Out
            </Button>
          </Header>
          <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <Card>
              <Title level={2}>Welcome, Question Author!</Title>
              <Paragraph>
                As a Question Author, you can create questions for students. Your questions will be reviewed and made available to students in their daily question practice.
              </Paragraph>
              <Divider />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                size="large"
                onClick={() => router.push('/create-question')}
              >
                Create New Question
              </Button>
            </Card>
          </Content>
        </Layout>
      </AspectRatioLayout>
    );
  }

  // STUDENT Dashboard
  if (userRole === 'STUDENT') {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>Student Dashboard</Title>
            <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
              Sign Out
            </Button>
          </Header>
          <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <Card>
              <Title level={2}>Welcome to Daily Dose Prep!</Title>
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
            </Card>
          </Content>
        </Layout>
      </AspectRatioLayout>
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
    <AspectRatioLayout>
      <Layout className="full-height">
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
                      icon={<UserAddOutlined />}
                      loading={createLoading}
                    >
                      Create QAUTHOR
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card title="Quick Actions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Link href="/create-question">
                    <Button type="primary" icon={<PlusOutlined />} block>
                      Create Question
                    </Button>
                  </Link>
                  <Link href="/daily-questions">
                    <Button icon={<BookOutlined />} block>
                      View Questions
                    </Button>
                  </Link>
                </div>
              </Card>
            </Col>
          </Row>
          
          <Card title="All Users" style={{ marginTop: 16 }}>
            <Table 
              dataSource={allUsers} 
              columns={columns} 
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Content>
      </Layout>
    </AspectRatioLayout>
  );
} 