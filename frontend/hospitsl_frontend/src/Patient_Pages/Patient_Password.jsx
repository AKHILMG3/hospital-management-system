import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { logoutUser } from "../utils/auth"

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://hospital-management-system-qdsz.onrender.com').replace(/\/$/, "")

const Patient_Password = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem("auth_token")

  const [changeData, setChangeData] = useState({
    current_password: "",
    new_password: "",
  })
  const [forgotData, setForgotData] = useState({
    email: "",
    otp: "",
    new_password: "",
  })
  const [otpSent, setOtpSent] = useState(false)
  const [loadingChange, setLoadingChange] = useState(false)
  const [loadingOtp, setLoadingOtp] = useState(false)
  const [loadingReset, setLoadingReset] = useState(false)
  const [changeError, setChangeError] = useState("")
  const [changeSuccess, setChangeSuccess] = useState("")
  const [forgotError, setForgotError] = useState("")
  const [forgotSuccess, setForgotSuccess] = useState("")

  const readError = (data, fallback) => {
    if (!data) return fallback
    if (typeof data === "string") {
      const cleaned = data.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      return cleaned || fallback
    }
    if (typeof data.error === "string") return data.error
    const first = Object.values(data)[0]
    if (Array.isArray(first)) return first[0]
    if (typeof first === "string") return first
    return fallback
  }

  const readRequestError = (err, fallback) => {
    if (!err?.response) {
      return "Unable to connect to backend. Start Django server and try again."
    }
    return readError(err.response?.data, fallback)
  }

  const handleChangeInput = (e) => {
    setChangeData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleForgotInput = (e) => {
    setForgotData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const submitChangePassword = async (e) => {
    e.preventDefault()
    setChangeError("")
    setChangeSuccess("")

    if (!token) {
      setChangeError("Login required to change password.")
      return
    }

    setLoadingChange(true)
    try {
      const res = await axios.post(
        `${API_BASE_URL}/patient-change-password/`,
        changeData,
        {
          headers: { Authorization: `Token ${token}` },
        }
      )
      setChangeSuccess(res.data?.message || "Password changed successfully.")
      setChangeData({ current_password: "", new_password: "" })
      setTimeout(() => logoutUser(navigate), 800)
    } catch (err) {
      setChangeError(readRequestError(err, "Unable to change password."))
    } finally {
      setLoadingChange(false)
    }
  }

  const requestOtp = async (e) => {
    e.preventDefault()
    setForgotError("")
    setForgotSuccess("")
    setLoadingOtp(true)

    try {
      const res = await axios.post(
        `${API_BASE_URL}/patient-forgot-password/request-otp/`,
        { email: forgotData.email }
      )
      setOtpSent(true)
      setForgotSuccess(res.data?.message || "OTP sent to your email.")
    } catch (err) {
      setForgotError(readRequestError(err, "Unable to send OTP."))
    } finally {
      setLoadingOtp(false)
    }
  }

  const submitForgotReset = async (e) => {
    e.preventDefault()
    setForgotError("")
    setForgotSuccess("")
    setLoadingReset(true)

    try {
      const payload = {
        email: forgotData.email,
        otp: forgotData.otp,
        new_password: forgotData.new_password,
      }
      const res = await axios.post(`${API_BASE_URL}/patient-forgot-password/reset/`, payload)
      setForgotSuccess(res.data?.message || "Password reset successful.")
      setForgotData({ email: "", otp: "", new_password: "" })
      setOtpSent(false)
      setTimeout(() => logoutUser(navigate), 800)
    } catch (err) {
      setForgotError(readRequestError(err, "Unable to reset password."))
    } finally {
      setLoadingReset(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.title}>Change Password</h3>
          <p style={styles.subtitle}>For logged-in patients</p>
          <form style={styles.form} onSubmit={submitChangePassword}>
            <input
              style={styles.input}
              type="password"
              name="current_password"
              placeholder="Current password"
              value={changeData.current_password}
              onChange={handleChangeInput}
              required
            />
            <input
              style={styles.input}
              type="password"
              name="new_password"
              placeholder="New password"
              value={changeData.new_password}
              onChange={handleChangeInput}
              required
            />
            {changeError ? <p style={styles.error}>{changeError}</p> : null}
            {changeSuccess ? <p style={styles.success}>{changeSuccess}</p> : null}
            <button style={styles.button} type="submit" disabled={loadingChange}>
              {loadingChange ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <h3 style={styles.title}>Forgot Password (OTP)</h3>
          <p style={styles.subtitle}>Reset with email OTP</p>

          <form style={styles.form} onSubmit={requestOtp}>
            <input
              style={styles.input}
              type="email"
              name="email"
              placeholder="Patient email"
              value={forgotData.email}
              onChange={handleForgotInput}
              required
            />
            <button style={styles.button} type="submit" disabled={loadingOtp}>
              {loadingOtp ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>

          {otpSent ? (
            <form style={{ ...styles.form, marginTop: "12px" }} onSubmit={submitForgotReset}>
              <input
                style={styles.input}
                type="text"
                name="otp"
                placeholder="Enter OTP"
                value={forgotData.otp}
                onChange={handleForgotInput}
                required
              />
              <input
                style={styles.input}
                type="password"
                name="new_password"
                placeholder="New password"
                value={forgotData.new_password}
                onChange={handleForgotInput}
                required
              />
              <button style={styles.button} type="submit" disabled={loadingReset}>
                {loadingReset ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          ) : null}

          {forgotError ? <p style={styles.error}>{forgotError}</p> : null}
          {forgotSuccess ? <p style={styles.success}>{forgotSuccess}</p> : null}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f4f8ff 0%, #eaf6f1 100%)",
    padding: "48px 16px",
  },
  grid: {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 14px 30px rgba(20, 58, 95, 0.12)",
    border: "1px solid #e5edf7",
  },
  title: {
    margin: "0 0 6px",
    color: "#17324d",
  },
  subtitle: {
    margin: "0 0 14px",
    color: "#5a7288",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  input: {
    height: "44px",
    borderRadius: "10px",
    border: "1px solid #c9d7e6",
    padding: "0 12px",
    fontSize: "14px",
    backgroundColor: "#fbfdff",
    outline: "none",
  },
  button: {
    marginTop: "4px",
    height: "44px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#1565c0",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    margin: "10px 0 0",
    color: "#b42318",
    fontSize: "12px",
  },
  success: {
    margin: "10px 0 0",
    color: "#067647",
    fontSize: "12px",
  },
}

export default Patient_Password
