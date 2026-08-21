import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('The application encountered a render error.', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-4">
          <div className="alert alert-danger" role="alert">
            <h1 className="h5">Something went wrong</h1>
            <p className="mb-0">
              The application could not display this page. Please refresh and
              try again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
