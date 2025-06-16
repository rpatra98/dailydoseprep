'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Result, Button, Space } from 'antd';
import AspectRatioLayout from '@/components/AspectRatioLayout';

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
    <AspectRatioLayout>
      <div className="center-content">
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
    </AspectRatioLayout>
  );
} 