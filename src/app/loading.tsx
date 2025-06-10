'use client';

import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function Loading() {
  const antIcon = <LoadingOutlined style={{ fontSize: 40 }} spin />;
  
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      overflow: 'visible'
    }}>
      <Spin indicator={antIcon} />
      <Text style={{ marginTop: 16 }}>Loading...</Text>
    </div>
  );
} 