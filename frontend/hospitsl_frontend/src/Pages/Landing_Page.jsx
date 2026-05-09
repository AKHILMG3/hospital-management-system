// Hint: This file contains project UI/app logic; read component sections for flow.
import React from 'react'
import { Link } from 'react-router-dom'

const Landing_Page = () => {
  return (
    <main>
      <section className="bg-primary text-white py-5">
        <div className="container py-4">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <h1 className="display-5 fw-bold">Hospital Management System</h1>
              <p className="lead mt-3">
                Manage appointments, patient records, billing, and staff workflows from one reliable platform.
              </p>
              <div className="d-flex flex-wrap gap-2 mt-4">
                <Link to="/about" className="btn btn-light btn-lg text-primary fw-semibold">
                  Learn More
                </Link>
                <button className="btn btn-outline-light btn-lg">Book Appointment</button>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="bg-white text-dark rounded-3 p-4 shadow">
                <h5 className="fw-bold">Today at a glance</h5>
                <p className="mb-2">Appointments: <strong>126</strong></p>
                <p className="mb-2">Doctors on duty: <strong>18</strong></p>
                <p className="mb-0">Emergency beds available: <strong>7</strong></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="text-center mb-4">
          <h2 className="fw-bold">Core Features</h2>
          <p className="text-muted">Everything your hospital needs in one place.</p>
        </div>
        <div className="row g-4">
          <div className="col-md-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Patient Records</h5>
                <p className="card-text">
                  Store and track complete patient data securely with quick access for medical teams.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Doctor Scheduling</h5>
                <p className="card-text">
                  Reduce delays by optimizing doctor availability and appointment slots.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Billing and Insurance</h5>
                <p className="card-text">
                  Simplify invoices, payments, and insurance workflows with automated reporting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-light py-5 border-top border-bottom">
        <div className="container">
          <div className="row text-center g-4">
            <div className="col-6 col-md-3">
              <h3 className="fw-bold text-primary mb-1">10K+</h3>
              <p className="mb-0 text-muted">Patients Served</p>
            </div>
            <div className="col-6 col-md-3">
              <h3 className="fw-bold text-primary mb-1">120+</h3>
              <p className="mb-0 text-muted">Doctors</p>
            </div>
            <div className="col-6 col-md-3">
              <h3 className="fw-bold text-primary mb-1">24/7</h3>
              <p className="mb-0 text-muted">Emergency Support</p>
            </div>
            <div className="col-6 col-md-3">
              <h3 className="fw-bold text-primary mb-1">99%</h3>
              <p className="mb-0 text-muted">System Uptime</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Landing_Page

