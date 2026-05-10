import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://hospital-management-system-qdsz.onrender.com').replace(/\/$/, '')

const getPatientName = (patient) => {
  const first = patient.first_name || ''
  const last = patient.last_name || ''
  const fullName = `${first} ${last}`.trim()
  return fullName || patient.username || '-'
}

const getAvatarLetter = (patient) => {
  const name = getPatientName(patient)
  return (name[0] || 'P').toUpperCase()
}

const View_Patient = () => {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPatients = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(`${API_BASE_URL}/admin-patients/`)
      setPatients(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const handleViewDetails = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin-patients/${id}/`)
      setSelectedPatient(res.data || null)
    } catch {
      alert('Unable to load patient details')
    }
  }

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`Delete patient ${name}?`)
    if (!confirmDelete) return

    try {
      await axios.delete(`${API_BASE_URL}/admin-patients/${id}/`)
      setPatients((prev) => prev.filter((patient) => patient.id !== id))
      if (selectedPatient && selectedPatient.id === id) {
        setSelectedPatient(null)
      }
      alert('Patient deleted successfully')
    } catch {
      alert('Failed to delete patient')
    }
  }

  if (loading) return <div style={styles.page}><h4>Loading patients...</h4></div>
  if (error) return <div style={styles.page}><h4 style={styles.error}>{error}</h4></div>

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Patients</h2>
      <p style={styles.subtitle}>View all patients, delete patient, and view patient details.</p>

      <div style={styles.tableWrap} className="table-responsive">
        <table className="table align-middle mb-0" style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Image</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Patient ID</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Address</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4" style={styles.td}>No patients found</td>
              </tr>
            ) : (
              patients.map((patient) => {
                const patientName = getPatientName(patient)
                return (
                  <tr key={patient.id}>
                    <td style={styles.td}>
                      {patient.image ? (
                        <img src={patient.image} alt="Patient" style={styles.avatarImage} />
                      ) : (
                        <div style={styles.avatar}>{getAvatarLetter(patient)}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <p className="fw-bold mb-1">{patientName}</p>
                      <p className="text-muted mb-0">@{patient.username || '-'}</p>
                    </td>
                    <td style={styles.td}>{patient.patient_id || '-'}</td>
                    <td style={styles.td}>{patient.email || '-'}</td>
                    <td style={styles.td}>{patient.phone_number || '-'}</td>
                    <td style={styles.td}>{patient.address || '-'}</td>
                    <td style={styles.td}>
                      <button type="button" style={styles.viewBtn} onClick={() => handleViewDetails(patient.id)}>
                        View
                      </button>
                      <button
                        type="button"
                        style={styles.deleteBtn}
                        onClick={() => handleDelete(patient.id, patientName)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedPatient ? (
        <div style={styles.detailsCard}>
          <h4 style={styles.detailsTitle}>Patient Details</h4>
          <div style={styles.detailsAvatarWrap}>
            {selectedPatient.image ? (
              <img src={selectedPatient.image} alt="Patient" style={styles.detailsAvatarImage} />
            ) : (
              <div style={styles.detailsAvatar}>{getAvatarLetter(selectedPatient)}</div>
            )}
          </div>
          <p><strong>Name:</strong> {getPatientName(selectedPatient)}</p>
          <p><strong>Patient ID:</strong> {selectedPatient.patient_id || '-'}</p>
          <p><strong>Username:</strong> {selectedPatient.username || '-'}</p>
          <p><strong>Email:</strong> {selectedPatient.email || '-'}</p>
          <p><strong>Phone:</strong> {selectedPatient.phone_number || '-'}</p>
          <p><strong>Address:</strong> {selectedPatient.address || '-'}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedPatient(null)}>
            Close
          </button>
        </div>
      ) : null}
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
  detailsCard: {
    marginTop: '18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5edf7',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 6px 14px rgba(20, 58, 95, 0.08)',
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
  detailsTitle: {
    marginBottom: '12px',
    color: '#17324d',
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
    border: '1px solid #d3e3f5',
  },
  detailsAvatarWrap: {
    marginBottom: '10px',
  },
  detailsAvatar: {
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    backgroundColor: '#d8e8fb',
    color: '#17324d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 700,
  },
  detailsAvatarImage: {
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid #d3e3f5',
  },
  viewBtn: {
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    marginRight: '6px',
    backgroundColor: '#e7f1ff',
    color: '#1458a5',
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
  error: {
    color: '#b42318',
  },
}

export default View_Patient
