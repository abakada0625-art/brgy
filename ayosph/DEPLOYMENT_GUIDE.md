# AyosPH - Complete Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Setting Up Supabase](#setting-up-supabase)
3. [Local Development Setup](#local-development-setup)
4. [GitHub Setup](#github-setup)
5. [Vercel Deployment](#vercel-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following:

### Required Accounts
- **GitHub Account**: [github.com](https://github.com)
- **Supabase Account**: [supabase.com](https://supabase.com)
- **Vercel Account**: [vercel.com](https://vercel.com)

### Required Software
- **VS Code**: [code.visualstudio.com](https://code.visualstudio.com)
- **Git**: [git-scm.com](https://git-scm.com)
- **Node.js** (optional): [nodejs.org](https://nodejs.org)

---

## Setting Up Supabase

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"New Project"**
3. Fill in the project details:
   - **Name**: `ayosph`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your location
4. Click **"Create new project"**
5. Wait for the project to be created (2-3 minutes)

### Step 2: Get Your API Keys

1. In your Supabase dashboard, click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"**
3. You'll see two keys:
   - **Project URL**: Copy this (e.g., `https://xxxxx.supabase.co`)
   - **anon public**: Copy this key
4. Save these for later

### Step 3: Create Database Tables

1. In Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` from your project
4. Paste it into the SQL editor
5. Click **"Run"** or press `Ctrl+Enter`
6. You should see "Success. No rows returned"

### Step 4: Create Storage Bucket

1. In Supabase dashboard, click **"Storage"** in the left sidebar
2. Click **"New bucket"**
3. Enter bucket name: `report-images`
4. Keep **"Public bucket"** checked
5. Click **"Create bucket"**

### Step 5: Configure Storage Policies

1. After creating the bucket, click on it
2. Click **"Policies"** tab
3. Click **"New policy"**
4. Select **"For full customization"**
5. Add the following policies:

**Policy 1: Allow authenticated users to upload images**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-images');
```

**Policy 2: Allow public read access**
```sql
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-images');
```

**Policy 3: Allow users to delete their own images**
```sql
CREATE POLICY "Allow users to delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'report-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

6. Click **"Save policy"** after each one

### Step 6: Enable Row Level Security (RLS)

The SQL schema already includes RLS policies. Verify they're enabled:

1. Go to **"Authentication"** → **"Policies"**
2. You should see policies for `users`, `reports`, `comments`, and `notifications` tables
3. If not, re-run the SQL schema

### Step 7: Create an Admin User

1. Go to **"Authentication"** → **"Users"**
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - **Email**: admin@ayosph.local (or your email)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: Check this box
4. Click **"Create user"**
5. After creation, go to **"SQL Editor"** and run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@ayosph.local';
```
(Replace with your admin email)

---

## Local Development Setup

### Step 1: Install VS Code Extensions

Open VS Code and install these extensions:
1. **Live Server** by Ritwick Dey
2. **Prettier** - Code formatter
3. **ESLint** - JavaScript linter
4. **GitLens** - Git supercharged

### Step 2: Clone or Setup Your Project

If you have the project files:
```bash
cd /path/to/your/project
```

### Step 3: Configure Supabase Credentials

1. Open `js/supabase.js` in VS Code
2. Replace the placeholder values:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### Step 4: Run Locally with Live Server

**Option A: Using VS Code Live Server Extension**
1. Right-click on `index.html`
2. Select **"Open with Live Server"**
3. Browser will open at `http://127.0.0.1:5500`

**Option B: Using Python**
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`

**Option C: Using Node.js http-server**
```bash
npx http-server -p 8000
```

### Step 5: Test the Application

1. Navigate to `register.html`
2. Create a test account
3. Check your email for verification (if enabled)
4. Login and test creating a report

---

## GitHub Setup

### Step 1: Create a GitHub Account

1. Go to [github.com](https://github.com)
2. Click **"Sign up"**
3. Follow the registration process
4. Verify your email

### Step 2: Install Git

**Windows:**
1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Run installer with default settings

**Mac:**
```bash
git --version  # If not installed, follow prompts
```

**Linux:**
```bash
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

### Step 3: Create a New Repository

1. Go to GitHub
2. Click **"+"** in top-right → **"New repository"**
3. Repository name: `ayosph`
4. Description: "Barangay Community Issue Reporting System"
5. Keep it **Public** or **Private** (your choice)
6. **DO NOT** initialize with README (we already have one)
7. Click **"Create repository"**

### Step 4: Push Code to GitHub

**Using Command Line:**

```bash
# Navigate to your project folder
cd /path/to/ayosph

# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: AyosPH application"

# Add remote repository (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/ayosph.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Using GitHub Desktop (Easier for Beginners):**

1. Download [GitHub Desktop](https://desktop.github.com)
2. Install and sign in with your GitHub account
3. Click **"File"** → **"Add Local Repository"**
4. Choose your `ayosph` folder
5. Click **"Create Repository"** if prompted
6. Write a commit message: "Initial commit"
7. Click **"Commit to main"**
8. Click **"Publish repository"**
9. Click **"Push origin"**

### Step 5: Verify Upload

1. Go to your repository on GitHub
2. Refresh the page
3. You should see all your files

---

## Vercel Deployment

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** (recommended)
4. Authorize Vercel to access your GitHub

### Step 2: Import Your Repository

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Under **"Import Git Repository"**, find `ayosph`
3. Click **"Import"**

### Step 3: Configure Build Settings

Vercel will auto-detect it's a static site. Configure:

- **Framework Preset**: `Other`
- **Build Command**: Leave empty
- **Output Directory**: Leave as `/`
- **Install Command**: Leave empty

### Step 4: Add Environment Variables

This is crucial! Click **"Environment Variables"** and add:

1. Click **"Add New"**
2. Name: `VITE_SUPABASE_URL`
3. Value: Your Supabase project URL
4. Click **"Save"**

Repeat for:
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: Your Supabase anon key

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for deployment (1-2 minutes)
3. You'll get a success message with your live URL

### Step 6: Update Supabase Configuration

1. Copy your Vercel URL (e.g., `https://ayosph.vercel.app`)
2. Go to Supabase dashboard
3. Go to **"Authentication"** → **"URL Configuration"**
4. Add your Vercel URL to:
   - **Site URL**: `https://ayosph.vercel.app`
   - **Redirect URLs**: Add `https://ayosph.vercel.app/**`
5. Click **"Save"**

### Step 7: Test Live Site

1. Click your Vercel URL
2. Test registration and login
3. Create a test report
4. Verify image uploads work

---

## Making Updates

### Updating Your Code

1. Make changes locally
2. Test with Live Server
3. Commit changes:
```bash
git add .
git commit -m "Description of changes"
git push
```

### Redeploying to Vercel

Vercel automatically deploys when you push to GitHub!

1. Push your changes to GitHub
2. Go to Vercel dashboard
3. Watch the deployment progress
4. Your site updates automatically

### Manual Redeploy

If needed:
1. Go to Vercel dashboard
2. Click on your project
3. Click **"Deployments"** tab
4. Click **"Redeploy"** on any deployment

---

## Troubleshooting

### Common Issues

#### 1. "Supabase is not configured" Warning

**Problem**: Console shows Supabase configuration warning

**Solution**: 
- Open `js/supabase.js`
- Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with actual values

#### 2. Authentication Not Working

**Problem**: Can't login or register

**Solutions**:
- Verify Supabase credentials are correct
- Check that email confirmation is enabled/disabled as needed
- In Supabase: **Authentication** → **Providers** → Ensure Email is enabled
- Check browser console for errors

#### 3. Image Upload Fails

**Problem**: Images don't upload

**Solutions**:
- Verify storage bucket `report-images` exists
- Check storage policies are set correctly
- Ensure bucket is public
- Check file size (max 5MB)

#### 4. RLS Policy Errors

**Problem**: "permission denied for table"

**Solutions**:
- Re-run the SQL schema
- Verify RLS is enabled on all tables
- Check policies in Supabase dashboard

#### 5. Vercel Deployment Fails

**Problem**: Deployment fails on Vercel

**Solutions**:
- Check build logs for errors
- Verify environment variables are set
- Ensure all file paths are correct
- Check for case-sensitive file names

#### 6. Blank Page After Deployment

**Problem**: Site shows blank page

**Solutions**:
- Open browser console (F12)
- Check for JavaScript errors
- Verify all script paths are correct
- Clear browser cache

#### 7. "Page Not Found" on Refresh

**Problem**: Refreshing gives 404

**Solution**: This is normal for SPA. Configure redirects in Vercel:

Create `vercel.json` in root:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Getting Help

1. **Check Browser Console**: Press F12 for errors
2. **Supabase Logs**: Dashboard → Logs
3. **Vercel Logs**: Dashboard → Deployments → Click deployment → View logs
4. **GitHub Issues**: Create an issue in your repository

---

## Additional Resources

### Documentation Links
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Git Documentation](https://git-scm.com/doc)
- [MDN Web Docs](https://developer.mozilla.org)

### Useful Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Postman](https://www.postman.com/) - API testing
- [Stripe CLI](https://stripe.com/docs/stripe-cli) - For future payment integration

---

## Next Steps

After successful deployment:

1. **Custom Domain** (Optional)
   - Buy a domain from Namecheap, GoDaddy, etc.
   - In Vercel: Settings → Domains → Add your domain
   - Follow DNS configuration instructions

2. **Email Configuration**
   - Configure custom email templates in Supabase
   - Set up email branding

3. **Analytics**
   - Add Google Analytics or similar
   - Track user behavior

4. **Security Hardening**
   - Review and tighten RLS policies
   - Implement rate limiting
   - Add CAPTCHA for forms

5. **Backup Strategy**
   - Set up automated database backups
   - Export data regularly

---

## Support

For issues specific to AyosPH:
- Check the code comments
- Review the Supabase schema
- Inspect browser console errors
- Verify all environment variables

Good luck with your deployment! 🚀
