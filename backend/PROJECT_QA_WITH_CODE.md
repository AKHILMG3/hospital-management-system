# Hospital Management System - PROJECT_QA.md + Code Explanation (Malayalam/English)

## Project Overview / പ്രോജക്റ്റ് അവലോകനം
**Q1: What is this project about?**  
**Code:** CustomUser model with roles (app/models.py):
```python
class UserType(models.IntegerChoices):
    PATIENT = 1, "Patient"    # രോഗി
    ADMIN = 2, "Admin"        # അഡ്മിൻ
    DOCTOR = 3, "Doctor"      # ഡോക്ടർ

class CustomUser(AbstractUser):
    user_type = models.IntegerField(choices=UserType.choices)
```
A1: Patient/Doctor reg, appointment booking, admin approve, OTP forgot password.

## Tech Stack / ടെക് സ്റ്റാക്ക്
**Q2:** Django DRF + MySQL (settings.py):
```python
DATABASES = {'default': {'ENGINE': 'django.db.backends.mysql', 'NAME': 'hospital_db'}}
AUTH_USER_MODEL = 'app.CustomUser'
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # Gmail OTP
```

## Models & Relationships / മോഡലുകൾ
**Q7: Core Models? (app/models.py)**
```python
class Registration(models.Model):  # Patient 1:1
    user = OneToOneField(CustomUser)
    patient_id = CharField(unique=True)  # PAT1001++

class DoctorProfile(models.Model):
    approval_status = CharField(default="Pending")  # Admin approve

class Appointment(models.Model):
    patient/doctor/dept = ForeignKey(CustomUser)
    status = "Pending/Approved/Cancelled"
```

**Q8: Patient ID Logic? (serializers.py)**
```python
def _generate_patient_id(self):
    last = Registration.objects.order_by("-id").first()
    next_num = int(re.match(r"PAT(\d+)", last.patient_id).group(1)) + 1
    return f"PAT{next_num}"  # tx.atomic safe
```

## Registration Flows / രജിസ്ട്രേഷൻ
**Q9:** PatientSignupSerializer (auto-pass, email creds):
```python
def create(self, data):
    auto_pass = _generate_strong_password()  # Abcd@123!
    user = CustomUser.objects.create_user(..., password=auto_pass)
    send_mail("Your ID: PAT1001, Pass: Abcd@123!")
```

Doctor: Pending → Admin approve → Email temp pass.

## Booking Validations (Q11: serializers.py AppointmentSerializer)
```python
def validate(self, attrs):
    if daily_booked(doctor, date) >= 5:     # MAX=5/day
        raise ValidationError("No slots. Next: 15 Oct")
    if Appointment.filter(doctor, exact_datetime).exists():  # No duplicate slot
        raise "Slot booked"
    if doctor.approval_status != "Approved":  # Doctor active?
        raise "Not available"
```

## Forgot Password (Q10: views.py) 
```python
otp = get_random_string(6, "0123456789")  # 123456
PatientPasswordResetOTP.create(expires_at=now+10min)
send_mail("Your OTP: 123456")  # Gmail
# Reset: verify OTP → set_password(new_pass)
```

## Admin APIs (Q12-13)
**Dashboard (views.py):**
```python
@api_view(["GET"])
def admin_dashboard_api(request):
    return {"total_patients": CustomUser.filter(PATIENT).count(),
            "pending_doctors": DoctorProfile.filter("Pending").count()}
```
- `/admin-doctors/1/status/ PATCH {"action":"approve"}` → Email pass.

**Endpoints (app/urls.py):** 40+ like `/patient-appointments/`, `/doctor-notifications/`.

## Email/Security (Q14-15)
```python
EMAIL_HOST_PASSWORD = read_secret_file("email_app_password.txt")  # Fallback
# Regex: phone=10dig, email=gmail.com, pass=upper+dig+special
```

## Challenges Solved (Q17)
- **Race conditions:** `transaction.atomic()` + `select_for_update()`.
- **Unique slots:** Exact datetime check.
- **Concurrency:** Daily count excludes cancelled.

## Setup/Demo (Q4)
```
cd hospital_backend && python manage.py migrate && runserver
# Signup patient → Book → Admin approve doctor → Consult
```

Print this for submission! All QA + code ready. 🚀
