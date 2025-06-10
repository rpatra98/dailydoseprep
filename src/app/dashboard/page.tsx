'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

interface Todo {
  id: string;
  task: string;
  is_complete: boolean;
  created_at: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    } else {
      fetchTodos();
    }
  }, [user, router]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
      alert('Error fetching todos!');
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ task: newTask, user_id: user?.id }])
        .select();

      if (error) throw error;
      if (data) {
        setTodos([...data, ...todos]);
        setNewTask('');
      }
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('Error adding todo!');
    }
  };

  const toggleTodoCompletion = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setTodos(
        todos.map((todo) => {
          if (todo.id === id) {
            return { ...todo, is_complete: !currentStatus };
          }
          return todo;
        })
      );
    } catch (error) {
      console.error('Error updating todo:', error);
      alert('Error updating todo!');
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Error deleting todo!');
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/auth');
  };

  if (!user) {
    return null; // will redirect in useEffect
  }

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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome, {user.email}</h2>
          
          <form onSubmit={addTodo} className="flex mb-6">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add
            </button>
          </form>
          
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">Your Tasks</h3>
            
            {loading ? (
              <p className="text-gray-500">Loading tasks...</p>
            ) : todos.length === 0 ? (
              <p className="text-gray-500">No tasks yet. Add one above!</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {todos.map((todo) => (
                  <li key={todo.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={todo.is_complete}
                          onChange={() => toggleTodoCompletion(todo.id, todo.is_complete)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span 
                          className={`ml-3 ${
                            todo.is_complete ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}
                        >
                          {todo.task}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 