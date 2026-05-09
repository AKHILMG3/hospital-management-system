import React from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { logoutUser } from "../utils/auth"

const menuItems = [
  { to: "/admin-dashboard", label: "Dashboard" },
  { to: "/add-departments", label: "Departments" },
  { to: "/add-patient", label: "Add Patient" },
  { to: "/add-doctor", label: "Add Doctor" },
  { to: "/view-patients", label: "Patients" },
  { to: "/view_doctors", label: "Doctors" },
  { to: "/booking-approval", label: "Appointments" },
  { to: "/status-page", label: "Consulted Patients" },
]

const Admin_Layout = ({ children }) => {
  const navigate = useNavigate()

  return (
    <div className="admin-layout" style={styles.layout}>
      <aside className="admin-sidebar" style={styles.sidebar}>
        <h2 className="admin-brand text-light" style={styles.brand}>Admin Panel</h2>

        <nav className="admin-nav" style={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="admin-menu-btn"
              style={({ isActive }) => (isActive ? { ...styles.menuBtn, ...styles.menuBtnActive } : styles.menuBtn)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="admin-menu-btn"
          style={{ ...styles.menuBtn, ...styles.logoutBtn }}
          type="button"
          onClick={() => logoutUser(navigate)}
        >
          Logout
        </button>
      </aside>

      <main className="admin-main" style={styles.main}>{children}</main>
    </div>
  )
}

const styles = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    background: "linear-gradient(135deg, #f7fbff 0%, #eef9f2 100%)",
  },
  sidebar: {
    width: "240px",
    backgroundColor: "#17324d",
    color: "#ffffff",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flexShrink: 0,
  },
  brand: {
    margin: "0 0 10px 0",
    fontSize: "22px",
    fontWeight: 700,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  menuBtn: {
    height: "42px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: "10px",
    backgroundColor: "transparent",
    color: "#ffffff",
    textAlign: "left",
    padding: "0 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
  },
  menuBtnActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  logoutBtn: {
    marginTop: "auto",
    backgroundColor: "#a71d2a",
    borderColor: "#a71d2a",
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
}

export default Admin_Layout

