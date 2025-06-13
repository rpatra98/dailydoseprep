"use client";

import Link from "next/link";
import { Layout, Typography, Button, Card, Row, Col, Space, Grid } from 'antd';
import { useEffect, useState } from "react";

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const screens = useBreakpoint();
  
  useEffect(() => {
    try {
      console.log("Home component mounting...");
      setIsMounted(true);
      console.log("Screens object:", screens);
    } catch (err) {
      console.error("Error in Home component mount:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [screens]);
  
  // If there's an error, show it
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Something went wrong</h1>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }
  
  const isMobile = isMounted ? screens.xs : false;
  
  return (
    <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header style={{ 
        background: '#fff', 
        padding: isMobile ? '0 16px' : '0 50px', 
        borderBottom: '1px solid #f0f0f0',
        height: isMobile ? 56 : 64
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <div>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#1677ff' }}>Daily Dose Prep</Title>
          </div>
          <div>
            <Space>
              <Link href="/login" passHref>
                <Button type="primary" size={isMobile ? "middle" : "middle"}>Login</Button>
              </Link>
              <Link href="/register" passHref>
                <Button size={isMobile ? "middle" : "middle"}>Register</Button>
              </Link>
            </Space>
          </div>
        </div>
      </Header>

      <Content style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Hero Section */}
        <div style={{ 
          padding: isMobile ? '32px 16px' : '40px 50px', 
          background: 'linear-gradient(to bottom, #f5f5f5, #fff)', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: isMobile ? 'calc(100vh - 56px - 48px)' : 'auto' // Fill screen height on mobile minus header and footer
        }}>
          <Title style={{ fontSize: isMobile ? '2rem' : '2.5rem', marginBottom: '24px' }}>
            Prepare for your competitive exams
          </Title>
          <Paragraph style={{ 
            fontSize: isMobile ? '1rem' : '1.1rem', 
            maxWidth: '800px', 
            margin: '0 auto 32px',
            padding: isMobile ? '0 8px' : 0 
          }}>
            Daily Dose Prep helps you ace your UPSC, JEE, NEET, SSC and other competitive exams with thousands of practice questions.
          </Paragraph>
          <div>
            <Link href="/register" passHref>
              <Button type="primary" size="large">
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div style={{ 
          padding: isMobile ? '32px 16px' : '40px 50px', 
          background: '#f7f7f7', 
          flex: 1 
        }}>
          <Title level={2} style={{ 
            textAlign: 'center', 
            marginBottom: '32px',
            fontSize: isMobile ? '1.5rem' : undefined
          }}>
            Why Choose Daily Dose Prep?
          </Title>
          
          <Row gutter={[16, 16]} justify="center">
            <Col xs={24} sm={12} md={8}>
              <Card hoverable style={{ height: '100%' }}>
                <Title level={4}>Comprehensive Question Bank</Title>
                <Text>Access thousands of MCQs created by expert educators.</Text>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={8}>
              <Card hoverable style={{ height: '100%' }}>
                <Title level={4}>Tailored For Exams</Title>
                <Text>Questions specifically designed for UPSC, JEE, NEET, SSC and more.</Text>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={8}>
              <Card hoverable style={{ height: '100%' }}>
                <Title level={4}>Detailed Explanations</Title>
                <Text>Learn from comprehensive explanations for every question.</Text>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>

      <Footer style={{ 
        textAlign: 'center', 
        background: '#fff', 
        padding: isMobile ? '12px' : '16px',
        height: isMobile ? '48px' : 'auto'
      }}>
        <Text type="secondary">© 2025 Daily Dose Prep. All rights reserved.</Text>
      </Footer>
    </Layout>
  );
}
