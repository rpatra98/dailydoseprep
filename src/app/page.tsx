"use client";

import Link from "next/link";
import { Layout, Typography, Button, Card, Row, Col, Space } from 'antd';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function Home() {
  return (
    <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header style={{ background: '#fff', padding: '0 50px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#1677ff' }}>Daily Dose Prep</Title>
          </div>
          <div>
            <Space>
              <Link href="/login" passHref>
                <Button type="primary">Login</Button>
              </Link>
              <Link href="/register" passHref>
                <Button>Register</Button>
              </Link>
            </Space>
          </div>
        </div>
      </Header>

      <Content style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Hero Section */}
        <div style={{ 
          padding: '40px 50px', 
          background: 'linear-gradient(to bottom, #f5f5f5, #fff)', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <Title style={{ fontSize: '2.5rem', marginBottom: '24px' }}>
            Prepare for your competitive exams
          </Title>
          <Paragraph style={{ fontSize: '1.1rem', maxWidth: '800px', margin: '0 auto 32px' }}>
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
        <div style={{ padding: '40px 50px', background: '#f7f7f7', flex: 1 }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
            Why Choose Daily Dose Prep?
          </Title>
          
          <Row gutter={[24, 24]} justify="center">
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

      <Footer style={{ textAlign: 'center', background: '#fff', padding: '16px' }}>
        <Text type="secondary">© 2024 Daily Dose Prep. All rights reserved.</Text>
      </Footer>
    </Layout>
  );
}
