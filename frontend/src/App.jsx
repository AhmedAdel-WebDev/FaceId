import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Update the import path extension
import { AuthProvider } from './context/AuthContext.jsx'; // Import AuthProvider
import { LanguageProvider } from './context/LanguageContext.jsx'; // Import LanguageProvider
// Import global styles
import './App.css';
// Import Pages (Make sure paths are correct)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ElectionsListPage from './pages/ElectionsListPage';
import ElectionDetailsPage from './pages/ElectionDetailsPage';
import DashboardPage from './pages/DashboardPage';
import CreateElectionPage from './pages/CreateElectionPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import BookmarkedElectionsPage from './pages/BookmarkedElectionsPage'; // Import BookmarkedElectionsPage
import PolicyPage from './pages/PolicyPage'; // Import PolicyPage
import CandidateApplicationsPage from './pages/CandidateApplicationsPage'; // Import CandidateApplicationsPage
import MyVotesPage from './pages/MyVotesPage'; // Import MyVotesPage
import ElectionWinnersPage from './pages/ElectionWinnersPage'; // Import ElectionWinnersPage
import ProtectedRoute from './components/routes/ProtectedRoute'; // Import ProtectedRoute

// Import placeholder components for protected routes (we'll create these later)
import PrivateRoute from './components/routes/PrivateRoute';
import AdminRoute from './components/routes/AdminRoute';
import ApplicationForm from './components/ApplicationForm.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx'; // Import the ErrorBoundary

import EditElectionPage from './pages/EditElectionPage.jsx'; // Import the new page
// Import the new Admin Create User Page
import AdminCreateUserPage from './pages/AdminCreateUserPage.jsx';
import RegistrationPage from './pages/RegistrationPage.jsx'; // Import RegistrationPage
import AdminUserManagementPage from './pages/AdminUserManagementPage.jsx'; // Import AdminUserManagementPage
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'; // Import ForgotPasswordPage


function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <Router>
        <div className="App">
          {/* Navbar might be placed here or within each page */}
          <ErrorBoundary>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} /> {/* ADD Public Register Route */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} /> {/* ADD Forgot Password Route */}
              <Route path="/policy" element={<PolicyPage />} /> {/* ADD Policy Page Route */}
              {/* <Route path="/register" element={<RegisterPage />} /> REMOVE Public Register Route */}
              <Route path="/elections" element={<ElectionsListPage />} />
              <Route path="/election-winners" element={<ElectionWinnersPage />} /> {/* ADD Election Winners Page Route */}
              <Route path="/elections/:id" element={
                <ErrorBoundary>
                  <ElectionDetailsPage />
                </ErrorBoundary>
              } />

              {/* Protected Routes (Example Structure) */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/my-applications" element={<ProtectedRoute><CandidateApplicationsPage /></ProtectedRoute>} />
              <Route path="/my-votes" element={<ProtectedRoute><MyVotesPage /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/create-election" element={<ProtectedRoute requiredRole="admin"><CreateElectionPage /></ProtectedRoute>} />
              {/* Add Edit Election Route */}
              <Route path="/elections/:id/edit" element={<ProtectedRoute requiredRole="admin"><EditElectionPage /></ProtectedRoute>} />
              {/* Add Admin Create User Route */}
              <Route path="/admin/create-user" element={<ProtectedRoute requiredRole="admin"><AdminCreateUserPage /></ProtectedRoute>} />
              <Route path="/admin/user-management" element={<ProtectedRoute requiredRole="admin"><AdminUserManagementPage /></ProtectedRoute>} />
              
              {/* Apply to election route */}
              <Route 
                  path="/elections/:id/apply" 
                  element={<ApplicationForm />} 
              />
              {/* Add BookmarkedElectionsPage to the routes */}
              <Route path="/bookmarked" element={<ProtectedRoute><BookmarkedElectionsPage /></ProtectedRoute>} />
              {/* Catch-all for Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
          {/* Footer might be placed here or within each page */}
        </div>
      </Router>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
