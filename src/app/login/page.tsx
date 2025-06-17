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
  const { user, login, loading, error, authInitialized } = useAuth();
  const router = useRouter();
  const screens = useBreakpoint();
  
  useEffect(() => {
    setIsMounted(true);
    
    // Check for errors from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam === 'account_config_error') {
      setLocalError('Account configuration error. Please contact administrator.');
    } else if (errorParam === 'session_expired') {
      setLocalError('Your session has expired. Please sign in again.');
    }
  }, []);
  
  const isMobile = isMounted ? screens.xs : false;

  // Redirect if already logged in
  useEffect(() => {
    if (user && authInitialized && !loading) {
      console.log('🔄 User already logged in, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [user, router, authInitialized, loading]);

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
  
  // Don't render during SSR to avoid hydration issues
  if (!isMounted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Show loading if authentication is initializing
  if (!authInitialized) {
    return (
      <AspectRatioLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" tip="Initializing authentication..." />
        </div>
      </AspectRatioLayout>
    );
  }

  // Show spinner if we're currently loading/submitting
  if (loading || isSubmitting) {
    return (
      <AspectRatioLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" tip={isSubmitting ? "Signing you in..." : "Loading..."} />
        </div>
      </AspectRatioLayout>
    );
  }

  // Display error from useAuth or local error
  const displayError = error || localError;

  return (
    <AspectRatioLayout>
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
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

        <Card 
          className={isMobile ? 'mobile-full-card responsive-card' : 'responsive-card'}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={isMobile ? 3 : 2}>Sign in to your account</Title>
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
                loading={isSubmitting}
                disabled={loading}
                style={{ width: '100%' }}
                size={isMobile ? "middle" : "large"}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>
          
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span style={{ color: '#666' }}>Don't have an account? </span>
            <Link href="/register" style={{ color: '#1890ff' }}>Create one here</Link>
          </div>
        </Card>
      </div>
    </AspectRatioLayout>
  );
} 