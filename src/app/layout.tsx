"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
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
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    try {
      console.log("Root layout mounted");
    } catch (err) {
      console.error("Error in RootLayout:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  if (error) {
    return (
      <html lang="en">
        <body>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Something went wrong in the application</h1>
            <p>{error.message}</p>
            <button onClick={() => window.location.reload()}>Reload</button>
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AntdRegistry>
          <ConfigProvider theme={theme}>
            <AuthProvider>
              <div className="aspect-ratio-container">
                <div className="aspect-ratio-content">
                  {children}
                </div>
              </div>
            </AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
