import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom'
import DriverPortfolio from './DriverPortfolio'
import DriverStoryForm from './DriverStoryForm'
import VideoRecorder from './pages/VideoRecorder'
import Dashboard from './admin/Dashboard'
import Drivers from './admin/Drivers'
import Employers from './admin/Employers'
import Requisitions from './admin/Requisitions'
import Submissions from './admin/Submissions'

// Employer Portal
import { EmployerAuthProvider } from './employer/EmployerLayout'
import EmployerLogin from './employer/Login'
import EmployerVerify from './employer/Verify'
import EmployerDashboard from './employer/Dashboard'
import EmployerJobs from './employer/Jobs'
import AddJob from './employer/AddJob'
import DriverFeed from './employer/DriverFeed'
import CandidateProfile from './employer/CandidateProfile'
import EmployerSubmissions from './employer/Submissions'
import SubmissionDetail from './employer/SubmissionDetail'

function PortfolioWrapper() {
  const { slug } = useParams()
  return <DriverPortfolio slug={slug} />
}

function FormWrapper() {
  const { uuid } = useParams()
  return <DriverStoryForm uuid={uuid} />
}

function VideoRecorderWrapper() {
  const { uuid } = useParams()
  return <VideoRecorder uuid={uuid} />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/portfolio/:slug" element={<PortfolioWrapper />} />
        <Route path="/form/:uuid" element={<FormWrapper />} />
        <Route path="/record/:uuid" element={<VideoRecorderWrapper />} />

        {/* Admin routes */}
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/drivers" element={<Drivers />} />
        <Route path="/admin/employers" element={<Employers />} />
        <Route path="/admin/requisitions" element={<Requisitions />} />
        <Route path="/admin/submissions" element={<Submissions />} />

        {/* Employer Portal routes */}
        <Route path="/employer/*" element={
          <EmployerAuthProvider>
            <Routes>
              <Route path="login" element={<EmployerLogin />} />
              <Route path="verify" element={<EmployerVerify />} />
              <Route path="" element={<EmployerDashboard />} />
              <Route path="jobs" element={<EmployerJobs />} />
              <Route path="jobs/new" element={<AddJob />} />
              <Route path="drivers" element={<DriverFeed />} />
              <Route path="drivers/:uuid" element={<CandidateProfile />} />
              <Route path="submissions" element={<EmployerSubmissions />} />
              <Route path="submissions/:id" element={<SubmissionDetail />} />
            </Routes>
          </EmployerAuthProvider>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
