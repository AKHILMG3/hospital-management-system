import React, { useState } from "react"
import axios from "axios"
import { getAuthToken } from "../utils/auth"

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "")
const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  age: "",
  gender: "",
  address: "",
}

const getFirstError = (value) => {
  if (Array.isArray(value)) return value[0]
  return value
}

const Add_Patient = () => {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateClient = () => {
    const name = formData.name.trim()
    const email = formData.email.trim().toLowerCase()
    const phone = String(formData.phone || "").trim()
    const address = formData.address.trim()

    if (name.length < 3) return "Name must be at least 3 characters."
    if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/.test(email)) {
      return "Email must be a valid Gmail address (e.g., abc@gmail.com)."
    }
    if (!/^\d{10}$/.test(phone)) return "Phone number must be exactly 10 digits."
    if (!formData.gender) return "Gender is required."
    if (!address) return "Address is required."
    return ""
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (submitting) return

    const token = getAuthToken()
    if (!token) {
      alert("Please login as admin first.")
      return
    }

    const clientError = validateClient()
    if (clientError) {
      alert(clientError)
      return
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: String(formData.phone || "").trim(),
      age: formData.age,
      gender: formData.gender,
      address: formData.address.trim(),
    }

    try {
      setSubmitting(true)

      const res = await axios.post(`${API_BASE_URL}/api/admin/add-patient/`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const responseData = res.data || {}
      const message = responseData.message || "Patient added successfully"
      const patientId = responseData.patient_id
      const emailSent = responseData.email_sent
      const tempPassword = responseData.temporary_password

      const extra = emailSent === false && tempPassword ? `\nTemporary password: ${tempPassword}` : ""
      alert((patientId ? `${message}\nPatient ID: ${patientId}` : message) + extra)

      setFormData(INITIAL_FORM)
    } catch (err) {
      const data = err.response ? err.response.data : null
      console.error(data || err)

      const fieldError =
        (data ? getFirstError(data.email) : "") ||
        (data ? getFirstError(data.phone_number) : "") ||
        (data ? getFirstError(data.phone) : "") ||
        (data ? getFirstError(data.address) : "") ||
        (data ? getFirstError(data.gender) : "")

      const message = (data && data.message) || fieldError || (data && data.detail) || "Error adding patient"
      alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Add Patient</h2>
        <p style={styles.hint}>Password will be auto-generated and sent to the patient email.</p>

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <input
            name="name"
            placeholder="Full Name"
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
            name="phone"
            placeholder="Phone (10 digits)"
            value={formData.phone}
            onChange={handleChange}
            style={styles.input}
            required
          />
          <input
            name="age"
            type="number"
            placeholder="Age"
            value={formData.age}
            onChange={handleChange}
            style={styles.input}
          />

          <select name="gender" value={formData.gender} onChange={handleChange} style={styles.input} required>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <textarea
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            style={styles.textarea}
            required
          />

          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Adding..." : "Add Patient"}
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
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#dcdcdc",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  },
  textarea: {
    gridColumn: "span 2",
    minHeight: "80px",
    padding: "10px 12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#dcdcdc",
    borderRadius: "8px",
  },
  button: {
    gridColumn: "span 2",
    padding: "12px",
    background: "#1abc9c",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    opacity: 1,
  },
}

export default Add_Patient
