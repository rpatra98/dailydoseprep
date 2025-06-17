'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, Question } from '@/types';
import QuestionForm from '@/components/Question/QuestionForm';
import { 
  Layout, 
  Typography, 
  Button, 
  Card, 
  Spin, 
  Result,
  Alert
} from 'antd';
import { ArrowLeftOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface User {
  id: string;
  email: string;
  role: 'SUPERADMIN' | 'QAUTHOR' | 'STUDENT';
}

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

export default function CreateQuestion() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    if (isDev) {
      const timestamp = new Date().toLocaleTimeString();
      const debugMessage = `[${timestamp}] ${message}`;
      console.log(debugMessage);
      setDebugInfo(prev => [...prev.slice(-4), debugMessage]);
    }
  };

  // Check authentication and fetch user data
  useEffect(() => {
    setIsMounted(true);
    
    const checkAuth = async (retryCount = 0) => {
      try {
        addDebug('🔄 Checking authentication for question creation...');
        
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
        
        // Only QAUTHORs and SUPERADMINs can create questions
        if (userData.role !== 'QAUTHOR' && userData.role !== 'SUPERADMIN') {
          addDebug('❌ Access denied - not QAUTHOR or SUPERADMIN');
          setError('Access denied. Only QAUTHORs can create questions.');
          return;
        }

        addDebug('✅ Access granted for question creation');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        addDebug(`❌ Auth error: ${errorMessage}`);
        setError(errorMessage);
        // Redirect to login on auth failure
        setTimeout(() => router.push('/login'), 1000);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleQuestionCreated = (question: Question) => {
    addDebug('✅ Question created successfully');
    setSuccess(true);
  };
  
  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };
  
  const handleCreateAnother = () => {
    setSuccess(false);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Loading question form..." />
        </div>
      </AspectRatioLayout>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Create Question</span>
              <span className="visible-mobile">Create</span>
            </Title>
          </Header>
          <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card style={{ textAlign: 'center' }}>
              <Spin tip="Loading user data..." />
            </Card>
          </Content>
        </Layout>
      </AspectRatioLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBackToDashboard}
              style={{ marginRight: 8 }}
            >
              <span className="hidden-mobile">Back</span>
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Create Question</span>
              <span className="visible-mobile">Create</span>
            </Title>
          </Header>
          <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card style={{ textAlign: 'center', maxWidth: 500 }}>
              <div style={{ marginBottom: 16 }}>
                <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#ff4d4f' }}>Error Loading Question Form</Title>
              </div>
              <Alert
                message="Authentication Error"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
              <div>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  style={{ marginRight: 8 }}
                >
                  Retry
                </Button>
                <Button onClick={handleBackToDashboard}>
                  Back to Dashboard
                </Button>
              </div>
            </Card>
          </Content>
        </Layout>
      </AspectRatioLayout>
    );
  }

  // If not authorized, show message
  if (userRole !== 'QAUTHOR' && userRole !== 'SUPERADMIN') {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBackToDashboard}
              style={{ marginRight: 8 }}
            >
              <span className="hidden-mobile">Back</span>
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Create Question</span>
              <span className="visible-mobile">Create</span>
            </Title>
          </Header>
          <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card>
              <Result
                status="403"
                title="Not Authorized"
                subTitle="Sorry, you are not authorized to create questions. Only QAUTHORs can create questions."
                extra={
                  <Button type="primary" onClick={handleBackToDashboard}>
                    Back to Dashboard
                  </Button>
                }
              />
            </Card>
          </Content>
        </Layout>
      </AspectRatioLayout>
    );
  }
  
  if (success) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Create Question</span>
              <span className="visible-mobile">Create</span>
            </Title>
          </Header>
          <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card>
              <Result
                status="success"
                title="Question Created Successfully!"
                subTitle="Your question has been added to the database and will be available for students."
                extra={[
                  <Button type="primary" key="another" onClick={handleCreateAnother}>
                    Create Another Question
                  </Button>,
                  <Button key="dashboard" onClick={handleBackToDashboard}>
                    Back to Dashboard
                  </Button>,
                ]}
              />
            </Card>
          </Content>
        </Layout>
      </AspectRatioLayout>
    );
  }
  
  return (
    <AspectRatioLayout>
      <Layout className="full-height">
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToDashboard}
            style={{ marginRight: 8 }}
          >
            <span className="hidden-mobile">Back</span>
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            <span className="hidden-mobile">Create Question</span>
            <span className="visible-mobile">Create</span>
          </Title>
        </Header>
        <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Card>
              <QuestionForm 
                onComplete={handleQuestionCreated} 
                onCancel={handleBackToDashboard} 
              />
            </Card>
          </div>
        </Content>
      </Layout>
    </AspectRatioLayout>
  );
} 