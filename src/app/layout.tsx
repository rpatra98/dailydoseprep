"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ConfigProvider } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import theme from '@/theme/themeConfig';
import { useState, useEffect } from "react";
import { clearBrowserClient } from "@/lib/supabase-browser";

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
    // Check if environment variables are available (only in development)
    if (process.env.NODE_ENV === 'development') {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Missing Supabase environment variables");
      }
    }
    
    // Clean up any invalid tokens on app startup
    const cleanupTokens = () => {
      try {
        if (typeof window !== 'undefined') {
          // Clear the old custom storage key if it exists
          const oldAuthToken = window.localStorage.getItem('ddp-supabase-auth-token');
          if (oldAuthToken) {
            window.localStorage.removeItem('ddp-supabase-auth-token');
            if (process.env.NODE_ENV === 'development') {
              console.log('Removed old custom auth token');
            }
          }
          
          // Check for invalid tokens in default Supabase storage
          const keysToCheck = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('sb-'))) {
              keysToCheck.push(key);
            }
          }
          
          // Validate each auth token
          for (const key of keysToCheck) {
            try {
              const tokenValue = window.localStorage.getItem(key);
              if (tokenValue) {
                const parsed = JSON.parse(tokenValue);
                // If token is malformed or expired, clear it
                if (!parsed.access_token || !parsed.refresh_token) {
                  window.localStorage.removeItem(key);
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Removed invalid token:', key);
                  }
                }
              }
            } catch (e) {
              // If we can't parse the token, it's invalid
              window.localStorage.removeItem(key);
              if (process.env.NODE_ENV === 'development') {
                console.log('Removed unparseable token:', key);
              }
            }
          }
        }
      } catch (error) {
        // Silent cleanup failure
        if (process.env.NODE_ENV === 'development') {
          console.error('Token cleanup error:', error);
        }
      }
    };
    
    cleanupTokens();
    
    // Shorter timeout to improve user experience
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
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
            Loading...
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
