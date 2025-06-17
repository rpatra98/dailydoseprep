"use client";

import Link from "next/link";
import { Button, Typography } from 'antd';
import { useEffect, useState } from "react";
import AspectRatioLayout from "@/components/AspectRatioLayout";

const { Title, Text, Paragraph } = Typography;

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simple loading state
  if (!mounted) {
    return (
      <div className="center-content">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <AspectRatioLayout>
      <div className="home-container">
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '40px',
          padding: '20px 0',
          flexWrap: 'wrap',
          gap: '16px'
      }}>
        <Title level={3} style={{ margin: 0, color: '#1677ff' }}>Daily Dose Prep</Title>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/login" passHref>
              <Button type="primary">Login</Button>
          </Link>
          <Link href="/register" passHref>
            <Button>Register</Button>
          </Link>
        </div>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <Title level={1} style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '24px' }}>
          Prepare for your competitive exams
        </Title>
          <Paragraph style={{ 
            fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', 
            maxWidth: '800px', 
            margin: '0 auto 32px',
            lineHeight: '1.6'
          }}>
          Daily Dose Prep helps you ace your UPSC, JEE, NEET, SSC and other competitive exams with thousands of practice questions.
        </Paragraph>
        <Link href="/register" passHref>
          <Button type="primary" size="large">
            Get Started
          </Button>
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Title level={2} style={{ 
            marginBottom: '32px',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)'
          }}>
          Why Choose Daily Dose Prep?
        </Title>
        
          <div className="feature-grid">
            <div className="feature-card">
            <Title level={4}>Comprehensive Question Bank</Title>
            <Text>Access thousands of MCQs created by expert educators.</Text>
          </div>
          
            <div className="feature-card">
            <Title level={4}>Tailored For Exams</Title>
            <Text>Questions specifically designed for UPSC, JEE, NEET, SSC and more.</Text>
          </div>
          
            <div className="feature-card">
            <Title level={4}>Detailed Explanations</Title>
            <Text>Learn from comprehensive explanations for every question.</Text>
          </div>
        </div>
      </div>

        <footer style={{ 
          textAlign: 'center', 
          padding: '20px 0', 
          borderTop: '1px solid #f0f0f0',
          marginTop: 'auto'
        }}>
        <Text type="secondary">© 2025 Daily Dose Prep. All rights reserved.</Text>
      </footer>
    </div>
    </AspectRatioLayout>
  );
}
