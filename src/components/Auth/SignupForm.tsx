import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isDev) {
      console.log('🔄 Starting student registration for:', email);
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setMessage({ type: 'error', text: errorMsg });
      if (isDev) {
        console.error('❌ Password validation failed:', errorMsg);
      }
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters long';
      setMessage({ type: 'error', text: errorMsg });
      if (isDev) {
        console.error('❌ Password length validation failed:', errorMsg);
      }
      setLoading(false);
      return;
    }

    try {
      if (isDev) {
        console.log('📡 Sending registration request...');
      }

      // Call the registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          role: 'STUDENT'
        }),
      });

      if (isDev) {
        console.log('📡 Registration API response status:', response.status);
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (isDev) {
          console.error('❌ Registration failed:', errorData.error);
        }
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await response.json();
      if (isDev) {
        console.log('✅ Registration successful for user:', result.user?.email);
      }

      setMessage({ 
        type: 'success', 
        text: 'Account created successfully! You can now log in with your credentials.' 
      });
      
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // Redirect to login page after a delay
      setTimeout(() => {
        if (isDev) {
          console.log('🔄 Redirecting to login page...');
        }
        router.push('/login');
      }, 2000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
      if (isDev) {
        console.error('❌ Registration error:', errorMessage);
      }
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
      
      {message && (
        <div className={`p-3 rounded mb-4 ${
          message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSignup}>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            minLength={6}
            placeholder="Create a password"
          />
          <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
        </div>

        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            minLength={6}
            placeholder="Confirm your password"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
} 