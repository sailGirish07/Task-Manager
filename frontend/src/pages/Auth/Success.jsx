import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";

export default function Success() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login after 3 seconds
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-black mb-2">Password Reset Successful!</h3>
        <p className="text-xs text-slate-700 mb-6">
          Your password has been successfully reset. You can now login with your new password.
        </p>
        
        <div className="text-sm text-slate-600">
          <p>Redirecting to login page in 3 seconds...</p>
          <button
            type="button"
            className="text-primary underline mt-2"
            onClick={() => navigate("/login")}
          >
            Click here if you are not redirected
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}