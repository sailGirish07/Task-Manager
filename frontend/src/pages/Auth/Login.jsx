import React, { useState, useContext, useEffect, useRef } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import { useNavigate, useLocation } from "react-router-dom";
import Input from "../../components/Inputs/Input";
import { Link } from "react-router-dom";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/UserContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showResendLink, setShowResendLink] = useState(false);
  const emailRef = useRef(null); // Ref for first input field

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from registration or email verification
  useEffect(() => {
    // Check for message in location state (from navigation)
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state so message doesn't persist on refresh
      window.history.replaceState({}, document.title);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    }

    // Check if redirected from email verification (comes from backend redirect)
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get("verified") === "true") {
      setSuccessMessage(
        "Email verified successfully! Please login within 15 minutes."
      );
      // Remove query parameter from URL
      window.history.replaceState({}, document.title, "/login");
      // Clear success message after 5 seconds (important message)
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  }, [location.state, location.search]);

  // Focus the first input field on component mount
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);

  //Handle login form submit
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!password) {
      setError("Please enter the password");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setError("");
    setShowResendLink(false); // Clear resend link on new login attempt

    // Show immediate loading feedback
    setSuccessMessage("Processing login...");
    const successTimeout = setTimeout(() => setSuccessMessage(""), 1500);

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      });

      const { accessToken, refreshToken, role } = response.data;

      if (accessToken && refreshToken) {
        // Clear the original processing message timeout and update message
        clearTimeout(successTimeout);
        setSuccessMessage("Login successful! Redirecting...");
        
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        updateUser(response.data);

        // Redirect after showing the success message for 3 seconds
        setTimeout(() => {
          // Clear the message and navigate based on role
          setSuccessMessage("");
          if (role === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/user/dashboard");
          }
        }, 3000);
      } else if (response.data.verificationRequired) {
        // Clear the processing message and timeout
        setSuccessMessage("");
        clearTimeout(successTimeout);
        
        // Show success message and redirect to verification page
        setSuccessMessage(
          "Verification code sent to your email. Please check your inbox."
        );
        // Redirect to verification page after a short delay
        setTimeout(() => {
          setSuccessMessage("");
          navigate("/login-verify", {
            state: {
              email: response.data.email,
            },
          });
        }, 2000); // 2 seconds to show message
      }
    } catch (err) {
      // Clear the processing message first
      setSuccessMessage("");
      clearTimeout(successTimeout);
      
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
        // Show resend link if server indicates it's needed
        if (err.response.data.resend) {
          setShowResendLink(true);
          // Update email from backend if provided
          if (err.response.data.email) {
            setEmail(err.response.data.email);
          }
        }
      } else {
        setError("Something went wrong. Please try again");
      }

      // Clear error message after 3 seconds to match new requirements
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <AuthLayout>
      <div className="lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center">
        <h3 className="text-xl font-semibold text-black">Welcome Back</h3>
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          Please enter your details to log in
        </p>

        <form onSubmit={handleLogin}>
          <Input
            ref={emailRef}
            value={email}
            onChange={({ target }) => setEmail(target.value)}
            label="Email Address"
            placeholder="Enter your Email"
            type="text"
          />

          <Input
            value={password}
            onChange={({ target }) => setPassword(target.value)}
            label="Password"
            placeholder="Min 8 characters"
            type="password"
          />

          <div className="text-right mb-4">
            <Link
              to="/forgot-password"
              className="text-primary text-sm underline"
            >
              Forgot Password?
            </Link>
          </div>

          {successMessage && (
            <p className="text-green-500 text-xs pb-2.5">{successMessage}</p>
          )}
          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
          {showResendLink && (
            <p className="text-xs pb-2.5">
              <Link
                to="/resend-verification"
                state={{ email: email }}
                className="text-primary underline"
              >
                Resend verification code
              </Link>
            </p>
          )}
          <div className="flex justify-between items-center mt-2">
            <button type="submit" className="btn-primary">
              Login
            </button>
          </div>

          <p className="text-[13px] text-slate-800 mt-3">
            Don't have an account?{" "}
            <Link className="font-medium text-primary underline" to="/signup">
              Signup
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
