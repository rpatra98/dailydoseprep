'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { User, UserRole } from '@/types';

export default function Dashboard() {
  const { user, logout, createQAUTHOR } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // For creating new QAUTHOR
  const [newAuthorEmail, setNewAuthorEmail] = useState('');
  const [newAuthorPassword, setNewAuthorPassword] = useState('');
  const [creatingAuthor, setCreatingAuthor] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Function to fetch user role and data
    async function fetchData() {
      // Get user ID safely
      const userId = user?.id;
      if (!userId) {
        return;
      }
      
      // 1. Get user role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user role:', userError);
        return;
      }
      
      if (userData?.role) {
        setUserRole(userData.role as UserRole);
        
        // 2. If SUPERADMIN, fetch all users
        if (userData.role === 'SUPERADMIN') {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (usersError) {
            console.error('Error fetching users:', usersError);
            return;
          }
          
          if (usersData) {
            setUsers(usersData as User[]);
          }
        }
      }
    }

    // Call the fetch function
    fetchData();
  }, [user, router]);

  const refreshUsers = async () => {
    if (userRole !== 'SUPERADMIN') return;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error refreshing users:', error);
      return;
    }
    
    if (data) {
      setUsers(data as User[]);
    }
  };

  const handleCreateQAUTHOR = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    
    if (!newAuthorEmail || !newAuthorPassword) {
      setCreateError('Email and password are required');
      return;
    }

    try {
      setCreatingAuthor(true);
      await createQAUTHOR(newAuthorEmail, newAuthorPassword);
      setCreateSuccess(`QAUTHOR account created for ${newAuthorEmail}`);
      setNewAuthorEmail('');
      setNewAuthorPassword('');
      
      // Refresh user list
      refreshUsers();
    } catch (error) {
      console.error('Error creating QAUTHOR:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create QAUTHOR');
    } finally {
      setCreatingAuthor(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  // If not logged in, don't render anything (will redirect in useEffect)
  if (!user) {
    return <div className="min-h-screen bg-gray-50"></div>;
  }

  // If role not fetched yet, render minimal content
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button onClick={handleSignOut} className="bg-red-600 text-white px-4 py-2 rounded-md">Sign Out</button>
          </div>
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <p>Welcome, {user.email}</p>
          </div>
        </div>
      </div>
    );
  }

  // If user is not SUPERADMIN, show limited dashboard
  if (userRole !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Sign Out
            </button>
          </div>
          
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Welcome, {user.email}
            </h2>
            <p className="text-gray-600">
              Your role: {userRole}
            </p>

            {userRole === 'QAUTHOR' && (
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-700 mb-3">QAUTHOR Features</h3>
                <p className="text-gray-600 mb-4">
                  As a QAUTHOR, you can create questions for students to practice.
                </p>
                <button
                  onClick={() => router.push('/questions/create')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Create Questions
                </button>
              </div>
            )}

            {userRole === 'STUDENT' && (
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-700 mb-3">Student Features</h3>
                <p className="text-gray-600 mb-4">
                  As a student, you can practice questions from various competitive exams.
                </p>
                <button
                  onClick={() => router.push('/practice')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Practice Questions
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SUPERADMIN Dashboard
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">SUPERADMIN Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
        
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Create QAUTHOR Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Create QAUTHOR Account
            </h2>
            
            {createError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {createError}
              </div>
            )}
            
            {createSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {createSuccess}
              </div>
            )}
            
            <form onSubmit={handleCreateQAUTHOR}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={newAuthorEmail}
                  onChange={(e) => setNewAuthorEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={newAuthorPassword}
                  onChange={(e) => setNewAuthorPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  minLength={6}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 6 characters.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={creatingAuthor}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {creatingAuthor ? 'Creating...' : 'Create QAUTHOR'}
              </button>
            </form>
          </div>
          
          {/* User Management Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              User Management
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'QAUTHOR' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 