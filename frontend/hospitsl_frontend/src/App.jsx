import React from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { getAuthToken, getStoredUser } from "./utils/auth"

import Landing_Page from "./Pages/Landing_Page"
import About_Page from "./Pages/About_Page"
import Login from "./Pages/Login"

import Header from "./Components/Header"
import Footer from "./Components/Footer"
import RequireAuth from "./Components/RequireAuth"

import Patient_Home from "./Patient_Pages/Patient_Home"
import P_Header from "./Patient_Pages/P_Header"
import Patient_Signup from "./Patient_Pages/Patient_Signup"

import Doctor_Home from "./Doctor_Pages/Doctor_Home"
import D_Header from "./Doctor_Pages/D_Header"
import Doctor_Signup from "./Doctor_Pages/Doctor_Signup"
import Dr_Profile from "./Doctor_Pages/Dr_Profile"
import Reset_Password from "./Doctor_Pages/Reset_Password"
import Booked_Appointments from "./Doctor_Pages/Booked_Appointments"

import Appointent_Page from "./Patient_Pages/Appointent_Page"
import My_Appointments from "./Patient_Pages/My_Appointments"
import Profile_View from "./Patient_Pages/Profile_View"
import Patient_Password from "./Patient_Pages/Patient_Password"
import Booked_Apointments from "./Patient_Pages/Booked_Apointments"

import Admin_Dashborad from "./Admin_Pages/Admin_Dashborad"
import Admin_Layout from "./Admin_Pages/Admin_Layout"
import Add_Patient from "./Admin_Pages/Add_Patient"
import Department_View from "./Admin_Pages/Department_View"
import View_Patient from "./Admin_Pages/View_Patient"
import View_Doctor from "./Admin_Pages/View_Doctor"
import Add_Doctor from "./Admin_Pages/ADD_Doctor"
import Booking_Approval from "./Admin_Pages/Booking_Approval"
import Status_Page from "./Admin_Pages/Status_Page"

// Public pages use the common site header + footer.
const PUBLIC_ROUTES = [
  { path: "/landing", page: Landing_Page, header: Header },
  { path: "/about", page: About_Page, header: Header },
  { path: "/signup", page: Patient_Signup, header: Header },
  { path: "/login", page: Login, header: Header },
  { path: "/doctor-signup", page: Doctor_Signup, header: Header },
]

const PATIENT_ROUTES = [
  { path: "/patient-home", page: Patient_Home },
  { path: "/appointment", page: Appointent_Page },
  { path: "/booked-appointments", page: Booked_Apointments },
  { path: "/my-appointments", page: My_Appointments },
  { path: "/profile", page: Profile_View },
  { path: "/patient-reset-password", page: Patient_Password },
]

const DOCTOR_ROUTES = [
  { path: "/doctor_home", page: Doctor_Home },
  { path: "/doctor-booked-appointments", page: Booked_Appointments },
  { path: "/doctor-profile", page: Dr_Profile },
  { path: "/reset-password", page: Reset_Password },
]

const ADMIN_ROUTES = [
  { path: "/admin-dashboard", page: Admin_Dashborad },
  { path: "/add-departments", page: Department_View },
  { path: "/add-patient", page: Add_Patient },
  { path: "/add-doctor", page: Add_Doctor },
  { path: "/view-patients", page: View_Patient },
  { path: "/view_doctors", page: View_Doctor },
  { path: "/booking-approval", page: Booking_Approval },
  { path: "/status-page", page: Status_Page },
]

function getHomePath(user) {
  const safeUser = user || {}
  const isAdmin =
    Boolean(safeUser.is_superuser) ||
    Boolean(safeUser.is_staff) ||
    Number(safeUser.user_type) === 2

  if (isAdmin) return "/admin-dashboard"

  const isDoctor = Number(safeUser.user_type) === 3
  if (isDoctor) return "/doctor_home"

  return "/patient-home"
}

function PageWithLayout({ HeaderComponent, PageComponent }) {
  return (
    <>
      <HeaderComponent />
      <PageComponent />
      <Footer />
    </>
  )
}

function RootRoute() {
  const token = getAuthToken()
  const user = getStoredUser()

  if (token && user) {
    return <Navigate to={getHomePath(user)} replace />
  }

  return <PageWithLayout HeaderComponent={Header} PageComponent={Landing_Page} />
}

function PageRouteElement({ PageComponent, HeaderComponent, role = null }) {
  const pageContent = <PageWithLayout HeaderComponent={HeaderComponent} PageComponent={PageComponent} />

  if (!role) {
    return pageContent
  }

  return <RequireAuth role={role}>{pageContent}</RequireAuth>
}

function AdminRouteElement({ PageComponent }) {
  return (
    <RequireAuth role="admin">
      <Admin_Layout>
        <PageComponent />
      </Admin_Layout>
    </RequireAuth>
  )
}

function DoctorOnlyAppointmentsRoute() {
  return (
    <RequireAuth role="doctor">
      <Booked_Appointments />
    </RequireAuth>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />

      {PUBLIC_ROUTES.map((item) => (
        <Route
          key={item.path}
          path={item.path}
          element={<PageRouteElement PageComponent={item.page} HeaderComponent={item.header || Header} />}
        />
      ))}

      {PATIENT_ROUTES.map((item) => (
        <Route
          key={item.path}
          path={item.path}
          element={<PageRouteElement PageComponent={item.page} HeaderComponent={P_Header} role="patient" />}
        />
      ))}

      {DOCTOR_ROUTES.map((item) => (
        <Route
          key={item.path}
          path={item.path}
          element={<PageRouteElement PageComponent={item.page} HeaderComponent={D_Header} role="doctor" />}
        />
      ))}

      {ADMIN_ROUTES.map((item) => {
        const PageComponent = item.page
        return <Route key={item.path} path={item.path} element={<AdminRouteElement PageComponent={PageComponent} />} />
      })}

      <Route path="/booked_appointments" element={<DoctorOnlyAppointmentsRoute />} />
    </Routes>
  )
}

export default App
