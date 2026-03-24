import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App } from './App';
import { ProjectPage } from './pages/ProjectPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { ActivityFeedPage } from './pages/ActivityFeedPage';
import { SessionReviewPage } from './pages/SessionReviewPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/projects/:slug" element={<ProjectPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/activity" element={<ActivityFeedPage />} />
          <Route path="/sessions/:id" element={<SessionReviewPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
