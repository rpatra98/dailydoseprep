import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isDev) {
      console.log('🔄 Starting login process for:', email);
    }

    try {
      // Call the login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      if (isDev) {
        console.log('📡 Login API response status:', response.status);
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (isDev) {
          console.error('❌ Login failed:', errorData.error);
        }
        throw new Error(errorData.error || 'Login failed');
      }

      const result = await response.json();
      if (isDev) {
        console.log('✅ Login successful for user:', result.user?.email);
      }

      setMessage({ type: 'success', text: 'Logged in successfully!' });
      
      // Redirect based on user role
      setTimeout(() => {
        if (result.user?.role === 'ADMIN') {
          if (isDev) {
            console.log('🔄 Redirecting ADMIN to admin dashboard...');
          }
          router.push('/admin/questions');
        } else if (result.user?.role === 'QAUTHOR') {
          if (isDev) {
            console.log('🔄 Redirecting QAUTHOR to question creation...');
          }
          router.push('/create-question');
        } else {
          if (isDev) {
            console.log('🔄 Redirecting STUDENT to dashboard...');
          }
          router.push('/dashboard');
        }
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login';
      if (isDev) {
        console.error('❌ Login error:', errorMessage);
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your password"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
} 