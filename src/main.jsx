import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import LoginPage from './pages/LoginPage'
import SalesPageWrapper from './pages/SalesPageWrapper'
import FoodPageWrapper from './pages/FoodPageWrapper'
import SpeedPageWrapper from './pages/SpeedPageWrapper'
import PointsPageWrapper from './pages/PointsPageWrapper'
import ExperiencePageWrapper from './pages/ExperiencePageWrapper'
import GoalsPageWrapper from './pages/GoalsPageWrapper'
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/app" element={<App />} />
        <Route path="/sales" element={<SalesPageWrapper />} />
        <Route path="/food" element={<FoodPageWrapper />} />
        <Route path="/speed" element={<SpeedPageWrapper />} />
        <Route path="/points" element={<PointsPageWrapper />} />
        <Route path="/experience" element={<ExperiencePageWrapper />} />
        <Route path="/goals" element={<GoalsPageWrapper />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
