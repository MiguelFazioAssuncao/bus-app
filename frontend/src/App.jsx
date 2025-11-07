import { Routes, Route, Navigate } from 'react-router-dom'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Directions from './pages/Directions.jsx'
import UserProfile from './pages/UserProfile.jsx'
import Lines from './pages/Lines.jsx'
import Stations from './pages/Stations.jsx'
import Search from './pages/Search.jsx'
import './App.css'

const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated() ? (
              <Navigate to="/directions" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/directions" element={<Directions />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/lines" element={<Lines />} />
        <Route path="/stations" element={<Stations />} />
        <Route path="/search" element={<Search />} />
      </Routes>
    </>
  )
}

export default App
