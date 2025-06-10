'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Result, Button, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px' 
    }}>
      <Result
        status="error"
        title="Something went wrong"
        subTitle={error.message || 'An unexpected error occurred. Please try again later.'}
        extra={
          <Space>
            <Button type="primary" onClick={reset}>
              Try again
            </Button>
            <Link href="/" passHref>
              <Button>Return home</Button>
            </Link>
          </Space>
        }
      />
    </div>
  );
} 