import React, { useState, useEffect, useContext, useRef, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import AuthLayout from "../../components/layouts/AuthLayout";
import { UserContext } from "../../context/UserContext";

export default function LoginVerify() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60); // 1 minute (60 seconds)
  
  const firstInputRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const [isSubmissionPending, setIsSubmissionPending] = useState(false);

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from URL query parameter or state
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const emailFromUrl = urlParams.get("email") || location.state?.email;
    
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    } else {
      // If no email, redirect to login
      navigate("/login");
    }
  }, [location.search, location.state, navigate]);
  
  // Focus on the first input field when component mounts
  useLayoutEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && !isLoading && !error && !isSubmissionPending) {
      // Set error when countdown reaches 0 and no submission is in progress and no error exists and no submission pending
      setError("Verification code has expired. Please request a new code.");
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown, isLoading, error, isSubmissionPending]);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle input change
  const handleInputChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newCode = [...code];
        newCode[index - 1] = "";
        setCode(newCode);
      }
    }
  };

  // Submit verification code
  const handleSubmit = async (enteredCode) => {
    if (!enteredCode || enteredCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    // Check if code has expired before submitting
    if (countdown <= 0) {
      setError("Verification code has expired. Please request a new code.");
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => {
        const firstInput = document.getElementById("code-0");
        if (firstInput) firstInput.focus();
      }, 100);
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.VERIFY_LOGIN_CODE, {
        email,
        code: enteredCode
      });

      if (response.data.success) {
        // Clear any previous error
        setError("");
        // Show success message before navigating
        setMessage("Email Verification Successful!");
        
        // Save tokens and user data
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        updateUser(response.data);
        
        // Redirect to dashboard based on role
        setTimeout(() => {
          if (response.data.role === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/user/dashboard");
          }
        }, 2000); // Wait 2 seconds to show success message
      }
      
      // Clear submission pending flag
      setIsSubmissionPending(false);
    } catch (err) {
      // Clear any previous success message
      setMessage("");
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        
        // Check the error type from the backend
        if (errorData.errorType === "CODE_EXPIRED") {
          setError("Verification code has expired. Please request a new code.");
          // Clear the code inputs for expired code
          setCode(["", "", "", "", "", ""]);
          // Focus first input
          setTimeout(() => {
            const firstInput = document.getElementById("code-0");
            if (firstInput) firstInput.focus();
          }, 100);
        } else if (errorData.errorType === "INVALID_CODE") {
          setError("Enter the correct code");
          // Clear the code inputs for incorrect code and focus first input
          setCode(["", "", "", "", "", ""]);
          // Focus first input
          setTimeout(() => {
            const firstInput = document.getElementById("code-0");
            if (firstInput) firstInput.focus();
          }, 100);
        } else {
          // Fallback to message field if no errorType
          const errorMessage = errorData.message;
          // For the email verification endpoint, it returns "Invalid or expired verification code" for both cases
          // We need to handle this specific message appropriately
          if (errorMessage === "Invalid or expired verification code") {
            setError("Enter the correct code");
            // Clear the code inputs for incorrect code and focus first input
            setCode(["", "", "", "", "", ""]);
            // Focus first input
            setTimeout(() => {
              const firstInput = document.getElementById("code-0");
              if (firstInput) firstInput.focus();
            }, 100);
          } else if (errorMessage.toLowerCase().includes("expired")) {
            setError("Verification code has expired. Please request a new code.");
            // Clear the code inputs for expired code
            setCode(["", "", "", "", "", ""]);
            // Focus first input
            setTimeout(() => {
              const firstInput = document.getElementById("code-0");
              if (firstInput) firstInput.focus();
            }, 100);
          } else if (errorMessage.toLowerCase().includes("invalid") || errorMessage.toLowerCase().includes("incorrect")) {
            setError("Enter the correct code");
            // Clear the code inputs for incorrect code and focus first input
            setCode(["", "", "", "", "", ""]);
            // Focus first input
            setTimeout(() => {
              const firstInput = document.getElementById("code-0");
              if (firstInput) firstInput.focus();
            }, 100);
          } else {
            setError(errorMessage);
            // Clear the code inputs for other errors
            setCode(["", "", "", "", "", ""]);
            // Focus first input
            setTimeout(() => {
              const firstInput = document.getElementById("code-0");
              if (firstInput) firstInput.focus();
            }, 100);
          }
        }
      } else {
        setError("Something went wrong. Please try again.");
        // Clear the code inputs for other errors
        setCode(["", "", "", "", "", ""]);
        // Focus first input
        setTimeout(() => {
          const firstInput = document.getElementById("code-0");
          if (firstInput) firstInput.focus();
        }, 100);
      }
      
      // Clear error after 5 seconds
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError("");
        errorTimeoutRef.current = null;
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");
    setIsSubmissionPending(true); // Mark that submission is pending
    // Clear any pending error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.RESEND_CODE, {
        email
      });

// Reset countdown
      setCountdown(60); // 1 minute (60 seconds)
      // Clear code inputs
      setCode(["", "", "", "", "", ""]);
      
      // Focus first input
      setTimeout(() => {
        if (firstInputRef.current) firstInputRef.current.focus();
      }, 100);
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setIsSubmissionPending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center">
        <h3 className="text-xl font-semibold text-black">Verify Your Email</h3>
        
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium">{email}</span>
        </p>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">
            Enter the verification code:
          </p>
          
          <div className="flex justify-center space-x-3 mb-4">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                ref={index === 0 ? firstInputRef : null}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
          {message && <p className="text-green-500 text-xs pb-2.5">{message}</p>}

          {/* Countdown Timer */}
          <div className="text-center text-sm text-gray-500 mb-4">
            {countdown > 0 ? (
              <span>Code expires in: <span className="font-semibold">{formatTime(countdown)}</span></span>
            ) : (
              <span className="text-red-500 font-semibold">Code has expired!</span>
            )}
          </div>

          {/* Resend Code Section */}
          <div className="flex justify-between items-center mb-6">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-sm text-primary underline"
            >
              Resend Code
            </button>
          </div>

          <button
            onClick={() => handleSubmit(code.join(""))}
            disabled={isLoading || code.some(digit => digit === "") || countdown <= 0}
            className={`w-full btn-primary ${isLoading || code.some(digit => digit === "") || countdown <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? "Verifying..." : countdown <= 0 ? "Code Expired" : "Verify Code"}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}