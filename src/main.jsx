import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import LoginPage from './pages/LoginPage'
import SalesPageWrapper from './pages/SalesPageWrapper'
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/app" element={<App />} />
        <Route path="/sales" element={<SalesPageWrapper />} />
        <Route path="/food" element={<FoodPageWrapper />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
