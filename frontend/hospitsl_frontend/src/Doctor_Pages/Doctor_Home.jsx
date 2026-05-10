// Hint: This file contains project UI/app logic; read component sections for flow.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_URL = 'https://hospital-management-system-qdsz.onrender.com'
const DOCTOR_USER_TYPE = 3
const NOTIFICATION_REFRESH_MS = 15000
const UPCOMING_DAYS = 7

function readAuthUser() {
  const raw = localStorage.getItem("auth_user")
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function parseDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function getDoctorDisplayName(user) {
  return (
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.username ||
    "Doctor"
  )
}

const Doctor_Home = () => {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const doctorUser = useMemo(() => readAuthUser(), [])
  const doctorId = doctorUser?.id
  const isDoctor = Number(doctorUser?.user_type) === DOCTOR_USER_TYPE
  const token = localStorage.getItem("auth_token")
  const lastSeenKey = doctorId ? `doctor_notifications_seen_at_${doctorId}` : null
  const doctorName = getDoctorDisplayName(doctorUser)

  const fetchApprovedAppointments = useCallback(async () => {
    if (!doctorId || !isDoctor) {
      setAppointments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError("")
      const res = await axios.get(`${API_URL}/appointments/?doctor_id=${doctorId}&status=Approved`)
      setAppointments(res.data || [])
    } catch {
      setError("Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }, [doctorId, isDoctor])

  const fetchNotifications = useCallback(async () => {
    if (!token || !doctorId || !isDoctor) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    try {
      const res = await axios.get(`${API_URL}/doctor-notifications/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      })
      const list = res.data?.notifications || []
      setNotifications(list)

      const lastSeenAt = lastSeenKey ? localStorage.getItem(lastSeenKey) : null
      if (!lastSeenAt) {
        setUnreadCount(list.length)
        return
      }
      const lastSeenTime = new Date(lastSeenAt).getTime()
      const unread = list.filter((item) => {
        const updated = new Date(item.updated_at).getTime()
        return !Number.isNaN(updated) && updated > lastSeenTime
      }).length
      setUnreadCount(unread)
    } catch (err) {
      setNotifications([])
      setUnreadCount(0)
      if (err.response?.status === 401) {
        localStorage.removeItem("auth_token")
      }
    }
  }, [doctorId, token, isDoctor, lastSeenKey])

  useEffect(() => {
    if (!doctorId) {
      navigate("/login")
      return
    }
    if (!isDoctor) {
      navigate("/patient-home")
    }
  }, [doctorId, isDoctor, navigate])

  useEffect(() => {
    fetchApprovedAppointments()
  }, [fetchApprovedAppointments])

  useEffect(() => {
    if (!isDoctor) return undefined
    fetchNotifications()
    const timer = setInterval(fetchNotifications, NOTIFICATION_REFRESH_MS)
    return () => clearInterval(timer)
  }, [isDoctor, fetchNotifications])

  const markNotificationsRead = () => {
    if (!lastSeenKey) return
    localStorage.setItem(lastSeenKey, new Date().toISOString())
    setUnreadCount(0)
  }

  const formatTime = (value) => {
    if (!value) return "-"
    const date = parseDate(value)
    if (!date) return value
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const toDateKey = (value) => {
    const date = parseDate(value)
    if (!date) return ""
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  const isToday = (value) => {
    const date = parseDate(value)
    if (!date) return false
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  const todayAppointments = useMemo(() => {
    return appointments
      .filter((item) => isToday(item.appointment_date))
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
  }, [appointments])

  const upcomingAppointments = useMemo(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + UPCOMING_DAYS, 23, 59, 59, 999)

    let filtered = appointments.filter((item) => {
      const date = parseDate(item.appointment_date)
      if (!date) return false
      return date >= start && date <= end
    })

    if (dateFilter) {
      filtered = filtered.filter((item) => toDateKey(item.appointment_date) === dateFilter)
    }

    return filtered.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
  }, [appointments, dateFilter])

  const getConsultedBadgeStyle = (consultedStatus) => {
    const isConsulted = String(consultedStatus || "").toLowerCase() === "consulted"
    if (isConsulted) return { ...styles.badgeBase, ...styles.consultedBadge }
    return { ...styles.badgeBase, ...styles.notConsultedBadge }
  }

  const getConsultedBadgeText = (consultedStatus) => {
    return consultedStatus || "Not Consulted"
  }

  const todayApprovedCount = todayAppointments.length

  return (
    <div style={styles.page}>
      <div style={styles.headerCard}>
        <h2 style={styles.title}>Welcome, Dr. {doctorName}</h2>
        <p style={styles.subtitle}>Manage appointments and patient care from your dashboard.</p>
        {error ? <p style={styles.errorText}>{error}</p> : null}
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Approved Today</p>
          <h3 style={styles.statValue}>{todayApprovedCount}</h3>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Approved</p>
          <h3 style={styles.statValue}>{appointments.length}</h3>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Dashboard Status</p>
          <h3 style={styles.statValue}>{loading ? "Loading..." : "Ready"}</h3>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Unread Notifications</p>
          <h3 style={styles.statValue}>{unreadCount}</h3>
        </div>
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.notificationHeader}>
          <h4 style={styles.sectionTitle}>
            Appointment Notifications
            {unreadCount > 0 ? <span style={styles.unreadBadge}>{unreadCount}</span> : null}
          </h4>
          <div style={styles.notificationActions}>
            <button style={styles.smallBtn} type="button" onClick={fetchNotifications}>Refresh</button>
            <button style={styles.smallBtn} type="button" onClick={markNotificationsRead}>Mark all read</button>
          </div>
        </div>
        {notifications.length === 0 ? (
          <p style={styles.emptyText}>No new notifications.</p>
        ) : (
          <ul style={styles.notificationList}>
            {notifications.map((item) => (
              <li key={item.id} style={styles.notificationItem}>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

   

      <div style={styles.sectionCard}>
        <h4 style={styles.sectionTitle}>Today's Appointments</h4>
        <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th style={styles.th}>Patient Name</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Booking Status</th>
              <th style={styles.th}>Consulted Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={styles.td}>Loading today's appointments...</td>
              </tr>
            ) : todayAppointments.length === 0 ? (
              <tr>
                <td colSpan="4" style={styles.td}>No approved appointments for today.</td>
              </tr>
            ) : (
              todayAppointments.map((item) => (
                <tr key={`today-${item.id}`}>
                  <td style={styles.td}>{item.patient_details?.name || "-"}</td>
                  <td style={styles.td}>{formatTime(item.appointment_date)}</td>
                  <td style={styles.td}>{item.status || "Approved"}</td>
                  <td style={styles.td}>
                    <span style={getConsultedBadgeStyle(item.consulted_status)}>
                      {getConsultedBadgeText(item.consulted_status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.filterBar}>
          <h4 style={styles.sectionTitleNoMargin}>Upcoming Appointments (Next 7 Days)</h4>
          <div style={styles.filterControls}>
            <label htmlFor="upcoming-date-filter" style={styles.filterLabel}>Filter by date</label>
            <input
              id="upcoming-date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={styles.filterInput}
            />
            <button type="button" style={styles.smallBtn} onClick={() => setDateFilter("")}>Clear</button>
          </div>
        </div>
        <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Patient Name</th>
              <th style={styles.th}>Booking Status</th>
              <th style={styles.th}>Consulted Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={styles.td}>Loading upcoming appointments...</td>
              </tr>
            ) : upcomingAppointments.length === 0 ? (
              <tr>
                <td colSpan="5" style={styles.td}>No upcoming approved appointments in the next 7 days.</td>
              </tr>
            ) : (
              upcomingAppointments.map((item) => (
                <tr key={`upcoming-${item.id}`}>
                  <td style={styles.td}>{toDateKey(item.appointment_date)}</td>
                  <td style={styles.td}>{formatTime(item.appointment_date)}</td>
                  <td style={styles.td}>{item.patient_details?.name || "-"}</td>
                  <td style={styles.td}>{item.status || "Approved"}</td>
                  <td style={styles.td}>
                    <span style={getConsultedBadgeStyle(item.consulted_status)}>
                      {getConsultedBadgeText(item.consulted_status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div style={styles.actionsRow}>
        <button style={styles.actionBtn} type="button" onClick={() => navigate("/doctor-booked-appointments")}>
          View Appointments
        </button>
        <button style={styles.actionBtn} type="button">Patient Records</button>
        <button style={{ ...styles.actionBtn, ...styles.secondaryBtn }} type="button" onClick={() => navigate("/doctor-profile")}>Update Profile</button>
      </div> <br />
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "linear-gradient(135deg, #f4f8ff 0%, #eaf6f1 100%)",
  },
  headerCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5edf7",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 8px 18px rgba(20, 58, 95, 0.08)",
    marginBottom: "16px",
  },
  title: {
    margin: "0 0 6px",
    color: "#17324d",
  },
  subtitle: {
    margin: 0,
    color: "#5a7288",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px",
    marginBottom: "16px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5edf7",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 6px 14px rgba(20, 58, 95, 0.06)",
  },
  statLabel: {
    margin: "0 0 8px",
    color: "#5b738a",
    fontSize: "14px",
  },
  statValue: {
    margin: 0,
    color: "#17324d",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5edf7",
    borderRadius: "14px",
    padding: "14px",
    boxShadow: "0 8px 18px rgba(20, 58, 95, 0.08)",
    marginBottom: "16px",
  },
  sectionTitle: {
    margin: "4px 0 12px",
    color: "#17324d",
  },
  sectionTitleNoMargin: {
    margin: 0,
    color: "#17324d",
  },
  th: {
    backgroundColor: "#f3f7fc",
    color: "#244766",
    fontSize: "13px",
    fontWeight: 700,
    padding: "10px 12px",
  },
  td: {
    padding: "10px 12px",
    color: "#253d55",
  },
  actionsRow: {
    marginTop: "16px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  actionBtn: {
    border: "none",
    borderRadius: "10px",
    height: "42px",
    padding: "0 16px",
    backgroundColor: "#1565c0",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    backgroundColor: "#2e7d32",
  },
  notificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  notificationActions: {
    display: "flex",
    gap: "8px",
  },
  smallBtn: {
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#e7f1ff",
    color: "#1a4c84",
    fontWeight: 600,
    padding: "6px 10px",
    cursor: "pointer",
  },
  unreadBadge: {
    marginLeft: "8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "22px",
    height: "22px",
    borderRadius: "999px",
    fontSize: "12px",
    color: "#ffffff",
    backgroundColor: "#b42318",
    padding: "0 8px",
  },
  notificationList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: "8px",
  },
  notificationItem: {
    border: "1px solid #e5edf7",
    borderRadius: "10px",
    padding: "10px 12px",
    color: "#253d55",
    backgroundColor: "#fbfdff",
  },
  emptyText: {
    margin: 0,
    color: "#5a7288",
  },
  errorText: {
    margin: "10px 0 0",
    color: "#b42318",
    fontWeight: 600,
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  filterControls: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterLabel: {
    color: "#5a7288",
    fontSize: "14px",
    fontWeight: 600,
  },
  filterInput: {
    height: "34px",
    borderRadius: "8px",
    border: "1px solid #c9d7e6",
    padding: "0 10px",
    fontSize: "13px",
    outline: "none",
    backgroundColor: "#fbfdff",
  },
  badgeBase: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700,
  },
  consultedBadge: {
    backgroundColor: "#e8f7ec",
    color: "#1f7a3e",
  },
  notConsultedBadge: {
    backgroundColor: "#fff2e8",
    color: "#b54708",
  },
}

export default Doctor_Home
