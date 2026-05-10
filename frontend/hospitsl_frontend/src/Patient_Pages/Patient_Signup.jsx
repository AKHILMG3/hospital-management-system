import React, { useEffect, useRef, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://hospital-management-system-qdsz.onrender.com').replace(/\/$/, "")

const INITIAL_FORM_DATA = {
  name: "",
  email: "",
  phone_number: "",
  gender: "",
  address: "",
}

const INITIAL_ERRORS = {
  name: "",
  email: "",
  phone_number: "",
  gender: "",
  address: "",
}

function getFirstError(value) {
  if (Array.isArray(value)) return value[0] || ""
  return value || ""
}

function hasValidationErrors(errors) {
  return Boolean(errors.name || errors.email || errors.phone_number || errors.gender || errors.address)
}

const Patient_Signup = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState(INITIAL_ERRORS)
  const [success, setSuccess] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const imageInputRef = useRef(null)

  const validateName = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return "Name is required."
    if (trimmed.length < 3) return "Name must be at least 3 characters."
    return ""
  }

  const validateEmailFormat = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return "Email is required."
    const re = /^[A-Za-z0-9._%+-]+@gmail\.com$/
    if (!re.test(trimmed)) return "Email must be a valid Gmail address (e.g., abc@gmail.com)."
    return ""
  }

  const validatePhone = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return "Phone number is required."
    if (!/^\d{10}$/.test(trimmed)) return "Phone number must be 10 digits."
    return ""
  }

  const validateGender = (value) => {
    const trimmed = String(value || "").trim()
    if (!trimmed) return "Gender is required."
    return ""
  }

  const validateAddress = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return "Address is required."
    return ""
  }

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        return validateName(value)
      case "email":
        return validateEmailFormat(value)
      case "phone_number":
        return validatePhone(value)
      case "gender":
        return validateGender(value)
      case "address":
        return validateAddress(value)
      default:
        return ""
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setSuccess("")
    setFormError("")
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleImageChange = (e) => {
    const selectedFile = e.target.files?.[0] || null
    setImageFile(selectedFile)
  }

  useEffect(() => {
    const email = formData.email.trim().toLowerCase()
    const emailFormatError = validateEmailFormat(email)

    if (!email || emailFormatError) {
      setCheckingEmail(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        setCheckingEmail(true)
        const res = await axios.get(`${API_BASE_URL}/patient-email-check/?email=${encodeURIComponent(email)}`)
        if (!cancelled && res.data?.available === false) {
          setErrors((prev) => ({ ...prev, email: "Email already exists" }))
        } else if (!cancelled) {
          setErrors((prev) => {
            if (prev.email === "Email already exists") {
              return { ...prev, email: "" }
            }
            return prev
          })
        }
      } catch {
        // keep local validation result if check fails
      } finally {
        if (!cancelled) setCheckingEmail(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [formData.email])

  const getIsFormValid = () => {
    const nameError = validateName(formData.name)
    const emailError = validateEmailFormat(formData.email)
    const phoneError = validatePhone(formData.phone_number)
    const genderError = validateGender(formData.gender)
    const addressError = validateAddress(formData.address)
    const hasErrors = hasValidationErrors(errors)
    return !nameError && !emailError && !phoneError && !genderError && !addressError && !hasErrors && !checkingEmail
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess("")
    setFormError("")

    const nextErrors = {
      name: validateName(formData.name),
      email: validateEmailFormat(formData.email),
      phone_number: validatePhone(formData.phone_number),
      gender: validateGender(formData.gender),
      address: validateAddress(formData.address),
    }
    setErrors(nextErrors)

    if (hasValidationErrors(nextErrors) || checkingEmail) {
      return
    }

    try {
      setSubmitting(true)
      const payload = new FormData()
      payload.append("name", formData.name.trim())
      payload.append("email", formData.email.trim().toLowerCase())
      payload.append("phone_number", formData.phone_number.trim())
      payload.append("gender", formData.gender)
      payload.append("address", formData.address.trim())
      if (imageFile) {
        payload.append("image", imageFile)
      }

      const response = await axios.post(`${API_BASE_URL}/patient-signup/`, payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const message = response.data?.message || "Patient registered successfully"
      const patientId = response.data?.patient_id
      setSuccess(patientId ? `${message} (Patient ID: ${patientId})` : message)

      setFormData(INITIAL_FORM_DATA)
      setErrors(INITIAL_ERRORS)
      setImageFile(null)
      if (imageInputRef.current) {
        imageInputRef.current.value = ""
      }

      setTimeout(() => {
        navigate("/login")
      }, 800)
    } catch (err) {
      const apiErrors = err.response?.data
      const genericError = apiErrors?.error || apiErrors?.message

      setErrors((prev) => ({
        ...prev,
        name: getFirstError(apiErrors?.name) || prev.name,
        email: getFirstError(apiErrors?.email) || prev.email,
        phone_number: getFirstError(apiErrors?.phone_number) || prev.phone_number,
        gender: getFirstError(apiErrors?.gender) || prev.gender,
        address: getFirstError(apiErrors?.address) || prev.address,
      }))

      if (genericError) {
        setFormError(getFirstError(genericError))
      } else if (!err.response) {
        setFormError("Unable to connect to backend. Start Django server and try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>Patient Registration</h2>
        <p style={styles.hint}>Password will be auto-generated and sent to your email.</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div>
            <label>Full Name</label>
            <input
              style={styles.input}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            {errors.name ? <p style={styles.error}>{errors.name}</p> : null}
          </div>

          <div>
            <label>Email</label>
            <input
              style={styles.input}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {checkingEmail ? <p style={styles.muted}>Checking email availability...</p> : null}
            {errors.email ? <p style={styles.error}>{errors.email}</p> : null}
          </div>

          <div>
            <label>Phone Number</label>
            <input
              style={styles.input}
              type="text"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              required
            />
            {errors.phone_number ? <p style={styles.error}>{errors.phone_number}</p> : null}
          </div>

          <div>
            <label>Gender</label>
            <select
              style={styles.input}
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {errors.gender ? <p style={styles.error}>{errors.gender}</p> : null}
          </div>

          <div>
            <label>Address</label>
            <input
              style={styles.input}
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
            {errors.address ? <p style={styles.error}>{errors.address}</p> : null}
          </div>

          <div>
            <label>Profile Image</label> <br />
            <input
              style={styles.fileInput}
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              ref={imageInputRef}
            />
          </div>

          {formError ? <p style={styles.error}>{formError}</p> : null}
          {success ? <p style={styles.success}>{success}</p> : null}

          <button style={styles.button} type="submit" disabled={!getIsFormValid() || submitting}>
            {submitting ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-center mt-3 mb-0">
          Already have an account?
          <a href="/login" className="fw-semibold">Log In</a>
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
    margin: "0 0 10px",
    textAlign: "center",
    color: "#17324d",
    fontWeight: 700,
  },
  hint: {
    textAlign: "center",
    color: "#5a7288",
    margin: "0 0 16px",
    fontSize: "13px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    width: "100%",
    height: "44px",
    borderRadius: "10px",
    border: "1px solid #c9d7e6",
    padding: "0 12px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#fbfdff",
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
    opacity: 1,
  },
  fileInput: {
    borderRadius: "10px",
    border: "1px solid #c9d7e6",
    padding: "10px 12px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#fbfdff",
  },
  error: {
    color: "#b42318",
    fontSize: "12px",
    margin: "6px 0 0",
  },
  success: {
    color: "#067647",
    fontSize: "12px",
    margin: 0,
  },
  muted: {
    color: "#5a7288",
    fontSize: "12px",
    margin: "6px 0 0",
  },
}

export default Patient_Signup
