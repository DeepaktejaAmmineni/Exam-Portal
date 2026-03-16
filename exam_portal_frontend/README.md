# Exam Portal — Frontend

React frontend for the Technical Exam Portal.

## Pages

### Student
| Page | Route | Description |
|------|-------|-------------|
| Login / Register | `/login` | Auth page |
| Dashboard | `/dashboard` | Overview, stats, quick links |
| Available Exams | `/exams` | List of active exams |
| Exam Engine | `/exam/:sessionId` | Timer, questions, auto-save, submit |
| My Results | `/my-results` | All results with per-question breakdown |

### Admin
| Page | Route | Description |
|------|-------|-------------|
| Overview | `/admin` | Stats, recent exams & submissions |
| Manage Exams | `/admin/exams` | Create/delete exams, add MCQ questions |
| All Results | `/admin/results` | Every student submission with breakdown |
| Users | `/admin/users` | List and deactivate users |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm start
```

Opens at http://localhost:3000

Make sure your backend is running at http://localhost:8000

## Project Structure

```
src/
├── context/
│   └── AuthContext.js     ← Global auth state + login/logout
├── utils/
│   └── api.js             ← Axios instance with JWT auto-attach
├── components/
│   ├── Layout.js          ← Sidebar + topbar shell
│   └── Layout.css
└── pages/
    ├── AuthPage.js        ← Login / Register
    ├── StudentDashboard.js
    ├── ExamList.js
    ├── ExamEngine.js      ← Core exam engine with timer
    ├── MyResults.js
    ├── AdminDashboard.js
    ├── AdminExams.js      ← Exam + question management
    ├── AdminResults.js
    └── AdminUsers.js
```
