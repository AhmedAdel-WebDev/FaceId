import React, { useState } from 'react';
import styles from './ElectionForm.module.css';

/**
 * Example component for displaying an election form
 * This is a demonstration component that shows the styled election form
 */
function ExampleElectionForm() {
  const [electionType, setElectionType] = useState('candidate-based');
  
  // Simulate form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    alert('This is a demonstration form. No actual submission will occur.');
  };

  return (
    <div className={styles.formContainer}>
      <h2>Create New Election</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div className={styles.formGroup}>
          <label htmlFor="title">Election Title <span className={styles.required}>*</span></label>
          <input
            type="text"
            id="title"
            placeholder="Enter a descriptive title"
            defaultValue="Annual Board Member Election"
            required
          />
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows="4"
            placeholder="Provide details about this election"
            defaultValue="Vote for new board members who will represent our community for the next fiscal year. Each voter may select up to three candidates from the approved list."
          />
        </div>

        {/* Date Row */}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="startDate">Start Date <span className={styles.required}>*</span></label>
            <input
              type="datetime-local"
              id="startDate"
              defaultValue="2023-10-15T08:00"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="endDate">End Date <span className={styles.required}>*</span></label>
            <input
              type="datetime-local"
              id="endDate"
              defaultValue="2023-10-22T20:00"
              required
            />
          </div>
        </div>

        {/* Election Type */}
        <div className={styles.formGroup}>
          <label htmlFor="electionType">Election Type <span className={styles.required}>*</span></label>
          <select
            id="electionType"
            value={electionType}
            onChange={(e) => setElectionType(e.target.value)}
            required
          >
            <option value="candidate-based">Candidate-Based</option>
            <option value="yes-no">Yes/No</option>
            <option value="rating">Rating (5-Star)</option>
            <option value="image-based">Image-Based</option>
          </select>
          <small className={styles.helperText}>The type of election determines how voters will cast their votes.</small>
        </div>

        {/* Conditional Fields based on Election Type */}
        {electionType === 'yes-no' && (
          <div className={styles.formGroup}>
            <label htmlFor="proposition">Proposition <span className={styles.required}>*</span></label>
            <input
              type="text"
              id="proposition"
              placeholder="e.g., Should we approve the new budget?"
              defaultValue="Should we approve the new community guidelines?"
            />
          </div>
        )}

        {electionType === 'rating' && (
          <div className={styles.formGroup}>
            <label htmlFor="ratingProposition">Rating Question <span className={styles.required}>*</span></label>
            <input
              type="text"
              id="ratingProposition"
              placeholder="e.g., How would you rate the new facilities?"
              defaultValue="How would you rate the proposed community center design?"
            />
            
            <div className={styles.ratingInfoBox}>
              <p>Voters will rate on a scale of 1-5 stars</p>
              <div className={styles.ratingStarsPreview}>★★★★★</div>
              <p>You can customize the meaning of the minimum (1) and maximum (5) values:</p>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="labelMin">Label for 1 star</label>
                  <input
                    type="text"
                    id="labelMin"
                    defaultValue="Poor"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="labelMax">Label for 5 stars</label>
                  <input
                    type="text"
                    id="labelMax"
                    defaultValue="Excellent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {electionType === 'image-based' && (
          <div className={styles.formGroup}>
            <label>Image Options <span className={styles.required}>*</span></label>
            <p className={styles.helperText}>Upload images for voters to choose from</p>
            
            <div className={styles.imageOptionsGrid}>
              <div className={styles.imageOptionContainer}>
                <div className={styles.imageInput}>
                  <input 
                    type="text" 
                    placeholder="Option Label"
                    defaultValue="Design Concept A"
                  />
                  <img
                    src="/placeholder-image.svg"
                    alt="Preview"
                    className={styles.imagePreview}
                  />
                  <input type="file" accept="image/*" />
                </div>
              </div>
              
              <div className={styles.imageOptionContainer}>
                <div className={styles.imageInput}>
                  <input 
                    type="text" 
                    placeholder="Option Label"
                    defaultValue="Design Concept B"
                  />
                  <img
                    src="/placeholder-image.svg"
                    alt="Preview"
                    className={styles.imagePreview}
                  />
                  <input type="file" accept="image/*" />
                </div>
              </div>
            </div>
            
            <button type="button" className={styles.addButton}>
              Add Image Option
            </button>
          </div>
        )}

        {/* Status */}
        <div className={styles.formGroup}>
          <label htmlFor="status">Status <span className={styles.required}>*</span></label>
          <select
            id="status"
            defaultValue="pending"
            required
          >
            <option value="pending">Pending (Allows Applications)</option>
            <option value="active">Active (Voting Open)</option>
            <option value="completed">Completed (Voting Closed)</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <small className={styles.helperText}>
            Set the current state. 'Pending' allows candidate applications. 'Active' allows voting.
          </small>
        </div>

        {/* Submit Button */}
        <div className={styles.buttonContainer}>
          <button type="submit" className={styles.submitButton}>
            Create Election
          </button>
          <button type="button" className={`${styles.submitButton} ${styles.cancelButton}`}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ExampleElectionForm; 