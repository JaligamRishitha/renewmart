import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../Styles/UpdatePassword.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons";

const UpdatePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [toast, setToast] = useState({ message: null, isError: false });
  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const resetToken = queryParams.get("token");
  const fromForgot = queryParams.get("from") === "forgot";

localStorage.removeItem("User");

  const user = JSON.parse(localStorage.getItem("user"));

 const employee_id = user?.employeeId || user?.id;

  const onboardingStatus = user?.onboarding_status; // o_status
  const loginStatus = user?.login_status; // login_status

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      showToast("New password and Confirm password do not match!", true);
      return;
    }

    try {
      if (resetToken || fromForgot) {
  // 🔹 Forgot password flow
  await axios.post(`${API_BASE_URL}/users/change-password`, {
    token: resetToken,
    newPassword: formData.newPassword,
  });

  showToast("Password reset successfully! Redirecting to login...", false);
  setTimeout(() => navigate("/"), 1500);

} else {
  // 🔹 Decide based on onboarding/login status
  if (!onboardingStatus && loginStatus) {
    // o=false, l=true → new user form
    showToast("Redirecting to onboarding form...", false);
    setTimeout(() => navigate("/new-user-form"), 1500);

  } else {
    // All other cases → actually reset password
    const token = localStorage.getItem("token");
    await axios.post(
      `${API_BASE_URL}/users/reset_onboarding_password`,
      { new_password: formData.newPassword, employee_id },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // ✅ Then handle dashboard / logout
    if (!onboardingStatus && !loginStatus) {
      showToast("Password updated! Redirecting to change password form...", false);
      setTimeout(() => navigate("/change-password"), 1500);

    } else if (onboardingStatus && !loginStatus) {
      showToast("Password updated! Redirecting to dashboard...", false);
      setTimeout(() => {
        if (user.role === "HR") navigate("/hr-dashboard");
        else if (user.role === "Manager") navigate("/manager-dashboard");
        else navigate("/employee-dashboard");
      }, 1500);

    } else if (onboardingStatus && loginStatus) {
      showToast("Password updated! Redirecting to dashboard...", false);
      setTimeout(() => {
        if (user.role === "HR") navigate("/hr-dashboard");
        else if (user.role === "Manager") navigate("/manager-dashboard");
        else navigate("/employee-dashboard");
      }, 1500);

    } else {
      showToast("Password updated! Please login again.", false);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setTimeout(() => navigate("/"), 1500);
    }
  }
}

        
      
    } catch (err) {
      console.error("Password update error:", err);
      showToast(err.response?.data?.error || "Something went wrong.", true);
    }
  };

  // Auto-hide toast after 2.5s
  useEffect(() => {
    if (toast.message) {
      const timer = setTimeout(
        () => setToast({ message: null, isError: false }),
        2500
      );
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      {toast.message && (
        <div className={`toast-message ${toast.isError ? "error" : "success"}`}>
          <FontAwesomeIcon
            icon={toast.isError ? faTimesCircle : faCheckCircle}
            className="me-2"
          />
          {toast.message}
        </div>
      )}

      <div className="form-box shadow-lg p-4 rounded">
        <h2 className="text-center mb-4">Change Password</h2>
        <form onSubmit={handleSubmit}>
          {/* Show current password only for normal users */}
          {!resetToken && onboardingStatus && loginStatus && (
            <div className="mb-3">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                className="form-control"
                placeholder="Enter current password"
                value={formData.currentPassword}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {/* Always show new + confirm */}
          <div className="mb-3">
            <label className="form-label">New Password</label>
            <input
              type="password"
              name="newPassword"
              className="form-control"
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-control"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-submit w-100">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
