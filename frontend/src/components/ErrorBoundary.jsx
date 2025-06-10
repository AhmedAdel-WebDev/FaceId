import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // You could also log the error to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          borderRadius: '5px',
          backgroundColor: '#2d3748', 
          color: '#e2e8f0', 
          textAlign: 'center' 
        }}>
          <h2 style={{ color: '#f56565' }}>Something went wrong</h2>
          <p>We're sorry, but there was an error loading this component.</p>
          <details style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#1a202c',
            borderRadius: '3px', 
            textAlign: 'left' 
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Show Error Details</summary>
            <p>{this.state.error?.toString()}</p>
            <pre style={{ 
              marginTop: '10px', 
              padding: '10px', 
              overflowX: 'auto',
              backgroundColor: '#2d3748',
              borderRadius: '3px',
              fontSize: '14px'
            }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '20px',
              padding: '8px 16px',
              backgroundColor: '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    // If no error occurred, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary; 