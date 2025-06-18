import { useState, useEffect } from 'react';
import { 
  Form,
  Input,
  Select,
  Radio,
  Button,
  Alert,
  Typography,
  Space,
  Divider,
  Spin,
  message
} from 'antd';
import { 
  QuestionCircleOutlined, 
  SaveOutlined, 
  CloseOutlined 
} from '@ant-design/icons';
import { Question, DifficultyLevel, ExamCategory, Option, Subject } from '@/types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option: SelectOption } = Select;

interface QuestionFormProps {
  onComplete?: (question: Question) => void;
  onCancel?: () => void;
  initialData?: Question | null; // For edit mode
  mode?: 'create' | 'edit'; // Form mode
}

export const QuestionForm = ({ onComplete, onCancel, initialData, mode = 'create' }: QuestionFormProps) => {
  const [form] = Form.useForm();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set initial form values when editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.setFieldsValue({
        title: initialData.title,
        content: initialData.content,
        optionA: initialData.optionA,
        optionB: initialData.optionB,
        optionC: initialData.optionC,
        optionD: initialData.optionD,
        correctOption: initialData.correctOption,
        explanation: initialData.explanation,
        difficulty: initialData.difficulty,
        subject: initialData.subject,
        examCategory: initialData.examCategory,
        year: initialData.year,
        source: initialData.source
      });
    }
  }, [mode, initialData, form]);
  
  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use fetch API to get subjects instead of direct Supabase client
        const response = await fetch('/api/subjects', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to load subjects');
        }
        
        const data = await response.json();
        setSubjects(data || []);
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);
  
  const handleSubmit = async (values: any) => {
    // Only log in development
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      console.log(`${mode === 'edit' ? 'Updating' : 'Creating'} question with values:`, {
        title: values.title,
        content: values.content,
        optionA: values.optionA ? 'present' : 'missing',
        optionB: values.optionB ? 'present' : 'missing',
        optionC: values.optionC ? 'present' : 'missing',
        optionD: values.optionD ? 'present' : 'missing',
        correctOption: values.correctOption,
        explanation: values.explanation ? 'present' : 'missing',
        difficulty: values.difficulty,
        subject: values.subject,
        source: values.source || 'not provided'
      });
    }

    setSubmitting(true);
    setError('');

    try {
      const questionData = {
        title: values.title,
        content: values.content,
        optionA: values.optionA,
        optionB: values.optionB,
        optionC: values.optionC,
        optionD: values.optionD,
        correctAnswer: values.correctOption,
        explanation: values.explanation,
        difficulty: values.difficulty,
        subject: values.subject,
        examCategory: values.examCategory,
        year: values.year,
        source: values.source || null
      };

      if (isDev) {
        console.log(`Sending question data to API (${mode}):`, questionData);
      }

      const apiUrl = mode === 'edit' && initialData 
        ? `/api/qauthor/questions/${initialData.id}`
        : '/api/questions';
      
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(questionData),
      });

      if (isDev) {
        console.log('API response status:', response.status);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${mode} question`);
      }

      const result = await response.json();
      const processedQuestion = result.question || result;

      if (isDev) {
        console.log(`Question ${mode}d successfully:`, processedQuestion.id);
      }

      message.success(`Question ${mode}d successfully!`);
      
      if (mode === 'create') {
        form.resetFields();
      }
      
      if (onComplete && processedQuestion) {
        onComplete(processedQuestion);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${mode} question`;
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <Spin tip="Loading subjects..." />;
  }
  
  return (
    <div>
      <Title level={3}>{mode === 'edit' ? 'Edit Question' : 'Create New Question'}</Title>
      <Text>
        {mode === 'edit' 
          ? 'Update the fields below to modify this question.'
          : 'Fill out the required fields below to create a complete question. Each question must have four options with one correct answer and belong to a specific subject.'
        }
      </Text>
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 16, marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: 24 }}
      >
        <Form.Item
          name="title"
          label="Question Title"
          rules={[{ required: true, message: 'Please enter a title for the question' }]}
        >
          <Input placeholder="Enter a brief, descriptive title" />
        </Form.Item>
        
        <Form.Item
          name="content"
          label="Question Content"
          rules={[{ required: true, message: 'Please enter the question content' }]}
        >
          <TextArea 
            placeholder="Enter the full question text" 
            rows={4} 
            showCount 
            maxLength={1000} 
          />
        </Form.Item>
        
        <Divider>Options</Divider>
        
        <Form.Item
          name="optionA"
          label="Option A"
          rules={[{ required: true, message: 'Please enter option A' }]}
        >
          <Input placeholder="Enter option A" />
        </Form.Item>
        
        <Form.Item
          name="optionB"
          label="Option B"
          rules={[{ required: true, message: 'Please enter option B' }]}
        >
          <Input placeholder="Enter option B" />
        </Form.Item>
        
        <Form.Item
          name="optionC"
          label="Option C"
          rules={[{ required: true, message: 'Please enter option C' }]}
        >
          <Input placeholder="Enter option C" />
        </Form.Item>
        
        <Form.Item
          name="optionD"
          label="Option D"
          rules={[{ required: true, message: 'Please enter option D' }]}
        >
          <Input placeholder="Enter option D" />
        </Form.Item>
        
        <Form.Item
          name="correctOption"
          label="Correct Answer"
          rules={[{ required: true, message: 'Please select the correct answer' }]}
        >
          <Radio.Group>
            <Radio value="A">Option A</Radio>
            <Radio value="B">Option B</Radio>
            <Radio value="C">Option C</Radio>
            <Radio value="D">Option D</Radio>
          </Radio.Group>
        </Form.Item>
        
        <Form.Item
          name="explanation"
          label="Explanation"
          rules={[{ required: true, message: 'Please provide an explanation for the correct answer' }]}
        >
          <TextArea 
            placeholder="Explain why this is the correct answer" 
            rows={3} 
            showCount 
            maxLength={500}
          />
        </Form.Item>
        
        <Divider>Question Details</Divider>
        
        <Form.Item
          name="subject"
          label="Subject"
          rules={[{ required: true, message: 'Please select a subject' }]}
        >
          <Select placeholder="Select a subject">
            {subjects.map((subject) => (
              <SelectOption key={subject.id} value={subject.id}>
                {subject.name}
              </SelectOption>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="difficulty"
          label="Difficulty Level"
          rules={[{ required: true, message: 'Please select difficulty level' }]}
        >
          <Select placeholder="Select difficulty">
            <SelectOption value="EASY">Easy</SelectOption>
            <SelectOption value="MEDIUM">Medium</SelectOption>
            <SelectOption value="HARD">Hard</SelectOption>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="examCategory"
          label="Exam Category"
          rules={[{ required: true, message: 'Please select exam category' }]}
        >
          <Select placeholder="Select exam category">
            <SelectOption value="UPSC">UPSC</SelectOption>
            <SelectOption value="JEE">JEE</SelectOption>
            <SelectOption value="NEET">NEET</SelectOption>
            <SelectOption value="SSC">SSC</SelectOption>
            <SelectOption value="OTHER">Other</SelectOption>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="year"
          label="Year (Optional)"
        >
          <Input type="number" placeholder="Enter year (e.g., 2023)" min={1900} max={2030} />
        </Form.Item>
        
        <Form.Item
          name="source"
          label="Source (Optional)"
        >
          <Input placeholder="Enter source (e.g., Previous Year Paper, Mock Test)" />
        </Form.Item>
        
        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={submitting}
            >
              {mode === 'edit' ? 'Update Question' : 'Create Question'}
            </Button>
            {onCancel && (
              <Button 
                onClick={onCancel}
                icon={<CloseOutlined />}
              >
                Cancel
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default QuestionForm; 