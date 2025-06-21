'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Layout, 
  Typography, 
  Button, 
  Card, 
  Radio, 
  Alert, 
  Spin, 
  Progress,
  Space,
  Divider,
  Tabs,
  Tag,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  RightOutlined,
  LeftOutlined,
  BookOutlined
} from '@ant-design/icons';
import AspectRatioLayout from '@/components/AspectRatioLayout';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Countdown } = Statistic;

interface Question {
  id: string;
  title: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  difficulty: string;
  subject_id: string;
  attemptCount?: number;
}

interface Subject {
  id: string;
  name: string;
  examcategory?: string;
}

interface PracticeSession {
  questions: Question[];
  currentQuestionIndex: number;
  selectedAnswers: Record<string, string>;
  startTime: Date;
  totalTime: number; // in seconds
  subject: Subject;
}

export default function PracticePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get('subject');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<string>>(new Set());
  const [sessionTime, setSessionTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Timer effect
  useEffect(() => {
    if (!session || isPaused) return;

    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isPaused]);

  // Initialize practice session
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'STUDENT') {
      router.push('/dashboard');
      return;
    }

    if (!subjectId) {
      setError('No subject selected. Please select a subject to practice.');
      setLoading(false);
      return;
    }

    initializePracticeSession();
  }, [user, router, subjectId]);

  const initializePracticeSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch questions for the subject
      const response = await fetch(`/api/questions?subject=${subjectId}&limit=20`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch practice questions');
      }

      const data = await response.json();
      
      if (!data.questions || data.questions.length === 0) {
        setError('No questions available for this subject yet. Please try another subject or check back later.');
        setLoading(false);
        return;
      }

      // Get subject info
      const subjectResponse = await fetch(`/api/subjects/${subjectId}`, {
        method: 'GET',
        credentials: 'include',
      });

      let subjectInfo: Subject = { id: subjectId || '', name: 'Unknown Subject' };
      if (subjectResponse.ok) {
        const subjectData = await subjectResponse.json();
        subjectInfo = {
          id: subjectData.id || subjectId || '',
          name: subjectData.name || 'Unknown Subject',
          examcategory: subjectData.examcategory
        };
      }

      // Shuffle questions for variety
      const shuffledQuestions = [...data.questions].sort(() => Math.random() - 0.5);

      setSession({
        questions: shuffledQuestions,
        currentQuestionIndex: 0,
        selectedAnswers: {},
        startTime: new Date(),
        totalTime: 0,
        subject: subjectInfo
      });

    } catch (err) {
      console.error('Error initializing practice session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start practice session');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (option: string) => {
    console.log('Answer selected:', option);
    setCurrentAnswer(option);
  };

  const handleSubmitAnswer = async () => {
    if (!session || !currentAnswer) {
      console.log('Cannot submit: missing session or answer', { session: !!session, currentAnswer });
      return;
    }

    setSubmitting(true);
    const currentQuestion = session.questions[session.currentQuestionIndex];
    const isCorrect = currentAnswer === currentQuestion.correct_option;

    try {
      console.log('Submitting answer:', {
        questionId: currentQuestion.id,
        selectedOption: currentAnswer,
        isCorrect,
        subjectId: currentQuestion.subject_id
      });

      // Submit answer to backend
      const response = await fetch('/api/student/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOption: currentAnswer,
          isCorrect: isCorrect,
          subjectId: currentQuestion.subject_id,
          timeSpent: sessionTime - (session.selectedAnswers[currentQuestion.id] ? 0 : sessionTime)
        }),
      });

      console.log('Submit response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Submit result:', result);
        
        // Update session state
        setSession(prev => prev ? {
          ...prev,
          selectedAnswers: {
            ...prev.selectedAnswers,
            [currentQuestion.id]: currentAnswer
          }
        } : null);

        setSubmittedAnswers(prev => new Set([...prev, currentQuestion.id]));
        setShowExplanation(true);
      } else {
        const errorData = await response.json();
        console.error('Submit failed:', errorData);
        // Still allow local state update for better UX
        setSession(prev => prev ? {
          ...prev,
          selectedAnswers: {
            ...prev.selectedAnswers,
            [currentQuestion.id]: currentAnswer
          }
        } : null);

        setSubmittedAnswers(prev => new Set([...prev, currentQuestion.id]));
        setShowExplanation(true);
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      // Still allow local state update for better UX
      setSession(prev => prev ? {
        ...prev,
        selectedAnswers: {
          ...prev.selectedAnswers,
          [currentQuestion.id]: currentAnswer
        }
      } : null);

      setSubmittedAnswers(prev => new Set([...prev, currentQuestion.id]));
      setShowExplanation(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!session) return;

    if (session.currentQuestionIndex < session.questions.length - 1) {
      setSession(prev => prev ? {
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      } : null);
      setCurrentAnswer('');
      setShowExplanation(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (!session) return;

    if (session.currentQuestionIndex > 0) {
      setSession(prev => prev ? {
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      } : null);
      
      // Load previous answer if exists
      const prevQuestion = session.questions[session.currentQuestionIndex - 1];
      const prevAnswer = session.selectedAnswers[prevQuestion.id] || '';
      setCurrentAnswer(prevAnswer);
      setShowExplanation(!!prevAnswer);
    }
  };

  const handleSkipQuestion = () => {
    handleNextQuestion();
  };

  const handleEndSession = async () => {
    if (!session) return;

    try {
      // Send session data to backend
      await fetch('/api/student/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subjectId: session.subject.id,
          totalTime: sessionTime,
          questionsAttempted: Object.keys(session.selectedAnswers).length
        }),
      });
    } catch (err) {
      console.error('Error ending session:', err);
    }

    router.push('/dashboard');
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <AspectRatioLayout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="Loading practice session..." />
        </div>
      </AspectRatioLayout>
    );
  }

  if (error) {
    return (
      <AspectRatioLayout>
        <Layout className="full-height">
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.push('/dashboard')}
              style={{ marginRight: 8 }}
            >
              Back to Dashboard
            </Button>
            <Title level={3} style={{ margin: 0 }}>Practice Session</Title>
          </Header>
          <Content style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Alert
              message="Practice Session Error"
              description={error}
              type="error"
              showIcon
              action={
                <Space>
                  <Button size="small" onClick={() => router.push('/dashboard')}>
                    Back to Dashboard
                  </Button>
                  <Button size="small" type="primary" onClick={initializePracticeSession}>
                    Retry
                  </Button>
                </Space>
              }
            />
          </Content>
        </Layout>
      </AspectRatioLayout>
    );
  }

  if (!session) {
    return null;
  }

  const currentQuestion = session.questions[session.currentQuestionIndex];
  const progress = ((session.currentQuestionIndex + 1) / session.questions.length) * 100;
  const isAnswered = submittedAnswers.has(currentQuestion.id);
  const selectedAnswer = session.selectedAnswers[currentQuestion.id] || currentAnswer;

  return (
    <AspectRatioLayout>
      <Layout className="full-height">
        {/* Header with timer and progress */}
        <Header style={{ 
          background: '#fff', 
          padding: '0 16px', 
          display: 'flex', 
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleEndSession}
            style={{ marginRight: 16 }}
          >
            End Session
          </Button>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Title level={4} style={{ margin: 0 }}>
                {session.subject.name} Practice
              </Title>
              <Text type="secondary">
                Question {session.currentQuestionIndex + 1} of {session.questions.length}
              </Text>
            </div>
            
            <Space size="large">
              <div style={{ textAlign: 'center' }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                <Text strong>{formatTime(sessionTime)}</Text>
              </div>
              
              <Button
                type={isPaused ? "primary" : "default"}
                icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                onClick={() => setIsPaused(!isPaused)}
                size="small"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            </Space>
          </div>
        </Header>

        <Content style={{ padding: '24px', backgroundColor: '#f5f5f5' }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '24px' }}>
            <Progress 
              percent={progress} 
              showInfo={false}
              strokeColor="#1890ff"
              style={{ marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">Progress: {Math.round(progress)}%</Text>
              <Tag color={currentQuestion.difficulty === 'EASY' ? 'green' : 
                         currentQuestion.difficulty === 'MEDIUM' ? 'orange' : 'red'}>
                {currentQuestion.difficulty}
              </Tag>
            </div>
          </div>

          {/* Question Card */}
          <Card style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Title level={4}>{currentQuestion.title}</Title>
              <Paragraph style={{ fontSize: '16px', lineHeight: '1.6' }}>
                {currentQuestion.content}
              </Paragraph>
              
              {currentQuestion.attemptCount && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {currentQuestion.attemptCount} students attempted this question
                </Text>
              )}
            </div>

            {/* Options */}
            <Radio.Group
              value={selectedAnswer}
              onChange={(e) => handleAnswerSelect(e.target.value)}
              style={{ width: '100%' }}
              disabled={isAnswered}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="A" style={{ padding: '8px', fontSize: '16px' }}>
                  <strong>A)</strong> {currentQuestion.option_a}
                </Radio>
                <Radio value="B" style={{ padding: '8px', fontSize: '16px' }}>
                  <strong>B)</strong> {currentQuestion.option_b}
                </Radio>
                <Radio value="C" style={{ padding: '8px', fontSize: '16px' }}>
                  <strong>C)</strong> {currentQuestion.option_c}
                </Radio>
                <Radio value="D" style={{ padding: '8px', fontSize: '16px' }}>
                  <strong>D)</strong> {currentQuestion.option_d}
                </Radio>
              </Space>
            </Radio.Group>

            {/* Explanation */}
            {showExplanation && isAnswered && (
              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f6ffed', borderRadius: '6px', border: '1px solid #b7eb8f' }}>
                <Title level={5} style={{ color: '#52c41a', marginBottom: '8px' }}>
                  <CheckCircleOutlined style={{ marginRight: '8px' }} />
                  Explanation
                </Title>
                <Paragraph style={{ margin: 0 }}>
                  <strong>Correct Answer:</strong> {currentQuestion.correct_option}) {
                    currentQuestion.correct_option === 'A' ? currentQuestion.option_a :
                    currentQuestion.correct_option === 'B' ? currentQuestion.option_b :
                    currentQuestion.correct_option === 'C' ? currentQuestion.option_c :
                    currentQuestion.option_d
                  }
                </Paragraph>
                <Paragraph style={{ margin: '8px 0 0 0' }}>
                  {currentQuestion.explanation}
                </Paragraph>
              </div>
            )}
          </Card>

          {/* Navigation */}
          <Card>
            <Row gutter={16} align="middle">
                             <Col>
                 <Button
                   icon={<LeftOutlined />}
                   onClick={handlePreviousQuestion}
                   disabled={session.currentQuestionIndex === 0}
                 >
                   Previous
                 </Button>
               </Col>
              
              <Col flex="auto" style={{ textAlign: 'center' }}>
                {!isAnswered ? (
                  <Space direction="vertical">
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleSubmitAnswer}
                      disabled={!currentAnswer || submitting}
                      loading={submitting}
                      icon={!submitting ? <CheckCircleOutlined /> : undefined}
                    >
                      {submitting ? 'Submitting...' : 'Submit Answer'}
                    </Button>
                    {process.env.NODE_ENV === 'development' && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Debug: Selected={currentAnswer || 'none'}, Can Submit={!!currentAnswer}
                      </Text>
                    )}
                    <Button
                      onClick={handleSkipQuestion}
                      disabled={session.currentQuestionIndex === session.questions.length - 1}
                    >
                      Skip Question
                    </Button>
                  </Space>
                ) : (
                  <Text type="secondary">
                    Answer submitted! {selectedAnswer === currentQuestion.correct_option ? '✅ Correct' : '❌ Incorrect'}
                  </Text>
                )}
              </Col>
              
                             <Col>
                 <Button
                   icon={<RightOutlined />}
                   onClick={handleNextQuestion}
                   disabled={session.currentQuestionIndex === session.questions.length - 1}
                 >
                   Next
                 </Button>
               </Col>
            </Row>
          </Card>
        </Content>
      </Layout>
    </AspectRatioLayout>
  );
} 