'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Result, Button, Space } from 'antd';

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
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      overflow: 'visible'
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