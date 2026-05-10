import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

const My_Appointments = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem("auth_token")
  const patientUser = localStorage.getItem("patient_user")
  const [appointments, setAppointments] = useState([])
  const [statusFilter, setStatusFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token || !patientUser) {
      navigate("/login", { replace: true })
      return
    }

    const fetchAppointments = async () => {
      try {
        setLoading(true)
        setError("")
        const res = await axios.get("https://hospital-management-system-qdsz.onrender.com/patient-appointments/", {
          headers: {
            Authorization: `Token ${token}`,
          },
        })
        setAppointments(res.data || [])
      } catch (err) {
        const backendError = err.response?.data?.error
        setError(backendError || "Failed to load appointment history.")
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [navigate, patientUser, token])

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "All") return appointments
    const filterValue = String(statusFilter || "").toLowerCase()
    return appointments.filter(
      (item) => String(getEffectiveStatus(item) || "").toLowerCase() === filterValue
    )
  }, [appointments, statusFilter])

  const stats = useMemo(() => {
    const total = appointments.length
    const approved = appointments.filter((a) => String(getEffectiveStatus(a) || "").toLowerCase() === "approved").length
    const pending = appointments.filter((a) => String(getEffectiveStatus(a) || "").toLowerCase() === "pending").length
    const rejected = appointments.filter((a) => String(getEffectiveStatus(a) || "").toLowerCase() === "rejected").length
    return { total, approved, pending, rejected }
  }, [appointments])

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

  return (
    <div style={styles.page}>
      <br />
      <br />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>My Appointment History</h2>
            <p style={styles.subtitle}>Track all your booked appointments and current status.</p>
          </div>
          <select
            style={styles.filter}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total</p>
            <h4 style={styles.statValue}>{stats.total}</h4>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Approved</p>
            <h4 style={styles.statValue}>{stats.approved}</h4>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Pending</p>
            <h4 style={styles.statValue}>{stats.pending}</h4>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Rejected</p>
            <h4 style={styles.statValue}>{stats.rejected}</h4>
          </div>
        </div>

        <div style={styles.tableCard} className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th style={styles.th}>Booked On</th>
                <th style={styles.th}>Doctor</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={styles.td}>Loading appointment history...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" style={{ ...styles.td, color: "#b42318" }}>{error}</td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="4" style={styles.td}>No appointments found.</td>
                </tr>
              ) : (
                filteredAppointments.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{formatDateTime(item.appointment_date)}</td>
                    <td style={styles.td}>Dr. {doctorName(item)}</td>
                    <td style={styles.td}>{item.department?.name || "-"}</td>
                    <td style={styles.td}>
                      <span style={badgeStyle(getEffectiveStatus(item))}>{getEffectiveStatus(item) || "-"}</span>
                    </td>
                  </tr>
                ))
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

const badgeStyle = (status) => {
  const value = String(status || "").toLowerCase()
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    minWidth: "90px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700,
  }
  if (value === "approved") return { ...base, backgroundColor: "#e8f7ec", color: "#1f7a3e" }
  if (value === "pending") return { ...base, backgroundColor: "#fff4e5", color: "#9a6700" }
  if (value === "rejected" || value === "cancelled") return { ...base, backgroundColor: "#fee4e2", color: "#b42318" }
  if (value === "completed") return { ...base, backgroundColor: "#e9f2ff", color: "#1d4ed8" }
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
  filter: {
    height: "40px",
    borderRadius: "8px",
    border: "1px solid #c9d8e7",
    padding: "0 10px",
    fontSize: "14px",
    backgroundColor: "#ffffff",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "14px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #d9e8f8",
    borderRadius: "10px",
    padding: "14px",
    boxShadow: "0 8px 18px rgba(20, 58, 95, 0.07)",
  },
  statLabel: {
    margin: "0 0 8px",
    color: "#5b738a",
    fontSize: "13px",
  },
  statValue: {
    margin: 0,
    color: "#17324d",
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
  },
  td: {
    padding: "12px",
    color: "#253d55",
    fontSize: "14px",
  },
}

export default My_Appointments

function getEffectiveStatus(item) {
  const consulted = String(item?.consulted_status || "").toLowerCase() === "consulted"
  if (consulted) return "Completed"
  return item?.status || ""
}
