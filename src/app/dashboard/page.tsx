'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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
  message,
  Statistic
} from 'antd';
import { 
  LogoutOutlined, 
  UserAddOutlined, 
  BookOutlined, 
  PlusOutlined,
  ReloadOutlined,
  MailOutlined,
  LockOutlined,
  DatabaseOutlined,
  TeamOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import SubjectSelection from '@/components/Auth/SubjectSelection';
import SubjectManager from '@/components/Admin/SubjectManager';
import QuestionManager from '@/components/QAUTHOR/QuestionManager';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

interface SystemStats {
  totalUsers: number;
  totalQAuthors: number;
  totalStudents: number;
  totalSubjects: number;
  totalQuestions: number;
  questionsPerSubject: { [key: string]: number };
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [form] = Form.useForm();

  // Add debug logging
  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Handle mounting
  useEffect(() => {
    addDebug('🔄 Dashboard mounting...');
    setIsMounted(true);
    addDebug('✅ Dashboard mounted');
  }, []);

  // Check authentication and fetch user data
  useEffect(() => {
    if (!isMounted) return;

    const checkAuth = async (retryCount = 0) => {
      try {
        addDebug('🔄 Checking authentication...');
        
        // Check if user is authenticated via session
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          // Retry once in case session is still being established
          if (retryCount === 0) {
            addDebug('⚠️ Auth check failed, retrying in 2 seconds...');
            setTimeout(() => checkAuth(1), 2000);
            return;
          }
          
          addDebug('❌ Not authenticated, redirecting to login');
          router.push('/login');
          return;
        }

        const userData = await response.json();
        addDebug(`✅ User authenticated: ${userData.email} (${userData.role})`);
        
        setUser(userData);
        setUserRole(userData.role);
        
        // If SUPERADMIN, fetch additional data
        if (userData.role === 'SUPERADMIN') {
          addDebug('🔄 Fetching admin data...');
          await Promise.all([
            fetchAllUsers(),
            fetchSystemStats()
          ]);
          addDebug('✅ Admin data loaded');
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        addDebug(`❌ Auth error: ${errorMessage}`);
        setLoadError(errorMessage);
        // Redirect to login on auth failure
        setTimeout(() => router.push('/login'), 1000);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isMounted, router]);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const usersData = await response.json();
        setAllUsers(usersData || []);
      }
    } catch (error) {
      addDebug(`⚠️ Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const stats = await response.json();
        setSystemStats(stats);
      }
    } catch (error) {
      addDebug(`⚠️ Failed to fetch stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSignOut = async () => {
    try {
      addDebug('🔄 Signing out...');
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        addDebug('✅ Signed out successfully');
        router.push('/');
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      addDebug(`❌ Logout error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      message.error('Failed to sign out');
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    window.location.reload();
  };

  const handleCreateQAUTHOR = async (values: { email: string; password: string }) => {
    try {
      setCreateLoading(true);
      addDebug(`🔄 Creating QAUTHOR: ${values.email}`);
      
      const response = await fetch('/api/admin/create-qauthor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      
      if (response.ok) {
        const result = await response.json();
        addDebug('✅ QAUTHOR created successfully');
        message.success(`QAUTHOR account created successfully for ${values.email}`);
        form.resetFields();
        fetchAllUsers(); // Refresh the users list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create QAUTHOR');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create QAUTHOR';
      addDebug(`❌ QAUTHOR creation failed: ${errorMessage}`);
      message.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5',
        flexDirection: 'column'
      }}>
        <Spin size="large" tip="Loading your dashboard..." />
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: 20, 
            fontFamily: 'monospace', 
            fontSize: '12px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            {debugInfo.slice(-3).map((info, index) => (
              <div key={index} style={{ marginBottom: '4px', color: '#666' }}>
                {info}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <Card style={{ maxWidth: 500, textAlign: 'center' }}>
          <Alert
            message="Dashboard Error"
            description={loadError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={handleRetry}
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // Show dashboard content
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 24px'
      }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            Daily Dose Prep Dashboard
          </Title>
          {user && (
            <Text type="secondary">
              Welcome, {user.email} 
              <Tag color={userRole === 'SUPERADMIN' ? 'red' : userRole === 'QAUTHOR' ? 'blue' : 'green'} 
                   style={{ marginLeft: 8 }}>
                {userRole}
              </Tag>
            </Text>
          )}
        </div>
        <Button 
          type="primary" 
          danger
          icon={<LogoutOutlined />}
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </Header>

      <Content style={{ padding: '24px', backgroundColor: '#f5f5f5' }}>
        {userRole === 'SUPERADMIN' && (
          <div>
            <Title level={2}>System Administration</Title>
            <Paragraph>
              Manage the entire system, create QAUTHOR accounts, and monitor system statistics.
            </Paragraph>

            {/* System Statistics */}
            {systemStats && (
              <Card title="System Statistics" style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic 
                      title="Total Users" 
                      value={systemStats.totalUsers} 
                      prefix={<TeamOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="QAUTHORs" 
                      value={systemStats.totalQAuthors} 
                      prefix={<UserAddOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="Students" 
                      value={systemStats.totalStudents} 
                      prefix={<TeamOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="Subjects" 
                      value={systemStats.totalSubjects} 
                      prefix={<BookOutlined />}
                    />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={6}>
                    <Statistic 
                      title="Total Questions" 
                      value={systemStats.totalQuestions} 
                      prefix={<FileTextOutlined />}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* Create QAUTHOR Account */}
            <Card title="Create QAUTHOR Account" style={{ marginBottom: 24 }}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleCreateQAUTHOR}
                style={{ maxWidth: 400 }}
              >
                <Form.Item
                  name="email"
                  label="Email Address"
                  rules={[
                    { required: true, message: 'Please enter email address' },
                    { type: 'email', message: 'Please enter a valid email address' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />} 
                    placeholder="Enter QAUTHOR email"
                  />
                </Form.Item>
                
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="Enter password"
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={createLoading}
                    icon={<UserAddOutlined />}
                  >
                    Create QAUTHOR Account
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Subject Management */}
            <Card title="Subject Management" style={{ marginBottom: 24 }}>
              <SubjectManager />
            </Card>

            {/* All Users Table */}
            <Card title="All Users">
              <Table
                dataSource={allUsers}
                rowKey="id"
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
                    render: (role: UserRole) => (
                      <Tag color={role === 'SUPERADMIN' ? 'red' : role === 'QAUTHOR' ? 'blue' : 'green'}>
                        {role}
                      </Tag>
                    )
                  },
                  {
                    title: 'Created At',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date: string) => new Date(date).toLocaleDateString()
                  }
                ]}
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </div>
        )}

        {userRole === 'QAUTHOR' && (
          <div>
            <Title level={2}>Question Author Dashboard</Title>
            <Paragraph>
              Create and manage questions for the daily dose preparation system.
            </Paragraph>

            <Card title="Question Management">
              <QuestionManager />
            </Card>
          </div>
        )}

        {userRole === 'STUDENT' && (
          <div>
            <Title level={2}>Student Dashboard</Title>
            <Paragraph>
              Welcome to your learning dashboard. Select subjects and start your daily dose preparation.
            </Paragraph>

                         <Card title="Subject Selection">
               {user && <SubjectSelection userId={user.id} />}
             </Card>

            <Card title="Quick Actions" style={{ marginTop: 24 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Link href="/daily-questions">
                    <Button type="primary" size="large" block icon={<BookOutlined />}>
                      Daily Questions
                    </Button>
                  </Link>
                </Col>
                <Col span={8}>
                  <Link href="/create-question">
                    <Button size="large" block icon={<PlusOutlined />}>
                      Practice Mode
                    </Button>
                  </Link>
                </Col>
                <Col span={8}>
                  <Button size="large" block icon={<DatabaseOutlined />}>
                    Progress Tracking
                  </Button>
                </Col>
              </Row>
            </Card>
          </div>
        )}

        {/* Debug Info Panel - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <Card 
            title="Debug Information"
            size="small"
            style={{ 
              marginTop: 24,
              maxWidth: 600
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '12px', maxHeight: '200px', overflowY: 'auto' }}>
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
      </Content>
    </Layout>
  );
} 