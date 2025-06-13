# Supabase CORS Configuration Guide

## Problem
The login page is stuck due to CORS (Cross-Origin Resource Sharing) errors when trying to refresh authentication tokens. This happens because Supabase is blocking requests from our deployed domain (`dailydoseprep.vercel.app`).

## Solution
You need to configure Supabase to allow requests from your domain. Follow these steps:

### 1. Log in to Supabase Dashboard
- Go to [https://app.supabase.com/](https://app.supabase.com/)
- Sign in with your credentials
- Select your project (the one with URL: `yncwjgyldietctftdpuu.supabase.co`)

### 2. Configure CORS Settings
1. In the left sidebar, click on **Authentication**
2. In the Authentication section, click on **URL Configuration**
3. Under **Site URL**, ensure your Vercel deployment URL is added: `https://dailydoseprep.vercel.app`
4. Under **Redirect URLs**, add:
   - `https://dailydoseprep.vercel.app/login`
   - `https://dailydoseprep.vercel.app/`
   - `https://dailydoseprep.vercel.app/*`

### 3. Configure API Settings
1. In the left sidebar, click on **Project Settings**
2. Click on **API**
3. Scroll down to the **CORS** section
4. Under **Additional allowed origins**, add:
   - `https://dailydoseprep.vercel.app`
   - If you're testing locally, also add `http://localhost:3000`

### 4. Save Changes
- Click **Save** to apply the changes
- It may take a few minutes for the changes to propagate

### 5. Verify Configuration
After making these changes, try logging in again. The CORS errors should be resolved, and authentication should work properly.

## Important Notes
- Never use wildcard (`*`) for production environments as it's a security risk
- Always specify the exact domains that should be allowed
- If you add new deployment domains in the future, remember to update the Supabase CORS configuration
- These settings cannot be configured through code alone - they must be set in the Supabase dashboard

## Troubleshooting
If you're still experiencing CORS issues after following these steps:
1. Clear your browser cache and cookies
2. Check browser console for specific error messages
3. Verify that the domain in the error matches exactly what you've configured
4. Ensure you've added both the base URL and any specific paths needed 