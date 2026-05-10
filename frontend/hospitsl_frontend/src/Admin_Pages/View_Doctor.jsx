import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://hospital-management-system-qdsz.onrender.com').replace(/\/$/, '')

const getDoctorName = (doctor) => {
  const first = doctor.first_name || ''
  const last = doctor.last_name || ''
  const fullName = `${first} ${last}`.trim()
  return fullName || doctor.username || '-'
}

const View_Doctor = () => {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDoctors = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(`${API_BASE_URL}/admin-doctors/`)
      setDoctors(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [])

  const handleDelete = async (id, name) => {
    const ok = window.confirm(`Delete doctor ${name}?`)
    if (!ok) return

    try {
      await axios.delete(`${API_BASE_URL}/admin-doctors/${id}/`)
      setDoctors((prev) => prev.filter((doctor) => doctor.id !== id))
      alert('Doctor deleted successfully')
    } catch {
      alert('Failed to delete doctor')
    }
  }

  const handleStatusChange = async (id, action, name) => {
    // Determine the action label (Approve or Reject)
    const actionLabel = action === 'approve' ? 'Approve' : 'Reject';

    // Confirm the action with the user
    const userConfirmed = window.confirm(`Are you sure you want to ${actionLabel} doctor ${name}?`);
    if (!userConfirmed) return;

    try {
        // Send the status update request to the server
        await axios.patch(`${API_BASE_URL}/admin-doctors/${id}/status/`, { action });

        // Update the doctor's status in the local state
        const updatedStatus = action === 'approve' ? 'Approved' : 'Rejected';
        setDoctors((prevDoctors) =>
            prevDoctors.map((doctor) =>
                doctor.id === id ? { ...doctor, approval_status: updatedStatus } : doctor
            )
        );

        // Notify the user of the successful action
        alert(`${actionLabel} action completed successfully for doctor ${name}.`);
    } catch (error) {
        // Handle errors and notify the user
        const errorMessage = error.response?.data?.error || 'An error occurred while updating the status.';
        alert(errorMessage);
    }
  }

  const handleResetPassword = async (id, name) => {
    const ok = window.confirm(`Reset password for doctor ${name}?`)
    if (!ok) return

    try {
      const res = await axios.post(`${API_BASE_URL}/admin-doctors/${id}/reset-password/`)
      const data = res.data || {}

      if (data.temporary_password) {
        alert(`Password reset successful. Temporary password: ${data.temporary_password}`)
      } else {
        alert(data.message || 'Password reset email sent successfully')
      }
    } catch (err) {
      const backendError = err.response && err.response.data ? err.response.data.error : ''
      alert(backendError || 'Failed to reset doctor password')
    }
  }

  const statusBadgeStyle = (statusValue) => {
    const normalized = String(statusValue || '').toLowerCase()
    if (normalized === 'approved') return styles.badgeApproved
    if (normalized === 'rejected') return styles.badgeRejected
    return styles.badgePending
  }

  if (loading) return <div style={styles.page}><h4>Loading doctors...</h4></div>
  if (error) return <div style={styles.page}><h4 style={styles.error}>{error}</h4></div>

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Doctors</h2>
      <p style={styles.subtitle}>View all doctors, delete doctor, approve/reject registration.</p>

      <div style={styles.tableWrap} className="table-responsive">
        <table className="table align-middle mb-0" style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Image</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4" style={styles.td}>No doctors found</td>
              </tr>
            ) : (
              doctors.map((doctor) => {
                const fullName = getDoctorName(doctor)
                const statusValue = doctor.approval_status || 'Pending'
                const isFinalized = String(statusValue).toLowerCase() !== 'pending'

                return (
                  <tr key={doctor.id}>
                    <td style={styles.td}>
                      {doctor.image ? (
                        <img src={doctor.image} alt={fullName} style={styles.avatarImage} />
                      ) : (
                        <div style={styles.avatar}>{(fullName[0] || 'D').toUpperCase()}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <p className="fw-bold mb-1">{fullName}</p>
                      <p className="text-muted mb-0">@{doctor.username || '-'}</p>
                    </td>
                    <td style={styles.td}>{doctor.department || '-'}</td>
                    <td style={styles.td}>
                      <p className="mb-1">{doctor.phone_number || '-'}</p>
                      <p className="text-muted mb-0">{doctor.email || '-'}</p>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badgeBase, ...statusBadgeStyle(statusValue) }}>
                        {statusValue}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.approveBtn}
                        disabled={isFinalized}
                        onClick={() => handleStatusChange(doctor.id, 'approve', fullName)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        style={styles.rejectBtn}
                        disabled={isFinalized}
                        onClick={() => handleStatusChange(doctor.id, 'reject', fullName)}
                      >
                        Reject
                      </button>
                      <button type="button" style={styles.deleteBtn} onClick={() => handleDelete(doctor.id, fullName)}>
                        Delete
                      </button>
                      <button
                        type="button"
                        style={styles.resetBtn}
                        onClick={() => handleResetPassword(doctor.id, fullName)}
                      >
                        Reset Password
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
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#d8e8fb',
    color: '#17324d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  avatarImage: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid #d8e8fb',
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
    marginRight: '6px',
    backgroundColor: '#fff2e8',
    color: '#b54708',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: {
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    backgroundColor: '#fdebec',
    color: '#b42318',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  resetBtn: {
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    marginLeft: '6px',
    backgroundColor: '#e7f1ff',
    color: '#1458a5',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  badgeBase: {
    display: 'inline-block',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  badgePending: {
    backgroundColor: '#fff5e6',
    color: '#b54708',
  },
  badgeApproved: {
    backgroundColor: '#e8f7ec',
    color: '#1f7a3e',
  },
  badgeRejected: {
    backgroundColor: '#fdebec',
    color: '#b42318',
  },
  error: {
    color: '#b42318',
  },
}

export default View_Doctor
