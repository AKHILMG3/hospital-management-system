import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

const PROFILE_URL = "https://hospital-management-system-qdsz.onrender.com/doctor-profile/"
const GMAIL_REGEX = /^[A-Z0-9._%+-]+@gmail\.com$/i

function readAuthUser() {
  const raw = localStorage.getItem("auth_user")
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const Dr_Profile = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem("auth_token")
  const doctorUser = useMemo(() => readAuthUser(), [])
  const isDoctor = Number(doctorUser?.user_type) === 3
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
  })
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)

  useEffect(() => {
    if (!token || !doctorUser) {
      navigate("/login", { replace: true })
      return
    }
    if (!isDoctor) {
      navigate("/patient-home", { replace: true })
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const res = await axios.get(PROFILE_URL, {
          headers: { Authorization: `Token ${token}` },
        })
        const data = res.data || {}
        setProfile(data)
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
        })
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load doctor profile.")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [doctorUser, isDoctor, navigate, token])

  const syncLocalUser = (updatedProfile) => {
    const parsed = readAuthUser()
    if (!parsed) return
    const patched = {
      ...parsed,
      first_name: updatedProfile.first_name || "",
      last_name: updatedProfile.last_name || "",
      username: updatedProfile.username || parsed.username,
    }
    localStorage.setItem("auth_user", JSON.stringify(patched))
  }

  const handleChange = (e) => {
    setError("")
    setSuccess("")
    const { name, value } = e.target
    if (name === "phone_number") {
      const digitsOnly = String(value || "").replace(/\D/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, phone_number: digitsOnly }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const firstName = formData.first_name.trim()
    const lastName = formData.last_name.trim()
    const cleanedEmail = formData.email.trim().toLowerCase()
    const cleanedPhone = formData.phone_number.replace(/\D/g, "").trim()

    if (firstName && firstName.length < 3) {
      setError("First name must be at least 3 characters.")
      return
    }
    if (!GMAIL_REGEX.test(cleanedEmail)) {
      setError("Email must be a valid Gmail address (e.g., abc@gmail.com).")
      return
    }
    if (cleanedPhone.length !== 10) {
      setError("Phone number must be exactly 10 digits.")
      return
    }

    setSaving(true)

    try {
      const payload = new FormData()
      payload.append("first_name", firstName)
      payload.append("last_name", lastName)
      payload.append("email", cleanedEmail)
      payload.append("phone_number", cleanedPhone)
      if (imageFile) payload.append("image", imageFile)
      if (removeImage) payload.append("remove_image", "true")

      const res = await axios.patch(PROFILE_URL, payload, {
        headers: { Authorization: `Token ${token}` },
      })
      const data = res.data || {}
      setProfile(data)
      setImageFile(null)
      setRemoveImage(false)
      setSuccess("Profile updated successfully.")
      syncLocalUser(data)
    } catch (err) {
      const data = err.response?.data || {}
      const firstError = data.error || data.email || data.phone_number || "Unable to update profile."
      setError(Array.isArray(firstError) ? firstError[0] : firstError)
    } finally {
      setSaving(false)
    }
  }

  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || profile?.username || "Doctor"

  if (loading) {
    return <div style={styles.page}><br /><br />Loading profile...</div>
  }

  return (
    <div style={styles.page}>
      <br />
      <br />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.avatar}>
            {profile?.image && !removeImage ? (
              <img src={profile.image} alt="Doctor" style={styles.avatarImage} />
            ) : (
              <span>{(fullName[0] || "D").toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 style={styles.title}>Dr. {fullName}</h2>
            <p style={styles.subtitle}>
              {profile?.department_name || "Department not assigned"} | {profile?.approval_status || "Pending"}
            </p>
          </div>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>First Name</label>
              <input
                style={styles.input}
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Last Name</label>
              <input
                style={styles.input}
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                style={styles.input}
                name="email"
                value={formData.email}
                onChange={handleChange}
                pattern="^[A-Za-z0-9._%+-]+@gmail\\.com$"
                title="Enter a Gmail address like abc@gmail.com"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input
                style={styles.input}
                name="phone_number"
                maxLength={10}
                value={formData.phone_number}
                onChange={handleChange}
                inputMode="numeric"
                type="tel"
                pattern="^[0-9]{10}$"
                title="Enter 10 digit phone number"
                required
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Department</label>
              <input style={styles.readOnlyInput} value={profile?.department_name || "-"} readOnly />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Approval Status</label>
              <input style={styles.readOnlyInput} value={profile?.approval_status || "-"} readOnly />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Profile Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] || null)
                if (e.target.files?.[0]) setRemoveImage(false)
              }}
              style={styles.input}
            />
          </div>

          {profile?.image ? (
            <label style={styles.checkboxWrap}>
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(e) => setRemoveImage(e.target.checked)}
              />
              Remove current image
            </label>
          ) : null}

          {error ? <p style={styles.error}>{error}</p> : null}
          {success ? <p style={styles.success}>{success}</p> : null}

          <div style={styles.actions}>
            <button style={styles.button} type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={() => navigate("/doctor_home")}
            >
              Back
            </button>
          </div>
        </form>
      </div>
      <br />
      <br />
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f4f8ff 0%, #eaf6f1 100%)",
    padding: "12px",
  },
  container: {
    maxWidth: "820px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #d9e8f8",
    boxShadow: "0 12px 24px rgba(16, 63, 108, 0.08)",
    padding: "22px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "18px",
  },
  avatar: {
    width: "72px",
    height: "72px",
    borderRadius: "999px",
    backgroundColor: "#eaf2fb",
    color: "#1a4c84",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 700,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  title: {
    margin: "0 0 4px",
    color: "#17324d",
  },
  subtitle: {
    margin: 0,
    color: "#5a7288",
    fontSize: "14px",
  },
  form: {
    display: "grid",
    gap: "12px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  field: {
    display: "grid",
    gap: "6px",
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
  readOnlyInput: {
    height: "42px",
    borderRadius: "8px",
    border: "1px solid #d7e3ef",
    padding: "0 12px",
    fontSize: "14px",
    backgroundColor: "#f5f9ff",
    color: "#3d5368",
  },
  checkboxWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#37536f",
  },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  button: {
    height: "44px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#1565c0",
    color: "#ffffff",
    fontWeight: 600,
    padding: "0 18px",
    cursor: "pointer",
  },
  secondaryButton: {
    height: "44px",
    border: "1px solid #c8d8ea",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    color: "#21435f",
    fontWeight: 600,
    padding: "0 18px",
    cursor: "pointer",
  },
  error: {
    margin: 0,
    color: "#b42318",
    fontSize: "13px",
  },
  success: {
    margin: 0,
    color: "#067647",
    fontSize: "13px",
  },
}

export default Dr_Profile
