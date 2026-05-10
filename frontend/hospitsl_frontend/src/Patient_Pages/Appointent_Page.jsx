// Hint: This file contains project UI/app logic; read component sections for flow.
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const Appointent_Page = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [formData, setFormData] = useState({
    department_id: "",
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
  })
  const [availability, setAvailability] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const token = localStorage.getItem("auth_token")
  const patientUser = localStorage.getItem("patient_user")

  const authHeaders = useMemo(
    () => ({
      headers: {
        Authorization: `Token ${token}`,
      },
    }),
    [token]
  )

  const selectedDepartmentId = formData.department_id
  const selectedDoctorId = formData.doctor_id
  const selectedAppointmentDate = formData.appointment_date
  const selectedAppointmentTime = formData.appointment_time

  useEffect(() => {
    if (!token || !patientUser) {
      navigate("/login", { replace: true })
      return
    }

    const loadInitialData = async () => {
      try {
        setLoading(true)
        const [profileRes, departmentsRes] = await Promise.all([
          axios.get("https://hospital-management-system-qdsz.onrender.com/patient-booking-profile/", authHeaders),
          axios.get("https://hospital-management-system-qdsz.onrender.com/departments/"),
        ])
        setProfile(profileRes.data)
        setDepartments(departmentsRes.data || [])
      } catch {
        setError("Failed to load booking form details.")
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [authHeaders, navigate, patientUser, token])

  useEffect(() => {
    const departmentId = selectedDepartmentId
    if (!departmentId) {
      setDoctors([])
      setFormData((prev) => ({ ...prev, doctor_id: "" }))
      setAvailability(null)
      return
    }

    const loadDoctors = async () => {
      try {
        setError("")
        const res = await axios.get(
          `https://hospital-management-system-qdsz.onrender.com/department-doctors/?department_id=${departmentId}`,
          authHeaders
        )
        setDoctors(res.data || [])
        setFormData((prev) => ({ ...prev, doctor_id: "" }))
        setAvailability(null)
      } catch {
        setDoctors([])
        setError("Failed to load doctors for selected department.")
      }
    }

    loadDoctors()
  }, [authHeaders, selectedDepartmentId])

  useEffect(() => {
    if (!selectedDoctorId || !selectedAppointmentDate || !selectedAppointmentTime) {
      setAvailability(null)
      return
    }

    const loadAvailability = async () => {
      try {
        const slotDateTime = new Date(`${selectedAppointmentDate}T${selectedAppointmentTime}:00`)
        if (Number.isNaN(slotDateTime.getTime())) {
          setAvailability(null)
          return
        }
        const res = await axios.get(
          `https://hospital-management-system-qdsz.onrender.com/doctor-availability/?doctor_id=${selectedDoctorId}&date=${selectedAppointmentDate}&appointment_date=${encodeURIComponent(slotDateTime.toISOString())}`,
          authHeaders
        )
        setAvailability(res.data)
      } catch (err) {
        const backendError = err.response?.data?.error || "Failed to check doctor availability."
        setAvailability(null)
        setError(backendError)
      }
    }

    loadAvailability()
  }, [authHeaders, selectedDoctorId, selectedAppointmentDate, selectedAppointmentTime])

  const handleChange = (e) => {
    setError("")
    setSuccess("")
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.department_id || !formData.doctor_id || !formData.appointment_date || !formData.appointment_time) {
      setError("Please select department, doctor, appointment date and time.")
      return
    }
    if (availability && !availability.is_available) {
      const nextDateMessage = availability.next_available_message || ""
      setError(`${availability.message || "No slots available."} ${nextDateMessage}`.trim())
      return
    }

    try {
      setSubmitting(true)
      const localDateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}:00`)
      if (Number.isNaN(localDateTime.getTime())) {
        setError("Invalid appointment date/time.")
        setSubmitting(false)
        return
      }

      await axios.post(
        "https://hospital-management-system-qdsz.onrender.com/appointments/",
        {
          department_id: Number(formData.department_id),
          doctor_id: Number(formData.doctor_id),
          appointment_date: localDateTime.toISOString(),
        },
        authHeaders
      )
      setSuccess("Booking submitted successfully.")
      setFormData((prev) => ({ ...prev, doctor_id: "", appointment_date: "", appointment_time: "" }))
      setAvailability(null)
    } catch (err) {
      const data = err.response?.data || {}
      const message = data.message || data.appointment_date?.[0] || data.error || "Booking failed."
      const next = data.next_available_message || ""
      setError(`${message} ${next}`.trim())
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const selectedDoctor = doctors.find((doc) => String(doc.id) === String(formData.doctor_id))

  if (loading) {
    return <div style={styles.page}><br /><br />Loading booking form...</div>
  }

  return (
    <div style={styles.page}>
      <br /><br />
      <div style={styles.container}>
        <h2 style={styles.title}>Book Appointment</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Patient ID</label>
          <input style={styles.input} value={profile?.patient_id || "-"} readOnly />

          <label style={styles.label}>Patient Name</label>
          <input style={styles.input} value={profile?.name || "-"} readOnly />

          <label style={styles.label}>Email</label>
          <input style={styles.input} value={profile?.email || "-"} readOnly />

          <label style={styles.label}>Phone</label>
          <input style={styles.input} value={profile?.phone_number || "-"} readOnly />

          <label style={styles.label}>Department</label>
          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            style={styles.input}
            required
          >
            <option value="">Select Department</option>
            {departments.map((dep) => (
              <option key={dep.id} value={dep.id}>
                {dep.name}
              </option>
            ))}
          </select>

          <label style={styles.label}>Doctor</label>
          <select
            name="doctor_id"
            value={formData.doctor_id}
            onChange={handleChange}
            style={styles.input}
            required
            disabled={!formData.department_id}
          >
            <option value="">Select Doctor</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>

          <label style={styles.label}>Desired Appointment Date</label>
          <input
            type="date"
            name="appointment_date"
            min={minDate}
            value={formData.appointment_date}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <label style={styles.label}>Desired Appointment Time</label>
          <input
            type="time"
            name="appointment_time"
            value={formData.appointment_time}
            onChange={handleChange}
            style={styles.input}
            required
          />

          {availability && !availability.is_available ? (
            <p style={styles.warning}>
              {availability.message}
              {availability.next_available_message ? ` ${availability.next_available_message}` : ""}
            </p>
          ) : null}

          {availability &&
          availability.is_available &&
          formData.appointment_date &&
          formData.appointment_time &&
          selectedDoctor &&
          !error &&
          !String(availability.message || "").toLowerCase().includes("already booked") ? (
            <p style={styles.successInline}>
              Slot available for Dr. {selectedDoctor.name} on {formData.appointment_date} at {formData.appointment_time}.
            </p>
          ) : null}

          {error ? <p style={styles.error}>{error}</p> : null}
          {success ? <p style={styles.successInline}>{success}</p> : null}

          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Booking..." : "Book Appointment"}
          </button>
        </form> 
      </div><br /><br /> 
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f2f8ff 0%, #f4fff8 100%)",
    padding: "12px",
  },
  container: {
    maxWidth: "520px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #d9e8f8",
    boxShadow: "0 12px 24px rgba(16, 63, 108, 0.08)",
    padding: "22px",
  },
  title: {
    color: "#17324d",
    marginBottom: "14px",
  },
  form: {
    display: "grid",
    gap: "10px",
  },
  label: {
    color: "#274867",
    fontWeight: 600,
    fontSize: "14px",
  },
  input: {
    height: "42px",
    borderRadius: "8px",
    border: "1px solid #c9d8e7",
    padding: "0 12px",
    fontSize: "14px",
    backgroundColor: "#fbfdff",
  },
  button: {
    height: "44px",
    marginTop: "6px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#1565c0",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    margin: 0,
    color: "#b42318",
    fontSize: "13px",
  },
  warning: {
    margin: 0,
    color: "#9a6700",
    fontSize: "13px",
  },
  successInline: {
    margin: 0,
    color: "#067647",
    fontSize: "13px",
  },
}

export default Appointent_Page


