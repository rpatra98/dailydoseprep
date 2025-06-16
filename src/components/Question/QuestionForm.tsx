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
  Spin
} from 'antd';
import { 
  QuestionCircleOutlined, 
  SaveOutlined, 
  CloseOutlined 
} from '@ant-design/icons';
import { getBrowserClient } from '@/lib/supabase-browser';
import { Question, DifficultyLevel, ExamCategory, Option, Subject } from '@/types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option: SelectOption } = Select;

interface QuestionFormProps {
  onComplete?: (question: Question) => void;
  onCancel?: () => void;
}

export const QuestionForm = ({ onComplete, onCancel }: QuestionFormProps) => {
  const [form] = Form.useForm();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const supabase = getBrowserClient();
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name', { ascending: true });
          
        if (error) {
          throw new Error('Failed to load subjects');
        }
        
        setSubjects(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);
  
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      setError(null);
      
      const supabase = getBrowserClient();
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error('You must be logged in to create questions');
      }
      
      // Prepare the question object
      const questionData = {
        title: values.title,
        content: values.content,
        optionA: values.optionA,
        optionB: values.optionB,
        optionC: values.optionC,
        optionD: values.optionD,
        correctOption: values.correctOption,
        explanation: values.explanation,
        difficulty: values.difficulty || 'MEDIUM', // Default to MEDIUM if not provided
        examCategory: values.examCategory || 'OTHER', // Default to OTHER if not provided
        subject: values.subject,
        year: values.year ? parseInt(values.year, 10) : null,
        source: values.source || null,
      };
      
      // Make API call to create the question
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(questionData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create question');
      }
      
      const createdQuestion = await response.json();
      
      // Reset the form
      form.resetFields();
      
      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete(createdQuestion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <Spin tip="Loading..." />;
  }
  
  return (
    <div>
      <Title level={3}>Create New Question</Title>
      <Text>
        Fill out the required fields below to create a complete question. Each question must have four options
        with one correct answer and belong to a specific subject.
      </Text>
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 16, marginBottom: 16 }}
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
        
        <Divider>Answer Options</Divider>
        
        <Form.Item
          name="optionA"
          label="Option A"
          rules={[{ required: true, message: 'Please enter Option A' }]}
        >
          <Input placeholder="Enter Option A" />
        </Form.Item>
        
        <Form.Item
          name="optionB"
          label="Option B"
          rules={[{ required: true, message: 'Please enter Option B' }]}
        >
          <Input placeholder="Enter Option B" />
        </Form.Item>
        
        <Form.Item
          name="optionC"
          label="Option C"
          rules={[{ required: true, message: 'Please enter Option C' }]}
        >
          <Input placeholder="Enter Option C" />
        </Form.Item>
        
        <Form.Item
          name="optionD"
          label="Option D"
          rules={[{ required: true, message: 'Please enter Option D' }]}
        >
          <Input placeholder="Enter Option D" />
        </Form.Item>
        
        <Form.Item
          name="correctOption"
          label="Correct Option"
          rules={[{ required: true, message: 'Please select the correct option' }]}
        >
          <Radio.Group>
            <Radio value="A">A</Radio>
            <Radio value="B">B</Radio>
            <Radio value="C">C</Radio>
            <Radio value="D">D</Radio>
          </Radio.Group>
        </Form.Item>
        
        <Form.Item
          name="explanation"
          label="Explanation for Correct Answer"
          rules={[{ required: true, message: 'Please provide an explanation for the correct answer' }]}
        >
          <TextArea 
            placeholder="Explain why this is the correct answer" 
            rows={4} 
            showCount 
            maxLength={1000} 
          />
        </Form.Item>
        
        <Divider>Question Details</Divider>
        
        <Form.Item
          name="subject"
          label="Subject"
          rules={[{ required: true, message: 'Please select a subject' }]}
        >
          <Select placeholder="Select the subject">
            {subjects.map(subject => (
              <SelectOption key={subject.id} value={subject.id}>
                {subject.name}
              </SelectOption>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="examCategory"
          label="Exam Category (Optional)"
          help="If not selected, will default to 'OTHER'"
        >
          <Select placeholder="Select exam category" allowClear>
            <SelectOption value="UPSC">UPSC</SelectOption>
            <SelectOption value="JEE">JEE</SelectOption>
            <SelectOption value="NEET">NEET</SelectOption>
            <SelectOption value="SSC">SSC</SelectOption>
            <SelectOption value="OTHER">OTHER</SelectOption>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="difficulty"
          label="Difficulty Level (Optional)"
          help="If not selected, will default to 'MEDIUM'"
        >
          <Select placeholder="Select difficulty" allowClear>
            <SelectOption value="EASY">Easy</SelectOption>
            <SelectOption value="MEDIUM">Medium</SelectOption>
            <SelectOption value="HARD">Hard</SelectOption>
          </Select>
        </Form.Item>
        
        <Form.Item name="year" label="Year (Optional)">
          <Input placeholder="Enter year (e.g., 2023)" type="number" />
        </Form.Item>
        
        <Form.Item name="source" label="Source/Reference (Optional)">
          <Input placeholder="Enter source or reference" />
        </Form.Item>
        
        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              icon={<SaveOutlined />}
            >
              Submit Question
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