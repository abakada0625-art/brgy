/*
 _____         _   _       _ 
|  |  |___ ___| |_| |_ ___| |
|     | -_| . |  _|  _| .'| |
|__|__|___|  _|_| |_| |__,|_|
          |_|               

AyosPH - Barangay Community Issue Reporting System
===================================================

A modern web application for barangay communities to report and track local issues.

Tech Stack:
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Supabase
- Deployment: Vercel
- Version Control: GitHub

Author: Your Name
License: MIT
*/

# AyosPH

![AyosPH Banner](./assets/images/banner.png)

**AyosPH** is a barangay community issue reporting and resolution tracking system where residents can report community problems and barangay officials can manage, resolve, and verify those reports through proof-based completion.

## 🌟 Features

### For Residents
- 📝 Submit community issue reports with photos
- 📍 GPS-based location tagging
- 📊 Track report status in real-time
- 💬 Comment on reports
- 🔔 Receive notifications on status updates
- 📜 View report history

### For Barangay Officials
- 📋 Manage all community reports
- ✅ Update report statuses
- 📸 Upload proof-of-fix photos
- 📈 View analytics and statistics
- 👥 User moderation capabilities
- 🔴 Real-time dashboard updates

## 🚀 Quick Start

### Prerequisites
- Node.js (optional, for live server)
- Git
- VS Code or any code editor
- Supabase account
- GitHub account
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ayosph.git
cd ayosph
```

2. **Set up environment variables**
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Run with Live Server**
- Open `index.html` in VS Code
- Use Live Server extension
- Or use Python: `python -m http.server 8000`

4. **Access the application**
Open your browser and navigate to `http://localhost:8000`

## 📁 Project Structure

```
ayosph/
├── index.html          # Landing page
├── login.html          # Login page
├── register.html       # Registration page
├── dashboard.html      # Resident dashboard
├── admin.html          # Admin dashboard
├── css/
│   ├── style.css       # Global styles
│   ├── auth.css        # Auth pages styles
│   ├── dashboard.css   # Dashboard styles
│   └── admin.css       # Admin styles
├── js/
│   ├── supabase.js     # Supabase configuration
│   ├── auth.js         # Authentication logic
│   ├── dashboard.js    # Resident dashboard logic
│   ├── reports.js      # Report management
│   ├── admin.js        # Admin dashboard logic
│   ├── notifications.js # Notification system
│   └── utils.js        # Utility functions
├── assets/
│   ├── images/
│   └── icons/
├── components/         # Reusable components
├── supabase-schema.sql # Database schema
└── README.md
```

## 🗄️ Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL to create all tables and policies

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

To get these values:
1. Go to Supabase Dashboard
2. Click on "Settings" → "API"
3. Copy the "Project URL" and "anon public" key

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel settings
5. Deploy!

For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Charts**: Chart.js
- **Icons**: Phosphor Icons / FontAwesome
- **Deployment**: Vercel
- **Version Control**: GitHub

## 📱 Responsive Design

AyosPH is fully responsive and works on:
- 🖥️ Desktop (1920px+)
- 💻 Laptop (1366px - 1920px)
- 📱 Tablet (768px - 1366px)
- 📲 Mobile (320px - 768px)

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Secure authentication with Supabase Auth
- Image upload validation
- Input sanitization
- Role-based access control

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Supabase for the amazing backend platform
- Vercel for seamless deployment
- All contributors and supporters

---

Built with ❤️ for Filipino Communities
