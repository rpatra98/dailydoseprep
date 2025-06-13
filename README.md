# Daily Dose Prep

A web application for competitive exam preparation with daily practice questions.

## Features

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Authentication (Email/Password)
- Protected Routes
- Todo Application Example

## Database Setup

The application requires a Supabase database with the correct schema. If you're seeing the error `relation "public.subjects" does not exist`, you need to set up your database schema:

### Option 1: Using the Setup Script

1. Make sure your `.env.local` file contains the correct Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

2. Run the setup script:
   ```bash
   npm run setup-db
   ```

### Option 2: Manual Setup

1. Create a new Supabase project at [https://app.supabase.com/](https://app.supabase.com/)

2. Once your project is created, navigate to the SQL Editor in the Supabase dashboard

3. Create a new query and paste the contents of `src/db/schema.sql`

4. Run the SQL query to create all necessary tables and policies

5. Update your environment variables with your Supabase project URL and keys

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

This application is deployed on Vercel. Connect your GitHub repository to Vercel and configure the environment variables in the Vercel dashboard.

## Troubleshooting

### Error: relation "public.subjects" does not exist

This error occurs when the database schema hasn't been properly set up. Follow the Database Setup instructions above to create the required tables.

### Multiple GoTrueClient instances detected

This warning is normal during development and doesn't affect functionality. We've implemented a singleton pattern for the Supabase client to minimize this issue.

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
