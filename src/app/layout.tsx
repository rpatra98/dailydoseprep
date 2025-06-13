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
    // Add global error handler
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
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
        maxWidth: '600px', 
        margin: '40px auto',
        backgroundColor: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1>Something went wrong</h1>
        <p>{error?.message || "An unexpected error occurred"}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#1677ff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload the application
        </button>
      </div>
    );
  }

  return children;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    console.log("Root layout mounted");
    
    // Check if environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
    } else {
      console.log("Supabase environment variables found");
    }
    
    // Shorter timeout to improve user experience
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="en">
      <head>
        <title>Daily Dose Prep | Competitive Exam Preparation</title>
        <meta name="description" content="Practice questions for UPSC, JEE, NEET, SSC and other competitive exams in India" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            width: '100%',
            backgroundColor: '#f5f5f5'
          }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '20px' }}>Loading Daily Dose Prep...</p>
          </div>
        ) : (
          <ErrorBoundary>
            <AntdRegistry>
              <ConfigProvider theme={theme}>
                <AuthProvider>
                  {children}
                </AuthProvider>
              </ConfigProvider>
            </AntdRegistry>
          </ErrorBoundary>
        )}
      </body>
    </html>
  );
}
