import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { getAuthToken, getStoredUser } from "../utils/auth"

function getUserRole(user) {
  const safeUser = user || {}

  const isAdmin =
    Boolean(safeUser.is_superuser) ||
    Boolean(safeUser.is_staff) ||
    Number(safeUser.user_type) === 2
  if (isAdmin) return "admin"

  if (Number(safeUser.user_type) === 3) return "doctor"
  return "patient"
}

export default function RequireAuth({ role = "any", children }) {
  const location = useLocation()
  const token = getAuthToken()
  const user = getStoredUser()

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (role !== "any") {
    const userRole = getUserRole(user)
    if (userRole !== role) {
      return <Navigate to="/login" replace />
    }
  }

  return children
}
