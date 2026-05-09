# Hospital Management System - പ്രോജക്റ്റ് സബ്മിഷൻ Q&A ഗൈഡ് (English & Malayalam)

## Project Overview / പ്രോജക്റ്റ് അവലോകനം
**Q1: What is this project about? / ഈ പ്രോജക്റ്റിനെക്കുറിച്ച്?**  
A1: Full-stack Hospital Management System with Django REST API backend and React frontend. Features patient/doctor registration & login, appointment booking/cancellation, admin management (doctors/patients/approval/bookings), forgot password via email OTP, doctor approval workflow.  
**A1 (മലയാളം):** ഡജാങ്ഗോ REST API ബാക്ക്‌എൻഡും React ഫ്രണ്ട്‌എൻഡും ഉപയോഗിച്ചുള്ള ഫുൾ-സ്റ്റാക്ക് ഹോസ്പിറ്റൽ മാനേജ്മെന്റ് സിസ്റ്റം. പേഷന്റ്/ഡോക്ടർ രജിസ്ട്രേഷൻ, അപ്പോയിൻട്മെന്റ് ബുക്കിങ്/കാൻസൽ, അഡ്മിൻ മാനേജ്മെന്റ് (ഡോക്ടർ/പേഷന്റ് അപ്രൂവൽ/ബുക്കിങ്സ്), ഫോറ്റ് പാസ്വേഡ് (ഇമെയിൽ OTP), ഡോക്ടർ അപ്രൂവൽ വർക്ക്‌ഫ്ലോ.


**Q2: Tech Stack? / ടെക് സ്റ്റാക്ക്?**  
A2:  
- Backend: Django 6.0+, DRF, MySQL (`hospital_db`), Custom `TokenOrBearerAuthentication`  
- Frontend: React (Vite + npm), Axios, Bootstrap, role-based routing (`RequireAuth.jsx`)  
- Other: Gmail SMTP (OTP/credentials), ImageField uploads (`media/doctors/`, `media/patients/`), CORS (localhost:5174)  
**A2 (മലയാളം):** ബാക്ക്‌എൻഡ്: ഡജാങ്ഗോ/DRF/MySQL, ടോക്കൺ auth. ഫ്രണ്ട്: React/Vite/Axios/Bootstrap. ഗൂഗിൾ SMTP OTP-ക്ക്, ഇമേജ് അപ്ലോഡ്, CORS 5174.

**Q3: Project Structure?**  
A3:  
```
backend/ (cwd)
├── hospital_backend/ (Django settings/urls)
├── app/ (models/views/serializers/urls/migrations)
├── media/ (profile images)
└── manage.py

../frontend/hospitsl_frontend/
├── src/
│   ├── Admin_Pages/ (Dashboard, View_Doctor/Patient, Add_Doctor/Patient)
│   ├── Doctor_Pages/ (Dr_Login, Doctor_Signup, Booked_Appointments)
│   ├── Patient_Pages/ (Patient_Signup, Appointent_Page, Profile_View)
│   ├── utils/auth.js (token mgmt)
│   └── App.jsx (main router)
└── package.json
```

## Architecture & Setup
**Q4: How to setup/run? / എങ്ങനെ റൺ ചെയ്യാം?**  
A4:  
Backend: `cd hospital_backend && pip install -r requirements.txt && python manage.py makemigrations app && python manage.py migrate && python manage.py createsuperuser && python manage.py runserver`  
Frontend: `cd ../frontend/hospitsl_frontend && npm i && npm run dev` (localhost:5174)  
APIs: localhost:8000 (root + /api/), media:/media/.  
**A4 (മലയാളം):** ബാക്ക്: migrate/runserver. ഫ്രണ്ട്: npm dev. APIകൾ 8000-ൽ.

**Q5: Why CustomUser & DB?**  
A5: `AUTH_USER_MODEL='app.CustomUser'` (extends AbstractUser + `user_type`: 1=Patient,2=Admin,3=Doctor). MySQL for concurrency (bookings), vs SQLite dev-only.

**Q6: Authentication Mechanism?**  
A6: DRF custom `TokenOrBearerAuthentication` (supports legacy Token + modern JWT). Role-specific login (`/patient-login/`, `/doctor-login/`) → token. Frontend: `auth.js` stores in localStorage, Axios interceptor.

## Models & Relationships
**Q7: Core Models?**  
A7:  
- `CustomUser`: user_type, display_name()  
- `Registration` (1:1 patient): patient_id(`PAT1001++`), phone(10dig), address, gender, image  
- `DoctorProfile` (1:1 doctor): approval_status(Pending/Approved/Rejected), dept(FK), image  
- `Department`: name, active  
- `Appointment`: patient(FK), doctor(FK), dept(FK), appointment_date(DT), status(Pending/Cancelled), consulted_status  
OTP models for reset.

**Q8: Patient ID Logic?**  
A8: Serializer scans last `PAT####`, increments (unique tx.atomic).

## Features Deep Dive
**Q9: Registration Flows?**  
A9:  
Patient: `/patient-signup/` → Gmail-only, unique phone/email, auto username/pass/PAT-ID, email credentials+login-link, auto-active.  
Doctor: `/doctor-signup/` → similar, but pending approval (admin approves → active).

**Q10: Forgot/Change Password?**  
A10: `/patient-forgot-password/request-otp/` → email 6dig OTP (expires/is_used). `/reset/` verify+new pass. Separate doctor endpoints.

**Q11: Booking Validations (AppointmentSerializer)?**  
A11:  
- Doctor: approved/active/correct-dept  
- Date: future only  
- Slot: unique exact-time (no duplicates)  
- Daily: max 5/doctor (suggests next avail. date)  
- Cancel: before appt/not-consulted  

**Q12: Admin Capabilities?**  
A12: `/admin-dashboard/`, `/admin-patients/` (list/detail), `/admin-doctors/` (list/approve/reset-pass/status), `/admin-bookings/` (list/status), add-patient/doctor/dept.

**Q13: Major API Endpoints (app.urls)?**  
A13: DRF routers (`/users/registrations/departments/appointments/`) + custom:  
- Auth: `patient/doctor-signup/login/profile/change-password`  
- Patient: `appointments/` `appointments/<id>/cancel/` `booking-profile/`  
- Doctor: `availability/` `notifications/` `appointments/<id>/consult-status/`  
- Admin: `admin-patients/<id>/` `admin-doctors/<id>/status/reset-password/` etc.

## Code Highlights
**Q14: Email Integration?**  
A14: `EMAIL_BACKEND=smtp.gmail.com:587 TLS`, env vars + fallback `email_app_password.txt`. Tx.atomic sends in serializers (reg/OTP).

**Q15: Security Best Practices?**  
A15: Regex (phone10dig, Gmail), uniqueness (phone/email), strong auto-pass (`!@#$`+upper+lower+dig), race-condition tx.atomic, active/approval checks, CSRF/CORS/JWT expiry.

**Q16: Frontend Integration?**  
A16: React role-pages (Patient_Home → Appointent_Page → book via API). Bootstrap responsive, auth guards.

**Q17: Challenges Solved?**  
A17: Concurrent bookings (slot+daily count), timezone dates (`to_local_date()`), auto-gen unique IDs/usernames, Gmail-only + fallback secrets, doctor workflow.

**Q18: Testing/Edge Cases?**  
A18: Serializer unit-tests implied (validations), manual: duplicate slot→error w/next-date, max-book→suggest, expired OTP→fail.

**Q19: Production Deployment?**  
A19: Backend: Railway/Render + Railway MySQL, .env (email creds), `ALLOWED_HOSTS=*`, `DEBUG=False`. Frontend: Vercel. Update CORS/FRONTEND_LOGIN_URL.

**Q20: Future Enhancements?**  
A20: JWT refresh, WebSocket notifications, payments(Razorpay), video-call, reports/charts, mobile PWA, Docker+CI/CD.

**Bonus Qs:**  
- Media: `ImageField(upload_to='doctors/')`, served via `static(MEDIA_URL)`.  
- Serializer tricks: `SerializerMethodField` (can_cancel=appt>now & !consulted), nested read-only (patient_details).  
- Why max 5/day? Realistic doctor load balancing.

Print this MD, demo live: create patient→book→admin approve doctor→consult. Code ref: `models.py`, `AppointmentSerializer` (validations gold), `urls.py`.

Good luck with submission! 🚀

