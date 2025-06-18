'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Typography, 
  Alert, 
  Spin, 
  Tabs, 
  Progress,
  Tag,
  Space,
  Divider,
  Grid
} from 'antd';
import { 
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  BookOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  CalendarOutlined,
  UserOutlined
} from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { useBreakpoint } = Grid;

interface User {
  id: string;
  email: string;
  role: string;
  primarysubject?: string;
  primarySubjectData?: {
    id: string;
    name: string;
  };
}

interface Subject {
  id: string;
  name: string;
  score: number;
  timeSpent: number; // in minutes
  questionsAttempted: number;
  totalQuestions: number;
}

interface SessionData {
  currentStreak: number;
  longestStreak: number;
  todayTimeSpent: number; // in minutes
  totalTimeSpent: number; // in minutes
  totalQuestionsAnswered: number;
  overallScore: number; // percentage
}

interface EnhancedStudentDashboardProps {
  user: User | null;
}

const EnhancedStudentDashboard = ({ user }: EnhancedStudentDashboardProps) => {
  const router = useRouter();
  const screens = useBreakpoint();
  const isMobile = screens.xs || !screens.sm;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessionData, setSessionData] = useState<SessionData>({
    currentStreak: 0,
    longestStreak: 0,
    todayTimeSpent: 0,
    totalTimeSpent: 0,
    totalQuestionsAnswered: 0,
    overallScore: 0
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('today');

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch student analytics data
      const response = await fetch('/api/student/analytics', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      
      setSubjects(data.subjects || []);
      setSessionData(data.sessionData || {
        currentStreak: 0,
        longestStreak: 0,
        todayTimeSpent: 0,
        totalTimeSpent: 0,
        totalQuestionsAnswered: 0,
        overallScore: 0
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#52c41a'; // green
    if (score >= 60) return '#faad14'; // orange
    return '#ff4d4f'; // red
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" tip="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchDashboardData}>
            Retry
          </Button>
        }
      />
    );
  }

  // Check if user needs to select subjects
  if (subjects.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <UserOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={3}>Welcome to Daily Dose Prep!</Title>
          <Paragraph>
            Get started by selecting your subjects for comprehensive exam preparation.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => router.push('/subjects/select')}>
            Select Subjects
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* Quick Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Overall Score"
              value={sessionData.overallScore}
              precision={1}
              suffix="%"
              valueStyle={{ color: getScoreColor(sessionData.overallScore) }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Login Streak"
              value={sessionData.currentStreak}
              suffix="days"
              valueStyle={{ color: '#cf1322' }}
              prefix={<FireOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Best: {sessionData.longestStreak} days
            </Text>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Today's Time"
              value={formatTime(sessionData.todayTimeSpent)}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Questions"
              value={sessionData.totalQuestionsAnswered}
              valueStyle={{ color: '#52c41a' }}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Subject Performance Grid */}
      <Card title="Subject Performance" style={{ marginBottom: '24px' }}>
        {subjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <BookOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={5} style={{ color: '#999', margin: 0 }}>
              No Performance Data Yet
            </Title>
            <Text type="secondary">
              Start practicing questions to see your performance metrics here.
            </Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {subjects.map((subject) => (
              <Col xs={24} sm={12} md={8} lg={6} key={subject.id}>
                <Card 
                  size="small"
                  actions={[
                    <Link href={`/practice?subject=${subject.id}`} key="practice">
                      <Button type="link" icon={<PlayCircleOutlined />}>
                        Practice
                      </Button>
                    </Link>
                  ]}
                >
                  <div style={{ textAlign: 'center' }}>
                    <Title level={5} style={{ margin: '0 0 8px 0' }}>
                      {subject.name}
                    </Title>
                    {subject.questionsAttempted > 0 ? (
                      <Progress
                        type="circle"
                        size={60}
                        percent={subject.score}
                        format={(percent) => `${percent}%`}
                        strokeColor={getScoreColor(subject.score)}
                      />
                    ) : (
                      <div style={{ 
                        width: '60px', 
                        height: '60px', 
                        border: '2px dashed #d9d9d9', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto',
                        color: '#999'
                      }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          No data
                        </Text>
                      </div>
                    )}
                    <div style={{ marginTop: '12px' }}>
                      <Space direction="vertical" size="small">
                        <Text type="secondary">
                          Time: {subject.timeSpent > 0 ? formatTime(subject.timeSpent) : 'No time logged'}
                        </Text>
                        <Text type="secondary">
                          {subject.questionsAttempted}/{subject.totalQuestions || 'Unknown'} questions
                        </Text>
                        {subject.questionsAttempted === 0 && subject.totalQuestions === 0 && (
                          <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                            No questions available
                          </Text>
                        )}
                      </Space>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Time Spent Analytics */}
      <Card title="Time Spent Analytics" style={{ marginBottom: '24px' }}>
        <Tabs 
          defaultActiveKey="today" 
          onChange={setSelectedTimeRange}
          items={[
            {
              key: 'today',
              label: 'Today',
              children: (
                <div>
                  {subjects.length === 0 || subjects.every(s => s.timeSpent === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <ClockCircleOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '16px' }} />
                      <Text type="secondary">No time logged today. Start practicing to track your progress!</Text>
                    </div>
                  ) : (
                    subjects.map((subject) => (
                      <div key={subject.id} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <Text>{subject.name}</Text>
                          <Text strong>
                            {subject.timeSpent > 0 ? formatTime(subject.timeSpent) : 'No time logged'}
                          </Text>
                        </div>
                        {subject.timeSpent > 0 && (
                          <Progress 
                            percent={(subject.timeSpent / Math.max(...subjects.map(s => s.timeSpent), 1)) * 100} 
                            showInfo={false}
                            strokeColor="#1890ff"
                          />
                        )}
                        {subject.timeSpent === 0 && (
                          <Progress 
                            percent={0} 
                            showInfo={false}
                            strokeColor="#f0f0f0"
                            trailColor="#f0f0f0"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )
            },
            {
              key: 'week',
              label: 'This Week',
              children: (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <BarChartOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <Text type="secondary">Weekly analytics will be available once you have more practice data.</Text>
                </div>
              )
            },
            {
              key: 'month',
              label: 'This Month',
              children: (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <BarChartOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <Text type="secondary">Monthly analytics will be available once you have more practice data.</Text>
                </div>
              )
            },
            {
              key: 'all',
              label: 'All Time',
              children: (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <BarChartOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <Text type="secondary">All-time analytics will be available once you have more practice data.</Text>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Quick Actions */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <PlayCircleOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '12px' }} />
              <Title level={4}>Start Practice</Title>
              <Paragraph type="secondary">
                Continue your learning journey with subject-based practice sessions.
              </Paragraph>
              <Link href="/practice">
                <Button type="primary" size="large" block>
                  Start Practicing
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CalendarOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '12px' }} />
              <Title level={4}>Daily Questions</Title>
              <Paragraph type="secondary">
                Access your personalized daily question set for focused preparation.
              </Paragraph>
              <Link href="/daily-questions">
                <Button type="primary" size="large" block>
                  View Today's Questions
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <BarChartOutlined style={{ fontSize: '32px', color: '#faad14', marginBottom: '12px' }} />
              <Title level={4}>Performance</Title>
              <Paragraph type="secondary">
                View detailed analytics and track your progress over time.
              </Paragraph>
              <Link href="/analytics">
                <Button size="large" block>
                  View Analytics
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EnhancedStudentDashboard; 