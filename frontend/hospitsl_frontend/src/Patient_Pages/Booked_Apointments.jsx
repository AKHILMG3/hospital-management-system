import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

const Booked_Apointments = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem("auth_token")
  const patientUserRaw = localStorage.getItem("patient_user")

  const patientUser = useMemo(() => {
    if (!patientUserRaw) return null
    try {
      return JSON.parse(patientUserRaw)
    } catch {
      return null
    }
  }, [patientUserRaw])

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    if (!token || !patientUser) {
      navigate("/login", { replace: true })
      return
    }

    const fetchApproved = async () => {
      try {
        setLoading(true)
        setError("")
        setSuccess("")
        const res = await axios.get("https://hospital-management-system-qdsz.onrender.com/patient-appointments/?status=Approved", {
          headers: { Authorization: `Token ${token}` },
        })
        setAppointments(res.data || [])
      } catch (err) {
        const backendError = err.response?.data?.error
        setError(backendError || "Failed to load approved appointments.")
      } finally {
        setLoading(false)
      }
    }

    fetchApproved()
  }, [navigate, patientUser, token])

  const formatDateTime = (value) => {
    if (!value) return "-"
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return value
    return dt.toLocaleString()
  }

  const doctorName = (item) => {
    const first = item?.doctor?.first_name || ""
    const last = item?.doctor?.last_name || ""
    return `${first} ${last}`.trim() || item?.doctor?.username || "-"
  }

  const patientName = (item) => item?.patient_details?.name || patientUser?.username || "-"

  const handleCancel = async (appointmentId) => {
    const appt = appointments.find((a) => a.id === appointmentId)
    if (!appt) return

    if (!appt.can_cancel) {
      setError("This appointment cannot be cancelled.")
      return
    }

    const ok = window.confirm("Cancel this appointment?")
    if (!ok) return

    try {
      setCancellingId(appointmentId)
      setError("")
      setSuccess("")

      const res = await axios.patch(
        `https://hospital-management-system-qdsz.onrender.com/patient-appointments/${appointmentId}/cancel/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      )

      setSuccess(res.data?.message || "Appointment cancelled.")
      setAppointments((prev) => prev.filter((a) => a.id !== appointmentId))
    } catch (err) {
      const backendError = err.response?.data?.error
      setError(backendError || "Failed to cancel appointment.")
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div style={styles.page}>
      <br />
      <br />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Booked Appointments</h2>
            <p style={styles.subtitle}>Only approved appointments are shown here. You can cancel before the appointment time.</p>
          </div>
        </div>

        {error ? <p style={styles.error}>{error}</p> : null}
        {success ? <p style={styles.success}>{success}</p> : null}

        <div style={styles.tableCard} className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th style={styles.th}>Date & Time</th>
                <th style={styles.th}>Patient</th>
                <th style={styles.th}>Doctor</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={styles.td}>Loading approved appointments...</td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="5" style={styles.td}>No approved appointments found.</td>
                </tr>
              ) : (
                appointments.map((item) => {
                  const disableCancel = !item.can_cancel || cancellingId === item.id
                  return (
                    <tr key={item.id}>
                      <td style={styles.td}>{formatDateTime(item.appointment_date)}</td>
                      <td style={styles.td}>{patientName(item)}</td>
                      <td style={styles.td}>Dr. {doctorName(item)}</td>
                      <td style={styles.td}>
                        <span style={badgeStyle(item.status)}>{item.status || "-"}</span>
                      </td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={disableCancel ? { ...styles.cancelBtn, ...styles.cancelBtnDisabled } : styles.cancelBtn}
                          disabled={disableCancel}
                          onClick={() => handleCancel(item.id)}
                        >
                          {cancellingId === item.id ? "Cancelling..." : "Cancel"}
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
      <br />
      <br />
    </div>
  )
}

export default Booked_Apointments

const badgeStyle = (status) => {
  const value = String(status || "").toLowerCase()
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    minWidth: "96px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700,
  }
  if (value === "approved") return { ...base, backgroundColor: "#e8f7ec", color: "#1f7a3e" }
  if (value === "completed") return { ...base, backgroundColor: "#e9f2ff", color: "#1d4ed8" }
  if (value === "cancelled" || value === "rejected") return { ...base, backgroundColor: "#fee4e2", color: "#b42318" }
  return { ...base, backgroundColor: "#eef2f7", color: "#344054" }
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f2f8ff 0%, #f4fff8 100%)",
    padding: "12px",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  title: {
    color: "#17324d",
    margin: "0 0 4px",
  },
  subtitle: {
    margin: 0,
    color: "#5a7288",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #d9e8f8",
    boxShadow: "0 12px 24px rgba(16, 63, 108, 0.08)",
    overflow: "hidden",
  },
  th: {
    backgroundColor: "#f3f7fc",
    color: "#244766",
    fontSize: "13px",
    fontWeight: 700,
    padding: "12px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px",
    color: "#253d55",
    fontSize: "14px",
    verticalAlign: "middle",
  },
  cancelBtn: {
    border: "none",
    borderRadius: "10px",
    height: "36px",
    padding: "0 14px",
    backgroundColor: "#b42318",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
  cancelBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  error: {
    margin: "0 0 10px",
    color: "#b42318",
    fontSize: "13px",
    fontWeight: 600,
  },
  success: {
    margin: "0 0 10px",
    color: "#067647",
    fontSize: "13px",
    fontWeight: 600,
  },
}

