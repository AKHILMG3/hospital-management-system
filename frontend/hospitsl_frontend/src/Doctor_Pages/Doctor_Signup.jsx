// Hint: This file contains project UI/app logic; read component sections for flow.
import React, { useEffect, useState } from 'react'
import axios from 'axios'

const GMAIL_REGEX = /^[A-Z0-9._%+-]+@gmail\.com$/i

const Doctor_Signup = () => {
  const [departments, setDepartments] = useState([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    department_id: "",
  })
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get("https://hospital-management-system-qdsz.onrender.com/departments/")
        const activeDepartments = (res.data || []).filter((dep) => dep.is_active)
        setDepartments(activeDepartments)
      } catch {
        setError("Unable to load departments")
      }
    }
    fetchDepartments()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "phone_number") {
      const digitsOnly = String(value || "").replace(/\D/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, phone_number: digitsOnly }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageChange = (e) => {
    const selectedFile = e.target.files?.[0] || null
    setImageFile(selectedFile)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const cleanedEmail = formData.email.trim().toLowerCase()
    const cleanedPhone = formData.phone_number.replace(/\D/g, "").trim()

    if (!GMAIL_REGEX.test(cleanedEmail)) {
      setError("Email must be a valid Gmail address (e.g., abc@gmail.com)")
      return
    }

    if (cleanedPhone.length !== 10) {
      setError("Phone number must be exactly 10 digits")
      return
    }

    if (!formData.department_id) {
      setError("Please select a department")
      return
    }

    setLoading(true)

    try {
      const payload = new FormData()
      payload.append("name", formData.name.trim())
      payload.append("email", cleanedEmail)
      payload.append("phone_number", cleanedPhone)
      payload.append("department_id", String(Number(formData.department_id)))
      if (imageFile) {
        payload.append("image", imageFile)
      }
      const res = await axios.post("https://hospital-management-system-qdsz.onrender.com/doctor-signup/", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      setSuccess(res.data?.message || "Doctor signup submitted successfully")
      setFormData({
        name: "",
        email: "",
        phone_number: "",
        department_id: "",
      })
      setImageFile(null)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === "object") {
        const first = Object.values(data)[0]
        if (Array.isArray(first)) {
          setError(first[0] || "Signup failed")
        } else if (typeof first === "string") {
          setError(first)
        } else {
          setError("Signup failed")
        }
      } else {
        setError("Unable to connect to backend")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
<div style={styles.page}>
  <div style={styles.card}>
    <h2 style={styles.title}>Doctor Signup</h2>

    <p style={styles.subtitle}>
      Status = Pending. Doctor account will be created and wait for admin approval.
    </p>

    <form style={styles.form} onSubmit={handleSubmit}>

      <div>
        <label style={styles.label}>Name</label>
        <input
          style={styles.input}
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          pattern="^[A-Za-z0-9._%+-]+@gmail\\.com$"
          title="Enter a Gmail address like abc@gmail.com"
          required
        />
      </div>

      <div>
        <label style={styles.label}>Phone Number</label>
        <input
          style={styles.input}
          type="tel"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          inputMode="numeric"
          pattern="^[0-9]{10}$"
          title="Enter 10 digit phone number"
          maxLength={10}
          required
        />
      </div>

      <div>
        <label style={styles.label}>Department</label>
        <select
          style={styles.input}
          name="department_id"
          value={formData.department_id}
          onChange={handleChange}
          required
        >
          <option value="">Select Department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={styles.label}>Profile Image</label>
        <input
          style={styles.fileInput}
          type="file"
          name="image"
          accept="image/*"
          onChange={handleImageChange}
        />
      </div>

      {error ? <p style={styles.error}>{error}</p> : null}
      {success ? <p style={styles.success}>{success}</p> : null}

      <button style={styles.button} type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Create Doctor Account"}
      </button>

    </form>
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
  card: {
    maxWidth: "480px",
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
    fontWeight: 700,
    textAlign: "center",
  },
  subtitle: {
    margin: "0 0 18px",
    textAlign: "center",
    color: "#4e647b",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#17324d",
    marginBottom: "4px",
    display: "block",
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

fileInput: {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid #c9d7e6",
  padding: "10px 12px",
  fontSize: "14px",
  backgroundColor: "#fbfdff",

  },
}


export default Doctor_Signup

