import React from 'react'
import './index.css'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import LeadDetail from './pages/LeadDetail.jsx'
import Reports from './pages/Reports.jsx'
import Agenda from './pages/Agenda.jsx'
import Profile from './pages/Profile.jsx'
import NewLead from './pages/NewLead.jsx'
import Users from './pages/Users.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<App><Dashboard /></App>} />
      <Route path="/leads" element={<App><Leads /></App>} />
      <Route path="/leads/new" element={<App><NewLead /></App>} />
      <Route path="/leads/:code" element={<App><LeadDetail /></App>} />
      <Route path="/reports" element={<App><Reports /></App>} />
      <Route path="/users" element={<App><Users /></App>} />
      <Route path="/profile" element={<App><Profile /></App>} />
      <Route path="/agenda" element={<App><Agenda /></App>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>,
)
