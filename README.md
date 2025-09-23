# Patient Workflow System

A comprehensive patient management system built with Next.js frontend and Node.js/Express backend with PostgreSQL database.

## Features

- **User Management**: Role-based authentication (Patients, Doctors, Admins, Super Admins)
- **Appointment Scheduling**: Book and manage patient appointments
- **Doctor Schedules**: Manage doctor availability and time slots
- **Medical Records**: Comprehensive patient medical history management
- **Analytics**: Appointment and patient analytics dashboard
- **Real-time Updates**: WebSocket integration for live updates

## Tech Stack

**Frontend:**
- Next.js 14 with TypeScript
- React 18 with React Hook Form
- Tailwind CSS for styling
- Axios for API communication
- React Query for state management

**Backend:**
- Node.js with Express and TypeScript
- Prisma ORM with PostgreSQL
- JWT authentication with refresh tokens
- Pino structured logging
- WebSocket support
- Zod validation

## Quick Start

### Prerequisites

- Node.js 20+ 
- PostgreSQL 16+
- npm or yarn package manager

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd patient-workflow-system
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   
   # Create .env file with database and JWT secrets
   cp .env.example .env
   
   # Update .env with your database URL and secrets
   # DATABASE_URL="postgresql://username:password@localhost:5432/pws"
   # JWT_ACCESS_SECRET="your-access-secret"
   # JWT_REFRESH_SECRET="your-refresh-secret"
   
   # Setup database
   npm run prisma:migrate:dev
   npm run prisma:seed
   
   # Start development server
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   
   # Create .env file
   echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1" > .env
   echo "NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws" >> .env
   
   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - API Documentation: http://localhost:8080/docs


## Database Setup

### Using Docker for PostgreSQL

You can run PostgreSQL using Docker for local development:

```bash
docker run --name pws-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pws -p 5444:5432 -d postgres:16-alpine
```

- Database will be available at: `postgresql://postgres:postgres@localhost:5444/pws`

### Database Migration

Run the following commands in the `backend` directory to apply migrations:

```bash
npm run prisma:migrate:dev
```

### Seeding the Database

After migration, seed the database with initial data:

```bash
npm run prisma:seed
```

## Default Accounts

After seeding, the following accounts are available:

- **Super Admin**: `superadmin@test.com` / `password123`
- **Admin**: `admin@test.com` / `password123`
- **Doctor**: `doctor@test.com` / `password123`
- **Patient**: `patient@test.com` / `password123`

## API Documentation

The API documentation is available at `/docs` when the backend server is running, providing interactive Swagger documentation for all endpoints.

## Project Structure

```
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic services
│   │   ├── middlewares/  # Express middlewares
│   │   ├── utils/        # Utility functions
│   │   └── prisma/       # Database schema and migrations
│   └── ...
├── frontend/             # Next.js React application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # Reusable React components
│   │   ├── lib/          # Frontend utilities
│   │   └── types/        # TypeScript type definitions
│   └── ...
└── docker-compose.yml    # Production deployment configuration
```
