import React from "react"
import { useNavigate } from "react-router-dom"
import { logoutUser } from "../utils/auth"
import "../assets/patient-home.css"

function readPatientUser() {
  const raw = localStorage.getItem("patient_user")
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const quickActions = [
  {
    title: "Book Appointment",
    description: "Choose a department and reserve your next visit quickly.",
    button: "Book Now",
    route: "/appointment",
    tone: "action-primary",
  },
  {
    title: "My Appointments",
    description: "Track upcoming visits and check status updates in one place.",
    button: "View Appointments",
    route: "/my-appointments",
    tone: "action-info",
  },
  {
    title: "My Profile",
    description: "Update contact details and keep your profile information accurate.",
    button: "View Profile",
    route: "/profile",
    tone: "action-success",
  },
]

const Patient_Home = () => {
  const navigate = useNavigate()
  const patientUser = readPatientUser()

  const fullName = `${patientUser?.first_name || ""} ${patientUser?.last_name || ""}`.trim()
  const patientName = fullName || patientUser?.username || "Patient"

  const handleLogout = () => {
    logoutUser(navigate)
  }

  return (
    <main className="patient-home-page py-5">
      <div className="container patient-home-wrapper">
        <section className="patient-hero mb-4 mb-lg-5">
          <div className="row g-4 align-items-center">
            <div className="col-lg-8">
              <span className="patient-chip">Patient Dashboard</span>
              <h1 className="patient-title mt-3 mb-2">Welcome back, {patientName}</h1>
              <p className="patient-subtitle mb-0">
                Manage appointments, profile details, and account settings from one place.
              </p>
            </div>
            <div className="col-lg-4">
              <button
                type="button"
                className="btn btn-danger btn-lg w-100"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </section>

        <section className="row g-4">
          {quickActions.map((item) => (
            <div className="col-md-6 col-xl-4" key={item.title}>
              <article className={`patient-card h-100 ${item.tone}`}>
                <h3 className="h5 fw-bold mb-2">{item.title}</h3>
                <p className="text-muted mb-4">{item.description}</p>
                <button
                  type="button"
                  className="btn btn-dark patient-card-btn"
                  onClick={() => navigate(item.route)}
                >
                  {item.button}
                </button>
              </article>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}

export default Patient_Home
