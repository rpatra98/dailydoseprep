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
      console.error("Login error:", error);
      if (error instanceof Error) {
        if (error.message.includes('Email not confirmed')) {
          setLocalError('Account email not confirmed. If you are a QAUTHOR, please contact the SUPERADMIN.');
        } else if (error.message.includes('Authentication client not initialized')) {
          setLocalError('Authentication service is initializing. Please try again in a moment.');
        } else {
          setLocalError(`Login failed: ${error.message}`);
        }
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