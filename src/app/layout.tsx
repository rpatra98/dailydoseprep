"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ConfigProvider } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import theme from '@/theme/themeConfig';
import { useState, useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Simple error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Add global error handler (only in development)
    const handleError = (event: ErrorEvent) => {
      if (process.env.NODE_ENV === 'development') {
        console.error("Global error caught:", event.error);
      }
      setError(event.error);
      setHasError(true);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: 'red',
        fontFamily: 'monospace'
      }}>
        <h2>Something went wrong</h2>
        <details style={{ whiteSpace: 'pre-wrap' }}>
          {error && error.toString()}
        </details>
        <button 
          onClick={() => {
            setHasError(false);
            setError(null);
            window.location.reload();
          }}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Check if environment variables are available (only in development)
    if (isDev) {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Missing Supabase environment variables");
      }
    }
    
    // Comprehensive session cleanup to prevent conflicts
    const cleanupSessions = () => {
      try {
        if (typeof window !== 'undefined') {
          const isLoginPage = window.location.pathname === '/login';
          
          // Clear any orphaned or conflicting auth tokens
          const keysToClean = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (
              key.includes('supabase') || 
              key.includes('sb-') || 
              key.includes('ddp-') ||
              key.includes('auth-token')
            )) {
              keysToClean.push(key);
            }
          }
          
          // Validate and clean up tokens
          for (const key of keysToClean) {
            try {
              const tokenValue = window.localStorage.getItem(key);
              if (tokenValue) {
                // Try to parse the token
                const parsed = JSON.parse(tokenValue);
                
                // Check if token structure is valid
                if (typeof parsed === 'object' && parsed !== null) {
                  // If it has auth-like structure, validate it
                  if (parsed.access_token || parsed.refresh_token) {
                    // Check if tokens are expired or malformed
                    if (!parsed.access_token || !parsed.refresh_token || 
                        typeof parsed.access_token !== 'string' ||
                        typeof parsed.refresh_token !== 'string') {
                      window.localStorage.removeItem(key);
                      if (isDev) console.log('Removed invalid token:', key);
                    }
                  }
                } else {
                  // Invalid structure
                  window.localStorage.removeItem(key);
                  if (isDev) console.log('Removed malformed token:', key);
                }
              }
            } catch (e) {
              // Can't parse - remove it
              window.localStorage.removeItem(key);
              if (isDev) console.log('Removed unparseable token:', key);
            }
          }

          // Clear session storage as well
          try {
            const sessionKeys = [];
            for (let i = 0; i < window.sessionStorage.length; i++) {
              const key = window.sessionStorage.key(i);
              if (key && (
                key.includes('supabase') || 
                key.includes('sb-') || 
                key.includes('ddp-')
              )) {
                sessionKeys.push(key);
              }
            }
            
            for (const key of sessionKeys) {
              window.sessionStorage.removeItem(key);
              if (isDev) console.log('Cleared session storage:', key);
            }
          } catch (e) {
            if (isDev) console.error('Session storage cleanup error:', e);
          }

          // Clear any cookies that might be conflicting (only auth-related ones)
          try {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const [name] = cookie.trim().split('=');
              if (name && (
                name.includes('supabase') || 
                name.includes('sb-') || 
                name.includes('ddp-')
              )) {
                // Clear the cookie
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                if (isDev) console.log('Cleared cookie:', name);
              }
            }
          } catch (e) {
            if (isDev) console.error('Cookie cleanup error:', e);
          }
        }
      } catch (error) {
        // Silent cleanup failure
        if (isDev) {
          console.error('Session cleanup error:', error);
        }
      }
    };
    
    // Run cleanup
    cleanupSessions();
    
    // Set a shorter timeout for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            fontSize: '18px',
            color: '#666'
          }}>
            Initializing...
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>Daily Dose Prep | Competitive Exam Preparation</title>
        <meta name="description" content="Practice questions for UPSC, JEE, NEET, SSC and other competitive exams in India" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <AntdRegistry>
            <ConfigProvider theme={theme}>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ConfigProvider>
          </AntdRegistry>
        </ErrorBoundary>
      </body>
    </html>
  );
}
