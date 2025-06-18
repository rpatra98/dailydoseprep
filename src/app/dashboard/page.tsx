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
  FileTextOutlined
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
  const { user, loading: authLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [statsLoading, setStatsLoading] = useState(false);
  const screens = useBreakpoint();

  // Only log in development
  const isDev = process.env.NODE_ENV === 'development';

  // Add debug logging - Always log for now
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
    if (!isMounted) {
      addDebug('⏳ Dashboard: Not mounted yet, skipping auth check');
      return;
    }

    addDebug(`🔄 Dashboard: Auth state - loading: ${authLoading}, user: ${user ? user.email : 'null'}`);

    if (authLoading) {
      addDebug('⏳ Dashboard: Auth still loading, waiting...');
      return;
    }

    const loadDashboardData = async () => {
      try {
        addDebug('🔄 Loading dashboard data...');
        
        if (!user) {
          addDebug('❌ Not authenticated, redirecting to login');
          router.push('/login');
          return;
        }

        addDebug(`✅ User authenticated: ${user.email} (${user.role})`);
        
        // If SUPERADMIN, fetch additional data
        if (user.role === 'SUPERADMIN') {
          addDebug('🔄 Fetching admin data...');
          await Promise.all([
            fetchAllUsers(),
            fetchSystemStats()
          ]);
          addDebug('✅ Admin data loaded');
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
        addDebug(`❌ Dashboard error: ${errorMessage}`);
        setLoadError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [isMounted, authLoading, user, router]);

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
      setStatsLoading(true);
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
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      addDebug('🔄 Signing out...');
      await signOut();
      addDebug('✅ Signed out successfully');
      router.push('/');
    } catch (error) {
      addDebug(`❌ Sign out error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        
        // Refresh both users list and system statistics
        await Promise.all([
          fetchAllUsers(),
          fetchSystemStats()
        ]);
        addDebug('✅ Statistics refreshed after QAUTHOR creation');
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

  // Callback function to refresh statistics when subjects are modified
  const handleSubjectChange = async () => {
    addDebug('🔄 Refreshing statistics after subject change...');
    await fetchSystemStats();
    addDebug('✅ Statistics refreshed after subject change');
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Loading dashboard..." />
        </div>
      </AspectRatioLayout>
    );
  }

  // Show loading state
  if (authLoading || isLoading) {
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
        {debugInfo.length > 0 && (
          <div style={{ maxWidth: '400px', textAlign: 'center' }}>
            {debugInfo.map((info, index) => (
              <Text key={index} type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                {info}
              </Text>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Dashboard Error"
          description={loadError}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
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

  const isMobile = !screens.md;

  // Show dashboard content
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
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '13px' }}>
                  {user.email}
                </Text>
                <Tag color={user.role === 'SUPERADMIN' ? 'red' : user.role === 'QAUTHOR' ? 'blue' : 'green'} 
                     style={{ fontSize: isMobile ? '10px' : '12px', margin: 0 }}>
                  {user.role}
                </Tag>
              </div>
            )}
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
              <Card title="All Users" style={{ marginTop: 16 }}>
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