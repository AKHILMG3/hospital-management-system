import React, { useEffect, useState } from "react"
import axios from "axios"
import { getAuthToken } from "../utils/auth"

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "")

const INITIAL_FORM = {
  name: "",
  email: "",
  phone_number: "",
  place: "",
  department_id: "",
}

const getFirstError = (value) => (Array.isArray(value) ? value[0] : value)

const Add_Doctor = () => {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [departments, setDepartments] = useState([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDepartments()
  }, [])

  // Load department options for the dropdown.
  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true)

      const response = await axios.get(`${API_BASE_URL}/api/departments/`)
      setDepartments(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error("Error fetching departments:", error)
      setDepartments([])
    } finally {
      setLoadingDepartments(false)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  // Validate inputs before API call.
  const validateForm = () => {
    const name = formData.name.trim()
    const email = formData.email.trim().toLowerCase()
    const phone = formData.phone_number.trim()
    const place = formData.place.trim()

    if (name.length < 3) return "Name must be at least 3 characters."

    if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/.test(email)) {
      return "Enter a valid Gmail (example@gmail.com)"
    }

    if (!/^\d{10}$/.test(phone)) {
      return "Phone number must be 10 digits"
    }

    if (!place) return "Place is required"

    return ""
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (submitting) return

    const token = getAuthToken()
    if (!token) {
      alert("Please login as admin first.")
      return
    }

    const validationError = validateForm()
    if (validationError) {
      alert(validationError)
      return
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone_number: formData.phone_number.trim(),
      place: formData.place.trim(),
    }

    if (formData.department_id) {
      payload.department_id = Number(formData.department_id)
    }

    try {
      setSubmitting(true)

      const response = await axios.post(
        `${API_BASE_URL}/api/admin/add-doctor/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = response.data || {}
      const message = data.message || "Doctor added successfully"
      const emailSent = data.email_sent
      const tempPassword = data.temporary_password

      const extraMessage =
        emailSent === false && tempPassword
          ? `\nTemporary password: ${tempPassword}`
          : ""

      alert(message + extraMessage)
      setFormData(INITIAL_FORM)
    } catch (error) {
      const data = error.response ? error.response.data : null

      console.error("Error:", data || error)

      const fieldError =
        (data && getFirstError(data.email)) ||
        (data && getFirstError(data.phone_number)) ||
        (data && getFirstError(data.place)) ||
        (data && getFirstError(data.name))

      const message =
        (data && data.message) ||
        fieldError ||
        (data && data.detail) ||
        "Error adding doctor"

      alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Add Doctor</h2>

        <p style={styles.hint}>
          Doctor is added automatically. Password will be sent to email.
        </p>

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <input
            name="name"
            placeholder="Doctor Name"
            value={formData.name}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email (abc@gmail.com)"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <input
            name="phone_number"
            placeholder="Phone (10 digits)"
            value={formData.phone_number}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <input
            name="place"
            placeholder="Place"
            value={formData.place}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="">
              {loadingDepartments
                ? "Loading..."
                : "Select Department (optional)"}
            </option>

            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Adding..." : "Add Doctor"}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: "30px",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: "700px",
    background: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
  },
  title: {
    marginBottom: "6px",
    fontSize: "22px",
    fontWeight: "600",
    color: "#2c3e50",
  },
  hint: {
    margin: "0 0 18px",
    color: "#5a7288",
    fontSize: "13px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #dcdcdc",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  },
  button: {
    gridColumn: "span 2",
    padding: "12px",
    background: "#1abc9c",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
}

export default Add_Doctor
