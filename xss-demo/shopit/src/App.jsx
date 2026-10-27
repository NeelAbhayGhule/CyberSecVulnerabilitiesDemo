import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import SecurePage from './pages/SecurePage.jsx'
import UnsecurePage from './pages/UnsecurePage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/secure" replace />} />
        <Route path="/secure" element={<SecurePage />} />
        <Route path="/unsecure" element={<UnsecurePage />} />
        <Route path="*" element={<Navigate to="/secure" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App