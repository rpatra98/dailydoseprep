'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  Statistic,
  Grid
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
  FileTextOutlined,
  WarningOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import SubjectSelection from '@/components/Auth/SubjectSelection';
import SubjectManager from '@/components/Admin/SubjectManager';
import QuestionManager from '@/components/QAUTHOR/QuestionManager';
import AspectRatioLayout from '@/components/AspectRatioLayout';
import EnhancedStudentDashboard from '@/components/Student/EnhancedStudentDashboard';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

interface SystemStats {
  totalUsers: number;
  totalQAuthors: number;
  totalStudents: number;
  totalSubjects: number;
  totalQuestions: number;
  questionsPerSubject: { [key: string]: number };
}

interface DashboardUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, signOut, initialized } = useAuth();
  const [dashboardState, setDashboardState] = useState<'loading' | 'ready' | 'error' | 'unauthorized'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<DashboardUser[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [form] = Form.useForm();
  const screens = useBreakpoint();

  // Helper function for debug logging
  const log = (message: string, data?: any) => {
    if (isDev) {
      console.log(`[Dashboard] ${message}`, data || '');
    }
  };

  // Validate user role and permissions
  const validateUserAccess = (user: any): boolean => {
    if (!user || !user.role || !user.email || !user.id) {
      log('❌ Invalid user object:', user);
      return false;
    }

    const validRoles: UserRole[] = ['SUPERADMIN', 'QAUTHOR', 'STUDENT'];
    if (!validRoles.includes(user.role)) {
      log('❌ Invalid user role:', user.role);
      return false;
    }

    log('✅ User validation passed:', { email: user.email, role: user.role });
    return true;
  };

  // Fetch all users for SUPERADMIN
  const fetchAllUsers = async (): Promise<void> => {
    try {
      log('🔄 Fetching all users...');
      const response = await fetch(`/api/admin/users?t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const usersData = await response.json();
      if (Array.isArray(usersData)) {
        setAllUsers(usersData);
        log('✅ Users fetched successfully:', usersData.length);
      } else {
        throw new Error('Invalid users data format');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
      log('❌ Error fetching users:', errorMessage);
      throw error;
    }
  };

  // Fetch system statistics for SUPERADMIN
  const fetchSystemStats = async (): Promise<void> => {
    try {
      setStatsLoading(true);
      log('🔄 Fetching system stats...');
      
      const response = await fetch(`/api/admin/stats?t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
      }

      const stats = await response.json();
      setSystemStats(stats);
      log('✅ Stats fetched successfully:', stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
      log('❌ Error fetching stats:', errorMessage);
      throw error;
    } finally {
      setStatsLoading(false);
    }
  };

  // Initialize dashboard data based on user role
  const initializeDashboard = async (user: any): Promise<void> => {
    try {
      log('🔄 Initializing dashboard for user:', { email: user.email, role: user.role });

      if (user.role === 'SUPERADMIN') {
        log('🔄 Loading SUPERADMIN dashboard data...');
        await Promise.all([fetchAllUsers(), fetchSystemStats()]);
        log('✅ SUPERADMIN dashboard data loaded');
      } else if (user.role === 'QAUTHOR') {
        log('✅ QAUTHOR dashboard initialized');
      } else if (user.role === 'STUDENT') {
        log('✅ STUDENT dashboard initialized');
      }

      setDashboardState('ready');
      log('✅ Dashboard initialization complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize dashboard';
      log('❌ Dashboard initialization error:', errorMessage);
      setError(errorMessage);
      setDashboardState('error');
    }
  };

  // Main effect to handle authentication and dashboard loading
  useEffect(() => {
    const handleDashboardLoad = async () => {
      try {
        log('🔄 Dashboard effect triggered:', { 
          initialized, 
          authLoading, 
          hasUser: !!user,
          userEmail: user?.email,
          userRole: user?.role
        });

        // Wait for auth to initialize
        if (!initialized) {
          log('⏳ Waiting for auth initialization...');
          setDashboardState('loading');
          return;
        }

        // If still loading auth, wait
        if (authLoading) {
          log('⏳ Auth still loading...');
          setDashboardState('loading');
          return;
        }

        // If no user, redirect to login
        if (!user) {
          log('❌ No authenticated user, redirecting to login');
          setDashboardState('unauthorized');
          router.push('/login');
          return;
        }

        // Validate user data
        if (!validateUserAccess(user)) {
          log('❌ User validation failed');
          setError('Invalid user data. Please sign in again.');
          setDashboardState('error');
          return;
        }

        // Initialize dashboard based on role
        await initializeDashboard(user);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Dashboard loading failed';
        log('❌ Dashboard loading error:', errorMessage);
        setError(errorMessage);
        setDashboardState('error');
      }
    };

    handleDashboardLoad();
  }, [initialized, authLoading, user, router]);

  // Handle sign out
  const handleSignOut = async (): Promise<void> => {
    try {
      log('🔄 Signing out...');
      await signOut();
      log('✅ Sign out successful');
      router.push('/login');
    } catch (error) {
      log('❌ Sign out error:', error);
      message.error('Failed to sign out');
    }
  };

  // Handle retry
  const handleRetry = (): void => {
    log('🔄 Retrying dashboard load...');
    setError(null);
    setDashboardState('loading');
    if (user) {
      initializeDashboard(user);
    }
  };

  // Handle QAUTHOR creation
  const handleCreateQAUTHOR = async (values: { email: string; password: string }): Promise<void> => {
    try {
      setCreateLoading(true);
      log('🔄 Creating QAUTHOR:', values.email);

      const response = await fetch('/api/admin/create-qauthor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (response.ok) {
        message.success(`QAUTHOR account created successfully for ${values.email}`);
        form.resetFields();
        await Promise.all([fetchAllUsers(), fetchSystemStats()]);
        log('✅ QAUTHOR created successfully');
      } else if (response.status === 409) {
        message.warning(result.message || 'User already exists with this email');
        log('⚠️ QAUTHOR creation conflict:', result.message);
      } else {
        throw new Error(result.message || 'Failed to create QAUTHOR');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create QAUTHOR';
      log('❌ QAUTHOR creation error:', errorMessage);
      message.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle subject changes
  const handleSubjectChange = async (): Promise<void> => {
    if (user?.role === 'SUPERADMIN') {
      await fetchSystemStats();
    }
  };

  // Loading state
  if (dashboardState === 'loading') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" tip="Loading dashboard..." />
        <Text type="secondary">
          {!initialized ? 'Initializing authentication...' : 
           authLoading ? 'Loading user data...' : 
           'Setting up dashboard...'}
        </Text>
      </div>
    );
  }

  // Error state
  if (dashboardState === 'error') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <Alert
          message="Dashboard Error"
          description={error}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          action={
            <Button type="primary" onClick={handleRetry}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // Unauthorized state
  if (dashboardState === 'unauthorized') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <Spin size="large" tip="Redirecting to login..." />
      </div>
    );
  }

  // Ensure user is available before rendering
  if (!user || !validateUserAccess(user)) {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <Alert
          message="Access Error"
          description="Invalid user session. Please sign in again."
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          }
        />
      </div>
    );
  }

  const isMobile = !screens.md;

  // Main dashboard content
  return (
    <AspectRatioLayout>
      <Layout className="full-height">
        <Header style={{ 
          background: '#fff', 
          padding: '0 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              <span className="hidden-mobile">Daily Dose Prep</span>
              <span className="visible-mobile">DDP</span>
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '13px' }}>
                {user.email}
              </Text>
              <Tag color={user.role === 'SUPERADMIN' ? 'red' : user.role === 'QAUTHOR' ? 'blue' : 'green'} 
                   style={{ fontSize: isMobile ? '10px' : '12px', margin: 0 }}>
                {user.role}
              </Tag>
            </div>
          </div>
          <Button 
            type="primary" 
            danger
            icon={<LogoutOutlined />}
            onClick={handleSignOut}
            size={isMobile ? "small" : "middle"}
          >
            <span className="hidden-mobile">Sign Out</span>
          </Button>
        </Header>

        <Content style={{ padding: isMobile ? '16px' : '24px', flex: 1, overflowY: 'auto' }}>
          {/* SUPERADMIN Dashboard */}
          {user.role === 'SUPERADMIN' && (
            <div>
              <Title level={2}>System Administration</Title>
              <Paragraph>
                Manage the entire system, create QAUTHOR accounts, and monitor system statistics.
              </Paragraph>

              {/* System Statistics */}
              {systemStats && (
                <Card 
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>System Statistics</span>
                      <Button 
                        icon={<ReloadOutlined />}
                        onClick={fetchSystemStats}
                        size="small"
                        type="text"
                        title="Refresh Statistics"
                        loading={statsLoading}
                      >
                        <span className="hidden-mobile">Refresh</span>
                      </Button>
                    </div>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={8} md={6}>
                      <Statistic 
                        title="Total Users" 
                        value={systemStats.totalUsers} 
                        prefix={<TeamOutlined />}
                      />
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Statistic 
                        title="QAUTHORs" 
                        value={systemStats.totalQAuthors} 
                        prefix={<UserAddOutlined />}
                      />
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Statistic 
                        title="Students" 
                        value={systemStats.totalStudents} 
                        prefix={<TeamOutlined />}
                      />
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Statistic 
                        title="Subjects" 
                        value={systemStats.totalSubjects} 
                        prefix={<BookOutlined />}
                      />
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Statistic 
                        title="Total Questions" 
                        value={systemStats.totalQuestions} 
                        prefix={<FileTextOutlined />}
                      />
                    </Col>
                  </Row>
                  
                  {Object.keys(systemStats.questionsPerSubject).length > 0 && (
                    <>
                      <Divider />
                      <Title level={4}>Questions per Subject</Title>
                      <Row gutter={[16, 16]}>
                        {Object.entries(systemStats.questionsPerSubject).map(([subject, count]) => (
                          <Col xs={12} sm={8} md={6} key={subject}>
                            <Statistic
                              title={subject}
                              value={count}
                              prefix={<FileTextOutlined />}
                            />
                          </Col>
                        ))}
                      </Row>
                    </>
                  )}
                </Card>
              )}

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
                  <Card title="View Questions">
                    <Paragraph>
                      As SUPERADMIN, you can view (but not edit) all questions created by QAUTHORs to monitor content quality.
                    </Paragraph>
                    <Link href="/admin/questions">
                      <Button icon={<BookOutlined />} block>
                        View All Questions
                      </Button>
                    </Link>
                  </Card>
                </Col>
              </Row>

              {/* Subject Management */}
              <Card style={{ marginTop: 16 }}>
                <SubjectManager onSubjectChange={handleSubjectChange} />
              </Card>

              {/* All Users Table */}
              <Card title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>All Users ({allUsers.length})</span>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      log('🔄 Manual refresh of users data...');
                      fetchAllUsers();
                    }}
                    size="small"
                    type="text"
                    title="Refresh Users"
                  >
                    Refresh
                  </Button>
                </div>
              } style={{ marginTop: 16 }}>

                {/* Debug Information */}
                {isDev && (
                  <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Debug: allUsers state contains {allUsers.length} users
                    </Text>
                    {allUsers.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Users: {allUsers.map(u => `${u.email} (${u.role})`).join(', ')}
                        </Text>
                      </div>
                    )}
                    {allUsers.length === 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: '11px', color: 'red' }}>
                          ⚠️ No users in state - this indicates a data loading issue
                        </Text>
                        <Button 
                          size="small" 
                          type="primary" 
                          onClick={async () => {
                            log('🔧 Manual debug refresh triggered');
                            await fetchAllUsers();
                            await fetchSystemStats();
                          }}
                          style={{ marginLeft: 8 }}
                        >
                          Force Refresh
                        </Button>
                      </div>
                    )}
                  </div>
                )}

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
                  scroll={{ x: 'max-content' }}
                />
              </Card>
            </div>
          )}
          
          {/* QAUTHOR Dashboard */}
          {user.role === 'QAUTHOR' && (
            <div>
              <Title level={2}>Question Author Dashboard</Title>
              <Paragraph>
                Create and manage questions for the daily dose preparation system.
              </Paragraph>

              <Row gutter={[16, 16]}>
                <Col span={24}>
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
                </Col>
                <Col span={24}>
                  <QuestionManager />
                </Col>
              </Row>
            </div>
          )}

          {/* STUDENT Dashboard */}
          {user.role === 'STUDENT' && (
            <div>
              <Title level={2}>Student Dashboard</Title>
              
              {/* Enhanced Student Dashboard */}
              <EnhancedStudentDashboard user={user} />
            </div>
          )}
        </Content>
      </Layout>
    </AspectRatioLayout>
  );
} 