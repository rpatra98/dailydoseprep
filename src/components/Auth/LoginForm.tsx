import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();

  // Helper function for debug logging
  const log = (message: string, data?: any) => {
    if (isDev) {
      console.log(`[LoginForm] ${message}`, data || '');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading || authLoading) {
      log('⚠️ Login already in progress, ignoring submission');
      return;
    }

    setLoading(true);
    setMessage(null);

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    // Basic validation
    if (!trimmedEmail || !trimmedPassword) {
      setMessage({ type: 'error', text: 'Please enter both email and password' });
      setLoading(false);
      return;
    }

    log('🔄 Starting login process for:', trimmedEmail);

    try {
      // Use AuthContext signIn method
      const result = await signIn(trimmedEmail, trimmedPassword);

      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      log('✅ Login successful via AuthContext');
      setMessage({ type: 'success', text: 'Login successful!' });
      
      // Small delay to show success message, then redirect
      setTimeout(() => {
        log('🔄 Redirecting to dashboard...');
        router.push('/dashboard');
      }, 500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login';
      log('❌ Login error:', errorMessage);
      
      // Handle specific error types
      let displayMessage = errorMessage;
      if (errorMessage.includes('Invalid login credentials')) {
        displayMessage = 'Invalid email or password. Please check your credentials.';
      } else if (errorMessage.includes('Email not confirmed')) {
        displayMessage = 'Please check your email and confirm your account before logging in.';
      } else if (errorMessage.includes('Too many requests')) {
        displayMessage = 'Too many login attempts. Please wait a moment and try again.';
      }
      
      setMessage({ 
        type: 'error', 
        text: displayMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // If user is already logged in, redirect
  if (user && !loading && !authLoading) {
    log('✅ User already authenticated, redirecting to dashboard');
    router.push('/dashboard');
    return (
      <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-md text-center">
        <p>Already logged in. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      
      {message && (
        <div className={`p-3 rounded mb-4 ${
          message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || authLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your email"
            autoComplete="email"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || authLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || authLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : authLoading ? 'Loading...' : 'Sign In'}
        </button>
      </form>
      
      {isDev && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Debug Info:</strong><br />
          Auth Loading: {authLoading ? 'Yes' : 'No'}<br />
          Form Loading: {loading ? 'Yes' : 'No'}<br />
          Current User: {user ? `${user.email} (${user.role})` : 'None'}
        </div>
      )}
    </div>
  );
} 