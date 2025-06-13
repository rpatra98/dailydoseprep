"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Grid, Spin } from 'antd';
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
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const isMobile = isMounted ? screens.xs : false;

  // Redirect if already logged in
  useEffect(() => {
    if (user && authInitialized) {
      console.log('User is logged in, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [user, router, authInitialized]);

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setLocalError('');
    
    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      // Successful login will trigger the useEffect to redirect
    } catch (error) {
      if (error instanceof Error && error.message.includes('Email not confirmed')) {
        setLocalError('Account email not confirmed. If you are a QAUTHOR, please contact the SUPERADMIN.');
      } else {
        setLocalError('Invalid email or password');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show any contextual errors from the auth provider
  const displayError = localError || error;

  // If auth is still initializing, show loading
  if (!authInitialized) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: '#f0f2f5' 
      }}>
        <Spin size="large" tip="Initializing..." />
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#f0f2f5',
      overflow: 'visible',
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

      <Card style={{ 
        width: isMobile ? '100%' : 400, 
        borderRadius: isMobile ? 0 : 8, 
        boxShadow: isMobile ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
        margin: isMobile ? 0 : undefined,
        border: isMobile ? 'none' : undefined
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
        
        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          requiredMark={false}
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
        </Form>
      </Card>
    </div>
  );
} 