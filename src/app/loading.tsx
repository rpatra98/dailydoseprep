'use client';

import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function Loading() {
  const antIcon = <LoadingOutlined style={{ fontSize: 40 }} spin />;
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Spin indicator={antIcon} />
      <Text style={{ marginTop: 16 }}>Loading...</Text>
    </div>
  );
} 