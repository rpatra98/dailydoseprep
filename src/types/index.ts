export type UserRole = 'SUPERADMIN' | 'QAUTHOR' | 'STUDENT';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type ExamCategory = 'UPSC' | 'JEE' | 'NEET' | 'SSC' | 'OTHER';
export type Option = 'A' | 'B' | 'C' | 'D';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
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
    subject: string;
    year?: number;
    source?: string;
    createdBy: string;
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

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    createQAUTHOR: (email: string, password: string) => Promise<void>;
    registerStudent: (email: string, password: string) => Promise<void>;
} 