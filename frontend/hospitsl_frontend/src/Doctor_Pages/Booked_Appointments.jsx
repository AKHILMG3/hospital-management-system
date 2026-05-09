// Import necessary libraries and hooks
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

// Constants for API and user types
const API_URL = "http://127.0.0.1:8000" // Backend server address
const DOCTOR_USER_TYPE = 3 // User type for doctors
const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected", "Completed"] // Status filter options
const CLOSED_BOOKING_STATUSES = ["rejected", "cancelled"] // Closed statuses

// Utility function to read authenticated user details from localStorage
function readAuthUser() {
  const raw = localStorage.getItem("auth_user")
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const Booked_Appointments = () => {
  const navigate = useNavigate()

  // State variables for managing appointments, loading, errors, etc.
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [updatingId, setUpdatingId] = useState(null)

  // Memoized values for authenticated user details
  const doctorUser = useMemo(() => readAuthUser(), [])
  const doctorId = doctorUser?.id
  const doctorUserType = Number(doctorUser?.user_type || 0)

  // Fetch appointments when the component mounts or user changes
  useEffect(() => {
    // Redirect to login if user is not authenticated or not a doctor
    if (!doctorId || doctorUserType !== DOCTOR_USER_TYPE) {
      navigate("/login", { replace: true })
      return
    }

    // Fetch appointments from the backend
    async function fetchAppointments() {
      try {
        setLoading(true)
        setError("")
        const res = await axios.get(`${API_URL}/appointments/?doctor_id=${doctorId}`)
        setAppointments(res.data || [])
      } catch {
        setError("Failed to load booked appointments.")
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [doctorId, doctorUserType, navigate])

  // Filter appointments based on the selected status
  const filteredAppointments = useMemo(() => {
    if (statusFilter === "All") return appointments
    const selectedStatus = statusFilter.toLowerCase()
    return appointments.filter((item) => normalizeText(item.status) === selectedStatus)
  }, [appointments, statusFilter])

  // Utility function to normalize text for comparison
  function normalizeText(value) {
    return String(value || "").toLowerCase().trim()
  }

  // Format date and time for display
  function formatDateTime(value) {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  // Get styles for booking status pills
  function getBookingStatusPillStyle(value) {
    const normalized = normalizeText(value)
    if (normalized === "approved") return { ...styles.pillBase, ...styles.pillApproved }
    if (normalized === "rejected") return { ...styles.pillBase, ...styles.pillRejected }
    if (normalized === "cancelled") return { ...styles.pillBase, ...styles.pillCancelled }
    if (normalized === "completed") return { ...styles.pillBase, ...styles.pillCompleted }
    return { ...styles.pillBase, ...styles.pillPending }
  }

  // Get styles for consulted status pills
  function getConsultedStatusPillStyle(value) {
    const normalized = normalizeText(value)
    if (!normalized) return { ...styles.pillBase, ...styles.pillNeutral }
    if (normalized === "consulted") return { ...styles.pillBase, ...styles.pillConsulted }
    return { ...styles.pillBase, ...styles.pillNotConsulted }
  }

  // Check if an appointment is past or current
  function isPastOrCurrentAppointment(value) {
    if (!value) return false
    const appointmentDate = new Date(value)
    if (Number.isNaN(appointmentDate.getTime())) return false
    return appointmentDate.getTime() <= Date.now()
  }

  // Determine if consulted status can be updated
  function canUpdateConsultedStatus(item) {
    const bookingStatus = normalizeText(item.status)
    const manualStatusAlreadySet = Boolean(item.consulted_status)
    if (manualStatusAlreadySet) return false
    if (CLOSED_BOOKING_STATUSES.includes(bookingStatus)) return false
    return isPastOrCurrentAppointment(item.appointment_date)
  }

  // Get a message to display in the table
  function getTableMessage() {
    if (error) return error
    if (loading) return "Loading appointments..."
    if (filteredAppointments.length === 0) return "No appointments found for selected filter."
    return null
  }

  // Handle updating the consulted status of an appointment
  const handleConsultStatusUpdate = async (appointmentId, action) => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      alert("Login expired. Please login again.")
      navigate("/login", { replace: true })
      return
    }

    try {
      setUpdatingId(appointmentId)
      const res = await axios.patch(
        `${API_URL}/doctor-appointments/${appointmentId}/consult-status/`,
        { action },
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      )

      const nextValue = res.data?.consulted_status || (action === "consulted" ? "Consulted" : "Not Consulted")
      const nextStatus = res.data?.status
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === appointmentId
            ? { ...item, consulted_status: nextValue, status: nextStatus || item.status }
            : item
        )
      )
    } catch (err) {
      const backendError = err.response?.data?.error
      alert(backendError || "Failed to update consulted status.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div style={styles.page}>
      {/* Header Section */}
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Booked Appointments</h2>
          <p style={styles.subtitle}>View all your appointment requests and mark consultation status.</p>
        </div>
        <div style={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              style={statusFilter === filter ? { ...styles.filterBtn, ...styles.filterBtnActive } : styles.filterBtn}
              onClick={() => setStatusFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Table */}
      <div style={styles.card}>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th style={styles.th}>Date & Time</th>
                <th style={styles.th}>Patient</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Booking Status</th>
                <th style={styles.th}>Consulted Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {getTableMessage() ? (
                <tr>
                  <td colSpan="6" style={styles.td}>{getTableMessage()}</td>
                </tr>
              ) : (
                filteredAppointments.map((item) => {
                  const updateDisabled = updatingId === item.id || !canUpdateConsultedStatus(item)
                  return (
                    <tr key={item.id}>
                      <td style={styles.td}>{formatDateTime(item.appointment_date)}</td>
                      <td style={styles.td}>{item.patient_details?.name || "-"}</td>
                      <td style={styles.td}>{item.department?.name || "-"}</td>
                      <td style={styles.td}>
                        <span style={getBookingStatusPillStyle(item.status)}>{item.status || "Pending"}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={getConsultedStatusPillStyle(item.consulted_status)}>
                          {item.consulted_status || "-"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.consultBtn}
                          disabled={updateDisabled}
                          onClick={() => handleConsultStatusUpdate(item.id, "consulted")}
                        >
                          Consulted
                        </button>
                        <button
                          type="button"
                          style={styles.notConsultBtn}
                          disabled={updateDisabled}
                          onClick={() => handleConsultStatusUpdate(item.id, "not_consulted")}
                        >
                          Not Consulted
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Styles for the component
const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "linear-gradient(135deg, #f4f8ff 0%, #eaf6f1 100%)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  title: {
    margin: "0 0 4px",
    color: "#17324d",
  },
  subtitle: {
    margin: 0,
    color: "#5a7288",
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterBtn: {
    border: "1px solid #c9d8e7",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#244766",
    fontWeight: 600,
    padding: "6px 10px",
    cursor: "pointer",
  },
  filterBtnActive: {
    backgroundColor: "#1565c0",
    color: "#ffffff",
    borderColor: "#1565c0",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5edf7",
    borderRadius: "14px",
    overflowX: "auto",
    boxShadow: "0 8px 18px rgba(20, 58, 95, 0.08)",
  },
  th: {
    backgroundColor: "#f3f7fc",
    color: "#244766",
    fontSize: "13px",
    fontWeight: 700,
    padding: "10px 12px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    color: "#253d55",
    verticalAlign: "middle",
  },
  pillBase: {
    display: "inline-block",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700,
  },
  pillPending: {
    backgroundColor: "#fff5e6",
    color: "#b54708",
  },
  pillApproved: {
    backgroundColor: "#e8f7ec",
    color: "#1f7a3e",
  },
  pillRejected: {
    backgroundColor: "#fdebec",
    color: "#b42318",
  },
  pillCancelled: {
    backgroundColor: "#eceff4",
    color: "#44566c",
  },
  pillConsulted: {
    backgroundColor: "#e8f7ec",
    color: "#1f7a3e",
  },
  pillNotConsulted: {
    backgroundColor: "#fff2e8",
    color: "#b54708",
  },
  pillNeutral: {
    backgroundColor: "#f4f7fb",
    color: "#5a7288",
  },
  consultBtn: {
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    marginRight: "6px",
    backgroundColor: "#e8f7ec",
    color: "#1f7a3e",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  notConsultBtn: {
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    backgroundColor: "#fff2e8",
    color: "#b54708",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
}

export default Booked_Appointments
