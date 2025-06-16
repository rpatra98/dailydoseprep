'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase-browser';
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

interface SystemStats {
  totalUsers: number;
  totalQAuthors: number;
  totalStudents: number;
  totalSubjects: number;
  totalQuestions: number;
  questionsPerSubject: { [key: string]: number };
}

export default function Dashboard() {
  const { user, logout, authInitialized } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [form] = Form.useForm();

  // Redirect if not logged in
  useEffect(() => {
    if (authInitialized && !user) {
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
        
        // Get user role
        const supabase = getBrowserClient();
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (userError) {
          throw new Error(`Failed to load user data: ${userError.message}`);
        }
        
        if (!userData) {
          throw new Error('User not found in database');
        }
        
        const role = userData.role as UserRole;
        setUserRole(role);
        
        // If SUPERADMIN, fetch all users and system stats
        if (role === 'SUPERADMIN') {
          await Promise.all([
            fetchAllUsers(),
            fetchSystemStats()
          ]);
        }
        
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, authInitialized]);

  const fetchAllUsers = async () => {
    try {
      const supabase = getBrowserClient();
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false });
        
              if (!usersError) {
          setAllUsers(usersData || []);
        }
      } catch (error) {
        // Silent error handling for production
      }
  };

  const fetchSystemStats = async () => {
    try {
      const supabase = getBrowserClient();
      // Fetch user counts
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('role');
      
      // Fetch subjects count
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name');
      
      // Fetch questions count
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, subject_id');

      if (usersError || subjectsError || questionsError) {
        return;
      }

      const totalUsers = usersData?.length || 0;
      const totalQAuthors = usersData?.filter(u => u.role === 'QAUTHOR').length || 0;
      const totalStudents = usersData?.filter(u => u.role === 'STUDENT').length || 0;
      const totalSubjects = subjectsData?.length || 0;
      const totalQuestions = questionsData?.length || 0;

      // Calculate questions per subject
      const questionsPerSubject: { [key: string]: number } = {};
      subjectsData?.forEach(subject => {
        const count = questionsData?.filter(q => q.subject_id === subject.id).length || 0;
        questionsPerSubject[subject.name] = count;
      });

      setSystemStats({
        totalUsers,
        totalQAuthors,
        totalStudents,
        totalSubjects,
        totalQuestions,
        questionsPerSubject
      });

    } catch (error) {
      // Silent error handling for production
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      // Handle sign out error silently
    }
  };
  
  const handleRetry = () => {
    window.location.reload();
  };

  const handleCreateQAUTHOR = async (values: { email: string; password: string }) => {
    try {
      setCreateLoading(true);
      const supabase = getBrowserClient();
      
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
        
        // Refresh data
        await Promise.all([
          fetchAllUsers(),
          fetchSystemStats()
        ]);
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
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Dashboard</span>
              <span className="visible-mobile">Dashboard</span>
            </Title>
            <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
              <span className="hidden-mobile">Sign Out</span>
              <LogoutOutlined className="visible-mobile" />
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
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">QAUTHOR Dashboard</span>
              <span className="visible-mobile">QAUTHOR</span>
            </Title>
            <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
              <span className="hidden-mobile">Sign Out</span>
              <LogoutOutlined className="visible-mobile" />
            </Button>
          </Header>
          <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
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
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Student Dashboard</span>
              <span className="visible-mobile">Student</span>
            </Title>
            <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
              <span className="hidden-mobile">Sign Out</span>
              <LogoutOutlined className="visible-mobile" />
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
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            <span className="hidden-mobile">SUPERADMIN Dashboard</span>
            <span className="visible-mobile">SUPERADMIN</span>
          </Title>
          <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
            <span className="hidden-mobile">Sign Out</span>
            <LogoutOutlined className="visible-mobile" />
          </Button>
        </Header>
        <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          
          {/* System Statistics */}
          {systemStats && (
            <Card title="System Statistics" style={{ marginBottom: 16 }}>
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
                    prefix={<BookOutlined />}
                  />
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Statistic
                    title="Subjects"
                    value={systemStats.totalSubjects}
                    prefix={<DatabaseOutlined />}
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
            <SubjectManager />
          </Card>
          
          {/* All Users Table */}
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