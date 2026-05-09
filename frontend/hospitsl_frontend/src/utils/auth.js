// Hint: This file contains project UI/app logic; read component sections for flow.
// LocalStorage keys store cheyyan vendi object
// Login user data & token ivide store cheyyum

const STORAGE_KEYS = {
  authUser: "auth_user", // Doctor / Admin user data
  patientUser: "patient_user",  // Patient user data
  token: "auth_token",  // Authentication token
}

// LocalStorage-il ninn auth token edukkanulla function, User login cheythittundo enn check cheyyan use cheyyam
export const getAuthToken = () => 
  localStorage.getItem(STORAGE_KEYS.token)

// JSON string -> JavaScript object convert cheyyan function , Invalid JSON vannal app crash aakathirikkan try-catch use cheyyunnu
function parseStoredJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null  // error vannal null return cheyyum
  }
}

// LocalStorage-il ninn login cheytha user data edukkunnu, auth_user illenkil patient_user check cheyyum
export const getStoredUser = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.authUser) || localStorage.getItem(STORAGE_KEYS.patientUser)
  if (!raw) return null
  return parseStoredJson(raw)
}

// Logout function, ella login data localStorage-il ninn remove cheythu login page-il redirect cheyyum
export const logoutUser = (navigate) => {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))  // auth_user, patient_user, token remove
  navigate("/login")
}

