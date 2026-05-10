import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://hospital-management-system-qdsz.onrender.com').replace(/\/$/, '')

const getDoctorDisplayName = (doctor) => {
  if (!doctor) return 'Not Assigned'
  const first = doctor.first_name || ''
  const last = doctor.last_name || ''
  const fullName = `${first} ${last}`.trim()
  return fullName || doctor.username || doctor.email || 'Unknown Doctor'
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const Status_Page = () => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchConsultedAppointments = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await axios.get(`${API_BASE_URL}/admin-bookings/?consulted_status=Consulted`)
      setAppointments(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError('Failed to load consulted appointments')
      console.error('Error fetching appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConsultedAppointments()
  }, [])

  if (loading) {
    return (
      <div style={styles.page}>
        <h3>Loading consulted appointments...</h3>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.page}>
        <h3 style={styles.error}>{error}</h3>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Consulted Patients</h2>
      <p style={styles.subtitle}>View all patients who have completed their consultations.</p>

      <div style={styles.tableWrap} className="table-responsive">
        <table className="table align-middle mb-0" style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Patient Name</th>
              <th style={styles.th}>Patient ID</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Doctor</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Appointment Date</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4" style={styles.td}>
                  No consulted appointments found
                </td>
              </tr>
            ) : (
              appointments.map((appointment) => {
                const patient = appointment.patient_details || {}
                const doctorName = getDoctorDisplayName(appointment.doctor)

                return (
                  <tr key={appointment.id}>
                    <td style={styles.td}>{patient.name || '-'}</td>
                    <td style={styles.td}>{patient.patient_id || '-'}</td>
                    <td style={styles.td}>{patient.email || '-'}</td>
                    <td style={styles.td}>{patient.phone_number || '-'}</td>
                    <td style={styles.td}>{doctorName}</td>
                    <td style={styles.td}>{appointment.department ? appointment.department.name : '-'}</td>
                    <td style={styles.td}>{formatDateTime(appointment.appointment_date)}</td>
                    <td style={styles.td}>
                      <span style={styles.consultedBadge}>{appointment.consulted_status}</span>
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
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f7fbff 0%, #eef9f2 100%)',
    padding: '28px',
  },
  title: {
    marginBottom: '6px',
    color: '#17324d',
  },
  subtitle: {
    marginBottom: '16px',
    color: '#5a7288',
  },
  tableWrap: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5edf7',
    borderRadius: '14px',
    overflowX: 'auto',
    boxShadow: '0 8px 18px rgba(20, 58, 95, 0.07)',
  },
  table: {
    marginBottom: 0,
  },
  th: {
    backgroundColor: '#f3f7fc',
    color: '#244766',
    fontSize: '13px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #e5edf7',
    padding: '14px 12px',
  },
  td: {
    color: '#253d55',
    verticalAlign: 'middle',
    borderBottom: '1px solid #eef3f8',
    padding: '12px',
  },
  consultedBadge: {
    backgroundColor: '#d1fadf',
    color: '#166534',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  error: {
    color: '#b42318',
  },
}

export default Status_Page
