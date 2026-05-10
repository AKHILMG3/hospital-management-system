import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Profile_View = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("auth_token");
  const patientUser = localStorage.getItem("patient_user");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
  });

  useEffect(() => {
    if (!token || !patientUser) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axios.get("https://hospital-management-system-qdsz.onrender.com/patient-profile/", {
          headers: { Authorization: `Token ${token}` },
        });
        const data = res.data || {};
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          address: data.address || "",
        });
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, patientUser, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await axios.patch("https://hospital-management-system-qdsz.onrender.com/patient-profile/", formData, {
        headers: { Authorization: `Token ${token}` },
      });
      setSuccess("Profile updated successfully.");
    } catch {
      setError("Unable to update profile.");
    }
  };

  if (loading) return <div>Loading...</div>;

return (
  <div style={styles.container}>
    <div style={styles.card}>
      <h2 style={styles.title}>Profile</h2>

      {loading && <p>Loading...</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        
        <div style={styles.field}>
          <label style={styles.label}>First Name</label>
          <input
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Last Name</label>
          <input
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Phone Number</label>
          <input
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            style={styles.textarea}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <button type="submit" style={styles.button}>
          Save Changes
        </button>
      </form>
    </div>
  </div>
)
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f5f5f5",
  },
  card: {
    background: "#fff",
    padding: "25px",
    borderRadius: "10px",
    width: "400px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  field: {
    marginBottom: "12px",
  },
  label: {
    marginBottom: "5px",
    display: "block",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  button: {
    marginTop: "10px",
    padding: "10px",
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  error: {
    color: "red",
    marginTop: "5px",
  },
  success: {
    color: "green",
    marginTop: "5px",
  },
}

export default Profile_View;

