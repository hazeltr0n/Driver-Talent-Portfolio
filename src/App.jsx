import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom'
import DriverPortfolio from './DriverPortfolio'
import DriverStoryForm from './DriverStoryForm'
import VideoRecorder from './pages/VideoRecorder'
import Dashboard from './admin/Dashboard'
import Drivers from './admin/Drivers'
import Requisitions from './admin/Requisitions'
import Submissions from './admin/Submissions'

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
        <Route path="/admin/requisitions" element={<Requisitions />} />
        <Route path="/admin/submissions" element={<Submissions />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
