export type UserRole = 'SUPERADMIN' | 'QAUTHOR' | 'STUDENT';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type ExamCategory = 'UPSC' | 'JEE' | 'NEET' | 'SSC' | 'OTHER';
export type Option = 'A' | 'B' | 'C' | 'D';

export interface Subject {
    id: string;
    name: string;
    examCategory: ExamCategory;
    description?: string;
    created_at: string;
    updated_at?: string;
}

export interface User {
    id: string;
    email: string;
    role: UserRole;
    primarySubject?: string;  // Subject ID for students
    created_at?: string;
    updated_at?: string;
}

export interface Question {
    id: string;
    title: string;
    content: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: Option;
    explanation: string;
    difficulty: DifficultyLevel;
    examCategory: ExamCategory;
    subject: string;  // Subject ID
    year?: number;
    source?: string;
    createdBy: string;  // QAUTHOR ID
    createdAt: Date;
    updatedAt: Date;
}

export interface StudentAttempt {
    id: string;
    studentId: string;
    questionId: string;
    selectedOption: Option;
    isCorrect: boolean;
    attemptedAt: Date;
}

export interface DailyQuestionSet {
    id: string;
    studentId: string;
    date: string;
    questions: string[];  // Array of question IDs
    completed: boolean;
    score?: number;
    created_at: Date;
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    authInitialized: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    createQAUTHOR: (email: string, password: string) => Promise<string>;
    registerStudent: (email: string, password: string) => Promise<string>;
} 