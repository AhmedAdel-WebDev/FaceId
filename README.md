# FaceId - Secure Election System with Facial Recognition

A secure voting and election management system that uses facial recognition for authentication and two-factor verification.

## Features

- **Facial Recognition Authentication**: Secure login and identity verification using face recognition
- **Election Management**: Create, update, and manage elections
- **Candidate Management**: Apply to elections, approve/reject applications
- **Voting System**: Secure voting with facial verification
- **Admin Dashboard**: Comprehensive election management for administrators
- **User Profiles**: User management with secure profile updates
- **Bookmarking**: Save elections of interest
- **Statistics**: View election statistics and results

## Tech Stack

### Frontend
- React 19
- Vite
- React Router
- Material UI
- React Webcam (for facial recognition)
- i18next (internationalization)
- Axios

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- TensorFlow.js (for facial recognition)
- face-api.js
- JWT Authentication
- Multer (file uploads)
- Node-cron (scheduled tasks)
- Nodemailer

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/FaceId.git
   cd FaceId
   ```

2. Install backend dependencies
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies
   ```
   cd ../frontend
   npm install
   ```

4. Create a .env file in the backend directory with the following variables:
   ```
   NODE_ENV
   PORT
   MONGO_URI
   JWT_SECRET
   JWT_EXPIRE
   ```

### Running the Application

1. Start the backend server
   ```
   cd backend
   npm run server
   ```

2. Start the frontend development server
   ```
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Importing Sample Data

```
cd backend
npm run import
```

### Clearing the Database

```
cd backend
npm run destroy
```

## API Endpoints

- `/api/v1/auth` - Authentication routes
- `/api/v1/elections` - Election management
- `/api/v1/votes` - Voting system
- `/api/v1/admin` - Admin functions
- `/api/v1/stats` - Statistics and reporting

## License

This project is licensed under the ISC License 
