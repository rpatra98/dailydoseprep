'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getBrowserClient } from '@/lib/supabase-browser';
import { UserRole, Question } from '@/types';
import QuestionForm from '@/components/Question/QuestionForm';
import { 
  Layout, 
  Typography, 
  Button, 
  Card, 
  Spin, 
  Result
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function CreateQuestion() {
  const { user } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Function to fetch user role
    async function fetchUserRole() {
      try {
        setLoading(true);
        // Get user role
        const supabase = getBrowserClient();
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user?.id || '')
          .single();

        if (userError) {
          console.error('Error fetching user role:', userError);
          return;
        }
        
        if (userData?.role) {
          setUserRole(userData.role as UserRole);
          
          // If not QAUTHOR or SUPERADMIN, redirect to dashboard
          if (userData.role !== 'QAUTHOR' && userData.role !== 'SUPERADMIN') {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [user, router]);

  const handleQuestionCreated = (question: Question) => {
    setSuccess(true);
  };
  
  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };
  
  const handleCreateAnother = () => {
    setSuccess(false);
  };
  
  // If not logged in, don't render anything (will redirect in useEffect)
  if (!user) {
    return (
      <AspectRatioLayout>
        <div className="full-height" style={{ background: '#f0f2f5' }}></div>
      </AspectRatioLayout>
    );
  }
  
  // If role not fetched yet, show loading
  if (loading) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>Create Question</Title>
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
  
  // If not authorized, show message
  if (userRole !== 'QAUTHOR' && userRole !== 'SUPERADMIN') {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>Create Question</Title>
          </Header>
          <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card>
              <Result
                status="403"
                title="Not Authorized"
                subTitle="Sorry, you are not authorized to create questions."
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
          <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>Create Question</Title>
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
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToDashboard}
            style={{ marginRight: 16 }}
          >
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>Create Question</Title>
        </Header>
        <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Card>
              <QuestionForm onComplete={handleQuestionCreated} onCancel={handleBackToDashboard} />
            </Card>
          </div>
        </Content>
      </Layout>
    </AspectRatioLayout>
  );
} 