"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Spin, Grid } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Title } = Typography;
const { useBreakpoint } = Grid;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [accountConfigError, setAccountConfigError] = useState(false);
  const { user, login, loading, error, authInitialized } = useAuth();
  const router = useRouter();
  const screens = useBreakpoint();
  
  useEffect(() => {
    setIsMounted(true);
    
    // Check for account configuration error from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'account_config_error') {
      setAccountConfigError(true);
      setLocalError('Account configuration error. Please contact administrator.');
    }
  }, []);
  
  const isMobile = isMounted ? screens.xs : false;

  // Redirect if already logged in
  useEffect(() => {
    if (user && authInitialized) {
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
    setConnectionIssue(false);
    setIsSubmitting(true);
    setLoginAttempts(prev => prev + 1);
    
    try {
      await login(email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setLocalError(errorMessage);
      
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        setConnectionIssue(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Don't render during SSR to avoid hydration issues
  if (!isMounted) {
    return <div className="center-content"><Spin size="large" /></div>;
  }

  // Show loading if authentication is initializing
  if (!authInitialized) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Initializing authentication..." />
        </div>
      </AspectRatioLayout>
    );
  }

  // Show spinner if we're currently loading/submitting
  if (loading || isSubmitting) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip={isSubmitting ? "Signing you in..." : "Loading..."} />
        </div>
      </AspectRatioLayout>
    );
  }

  // Display error from useAuth or local error
  const displayError = error || localError;

  return (
    <AspectRatioLayout>
      <div className="center-content" style={{ 
        padding: isMobile ? '16px' : '24px',
        position: 'relative'
      }}>
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

        <Card className={isMobile ? 'mobile-full-card responsive-card' : 'responsive-card'}>
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
          
          {accountConfigError && (
            <Alert
              message="Account Configuration Error"
              description="Your account exists in authentication but not in the database. This is a security issue. Please contact the administrator to resolve this."
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size={isMobile ? "middle" : "large"}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email address' },
                { type: 'email', message: 'Please enter a valid email address' }
              ]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Enter your email"
                autoComplete="email"
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter your password' }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                block
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </Form.Item>
          </Form>
          
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span>Don't have an account? </span>
            <Link href="/register" style={{ color: '#1677ff' }}>
              Create one here
            </Link>
          </div>
        </Card>
      </div>
    </AspectRatioLayout>
  );
} 