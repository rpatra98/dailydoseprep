'use client';

import { useState } from 'react';
import LoginForm from '@/components/Auth/LoginForm';
import SignupForm from '@/components/Auth/SignupForm';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">
          Welcome to Next.js + Supabase
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in or create an account to get started
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`py-2 px-4 font-medium text-sm flex-1 ${
                activeTab === 'login'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm flex-1 ${
                activeTab === 'signup'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {activeTab === 'login' ? <LoginForm /> : <SignupForm />}
        </div>
      </div>
    </div>
  );
} 