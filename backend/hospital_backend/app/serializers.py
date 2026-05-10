"""Serializers used by the hospital booking APIs.

This module keeps request validation and object creation/update logic in one place
for easier API maintenance.
"""

import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework import serializers

from .models import (
    Appointment,
    CustomUser,
    Department,
    DoctorProfile,
    Patient,
    Registration,
    UserType,
)

User = get_user_model()


MAX_BOOKINGS_PER_DAY = 5
GMAIL_REGEX = r"^[A-Za-z0-9._%+-]+@gmail\.com$"


def to_local_date(value):
    """Convert a datetime value to a local date."""
    if not value:
        return None

    if timezone.is_aware(value):
        return timezone.localtime(value).date()
    return value.date()


def is_valid_gmail(email):
    """Return True if email matches project Gmail-only policy."""
    return bool(re.match(GMAIL_REGEX, str(email or "").strip().lower()))


def split_name(full_name, default_first_name):
    """Split full name into first_name and last_name."""
    parts = str(full_name or "").strip().split()
    first_name = parts[0] if parts else default_first_name
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    return first_name, last_name


class DepartmentSerializer(serializers.ModelSerializer):
    """CRUD serializer for departments."""

    class Meta:
        model = Department
        fields = '__all__'


class CustomUserSerializer(serializers.ModelSerializer):
    """Generic serializer for CustomUser model."""

    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = CustomUser
        fields = '__all__'

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({"password": "This field is required."})
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegistrationSerializer(serializers.ModelSerializer):
    """Serializer for patient registration profile."""

    user = CustomUserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='user',
        write_only=True,
    )

    class Meta:
        model = Registration
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    #Serializer for appointments with booking validations.

    patient = CustomUserSerializer(read_only=True)
    doctor = CustomUserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    patient_details = serializers.SerializerMethodField()
    consulted_status = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    patient_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='patient',
        write_only=True,
        required=False,
    )
    doctor_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='doctor',
        write_only=True,
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        write_only=True,
    )

    class Meta:
        model = Appointment
        fields = '__all__'

    def get_patient_details(self, obj):
        try:
            registration = obj.patient.registration
        except Registration.DoesNotExist:
            registration = None

        full_name = (
            f"{obj.patient.first_name or ''} {obj.patient.last_name or ''}".strip()
            or obj.patient.username
        )

        return {
            "id": obj.patient.id,
            "name": full_name,
            "email": obj.patient.email,
            "patient_id": registration.patient_id if registration else None,
            "phone_number": registration.phone_number if registration else None,
            "address": registration.address if registration else None,
        }

    def get_consulted_status(self, obj):
        if not getattr(obj, "consulted_status_updated_at", None):
            return None
        value = str(getattr(obj, "consulted_status", "") or "").strip()
        if value.lower() == "consulted":
            return "Consulted"
        return "Not Consulted"

    def get_can_cancel(self, obj):
        status_value = str(getattr(obj, "status", "") or "").strip().lower()
        if status_value in {"cancelled", "rejected"}:
            return False

        consulted_value = str(getattr(obj, "consulted_status", "") or "").strip().lower()
        if consulted_value == "consulted":
            return False

        appointment_dt = getattr(obj, "appointment_date", None)
        if not appointment_dt:
            return False

        now = timezone.now()
        if timezone.is_aware(now) and timezone.is_naive(appointment_dt):
            now = timezone.make_naive(now)
        elif timezone.is_naive(now) and timezone.is_aware(appointment_dt):
            now = timezone.make_aware(now)

        return appointment_dt > now

    def validate(self, attrs):
        doctor = attrs.get("doctor")
        department = attrs.get("department")
        appointment_date = attrs.get("appointment_date")

        if doctor:
            if int(doctor.user_type) != UserType.DOCTOR:
                raise serializers.ValidationError({
                    "doctor_id": "Selected user is not a doctor."
                })

        if doctor:
            profile = getattr(doctor, "doctor_profile", None)
            if not profile:
                raise serializers.ValidationError({
                    "doctor_id": "Selected doctor is not available for booking."
                })
            if profile.approval_status != DoctorProfile.STATUS_APPROVED:
                raise serializers.ValidationError({
                    "doctor_id": "Selected doctor is not available for booking."
                })
            if not doctor.is_active:
                raise serializers.ValidationError({
                    "doctor_id": "Selected doctor is not available for booking."
                })

        if doctor and department:
            profile = getattr(doctor, "doctor_profile", None)
            if profile and profile.department_id != department.id:
                raise serializers.ValidationError({
                    "doctor_id": "Selected doctor does not belong to the selected department."
                })

        selected_date = None
        if appointment_date:
            selected_date = to_local_date(appointment_date)
            today = timezone.localdate()
            if selected_date <= today:
                raise serializers.ValidationError({
                    "appointment_date": "Only future dates are allowed. Please select a date after today."
                })

        # Prevent duplicate booking of the same doctor slot across all patients.
        if doctor and appointment_date:
            slot_exists = (
                Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=appointment_date,
                )
                .exclude(status__iexact="Rejected")
                .exclude(status__iexact="Cancelled")
                .exists()
            )
            if slot_exists:
                raise serializers.ValidationError(
                    {"message": "This slot is already booked. Please book another slot."}
                )

        if doctor and selected_date:
            booked_count = self._daily_booking_count(doctor, selected_date)
            if booked_count >= MAX_BOOKINGS_PER_DAY:
                next_available_date = self._find_next_available_date(
                    doctor,
                    selected_date + timedelta(days=1)
                )
                doctor_name = (
                    f"{doctor.first_name} {doctor.last_name}".strip() or doctor.username
                )
                message = (
                    f"No slots available for Dr. {doctor_name} "
                    f"on {selected_date.strftime('%d %b %Y')}"
                )
                error_data = {"message": message}
                if next_available_date:
                    error_data["next_available_date"] = next_available_date.isoformat()
                    error_data["next_available_message"] = (
                        f"Next available date: "
                        f"{next_available_date.strftime('%d %b %Y')}"
                    )
                raise serializers.ValidationError(error_data)

        return attrs

    def _find_next_available_date(self, doctor, start_date):
        candidate_date = start_date
        for _ in range(365):
            booked_count = self._daily_booking_count(doctor, candidate_date)
            if booked_count < MAX_BOOKINGS_PER_DAY:
                return candidate_date
            candidate_date += timedelta(days=1)
        return None

    def _daily_booking_count(self, doctor, selected_date):
        return (
            Appointment.objects.filter(
                doctor=doctor,
                appointment_date__date=selected_date,
            )
            .exclude(status__iexact="Rejected")
            .exclude(status__iexact="Cancelled")
            .count()
        )

    def create(self, validated_data):
        validated_data["status"] = "Pending"
        return super().create(validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for nested API responses."""

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Create patient user + registration and send credentials by email."""

    name = serializers.CharField(write_only=True, min_length=3, max_length=150)
    phone_number = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)
    address = serializers.CharField(write_only=True)
    image = serializers.ImageField(write_only=True, required=False, allow_null=True)
    gender = serializers.ChoiceField(
        write_only=True,
        required=False,
        choices=Registration.GENDER_CHOICES,
    )
    age = serializers.IntegerField(write_only=True, required=False, min_value=0)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ['name', 'email', 'phone_number', 'phone', 'address', 'gender', 'age', 'password', 'image']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not (attrs.get("phone_number") or attrs.get("phone")):
            raise serializers.ValidationError({"phone_number": "Phone number is required."})
        return attrs

    def validate_gender(self, value):
        if value in (None, ""):
            return None
        normalized = str(value).strip().lower()
        if normalized in {"male", "m"}:
            return Registration.GENDER_MALE
        if normalized in {"female", "f"}:
            return Registration.GENDER_FEMALE
        return value

    def validate_phone_number(self, value):
        value = value.strip()
        if value == "":
            raise serializers.ValidationError("Phone number is required.")
        if not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Phone number must be 10 digits.")
        if Registration.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("This phone number is already registered")
        return value

    def validate_phone(self, value):
        return self.validate_phone_number(value)

    def validate_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Address is required.")
        return value

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not is_valid_gmail(email):
            raise serializers.ValidationError(
                "Email must be a valid Gmail address (e.g., abc@gmail.com)."
            )
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("This email is already registered")
        return email


    def validate_name(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters.")
        return value

    def _build_username(self, name, email):
        name_part = re.sub(r'[^a-z0-9]', '', name.lower())[:12]
        email_part = email.split("@")[0].replace(".", "").replace("_", "").lower()[:12]
        base = (name_part or email_part or "patient").strip() or "patient"

        username = base
        counter = 1
        while CustomUser.objects.filter(username__iexact=username).exists():
            username = f"{base}{counter}"
            counter += 1
        return username

    def _generate_patient_id(self):
        last_patient_id = (
            Registration.objects.exclude(patient_id__isnull=True)
            .exclude(patient_id__exact="")
            .order_by("-id")
            .values_list("patient_id", flat=True)
            .first()
        )

        next_number = 1001
        if last_patient_id:
            match = re.match(r"^PAT(\d+)$", str(last_patient_id))
            if match:
                next_number = int(match.group(1)) + 1

        while True:
            candidate = f"PAT{next_number}"
            if not Registration.objects.filter(patient_id=candidate).exists():
                return candidate
            next_number += 1

    def _generate_strong_password(self):
        allowed_special = "!@#$%^&*"
        allowed_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + allowed_special
        while True:
            password = get_random_string(10, allowed_chars=allowed_chars)
            if (
                any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in allowed_special for c in password)
            ):
                return password

    def create(self, validated_data):
        try:
            # Create the user
            user = CustomUser.objects.create_user(
                username=validated_data['email'],
                email=validated_data['email'],
                password=validated_data.get('password', 'defaultpassword'),
                first_name=validated_data['name'],
            )

            # Create the registration
            registration = Registration.objects.create(
                user=user,
                phone_number=validated_data.get('phone_number', ''),
                phone=validated_data.get('phone', ''),
                address=validated_data['address'],
                gender=validated_data.get('gender', None),
                age=validated_data.get('age', None),
                image=validated_data.get('image', None),
            )

            # Set generated_patient_id and email_error attributes
            self.generated_patient_id = registration.id
            self.email_error = None

            # Send email (pseudo-code, replace with actual implementation)
            try:
                send_email_to_patient(user.email, registration.id, validated_data.get('password', 'defaultpassword'))
            except Exception as e:
                self.email_error = str(e)

            return user
        except Exception as e:
            raise serializers.ValidationError({"error": str(e)})


class DoctorProfileSerializer(serializers.ModelSerializer):
    """Serializer for doctor profile details."""

    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
    )

    class Meta:
        model = DoctorProfile
        fields = '__all__'


class DoctorSignupSerializer(serializers.Serializer):
    """Self-signup serializer for doctors (pending approval)."""

    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    image = serializers.ImageField(required=False, allow_null=True)
    department_id = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), source="department")

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters.")
        return value

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not is_valid_gmail(email):
            raise serializers.ValidationError("Email must be a valid Gmail address (e.g., abc@gmail.com).")
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("This email is already registered.")
        return email

    def validate_phone_number(self, value):
        phone_digits = re.sub(r"\D", "", str(value or ""))
        if len(phone_digits) != 10:
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        phone_exists = (
            DoctorProfile.objects.filter(phone_number=phone_digits).exists()
            or Registration.objects.filter(phone_number=phone_digits).exists()
        )
        if phone_exists:
            raise serializers.ValidationError("This phone number is already registered.")
        return phone_digits

    def _build_username(self, email):
        base = email.split("@")[0].replace(" ", "").lower()[:25] or "doctor"
        username = base
        counter = 1
        while CustomUser.objects.filter(username=username).exists():
            username = f"{base}{counter}"
            counter += 1
        return username

    def create(self, validated_data):
        name = validated_data["name"].strip()
        email = validated_data["email"]
        phone_number = validated_data["phone_number"]
        image = validated_data.get("image")
        department = validated_data["department"]

        first_name, last_name = split_name(name, default_first_name="Doctor")

        username = self._build_username(email)

        try:
            with transaction.atomic():
                user = CustomUser.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=None,
                    user_type=UserType.DOCTOR,
                    status=0,
                    is_active=False,
                )
                DoctorProfile.objects.create(
                    user=user,
                    phone_number=phone_number,
                    image=image,
                    department=department,
                    approval_status=DoctorProfile.STATUS_PENDING,
                )
        except Exception as exc:
            raise serializers.ValidationError(
                {"error": f"Unable to create doctor account. {str(exc)}"}
            )

        return user


class AdminAddDoctorSerializer(serializers.Serializer):
    """Admin serializer to create an approved doctor account."""

    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    place = serializers.CharField(max_length=100)
    image = serializers.ImageField(required=False, allow_null=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        required=False,
        allow_null=True,
    )

    def validate_name(self, value):
        value = (value or "").strip()
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters.")
        return value

    def validate_place(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Place is required.")
        return value

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not is_valid_gmail(email):
            raise serializers.ValidationError("Email must be a valid Gmail address (e.g., abc@gmail.com).")
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("This email is already registered.")
        return email

    def validate_phone_number(self, value):
        phone_digits = re.sub(r"\D", "", str(value or ""))
        if len(phone_digits) != 10:
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        phone_exists = (
            DoctorProfile.objects.filter(phone_number=phone_digits).exists()
            or Registration.objects.filter(phone_number=phone_digits).exists()
        )
        if phone_exists:
            raise serializers.ValidationError("This phone number is already registered.")
        return phone_digits

    def _build_username(self, email):
        base = email.split("@")[0].replace(" ", "").lower()[:25] or "doctor"
        username = base
        counter = 1
        while CustomUser.objects.filter(username__iexact=username).exists():
            username = f"{base}{counter}"
            counter += 1
        return username

    def _generate_strong_password(self):
        allowed_special = "!@#$%^&*"
        allowed_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + allowed_special
        while True:
            password = get_random_string(10, allowed_chars=allowed_chars)
            if (
                any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in allowed_special for c in password)
            ):
                return password

    def create(self, validated_data):
        name = validated_data["name"].strip()
        email = validated_data["email"]
        phone_number = validated_data["phone_number"]
        place = validated_data["place"].strip()
        image = validated_data.get("image")
        department = validated_data.get("department")

        first_name, last_name = split_name(name, default_first_name="Doctor")

        username = self._build_username(email)
        auto_password = self._generate_strong_password()
        login_url = getattr(settings, "FRONTEND_LOGIN_URL", "http://127.0.0.1:5173/login")

        try:
            with transaction.atomic():
                # Re-check inside transaction to avoid partial creation on duplicates.
                if CustomUser.objects.filter(email__iexact=email).exists():
                    raise serializers.ValidationError({"email": "This email is already registered."})
                if (
                    DoctorProfile.objects.filter(phone_number=phone_number).exists()
                    or Registration.objects.filter(phone_number=phone_number).exists()
                ):
                    raise serializers.ValidationError({"phone_number": "This phone number is already registered."})

                user = CustomUser.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=auto_password,
                    user_type=UserType.DOCTOR,
                    status=1,
                    is_active=True,
                )
                DoctorProfile.objects.create(
                    user=user,
                    phone_number=phone_number,
                    place=place,
                    image=image,
                    department=department,
                    approval_status=DoctorProfile.STATUS_APPROVED,
                )
        except serializers.ValidationError:
            raise
        except Exception as exc:
            raise serializers.ValidationError(
                {"error": f"Unable to create doctor account. {str(exc)}"}
            )

        self.email_error = None
        try:
            send_mail(
                subject="Doctor Account Created",
                message=(
                    f"Hello Dr. {first_name},\n\n"
                    "Your doctor account has been created by the admin.\n"
                    f"Email: {email}\n"
                    f"Password: {auto_password}\n"
                    f"Login Link: {login_url}\n\n"
                    "You can login and change your password anytime."
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER),
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as exc:
            self.email_error = str(exc)

        self.generated_password = auto_password
        return user
    


class LegacyUserRegistrationSerializer(serializers.Serializer):
    """Legacy serializer kept for backward compatibility."""

    name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    age = serializers.IntegerField()
    gender = serializers.CharField()    
    address = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def create(self, validated_data):
        password = validated_data.pop("password")

        # Create auth user account.
        user = User.objects.create(
            email=validated_data["email"],
            username=validated_data["email"],
        )
        user.set_password(password)
        user.save()

        # Create legacy patient record.
        patient = Patient.objects.create(
            user=user,
            name=validated_data["name"],
            phone=validated_data["phone"],
            age=validated_data["age"],
            gender=validated_data["gender"],
            address=validated_data["address"],
        )

        return patient

