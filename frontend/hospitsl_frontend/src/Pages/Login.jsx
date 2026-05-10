import React, { useState } from "react"
import axios from "axios"
import { Link, useNavigate } from "react-router-dom"

const LOGIN_URL = "https://hospital-management-system-qdsz.onrender.com/patient-login/"
const STORAGE_KEYS = {
  authUser: "auth_user",
  patientUser: "patient_user",
  token: "auth_token",
}

function getHomePath(user) {
  const isAdmin = Boolean(user?.is_superuser) || Boolean(user?.is_staff) || Number(user?.user_type) === 2
  const isDoctor = Number(user?.user_type) === 3
  if (isAdmin) return "/admin-dashboard"
  if (isDoctor) return "/doctor_home"
  return "/patient-home"
}

const Login = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const saveLoginData = (user, token, homePath) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(user))
    }
    if (token) {
      localStorage.setItem(STORAGE_KEYS.token, token)
      // alias for older pages expecting `access`
      localStorage.setItem("access", token)
    }

    const isDoctor = Number(user?.user_type) === 3
    const isAdmin = homePath === "/admin-dashboard"

    if (isAdmin) {
      localStorage.removeItem(STORAGE_KEYS.patientUser)
      return
    }

    if (!isDoctor && user) {
      localStorage.setItem(STORAGE_KEYS.patientUser, JSON.stringify(user))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      const response = await axios.post(LOGIN_URL, {
        username: formData.email,
        password: formData.password,
      })

      const user = response.data?.user
      const token = response.data?.token

      const homePath = getHomePath(user)
      saveLoginData(user, token, homePath)

      setSuccess(response.data?.message || "Login successful")
      setTimeout(() => navigate(homePath), 600)
    } catch (err) {
      localStorage.removeItem(STORAGE_KEYS.token)
      localStorage.removeItem("access")
      const backendError = err.response?.data?.error
      setError(backendError || "Unable to login")
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>Login</h2>
        <p style={styles.subtitle}>Access your account</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          <label style={styles.label} htmlFor="email">Email or Username</label>
          <input
            id="email"
            type="text"
            name="email"
            placeholder="Enter your email or username"
            style={styles.input}
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label style={styles.label} htmlFor="password">Password</label>
          <div style={styles.passwordWrapper}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              style={styles.input}
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              style={styles.toggleButton}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error ? <p style={styles.error}>{error}</p> : null}
          {success ? <p style={styles.success}>{success}</p> : null}

          <button type="submit" style={styles.button}>Log In</button>
        </form>

        <p className="text-center mt-3 mb-0">
          Do you have an account? <a href="/signup" className="fw-semibold">Sign Up</a>
        </p>
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
  container: {
    maxWidth: "460px",
    margin: "0 auto",
    textAlign: "left",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 14px 30px rgba(20, 58, 95, 0.12)",
    border: "1px solid #e5edf7",
  },
  title: {
    margin: "0 0 6px",
    color: "#17324d",
    textAlign: "center",
    fontWeight: 700,
  },
  subtitle: {
    margin: "0 0 18px",
    color: "#4e647b",
    textAlign: "center",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  label: {
    fontSize: "14px",
    color: "#2f4d69",
    fontWeight: 600,
  },
  input: {
    height: "44px",
    borderRadius: "10px",
    border: "1px solid #c9d7e6",
    padding: "0 12px",
    fontSize: "14px",
    backgroundColor: "#fbfdff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  passwordWrapper: {
    position: "relative",
  },
  toggleButton: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    color: "#1565c0",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  button: {
    marginTop: "6px",
    height: "46px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#1565c0",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    color: "#b42318",
    fontSize: "12px",
    margin: 0,
  },
  success: {
    color: "#067647",
    fontSize: "12px",
    margin: 0,
  },
}

export default Login

