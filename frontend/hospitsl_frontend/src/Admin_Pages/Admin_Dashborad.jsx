import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://hospital-management-system-qdsz.onrender.com').replace(/\/$/, '')

const Admin_Dashborad = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError('')

      const statsRes = await axios.get(`${API_BASE_URL}/admin-dashboard/`)
      await axios.get(`${API_BASE_URL}/admin-bookings/`)

      setStats(statsRes.data)
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const handleDoctorAction = async (doctorId, action) => {
    try {
      await axios.patch(`${API_BASE_URL}/admin-doctors/${doctorId}/status/`, { action })
      fetchDashboard()
    } catch {
      alert('Failed to update doctor request')
    }
  }

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <h3>Loading dashboard...</h3>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.wrapper}>
        <h3 style={styles.error}>{error}</h3>
      </div>
    )
  }

  const totalUsers = stats && stats.total_users ? stats.total_users : 0
  const totalPatients = stats && stats.total_patients ? stats.total_patients : 0
  const totalDoctors = stats && stats.total_doctors ? stats.total_doctors : 0
  const totalDepartments = stats && stats.total_departments ? stats.total_departments : 0
  const totalAppointments = stats && stats.total_appointments ? stats.total_appointments : 0
  const totalScheduled = stats && stats.scheduled_appointments != null ? stats.scheduled_appointments : 0
  const totalCompleted = stats && stats.completed_appointments != null ? stats.completed_appointments : 0
  const pendingCount = stats && stats.pending_doctor_requests != null ? stats.pending_doctor_requests : 0
  const pendingDoctors = stats && Array.isArray(stats.pending_doctors) ? stats.pending_doctors : []

  return (
    <main style={styles.wrapper}>
      <h1 style={styles.title}>Welcome to Admin Dashboard</h1>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h4>Total Users</h4>
          <p>{totalUsers}</p>
        </div>

        <div style={styles.card}>
          <h4>Total Patients</h4>
          <p>{totalPatients}</p>
        </div>

        <div style={styles.card}>
          <h4>Total Doctors</h4>
          <p>{totalDoctors}</p>
        </div>

        <div style={styles.card}>
          <h4>Total Departments</h4>
          <p>{totalDepartments}</p>
        </div>

        <div style={styles.card}>
          <h4>Total Appointments</h4>
          <p>{totalAppointments}</p>
        </div>

        <div style={styles.card}>
          <h4>Total Scheduled</h4>
          <p>{totalScheduled}</p>
        </div>

        <div style={styles.card}>
          <h4>Total Completed</h4>
          <p>{totalCompleted}</p>
        </div>
      </div>

      <div style={styles.notifyCard}>
        <h4 style={styles.notifyTitle}>
          New Doctor Registration Requests
          <span style={styles.notifyCount}>{pendingCount}</span>
        </h4>

        {pendingDoctors.length === 0 ? (
          <p style={styles.emptyText}>No pending doctor requests.</p>
        ) : (
          pendingDoctors.map((doctor) => (
            <div key={doctor.id} style={styles.requestRow}>
              <div>
                <p style={styles.requestName}>{doctor.name}</p>
                <p style={styles.requestMeta}>{doctor.email} | {doctor.department}</p>
              </div>
              <div>
                <button
                  type="button"
                  style={styles.approveBtn}
                  onClick={() => handleDoctorAction(doctor.id, 'approve')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  style={styles.rejectBtn}
                  onClick={() => handleDoctorAction(doctor.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}

const styles = {
  wrapper: {
    flex: 1,
    minHeight: '100vh',
    padding: '32px',
  },
  title: {
    marginBottom: '24px',
    color: '#17324d',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  listGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
    marginTop: '18px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5edf7',
    borderRadius: '12px',
    padding: '18px',
    boxShadow: '0 8px 20px rgba(20, 58, 95, 0.08)',
  },
  notifyCard: {
    marginTop: '18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5edf7',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 8px 20px rgba(20, 58, 95, 0.08)',
  },
  notifyTitle: {
    margin: '0 0 10px',
    color: '#17324d',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  notifyCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '24px',
    borderRadius: '999px',
    backgroundColor: '#eef3ff',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: 700,
    padding: '0 8px',
  },
  listWrap: {
    maxHeight: '360px',
    overflowY: 'auto',
  },
  requestRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #eef3f8',
    padding: '10px 0',
    gap: '12px',
  },
  requestName: {
    margin: 0,
    fontWeight: 600,
    color: '#17324d',
  },
  requestMeta: {
    margin: 0,
    color: '#5a7288',
    fontSize: '13px',
  },
  approveBtn: {
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    marginRight: '6px',
    backgroundColor: '#e8f7ec',
    color: '#1f7a3e',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  rejectBtn: {
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    backgroundColor: '#fdebec',
    color: '#b42318',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyText: {
    margin: 0,
    color: '#5a7288',
  },
  error: {
    color: '#b42318',
  },
}

export default Admin_Dashborad
