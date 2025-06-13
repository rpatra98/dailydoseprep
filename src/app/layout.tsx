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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    console.log("Root layout mounted");
    // Short timeout to ensure CSS is applied
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    
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
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            width: '100vw'
          }}>
            <p>Loading application...</p>
          </div>
        ) : (
          <AntdRegistry>
            <ConfigProvider theme={theme}>
              <AuthProvider>
                <div className="app-container">
                  {children}
                </div>
              </AuthProvider>
            </ConfigProvider>
          </AntdRegistry>
        )}
      </body>
    </html>
  );
}
