import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import React, { useContext } from 'react';

import PrivateRoute from './routes/PrivateRoute'
import UserContext, { UserProvider } from "./context/UserContext"

import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'

import Dashboard from './pages/Admin/Dashboard'
import ManageTasks from './pages/Admin/ManageTasks'
import CreateTask from './pages/Admin/CreateTask'
import ManageUsers from './pages/Admin/ManageUsers'
import AdminEditProfile from './pages/Admin/EditProfile'

import UserDashboard from './pages/User/UserDashboard'
import MyTasks from './pages/User/MyTasks'
import ViewTaskDetails from './pages/User/ViewTaskDetails'
import UserEditProfile from './pages/User/EditProfile'
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <UserProvider>
      <div>
        <Router>
          <Routes>
            <Route path='/login' element={<Login/>}/>
            <Route path='/signup' element={<Signup/>}/>

            {/* Admin Routes */}
            <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
              <Route path='/admin/dashboard' element={<Dashboard/>}/>
              <Route path='/admin/tasks' element={<ManageTasks/>}/>
              <Route path='/admin/create-task' element={<CreateTask/>}/>
              <Route path='/admin/users' element={<ManageUsers/>}/>
              <Route path='/admin/edit-profile' element={<AdminEditProfile/>}/>
            </Route>

            {/* Users Routes */}
            <Route element={<PrivateRoute allowedRoles={["member", "admin"]} />}>
              <Route path='/user/dashboard' element={<UserDashboard/>}/>
              <Route path='/user/tasks' element={<MyTasks/>}/>
              <Route path='/user/task-details/:id' element={<ViewTaskDetails/>}/>
              <Route path='/user/edit-profile' element={<UserEditProfile/>}/>
            </Route>

            {/* Default routes */}
            <Route path='/' element={<Root/>}/>
          </Routes>
        </Router>
      </div>

      <Toaster
      toastOptions={{
        className: "",
        style: {
          fontsize: "13px"
        },
      }}
      />
    </UserProvider>
  )
}

export default App

const Root = () => {
  const { user, loading } = useContext(UserContext);
  
  if (loading) return <div>Loading...</div>

  if (!user) {
    return <Navigate to="/login" />
  }

  return user.role === "admin" ? <Navigate to="/admin/dashboard"/> : <Navigate to="/user/dashboard"/>;
};