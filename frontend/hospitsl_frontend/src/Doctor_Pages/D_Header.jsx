import React, { useId, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { logoutUser } from "../utils/auth"

const D_Header = () => {
  const navigate = useNavigate()
  const collapseId = useId()
  const [isOpen, setIsOpen] = useState(false)

  const closeMenu = () => setIsOpen(false)

  const handleLogout = () => {
    logoutUser(navigate)
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-primary fixed-top" data-bs-theme="dark">
        <div className="container-fluid">

          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <h2 className="text-white m-0">MediEase</h2>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            aria-controls={collapseId}
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`collapse navbar-collapse ${isOpen ? "show" : ""}`} id={collapseId}>

            <ul className="navbar-nav me-auto">

              <li className="nav-item">
                <Link className="nav-link" to="/doctor_home" onClick={closeMenu}>
                  Home
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="/doctor-booked-appointments" onClick={closeMenu}>
                  Booked Appointments
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="/reset-password" onClick={closeMenu}>
                  Change Password
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="/doctor-profile" onClick={closeMenu}>
                  Profile
                </Link>
              </li>

            </ul>

            <div className="navbar-actions d-flex ms-3 gap-2">
              <button
                className="btn btn-danger"
                onClick={() => {
                  closeMenu()
                  handleLogout()
                }}
              >
                Log Out
              </button>
            </div>

          </div>
        </div>
      </nav>

      <br /><br />
    </>
  )
}

export default D_Header