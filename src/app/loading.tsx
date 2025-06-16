'use client';

import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Text } = Typography;

export default function Loading() {
  const antIcon = <LoadingOutlined style={{ fontSize: 40 }} spin />;
  
  return (
    <AspectRatioLayout>
      <div className="center-content">
        <Spin indicator={antIcon} />
        <Text style={{ marginTop: 16 }}>Loading...</Text>
      </div>
    </AspectRatioLayout>
  );
} 