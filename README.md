# Ufriends 2.0 (Migration)

This is a migration of Ufriends Version 3 to a modern stack:
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express + Prisma (Serverless-ready)
- **Database**: PostgreSQL (via Prisma)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```
*Note: If installation fails due to network issues, try running `npm install --no-audit` or retrying multiple times.*

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ufriends?schema=public"
JWT_SECRET="your-secret-key"
```

### 3. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
# Start Frontend (Vite)
npm run dev

# Start Backend API (Local)
npm start
```

## Project Structure
- `/src`: Frontend code (React)
- `/api`: Backend code (Express Serverless Function)
- `/prisma`: Database schema
# ufriends-2.0
