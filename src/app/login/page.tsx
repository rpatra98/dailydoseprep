"use client";

import { useState, useEffect } from 'react';
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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const router = useRouter();
  const screens = useBreakpoint();
  
  // Add debug logging
  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  useEffect(() => {
    addDebug('🔄 Component mounting...');
    setIsMounted(true);
    addDebug('✅ Component mounted successfully');
    
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

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setLocalError('');
    setIsSubmitting(true);
    addDebug(`🔄 Starting login for: ${email}`);
    
    try {
      // Direct login bypassing AuthContext for now
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      addDebug(`📡 Login API response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addDebug('✅ Login successful, redirecting...');
        // Small delay to ensure session is established
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        const errorData = await response.json();
        addDebug(`❌ Login failed: ${errorData.error}`);
        setLocalError(errorData.error || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      addDebug(`💥 Login exception: ${errorMessage}`);
      setLocalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Loading login page..." />
        </div>
      </AspectRatioLayout>
    );
  }

  const isMobile = isMounted ? screens.xs : false;

  return (
    <AspectRatioLayout>
      <div className="auth-page-container">
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

        <div style={{ 
          width: '100%', 
          maxWidth: isMobile ? '100%' : 400,
          padding: isMobile ? '0 16px' : '0'
        }}>
          <Card 
            style={{ 
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              marginBottom: '20px'
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
            
            {localError && (
              <Alert
                message="Login Error"
                description={localError}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
                closable
                onClose={() => setLocalError('')}
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
          
          {/* Debug Info Panel - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <Card 
              title="Debug Information"
              size="small"
              style={{ 
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: '8px'
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
      </div>
    </AspectRatioLayout>
  );
} 