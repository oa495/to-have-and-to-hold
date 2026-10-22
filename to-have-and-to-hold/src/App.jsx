import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import TimelinePage from './pages/TimelinePage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/timeline" replace />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/uploads/:id" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
