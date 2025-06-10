import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Form.module.css';

function AdminCreateUserForm() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState(''); // Add username state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [profileImages, setProfileImages] = useState([]); // Will store array of base64 strings
    const [role, setRole] = useState('voter');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    // Toggle password visibility functions
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const promises = files.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = (err) => {
                        console.error("FileReader error: ", err);
                        reject('Failed to read image file: ' + file.name);
                    };
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(promises)
                .then(newBase64Images => {
                    // Append new images to the existing ones
                    setProfileImages(prevImages => [...prevImages, ...newBase64Images]);
                    setError('');
                })
                .catch(err => {
                    setError(err);
                    setProfileImages([]); // Clear on error
                });
        } // No need to clear if no new files are selected, keep existing ones
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setSuccess('');
            return;
        }
        if (profileImages.length === 0) {
            setError('At least one profile image is required');
            setSuccess('');
            return;
        }
        if (!role) {
            setError('Please select a role for the user');
            setSuccess('');
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        try {
            // Combine firstName and lastName for the name field
            const fullName = `${firstName} ${lastName}`;
            // Pass the array of base64 profileImages strings and username to the register function
            await register(fullName, username, email, password, role, profileImages); // Pass the array
            setSuccess(`User '${fullName}' (username: '${username}') created successfully with role '${role}'.`);
            setFirstName('');
            setLastName('');
            setUsername(''); // Clear username state
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setProfileImages([]); // Clear images state
            setRole('voter');
            // Clear the file input visually (optional, might need ref)
            const fileInput = document.getElementById('profileImageFiles'); // Match new ID
            if (fileInput) fileInput.value = '';
            // navigate('/admin/manage-users');
        } catch (err) {
            console.error('Registration Error Object:', err); // Log the full error
            console.error('Registration Error Response:', err.response); // Log the response object
            console.error('Registration Error Response Data:', err.response?.data); // Log the data part specifically

            let message = 'User creation failed. Please check the console for details.'; // Default message

            if (err.response && err.response.data) {
                // Prioritize specific backend fields if they exist
                message = err.response.data.error || err.response.data.message || message;
            } else if (err.message) {
                 // Fallback to generic Axios/fetch message if no response data
                message = err.message;
            }

            setError(message);
            setSuccess('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>{success}</p>} {/* Display success message */}

            <div className={styles.formGroup}>
                <label htmlFor="firstName">First Name</label>
                <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="lastName">Last Name</label>
                <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            {/* Add Username Field */}
            <div className={styles.formGroup}>
                <label htmlFor="username">Username</label>
                <input
                    type="text"
                    id="username"
                    value={username} // Bind to username state
                    onChange={(e) => setUsername(e.target.value)} // Update username state
                    required
                    disabled={loading}
                />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
             {/* Changed to file input */}
             <div className={styles.formGroup}>
                <label htmlFor="profileImageFiles">Profile Images (First is profile pic)</label>
                <input
                    type="file"
                    id="profileImageFiles" // Changed ID
                    accept="image/*" // Accept only image files
                    onChange={handleFileChange} // Use the updated handler
                    multiple // Allow multiple file selection
                    required
                    disabled={loading}
                />
                {/* Optional: Display image previews */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                    {profileImages.map((imgSrc, index) => (
                        <img key={index} src={imgSrc} alt={`Preview ${index + 1}`} style={{ maxWidth: '80px', maxHeight: '80px', border: index === 0 ? '2px solid blue' : 'none' }} title={index === 0 ? 'Profile Picture' : `Image ${index + 1}`} />
                    ))}
                </div>
            </div>
            {/* Add Role Selection Dropdown */}
            <div className={styles.formGroup}>
                <label htmlFor="role">Role</label>
                <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    disabled={loading}
                    className={styles.selectInput} // Add a class for styling if needed
                >
                    <option value="voter">Voter</option>
                    <option value="candidate">Candidate</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.passwordInputContainer}>
                    <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                        disabled={loading}
                        className={styles.passwordInput}
                    />
                    <button 
                        type="button" 
                        className={styles.passwordToggleBtn}
                        onClick={togglePasswordVisibility}
                        tabIndex="-1"
                    >
                        {showPassword ? 
                            <span className={styles.passwordIcon}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </span> : 
                            <span className={styles.passwordIcon}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </span>
                        }
                    </button>
                </div>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className={styles.passwordInputContainer}>
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength="6"
                        disabled={loading}
                        className={styles.passwordInput}
                    />
                    <button 
                        type="button" 
                        className={styles.passwordToggleBtn}
                        onClick={toggleConfirmPasswordVisibility}
                        tabIndex="-1"
                    >
                        {showConfirmPassword ? 
                            <span className={styles.passwordIcon}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            </span> : 
                            <span className={styles.passwordIcon}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </span>
                        }
                    </button>
                </div>
            </div>
            <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? 'Creating User...' : 'Create User'}
            </button>
        </form>
    );
}

export default AdminCreateUserForm;