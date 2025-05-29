# Next.js + Supabase Starter

A modern full-stack application starter template using Next.js and Supabase.

## Features

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Authentication (Email/Password)
- Protected Routes
- Todo Application Example

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- A Supabase account (free tier available)

### Setup

1. Clone this repository

```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Create a Supabase project

   - Go to [Supabase](https://supabase.com) and create a new project
   - Once your project is ready, go to Settings > API and copy your URL and anon key

4. Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Set up the database schema

   - In your Supabase project, navigate to the SQL Editor
   - Create a new query and paste the following SQL:

```sql
-- Create a table for todos
CREATE TABLE todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own todos
CREATE POLICY "Users can view their own todos" ON todos
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own todos
CREATE POLICY "Users can insert their own todos" ON todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own todos
CREATE POLICY "Users can update their own todos" ON todos
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own todos
CREATE POLICY "Users can delete their own todos" ON todos
  FOR DELETE USING (auth.uid() = user_id);
```

6. Run the development server

```bash
npm run dev
# or
yarn dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

- Visit the home page at `/`
- Sign up or log in at `/auth`
- Access the protected dashboard at `/dashboard`
- Create, read, update, and delete todos once logged in

## Deployment

This project can be deployed on any platform that supports Next.js applications, such as Vercel, Netlify, or your own server.

```bash
npm run build
npm start
```

## Learn More

To learn more about the technologies used in this project, check out the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
