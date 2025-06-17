'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getBrowserClient } from '@/lib/supabase-browser';
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
import AspectRatioLayout from '@/components/AspectRatioLayout';

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
    return (
      <AspectRatioLayout>
        <div className="full-height" style={{ background: '#f0f2f5' }}></div>
      </AspectRatioLayout>
    );
  }
  
  // If loading, show loading indicator
  if (loading) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Daily Questions</span>
              <span className="visible-mobile">Questions</span>
            </Title>
        </Header>
        <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ textAlign: 'center' }}>
            <Spin tip="Loading your daily questions..." />
          </Card>
        </Content>
      </Layout>
      </AspectRatioLayout>
    );
  }
  
  // If no set is available or there's a special message
  if (!currentSet || !currentSet.questions || currentSet.questions.length === 0) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToDashboard}
              style={{ marginRight: 8 }}
          >
              <span className="hidden-mobile">Back</span>
          </Button>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Daily Questions</span>
              <span className="visible-mobile">Questions</span>
            </Title>
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
      </AspectRatioLayout>
    );
  }
  
  // If set is already completed
  if (currentSet.completed) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToDashboard}
              style={{ marginRight: 8 }}
          >
              <span className="hidden-mobile">Back</span>
          </Button>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Daily Questions</span>
              <span className="visible-mobile">Questions</span>
            </Title>
        </Header>
        <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Card style={{ textAlign: 'center', maxWidth: 600 }}>
            <Result
                status="success"
                title="Questions Completed!"
                subTitle={`You scored ${currentSet.score || 0} out of ${currentSet.questions.length} questions.`}
                extra={[
                  <Button type="primary" key="dashboard" onClick={handleBackToDashboard}>
                    Back to Dashboard
                  </Button>,
                ]}
              />
              <Divider />
              <Progress 
                type="circle" 
                percent={Math.round(((currentSet.score || 0) / currentSet.questions.length) * 100)}
                format={() => `${currentSet.score || 0}/${currentSet.questions.length}`}
            />
          </Card>
        </Content>
      </Layout>
      </AspectRatioLayout>
    );
  }
  
  // Show active questions
  return (
    <AspectRatioLayout>
      <Layout className="full-height">
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBackToDashboard}
              style={{ marginRight: 8 }}
        >
              <span className="hidden-mobile">Back</span>
        </Button>
            <Title level={3} style={{ margin: 0 }}>
              <span className="hidden-mobile">Daily Questions</span>
              <span className="visible-mobile">Questions</span>
            </Title>
          </div>
          <Text type="secondary">
            <span className="hidden-mobile">{Object.keys(selectedAnswers).length} / {currentSet.questions.length} answered</span>
            <span className="visible-mobile">{Object.keys(selectedAnswers).length}/{currentSet.questions.length}</span>
          </Text>
      </Header>
        <Content style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {error && (
          <Alert
                message={error}
            type="error"
            showIcon
                style={{ marginBottom: 24 }}
            closable
            onClose={() => setError(null)}
          />
        )}
        
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {currentSet.questions.map((question, index) => (
          <Card 
            key={question.id} 
                  title={`Question ${index + 1}`}
                  style={{ width: '100%' }}
          >
                  <Title level={4}>{question.title}</Title>
            <Paragraph>{question.content}</Paragraph>
                  
            <Radio.Group 
              value={selectedAnswers[question.id]}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {question.options.map((option) => (
                        <Radio key={option.key} value={option.key} style={{ width: '100%' }}>
                          {option.value}
                </Radio>
              ))}
                    </Space>
            </Radio.Group>
          </Card>
        ))}
            </Space>
        
            <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Button 
            type="primary" 
            size="large"
                loading={submitting}
            onClick={handleSubmitAnswers}
                icon={<CheckCircleOutlined />}
          >
                {submitting ? 'Submitting...' : 'Submit Answers'}
          </Button>
            </div>
          </div>
      </Content>
    </Layout>
    </AspectRatioLayout>
  );
} 