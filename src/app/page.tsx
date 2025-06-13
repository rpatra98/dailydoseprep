"use client";

import Link from "next/link";
import { Button, Typography } from 'antd';
import { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("Home component mounting");
    setMounted(true);
  }, []);

  // Simple loading state
  if (!mounted) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '40px',
        padding: '20px 0'
      }}>
        <Title level={3} style={{ margin: 0, color: '#1677ff' }}>Daily Dose Prep</Title>
        <div>
          <Link href="/login" passHref>
            <Button type="primary" style={{ marginRight: '10px' }}>Login</Button>
          </Link>
          <Link href="/register" passHref>
            <Button>Register</Button>
          </Link>
        </div>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <Title style={{ fontSize: '2.5rem', marginBottom: '24px' }}>
          Prepare for your competitive exams
        </Title>
        <Paragraph style={{ fontSize: '1.1rem', maxWidth: '800px', margin: '0 auto 32px' }}>
          Daily Dose Prep helps you ace your UPSC, JEE, NEET, SSC and other competitive exams with thousands of practice questions.
        </Paragraph>
        <Link href="/register" passHref>
          <Button type="primary" size="large">
            Get Started
          </Button>
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={2} style={{ marginBottom: '32px' }}>
          Why Choose Daily Dose Prep?
        </Title>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
          <div style={{ 
            flex: '1 1 300px', 
            maxWidth: '350px', 
            padding: '20px', 
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            backgroundColor: '#fff'
          }}>
            <Title level={4}>Comprehensive Question Bank</Title>
            <Text>Access thousands of MCQs created by expert educators.</Text>
          </div>
          
          <div style={{ 
            flex: '1 1 300px', 
            maxWidth: '350px', 
            padding: '20px', 
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            backgroundColor: '#fff'
          }}>
            <Title level={4}>Tailored For Exams</Title>
            <Text>Questions specifically designed for UPSC, JEE, NEET, SSC and more.</Text>
          </div>
          
          <div style={{ 
            flex: '1 1 300px', 
            maxWidth: '350px', 
            padding: '20px', 
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            backgroundColor: '#fff'
          }}>
            <Title level={4}>Detailed Explanations</Title>
            <Text>Learn from comprehensive explanations for every question.</Text>
          </div>
        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid #f0f0f0' }}>
        <Text type="secondary">© 2025 Daily Dose Prep. All rights reserved.</Text>
      </footer>
    </div>
  );
}
