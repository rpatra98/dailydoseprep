"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const { user, login, loading, error, authInitialized } = useAuth();
  const router = useRouter();
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && authInitialized) {
      console.log('User is logged in, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [user, router, authInitialized]);

  // Monitor for timeout issues
  useEffect(() => {
    if (loginAttempts > 0 && !isSubmitting && !user) {
      const timeoutId = setTimeout(() => {
        if (!user && localError.includes('timeout')) {
          setConnectionIssue(true);
        }
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loginAttempts, isSubmitting, user, localError]);

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setLocalError('');
    setLoginAttempts(prev => prev + 1);
    setConnectionIssue(false);
    
    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log(`Login attempt ${loginAttempts + 1} for ${email}`);
      
      const result = await login(email, password);
      
      // If we get here, login was successful
      console.log("Login successful, result:", result ? "Data returned" : "No data");
      
      // Force redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error("Login error in page component:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('Email not confirmed')) {
          setLocalError('Account email not confirmed. If you are a QAUTHOR, please contact the SUPERADMIN.');
        } else if (error.message.includes('Authentication client not initialized')) {
          setLocalError('Authentication service is initializing. Please try again in a moment.');
        } else if (error.message.includes('Invalid login credentials')) {
          setLocalError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('timeout') || error.message.includes('fetch')) {
          setLocalError('Connection timeout. The server is not responding. Please check your internet connection and try again.');
          setConnectionIssue(true);
        } else {
          setLocalError(`Login failed: ${error.message}`);
        }
      } else {
        setLocalError('An unexpected error occurred. Please try again.');
      }
      
      // If multiple login attempts fail, suggest refreshing the page
      if (loginAttempts >= 2) {
        setLocalError(prev => `${prev} You may need to refresh the page if the problem persists.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual page refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  // Show any contextual errors from the auth provider
  const displayError = localError || error;

  // If auth is still initializing, show loading
  if (!authInitialized && loading) {
    return (
      <div className="auth-page-container">
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Initializing authentication...</p>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      {/* Back button */}
      <div style={{ 
        position: 'absolute', 
        top: isMobile ? 16 : 24, 
        left: isMobile ? 16 : 24,
      }}>
        <Link href="/">
          <Button 
            icon={<ArrowLeftOutlined />} 
            type="text"
            size={isMobile ? "middle" : "large"}
          >
            Back to Home
          </Button>
        </Link>
      </div>

      <Card style={{ 
        width: isMobile ? '100%' : 400, 
        borderRadius: 8, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        marginTop: '60px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={isMobile ? 3 : 2}>Sign in to your account</Title>
        </div>
        
        {displayError && (
          <Alert
            message={displayError}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        
        {connectionIssue && (
          <Alert
            message="Database Connection Issue"
            description="We're having trouble connecting to our database. This could be due to server maintenance or network issues."
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        
        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          requiredMark={false}
          initialValues={{ email: 'superadmin@ddp.com' }}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Email address" 
              size="large"
              disabled={loading || isSubmitting}
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Password" 
              size="large"
              disabled={loading || isSubmitting}
            />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading || isSubmitting}
            >
              Sign in
            </Button>
          </Form.Item>
          
          {(loginAttempts > 0 || connectionIssue) && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button 
                type="link" 
                onClick={handleRefresh}
              >
                Refresh page
              </Button>
            </div>
          )}
        </Form>
      </Card>
    </div>
  );
} 