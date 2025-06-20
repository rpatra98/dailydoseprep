"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Spin, Grid } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import AspectRatioLayout from '@/components/AspectRatioLayout';
import { useAuth } from '@/context/AuthContext';

const { Title } = Typography;
const { useBreakpoint } = Grid;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [localError, setLocalError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const router = useRouter();
  const screens = useBreakpoint();
  
  // Use AuthContext for proper session management
  const { signIn, user, loading: authLoading, initialized } = useAuth();
  
  // Only log in development
  const isDev = process.env.NODE_ENV === 'development';
  
  // Add debug logging
  const addDebug = (message: string) => {
    if (isDev) {
      console.log(`[LoginPage] ${message}`);
      setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
    }
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

  // Redirect if already authenticated
  useEffect(() => {
    if (initialized && !authLoading && user) {
      addDebug(`✅ User already authenticated: ${(user as any).email} (${(user as any).role}), redirecting...`);
      router.push('/dashboard');
    }
  }, [initialized, authLoading, user, router]);

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setLocalError('');
    addDebug(`🔄 Starting login for: ${email}`);
    
    try {
      // Use AuthContext signIn method for proper session management
      const result = await signIn(email.trim().toLowerCase(), password);

      if (result.success) {
        addDebug('✅ Login successful via AuthContext');
        // AuthContext will handle state updates, just redirect
        router.push('/dashboard');
      } else {
        addDebug(`❌ Login failed: ${result.error}`);
        setLocalError(result.error || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      addDebug(`💥 Login exception: ${errorMessage}`);
      setLocalError(errorMessage);
    }
  };
  
  // Show loading while auth is initializing
  if (!isMounted || !initialized) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Initializing authentication..." />
        </div>
      </AspectRatioLayout>
    );
  }

  // Show loading if already authenticated and redirecting
  if (user) {
    return (
      <AspectRatioLayout>
        <div className="center-content">
          <Spin size="large" tip="Already signed in, redirecting..." />
        </div>
      </AspectRatioLayout>
    );
  }

  const isMobile = screens.xs;

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
                email: isDev ? 'superadmin@ddp.com' : '', // Pre-fill only in development
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
                  disabled={authLoading}
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
                  disabled={authLoading}
                />
              </Form.Item>
              
              <Form.Item style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={authLoading}
                  disabled={authLoading}
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}
                  size={isMobile ? "middle" : "large"}
                >
                  {authLoading ? 'Signing in...' : 'Sign In'}
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
          {isDev && (
            <Card 
              title="Debug Information"
              size="small"
              style={{ 
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: '8px'
              }}
            >
              <div style={{ fontFamily: 'monospace', fontSize: '11px', maxHeight: '200px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '8px', color: '#666' }}>
                  <strong>Auth State:</strong><br />
                  Initialized: {initialized ? 'Yes' : 'No'}<br />
                  Loading: {authLoading ? 'Yes' : 'No'}<br />
                                     User: {user ? `${(user as any).email} (${(user as any).role})` : 'None'}
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
                  <strong>Debug Log:</strong><br />
                  {debugInfo.map((info, index) => (
                    <div key={index} style={{ marginBottom: '2px' }}>
                      {info}
                    </div>
                  ))}
                  {debugInfo.length === 0 && (
                    <div style={{ color: '#999' }}>No debug info yet...</div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AspectRatioLayout>
  );
} 