// Hint: This file contains project UI/app logic; read component sections for flow.
import React from 'react'

const About_Page = () => {
  return (
    
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <h1 className="mb-3 text-primary">About Hospital Management System</h1>
          <p className="lead">
            Our Hospital Management System is designed to simplify and digitize day-to-day hospital operations.
            It helps hospitals manage patients, doctors, appointments, billing, and reports from one centralized platform.
          </p>
        </div>
      </div>

      <div className="row g-4 mt-2">
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Patient Management</h5>
              <p className="card-text">
                Maintain patient records, medical history, prescriptions, and discharge summaries securely.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Appointment Scheduling</h5>
              <p className="card-text">
                Book, reschedule, and track appointments with doctors to reduce waiting time and improve care flow.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Billing and Reports</h5>
              <p className="card-text">
                Generate invoices, manage payments, and view operational reports for better financial control.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row justify-content-center mt-5">
        <div className="col-lg-10">
          <div className="p-4 bg-light rounded-3 border">
            <h4 className="mb-3">Why this system?</h4>
            <p className="mb-0">
              This platform improves efficiency, minimizes manual errors, and enhances patient experience by enabling
              faster, data-driven decision making across hospital departments.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About_Page

