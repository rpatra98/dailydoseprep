"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Spin, Grid } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title } = Typography;
const { useBreakpoint } = Grid;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, login, loading, error, authInitialized } = useAuth();
  const router = useRouter();
  const screens = useBreakpoint();
  
  // Fix hydration by ensuring component only renders after mounting
  useEffect(() => {
    setIsMounted(true);
    
    // Check for errors from URL params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      
      if (errorParam === 'account_config_error') {
        setLocalError('Account configuration error. Please contact administrator.');
      } else if (errorParam === 'session_expired') {
        setLocalError('Your session has expired. Please sign in again.');
      }
    }
  }, []);
  
  const isMobile = isMounted ? screens.xs : false;

  // Redirect if already logged in
  useEffect(() => {
    if (user && authInitialized && !loading && isMounted) {
      console.log('🔄 User already logged in, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [user, router, authInitialized, loading, isMounted]);

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setLocalError('');
    setIsSubmitting(true);
    
    try {
      console.log('🔄 Submitting login form...');
      const result = await login(email, password);
      
      if (result && !result.success) {
        setLocalError(result.error || 'Login failed');
      }
      // If successful, the AuthContext will handle the redirect
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      console.error('❌ Login form error:', errorMessage);
      setLocalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // Show loading if authentication is initializing
  if (!authInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <Spin size="large" tip="Initializing authentication..." />
      </div>
    );
  }

  // Show spinner if we're currently loading/submitting
  if (loading || isSubmitting) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <Spin size="large" tip={isSubmitting ? "Signing you in..." : "Loading..."} />
      </div>
    );
  }

  // Display error from useAuth or local error
  const displayError = error || localError;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '16px' : '24px',
      position: 'relative'
    }}>
      {/* Back button */}
      <div style={{ 
        position: 'absolute', 
        top: isMobile ? 16 : 24, 
        left: isMobile ? 16 : 24,
        zIndex: 10
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

      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: '8px'
        }}
        bodyStyle={{ padding: isMobile ? '24px' : '32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={isMobile ? 3 : 2} style={{ marginBottom: 8 }}>
            Sign in to your account
          </Title>
          <Typography.Text type="secondary">
            Welcome back! Please enter your credentials.
          </Typography.Text>
        </div>
        
        {displayError && (
          <Alert
            message="Login Error"
            description={displayError}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            closable
            onClose={() => {
              setLocalError('');
            }}
          />
        )}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size={isMobile ? "middle" : "large"}
          initialValues={{
            email: 'superadmin@ddp.com', // Pre-fill for testing
          }}
        >
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter your email address' },
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} 
              placeholder="Enter your email"
              autoComplete="email"
              style={{ borderRadius: '6px' }}
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
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{ borderRadius: '6px' }}
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              disabled={loading}
              style={{ 
                width: '100%',
                height: '40px',
                borderRadius: '6px',
                fontWeight: '500'
              }}
              size={isMobile ? "middle" : "large"}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #f0f0f0'
        }}>
          <Typography.Text type="secondary">
            Don't have an account?{' '}
            <Link href="/register" style={{ color: '#1890ff', fontWeight: '500' }}>
              Create one here
            </Link>
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
} 