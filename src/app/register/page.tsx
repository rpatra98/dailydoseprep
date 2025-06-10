"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Grid } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function RegisterPage() {
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const { user, registerStudent } = useAuth();
  const router = useRouter();
  const screens = useBreakpoint();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const isMobile = isMounted ? screens.xs : false;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (values: { email: string; password: string; confirmPassword: string }) => {
    const { email, password, confirmPassword } = values;
    setError('');
    setSuccess('');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await registerStudent(email, password);
      setSuccess('Registration successful! You can now log in.');
      // After successful registration, redirect to login page after a delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          name="register"
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
              disabled={isSubmitting}
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Password" 
              size="large"
              disabled={isSubmitting}
            />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Confirm Password" 
              size="large"
              disabled={isSubmitting}
            />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isSubmitting}
            >
              Sign up
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 