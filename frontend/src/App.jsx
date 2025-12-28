import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import React, { useContext } from "react";

import PrivateRoute from "./routes/PrivateRoute";
import { UserContext, UserProvider } from "./context/UserContext";

import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import VerifyCode from "./pages/Auth/VerifyCode";
import LoginVerify from "./pages/Auth/LoginVerify";
import ResendVerification from "./pages/Auth/ResendVerification";
import EnterPass from "./pages/Auth/EnterPass";
import EnterCode from "./pages/Auth/EnterCode";
import ReEnterPass from "./pages/Auth/ReEnterPass";
import Success from "./pages/Auth/Success";

import Dashboard from "./pages/Admin/Dashboard";
import ManageTasks from "./pages/Admin/ManageTasks";
import CreateTask from "./pages/Admin/CreateTask";
import ManageUsers from "./pages/Admin/ManageUsers";
// import AdminEditProfile from './pages/Admin/EditProfile'

import UserDashboard from "./pages/User/UserDashboard";
import MyTasks from "./pages/User/MyTasks";
import ViewTaskDetails from "./pages/User/ViewTaskDetails";
// import UserEditProfile from './pages/User/EditProfile'
import { Toaster } from "react-hot-toast";

const Root = () => {
  const { user, loading } = useContext(UserContext);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return user.role === "admin" ? (
    <Navigate to="/admin/dashboard" />
  ) : (
    <Navigate to="/user/dashboard" />
  );
};

function App() {
  return (
    <>
      <div>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-code" element={<VerifyCode />} />
            <Route path="/login-verify" element={<LoginVerify />} />
            <Route
              path="/resend-verification"
              element={<ResendVerification />}
            />
            <Route path="/forgot-password" element={<EnterPass />} />
            <Route path="/enter-code" element={<EnterCode />} />
            <Route path="/re-enter-password" element={<ReEnterPass />} />
            <Route path="/reset-success" element={<Success />} />

            {/* Admin Routes */}
            <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/tasks" element={<ManageTasks />} />
              <Route path="/admin/create-task" element={<CreateTask />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              {/* <Route path='/admin/edit-profile' element={<AdminEditProfile/>}/> */}
            </Route>

            {/* Users Routes */}
            <Route
              element={<PrivateRoute allowedRoles={["member", "admin"]} />}
            >
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/tasks" element={<MyTasks />} />
              <Route
                path="/user/task-details/:id"
                element={<ViewTaskDetails />}
              />
              {/* <Route path='/user/edit-profile' element={<UserEditProfile/>}/> */}
            </Route>

            {/* Default routes */}
            <Route path="/" element={<Root />} />
          </Routes>
        </Router>
      </div>

      <Toaster
        toastOptions={{
          className: "",
          style: {
            fontsize: "13px",
          },
        }}
      />
    </>
  );
}

export default App;
