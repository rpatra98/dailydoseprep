'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { UserRole } from '@/types';
import { 
  Layout, 
  Typography, 
  Button, 
  Card, 
  Radio, 
  Alert, 
  Spin, 
  Result,
  Progress,
  Space,
  Divider
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

interface QuestionWithOptions {
  id: string;
  title: string;
  content: string;
  options: { key: string; value: string }[];
}

interface DailyQuestionSetResponse {
  date: string;
  questions: QuestionWithOptions[];
  completed: boolean;
  score?: number;
  message?: string;
}

export default function DailyQuestions() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSet, setCurrentSet] = useState<DailyQuestionSetResponse | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch today's questions
    const fetchDailyQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/daily-questions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch daily questions');
        }
        
        const data = await response.json();
        setCurrentSet(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDailyQuestions();
  }, [user, router]);
  
  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };
  
  const handleAnswerChange = (questionId: string, option: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };
  
  const handleSubmitAnswers = async () => {
    try {
      if (!currentSet) return;
      
      // Check if all questions have been answered
      const unansweredQuestions = currentSet.questions.filter(
        q => !selectedAnswers[q.id]
      );
      
      if (unansweredQuestions.length > 0) {
        setError(`Please answer all questions before submitting. You have ${unansweredQuestions.length} unanswered questions.`);
        return;
      }
      
      setSubmitting(true);
      setError(null);
      
      const answers = Object.entries(selectedAnswers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption
      }));
      
      const response = await fetch('/api/daily-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: currentSet.date,
          answers
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit answers');
      }
      
      const result = await response.json();
      setCurrentSet(prev => ({
        ...prev!,
        completed: true,
        score: result.score
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setSubmitting(false);
    }
  };
  
  // If not logged in, don't render anything
  if (!user) {
    return <div style={{ height: '100%', background: '#f0f2f5' }}></div>;
  }
  
  // If loading, show loading indicator
  if (loading) {
    return (
      <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Daily Questions</Title>
        </Header>
        <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ textAlign: 'center' }}>
            <Spin tip="Loading your daily questions..." />
          </Card>
        </Content>
      </Layout>
    );
  }
  
  // If no set is available or there's a special message
  if (!currentSet || !currentSet.questions || currentSet.questions.length === 0) {
    return (
      <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToDashboard}
            style={{ marginRight: 16 }}
          >
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>Daily Questions</Title>
        </Header>
        <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card>
            <Result
              status="info"
              title={currentSet?.message || "No questions available"}
              subTitle={
                currentSet?.message 
                  ? "You've completed all available questions for your primary subject!"
                  : "Please select a primary subject in your dashboard to receive daily questions."
              }
              extra={
                <Button type="primary" onClick={handleBackToDashboard}>
                  Back to Dashboard
                </Button>
              }
            />
          </Card>
        </Content>
      </Layout>
    );
  }
  
  // If set is already completed
  if (currentSet.completed) {
    return (
      <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToDashboard}
            style={{ marginRight: 16 }}
          >
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>Daily Questions</Title>
        </Header>
        <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card>
            <Result
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="Today's Questions Completed!"
              subTitle={`For ${currentSet.date}, you got ${currentSet.score} questions correct out of ${currentSet.questions.length}.`}
              extra={
                <div style={{ textAlign: 'center' }}>
                  <Progress 
                    type="circle" 
                    percent={Math.round((currentSet.score || 0) / currentSet.questions.length * 100)} 
                    style={{ marginBottom: 16 }}
                  />
                  <br />
                  <Button type="primary" onClick={handleBackToDashboard}>
                    Back to Dashboard
                  </Button>
                </div>
              }
            />
          </Card>
        </Content>
      </Layout>
    );
  }
  
  // Show active questions
  return (
    <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBackToDashboard}
          style={{ marginRight: 16 }}
        >
          Back
        </Button>
        <Title level={3} style={{ margin: 0 }}>Daily Questions - {currentSet.date}</Title>
      </Header>
      <Content style={{ padding: '24px', flex: 1 }}>
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError(null)}
          />
        )}
        
        <Title level={4}>Your Daily Set of {currentSet.questions.length} Questions</Title>
        <Paragraph>
          Answer all questions by selecting one option for each. Your score will be shown after submission.
        </Paragraph>
        
        {currentSet.questions.map((question, index) => (
          <Card 
            key={question.id} 
            title={`Question ${index + 1}: ${question.title}`}
            style={{ marginBottom: 16 }}
          >
            <Paragraph>{question.content}</Paragraph>
            <Radio.Group 
              onChange={e => handleAnswerChange(question.id, e.target.value)}
              value={selectedAnswers[question.id]}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {question.options.map(option => (
                <Radio key={option.key} value={option.key}>
                  {option.key}: {option.value}
                </Radio>
              ))}
            </Radio.Group>
          </Card>
        ))}
        
        <Space style={{ marginTop: 24 }}>
          <Button 
            type="primary" 
            size="large"
            onClick={handleSubmitAnswers}
            loading={submitting}
            disabled={submitting}
          >
            Submit All Answers
          </Button>
          <Button onClick={handleBackToDashboard}>Cancel</Button>
        </Space>
      </Content>
    </Layout>
  );
} 