import React, { useId, useState } from "react"
import { Link } from "react-router-dom"

const Header = () => {
  const collapseId = useId()
  const [isOpen, setIsOpen] = useState(false)

  const closeMenu = () => setIsOpen(false)

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
                <Link className="nav-link" to="/" onClick={closeMenu}>
                  Home
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="/about" onClick={closeMenu}>
                  About
                </Link>
              </li>

            </ul>

            <div className="navbar-actions d-flex ms-3 gap-2">

              <Link className="btn btn-outline-dark" to="/login" onClick={closeMenu}>
                Login
              </Link>

              <Link className="btn btn-light text-primary" to="/signup" onClick={closeMenu}>
                Sign Up
              </Link>

              <Link className="btn btn-warning text-dark" to="/doctor-signup" onClick={closeMenu}>
                Doctor Sign Up
              </Link>

            </div>

          </div>
        </div>
      </nav>

      <br />
    </>
  )
}

export default Header