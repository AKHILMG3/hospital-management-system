import React, { useEffect, useState } from "react"
import axios from "axios"
import "./Department_View.css"

const API_BASE_URL = "http://127.0.0.1:8000"

const Department_View = () => {
  const [departments, setDepartments] = useState([])

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)

  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/departments/`)
      setDepartments(res.data)
    } catch (error) {
      alert("Error loading departments")
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()

    if (name.length < 3) {
      alert("Name must be at least 3 characters")
      return
    }

    try {
      await axios.post(`${API_BASE_URL}/api/departments/`, {
        name,
        description,
        is_active: isActive,
      })

      alert("Added successfully")

      setName("")
      setDescription("")
      setIsActive(true)

      fetchDepartments()
    } catch {
      alert("Error adding department")
    }
  }

  const handleEdit = (dept) => {
    setEditingId(dept.id)
    setName(dept.name)
    setDescription(dept.description)
    setIsActive(dept.is_active)
  }

  const handleUpdate = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/api/departments/${editingId}/`, {
        name,
        description,
        is_active: isActive,
      })

      alert("Updated successfully")

      setEditingId(null)
      setName("")
      setDescription("")
      setIsActive(true)

      fetchDepartments()
    } catch {
      alert("Error updating")
    }
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure?")
    if (!confirmDelete) return

    try {
      await axios.delete(`${API_BASE_URL}/api/departments/${id}/`)
      alert("Deleted successfully")
      fetchDepartments()
    } catch {
      alert("Error deleting")
    }
  }

  return (
    <main className="department-view">
      <div className="department-view__container">
        <header className="department-view__header">
          <h2>Department Management</h2>
          <p>Add, edit, and manage department details in one place.</p>
        </header>

        <section className="department-card department-card--form">
          <form className="department-form" onSubmit={handleAdd}>
            <div className="department-field">
              <label>Department Name</label>
              <input
                type="text"
                className="department-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter department name"
              />
            </div>

            <div className="department-field">
              <label>Description</label>
              <textarea
                className="department-input department-input--textarea"
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>

            <div className="department-form__footer">
              <div className="department-checkbox">
                <input
                  type="checkbox"
                  className="department-checkbox__input"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label>Active</label>
              </div>

              {editingId ? (
                <button
                  className="department-btn department-btn--warning department-btn--submit"
                  type="button"
                  onClick={handleUpdate}
                >
                  Update Department
                </button>
              ) : (
                <button className="department-btn department-btn--primary department-btn--submit" type="submit">
                  Add Department
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="department-card">
          {departments.length === 0 ? (
            <p className="department-empty">No departments found</p>
          ) : (
            <div className="department-table-wrap">
              <table className="department-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, index) => (
                    <tr key={dept.id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{dept.name}</strong>
                      </td>
                      <td>{dept.description}</td>
                      <td>
                        <span
                          className={`department-badge ${
                            dept.is_active ? "department-badge--active" : "department-badge--inactive"
                          }`}
                        >
                          {dept.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="department-actions">
                        <button
                          type="button"
                          className="department-btn department-btn--small"
                          onClick={() => handleEdit(dept)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="department-btn department-btn--small department-btn--danger"
                          onClick={() => handleDelete(dept.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Department_View
