import React, { useState } from "react"
import axios from "axios"

const API_BASE_URL = "http://127.0.0.1:8000"

const Add_Departments = () => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  //  Submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (loading) return

    // Simple validation
    if (!name.trim()) {
      alert("Department name is required")
      return
    }

    if (!description.trim()) {
      alert("Description is required")
      return
    }

    try {
      setLoading(true)

      await axios.post(`${API_BASE_URL}/add-department/`, {
        name: name.trim(),
        description: description.trim(),
        is_active: true,
      })

      alert("Department added successfully")

      // Reset form
      setName("")
      setDescription("")
    } catch {
      alert("Error adding department")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Add Department</h2>
        <p style={styles.subtitle}>
          Create a new department for hospital management.
        </p>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Department Name</label>
            <input
              type="text"
              placeholder="Enter department name"
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              placeholder="Enter description"
              style={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Adding..." : "Add Department"}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f5f5f5",
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    width: "400px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    fontSize: "14px",
    color: "gray",
    marginBottom: "15px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  field: {
    marginBottom: "10px",
  },
  label: {
    marginBottom: "5px",
    display: "block",
  },
  input: {
    width: "100%",
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  button: {
    marginTop: "10px",
    padding: "10px",
    background: "green",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
}

export default Add_Departments


