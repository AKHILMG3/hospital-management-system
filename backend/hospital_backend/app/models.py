from django.contrib.auth.models import AbstractUser
from django.db import models


# ----------------------------------
# User Models
# ----------------------------------
class UserType(models.IntegerChoices):
    PATIENT = 1, "Patient"
    ADMIN = 2, "Admin"
    DOCTOR = 3, "Doctor"


class CustomUser(AbstractUser):
    # 1 = Patient, 2 = Admin, 3 = Doctor
    user_type = models.IntegerField(choices=UserType.choices, default=UserType.PATIENT)
    status = models.IntegerField(default=0)

    def display_name(self):
        """Return full name if available, otherwise username."""
        return self.get_full_name() or self.username

    def __str__(self):
        return self.display_name()


# ----------------------------------
# Patient Side Models
# ----------------------------------
class Registration(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    patient_id = models.CharField(max_length=30, unique=True, null=True, blank=True)

    GENDER_MALE = "Male"
    GENDER_FEMALE = "Female"
    GENDER_CHOICES = [
        (GENDER_MALE, "Male"),
        (GENDER_FEMALE, "Female"),
    ]

    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    phone_number = models.CharField(max_length=20)
    address = models.TextField()
    image = models.ImageField(upload_to="patients/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.display_name()


class Department(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Appointment(models.Model):
    CONSULTED = "Consulted"
    NOT_CONSULTED = "Not Consulted"
    CONSULT_STATUS_CHOICES = [
        (CONSULTED, "Consulted"),
        (NOT_CONSULTED, "Not Consulted"),
    ]

    patient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="patient_appointments",
    )
    doctor = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="doctor_appointments",
    )
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=20, default="Pending")
    consulted_status = models.CharField(
        max_length=20,
        choices=CONSULT_STATUS_CHOICES,
        default=NOT_CONSULTED,
    )
    consulted_status_updated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.patient} -> {self.doctor} ({self.appointment_date:%Y-%m-%d %H:%M})"


# ----------------------------------
# Doctor Side Models
# ----------------------------------
class DoctorProfile(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_APPROVED = "Approved"
    STATUS_REJECTED = "Rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="doctor_profile")
    phone_number = models.CharField(max_length=20)
    place = models.CharField(max_length=100, null=True, blank=True)
    image = models.ImageField(upload_to="doctors/", null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    approval_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.display_name()


class DoctorPasswordResetOTP(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="doctor_password_otps")
    otp_code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.user.username} OTP ({'used' if self.is_used else 'active'})"


class PatientPasswordResetOTP(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="patient_password_otps")
    otp_code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.user.username} OTP ({'used' if self.is_used else 'active'})"


# Legacy model (currently unused: Registration/DoctorProfile are used instead)
class Patient(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=10)
    address = models.TextField()
