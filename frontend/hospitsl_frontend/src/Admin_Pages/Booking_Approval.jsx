// Hint: This file contains project UI/app logic; read component sections for flow.
import React, { useEffect, useState } from 'react'
import axios from 'axios'

const Booking_Approval = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchPendingBookings = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await axios.get("https://hospital-management-system-qdsz.onrender.com/admin-bookings/?status=Pending", {
        timeout: 10000,
      })
      setBookings(res.data || [])
    } catch (err) {
      const statusCode = err.response?.status
      const backendError =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message
      if (statusCode) {
        setError(`Failed to load pending bookings (${statusCode}): ${backendError}`)
      } else {
        setError(`Failed to load pending bookings: ${backendError}`)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingBookings()
  }, [])

  const handleAction = async (bookingId, action) => {
    try {
      await axios.patch(`https://hospital-management-system-qdsz.onrender.com/admin-bookings/${bookingId}/status/`, { action })
      setBookings((prev) => prev.filter((booking) => booking.id !== bookingId))
    } catch {
      alert("Failed to update booking status")
    }
  }

  const formatDateTime = (value) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  if (loading) return <div style={styles.page}><h4>Loading pending bookings...</h4></div>
  if (error) return <div style={styles.page}><h4 style={styles.error}>{error}</h4></div>

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Booking Approval</h2>
      <p style={styles.subtitle}>Review pending appointments and approve or reject each booking.</p>

      <div style={styles.tableWrap} className="table-responsive">
        <table className="table align-middle mb-0" style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Patient</th>
              <th style={styles.th}>Doctor</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Appointment Date</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4" style={styles.td}>No pending bookings.</td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const patient = booking.patient_details || {}
                const doctorName =
                  `${booking.doctor?.first_name || ""} ${booking.doctor?.last_name || ""}`.trim() ||
                  booking.doctor?.username ||
                  "-"
                return (
                  <tr key={booking.id}>
                    <td style={styles.td}>
                      <p className="fw-bold mb-1">{patient.name || "-"}</p>
                      <p className="mb-0 text-muted">{patient.email || "-"}</p>
                    </td>
                    <td style={styles.td}>{doctorName}</td>
                    <td style={styles.td}>{booking.department?.name || "-"}</td>
                    <td style={styles.td}>{formatDateTime(booking.appointment_date)}</td>
                    <td style={styles.td}>{booking.status || "-"}</td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.approveBtn}
                        onClick={() => handleAction(booking.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        style={styles.rejectBtn}
                        onClick={() => handleAction(booking.id, "reject")}
                      >
                        Reject
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
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f7fbff 0%, #eef9f2 100%)",
    padding: "28px",
  },
  title: {
    marginBottom: "6px",
    color: "#17324d",
  },
  subtitle: {
    marginBottom: "16px",
    color: "#5a7288",
  },
  tableWrap: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5edf7",
    borderRadius: "14px",
    overflowX: "auto",
    boxShadow: "0 8px 18px rgba(20, 58, 95, 0.07)",
  },
  table: {
    marginBottom: 0,
  },
  th: {
    backgroundColor: "#f3f7fc",
    color: "#244766",
    fontSize: "13px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    borderBottom: "1px solid #e5edf7",
    padding: "14px 12px",
  },
  td: {
    color: "#253d55",
    verticalAlign: "middle",
    borderBottom: "1px solid #eef3f8",
    padding: "12px",
  },
  approveBtn: {
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    marginRight: "6px",
    backgroundColor: "#e8f7ec",
    color: "#1f7a3e",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  rejectBtn: {
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    backgroundColor: "#fdebec",
    color: "#b42318",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    color: "#b42318",
  },
}

export default Booking_Approval


