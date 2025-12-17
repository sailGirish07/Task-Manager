# Task Manager Application

A full-stack task management application built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Contributing](#contributing)
- [License](#license)

## Features

- User authentication (login/signup)
- Role-based access control (Admin/User)
- Create, read, update, and delete tasks
- Assign tasks to users
- Task status tracking
- User management (Admin only)
- Reporting and analytics

## Technologies Used

### Frontend
- React 18
- React Router v7
- Tailwind CSS
- Axios for API requests
- Recharts for data visualization
- React Icons
- Moment.js for date handling

### Backend
- Node.js
- Express.js v5
- MongoDB with Mongoose
- JWT for authentication
- Bcrypt.js for password hashing
- Multer for file uploads
- Cors for cross-origin resource sharing

## Project Structure

```
Task Manager/
├── Backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── .env
│   ├── Server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── hooks/
    │   ├── pages/
    │   ├── routes/
    │   ├── utils/
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB database (local or cloud instance like MongoDB Atlas)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd task-manager
   ```

2. Install backend dependencies:
   ```bash
   cd Backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

## Environment Variables

### Backend (.env file in Backend directory)
Create a `.env` file in the Backend directory with the following variables:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
ADMIN_INVITE_TOKEN=your_admin_invite_token
PORT=8000
```

### Frontend
The frontend uses Vite's environment variables. You can create a `.env` file in the frontend directory if needed.

## Running the Application

### Backend
```bash
cd Backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

## Building for Production

### Frontend
```bash
cd frontend
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.