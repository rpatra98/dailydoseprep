"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Grid, Spin } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

export default function RegisterPage() {
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const router = useRouter();
  const screens = useBreakpoint();

  // Add debug logging
  const addDebug = (message: string) => {
    if (isDev) {
      console.log(message);
      setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
    }
  };
  
  useEffect(() => {
    addDebug('🔄 Register page mounting...');
    setIsMounted(true);
    addDebug('✅ Register page mounted');
  }, []);
  
  const isMobile = isMounted ? screens.xs : false;

  // Check if user is already logged in
  useEffect(() => {
    if (!isMounted) return;

    const checkAuth = async () => {
      try {
        addDebug('🔄 Checking if user is already logged in...');
        
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          addDebug(`✅ User already logged in: ${userData.email}, redirecting to dashboard`);
          router.push('/dashboard');
        } else {
          addDebug('✅ No active session, user can register');
        }
      } catch (error) {
        addDebug(`⚠️ Auth check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Ignore errors, user can proceed with registration
      }
    };

    checkAuth();
  }, [isMounted, router]);

  const handleSubmit = async (values: { email: string; password: string; confirmPassword: string }) => {
    const { email, password, confirmPassword } = values;
    setError('');
    setSuccess('');
    
    addDebug(`🔄 Starting registration for: ${email}`);
    
    // Validate passwords match
    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setError(errorMsg);
      addDebug(`❌ Password validation failed: ${errorMsg}`);
      return;
    }
    
    try {
      setIsSubmitting(true);
      addDebug('📡 Sending registration request...');
      
      // Create student account via API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          role: 'STUDENT'
        }),
      });

      addDebug(`📡 Registration API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        addDebug(`❌ Registration failed: ${errorData.error}`);
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await response.json();
      addDebug('✅ Registration successful');
      
      setSuccess('Registration successful! You can now log in with your credentials.');
      form.resetFields();
      
      // Redirect to login page after a delay
      setTimeout(() => {
        addDebug('🔄 Redirecting to login page...');
        router.push('/login');
      }, 2000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      addDebug(`❌ Registration error: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Loading registration page..." />
        </div>
      </AspectRatioLayout>
    );
  }

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
            <Title level={isMobile ? 3 : 2}>Create your account</Title>
            <Text type="secondary">
              Or <Link href="/login" style={{ color: '#1677ff' }}>sign in to your existing account</Link>
            </Text>
          </div>
          
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}
          
          {success && (
            <Alert
              message={success}
              type="success"
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
                { required: true, message: 'Please enter a password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Confirm your password"
                autoComplete="new-password"
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
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </Form.Item>
          </Form>
          
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              By creating an account, you agree to our terms of service and privacy policy.
            </Text>
          </div>
        </Card>

        {/* Debug Info Panel - Only show in development */}
        {isDev && (
          <Card 
            title="Debug Information"
            size="small"
            style={{ 
              marginTop: 24,
              maxWidth: 600
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '12px', maxHeight: '200px', overflowY: 'auto' }}>
              {debugInfo.map((info, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  {info}
                </div>
              ))}
              {debugInfo.length === 0 && (
                <div style={{ color: '#999' }}>No debug info yet...</div>
              )}
            </div>
          </Card>
        )}
      </div>
    </AspectRatioLayout>
  );
} 