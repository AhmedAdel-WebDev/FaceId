import React from 'react';
import { Link } from 'react-router-dom';
import ExampleElectionCard from './ExampleElectionCard';
import styles from '../pages/BookmarkedPage.module.css';

/**
 * Example component for displaying a list of bookmarked elections
 * This is a demonstration component that shows the styled bookmarked elections list
 */
function ExampleBookmarkedList() {
  // Create mock data with a few example elections
  const mockElections = [
    {
      id: 1,
      title: 'Annual Board Member Selection',
      description: 'Vote for new board members who will represent our community for the next fiscal year. Each voter may select up to three candidates from the approved list.',
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      status: 'active',
      type: 'candidate-based'
    },
    {
      id: 2,
      title: 'Community Budget Approval',
      description: 'Vote to approve or reject the proposed community budget for the upcoming fiscal year.',
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'active',
      type: 'yes-no'
    },
    {
      id: 3,
      title: 'New Playground Design Selection',
      description: 'Choose your preferred design for the new community playground renovation.',
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
      status: 'pending',
      type: 'image-based'
    }
  ];

  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainContent}>
        <div className={styles.headerSection}>
          <h1 className={styles.pageTitle}>My Bookmarked Elections</h1>
          <Link to="/elections" className={styles.browseLink}>
            Browse All Elections
          </Link>
        </div>

        {/* Show bookmarked elections in a grid */}
        <div className={styles.electionsGrid}>
          {/* Using our example election card component multiple times */}
          {mockElections.map(election => (
            <div key={election.id}>
              <ExampleElectionCard />
            </div>
          ))}
        </div>

        {/* Empty state example */}
        <div className={styles.emptyContainer} style={{marginTop: '2rem'}}>
          <p className={styles.emptyText}>
            You haven't bookmarked any elections yet. Browse all elections and bookmark the ones you're interested in.
          </p>
          <Link to="/elections" className={styles.browseButton}>
            Browse Elections
          </Link>
        </div>
      </main>
    </div>
  );
}

export default ExampleBookmarkedList; 