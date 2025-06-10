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

## Detailed Functionality

### Authentication System
- **Two-Factor Authentication**: Password login followed by facial recognition verification
- **Face Registration**: User face enrollment during account creation
- **Password Reset**: Secure password reset using facial verification
- **Profile Updates**: Face verification required before updating sensitive information

### Election Management
- **Election Creation**: Admins can create elections with title, description, start/end dates, and images
- **Election Status Management**: Elections can be in draft, active, or completed states
- **Candidate Applications**: Candidates can apply to elections with CV uploads
- **Application Review**: Admins can approve or reject candidate applications
- **Candidate Removal**: Admins can remove candidates from elections when necessary

### Voting System
- **Secure Voting**: Face verification required before casting votes
- **Vote Tracking**: System tracks who has voted to prevent duplicate votes
- **Vote Counting**: Automatic tallying of votes for each candidate
- **Results Display**: Visual representation of election results

### User Management
- **Role-Based Access**: Different permissions for voters, candidates, and administrators
- **Profile Management**: Users can update their profiles with facial verification
- **Bookmarking**: Users can bookmark elections they're interested in
- **Application Tracking**: Candidates can track their election applications

### Scheduled Tasks
- **Election Status Updates**: Automatic updates to election status based on start/end dates
- **Result Calculation**: Automatic calculation of results when elections end
- **Notification System**: Email notifications for important events

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

4. Create a `.env` file in the backend directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   EMAIL_SERVICE=your_email_service
   EMAIL_USERNAME=your_email_username
   EMAIL_PASSWORD=your_email_password
   FROM_EMAIL=your_from_email
   FROM_NAME=FaceId System
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

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login with password
- `POST /api/v1/auth/verifyface` - Second factor authentication with facial recognition
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/request-password-reset-face-verify` - Request password reset with face verification
- `POST /api/v1/auth/reset-password-with-token` - Reset password using token
- `POST /api/v1/auth/verify-face-for-profile-update` - Verify face before profile update
- `PUT /api/v1/auth/update-profile` - Update user profile after verification

### Elections
- `GET /api/v1/elections` - Get all elections
- `GET /api/v1/elections/:id` - Get specific election
- `POST /api/v1/elections` - Create new election (admin)
- `PUT /api/v1/elections/:id` - Update election (admin)
- `DELETE /api/v1/elections/:id` - Delete election (admin)
- `PATCH /api/v1/elections/:id/status` - Update election status (admin)
- `GET /api/v1/elections/bookmarks` - Get bookmarked elections
- `POST /api/v1/elections/:id/bookmark` - Bookmark an election
- `DELETE /api/v1/elections/:id/bookmark` - Remove bookmark

### Candidates
- `POST /api/v1/elections/:id/apply` - Apply to an election as candidate
- `GET /api/v1/elections/my-applications` - Get candidate's applications
- `GET /api/v1/elections/:id/applications` - Get all applications for election (admin)
- `PUT /api/v1/elections/:id/applications/:candidateId/approve` - Approve application (admin)
- `PUT /api/v1/elections/:id/applications/:candidateId/reject` - Reject application (admin)
- `DELETE /api/v1/elections/:id/candidates/:candidateId` - Remove candidate (admin)

### Voting
- `GET /api/v1/elections/:id/votes` - Get votes for an election
- `POST /api/v1/elections/:id/votes` - Cast vote in election
- `GET /api/v1/votes/my-votes` - Get current user's voting history

### Statistics
- `GET /api/v1/stats/elections` - Get election statistics
- `GET /api/v1/stats/users` - Get user statistics (admin)

## File Structure

```
FaceId/
├── backend/
│   ├── _data/            # Sample data for seeding
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   ├── uploads/          # Uploaded files storage
│   ├── server.js         # Entry point
│   └── seeder.js         # Database seeder
├── frontend/
│   ├── public/           # Static files
│   ├── src/
│   │   ├── assets/       # Images and static assets
│   │   ├── components/   # React components
│   │   ├── context/      # React context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service functions
│   │   ├── utils/        # Utility functions
│   │   ├── App.jsx       # Main App component
│   │   └── main.jsx      # Entry point
│   ├── index.html        # HTML template
│   └── vite.config.js    # Vite configuration
└── README.md             # Project documentation
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Face Recognition**: Biometric verification for enhanced security
- **Password Encryption**: Secure password hashing with bcrypt
- **Role-Based Access Control**: Different permissions for different user roles
- **CORS Protection**: Configured to prevent unauthorized cross-origin requests
- **File Upload Validation**: Secure file upload handling
- **Rate Limiting**: Protection against brute force attacks

## License

This project is licensed under the ISC License 