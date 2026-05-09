"""API views for hospital booking system."""

import re
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db.models import Q
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import TokenOrBearerAuthentication
from .models import (
    CustomUser,
    Department,
    Appointment,
    Registration,
    DoctorProfile,
    DoctorPasswordResetOTP,
    PatientPasswordResetOTP,
    UserType,
)
from .serializers import (
    CustomUserSerializer,
    DepartmentSerializer,
    AppointmentSerializer,
    RegistrationSerializer,
    UserRegistrationSerializer,
    DoctorSignupSerializer,
    AdminAddDoctorSerializer,
)


# ----------------------------------
# Health/Test
# ----------------------------------
@api_view(["GET"])
def test_api(request):
    return Response({"message": "Django + React Connected Successfully"})


# ----------------------------------
# Shared constants + helpers
# ----------------------------------
MAX_BOOKINGS_PER_DAY = 5
GMAIL_REGEX = r"^[A-Za-z0-9._%+-]+@gmail\.com$"
PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 8 characters long and contain at least one "
    "uppercase letter, one digit, and one special character, e.g. Abcd@123."
)


def _is_password_policy_valid(password):
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[^A-Za-z0-9]", password):
        return False
    return True


def _validate_password_policy_or_raise(password):
    if not _is_password_policy_valid(password):
        raise DjangoValidationError(PASSWORD_POLICY_MESSAGE)


def _generate_strong_password(length=10):
    special_characters = "!@#$%^&*."
    letters_and_numbers = (
        "abcdefghijklmnopqrstuvwxyz"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "0123456789"
    )
    all_allowed = letters_and_numbers + special_characters

    while True:
        password = get_random_string(length=length, allowed_chars=all_allowed)
        if _is_password_policy_valid(password):
            return password


def _is_truthy_flag(value):
    """Parse common truthy values from request payload."""
    return str(value).strip().lower() in {"1", "true", "yes"}


def _is_valid_gmail(email):
    """Validate Gmail-only format used in this project."""
    return bool(re.match(GMAIL_REGEX, str(email or "").strip().lower()))


def to_local_date(datetime_value):
    """Convert datetime to local date in a timezone-safe way."""
    if not datetime_value:
        return None

    if timezone.is_aware(datetime_value):
        return timezone.localtime(datetime_value).date()

    return datetime_value.date()


def daily_booking_count(doctor, selected_date):
    """Count active (non-cancelled/non-rejected) bookings for a doctor."""
    appointments = Appointment.objects.filter(
        doctor=doctor,
        appointment_date__date=selected_date,
    )
    appointments = appointments.exclude(status__iexact="Rejected")
    appointments = appointments.exclude(status__iexact="Cancelled")
    return appointments.count()

def has_authenticated_role(user, role):
    if user is None:
        return False

    if not user.is_authenticated:
        return False

    user_role = getattr(user, "user_type", 0)
    return int(user_role) == role


# ----------------------------------
# Permissions
# ----------------------------------
class IsPatientUser(BasePermission):
    def has_permission(self, request, view):
        return has_authenticated_role(request.user, UserType.PATIENT)

class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        return has_authenticated_role(request.user, UserType.DOCTOR)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return (
            user.is_staff
            or user.is_superuser
            or int(getattr(user, "user_type", 0)) == UserType.ADMIN
        )


# ----------------------------------
# Admin dashboard summary
# ----------------------------------
@api_view(["GET"])
def admin_dashboard_api(request):
    pending_profiles = (
        DoctorProfile.objects.filter(
            approval_status=DoctorProfile.STATUS_PENDING
        )
        .select_related("user", "department")
        .order_by("-created_at")
    )

    pending_doctors = []
    for profile in pending_profiles:
        full_name = f"{profile.user.first_name} {profile.user.last_name}".strip()
        if not full_name:
            full_name = profile.user.username

        department_name = "-"
        if profile.department:
            department_name = profile.department.name

        pending_doctors.append(
            {
                "id": profile.user.id,
                "name": full_name,
                "email": profile.user.email,
                "department": department_name,
            }
        )

    data = {
        "total_users": CustomUser.objects.count(),
        "total_patients": CustomUser.objects.filter(user_type=UserType.PATIENT).count(),
        "total_doctors": CustomUser.objects.filter(user_type=UserType.DOCTOR).count(),
        "total_departments": Department.objects.count(),
        "total_appointments": Appointment.objects.count(),
        "scheduled_appointments": Appointment.objects.filter(
            status__iexact="Approved",
            consulted_status__iexact="Not Consulted",
        ).count(),
        "completed_appointments": Appointment.objects.filter(
            status__iexact="Approved",
            consulted_status__iexact="Consulted",
        ).count(),
        "cancelled_appointments": Appointment.objects.filter(status__iexact="Cancelled").count(),
        "pending_doctor_requests": pending_profiles.count(),
        "pending_doctors": pending_doctors,
    }

    return Response(data, status=status.HTTP_200_OK)

class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().order_by('-id')
    serializer_class = CustomUserSerializer

class RegistrationViewSet(viewsets.ModelViewSet):
    queryset = Registration.objects.select_related('user').all().order_by('-created_at')
    serializer_class = RegistrationSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all().order_by('-id')
    serializer_class = DepartmentSerializer


class AddDepartmentView(APIView):
    """Create department with duplicate-name protection."""

    def post(self, request):
        serializer = DepartmentSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        name = serializer.validated_data.get("name", "").strip()
        if Department.objects.filter(name__iexact=name).exists():
            return Response(
                {"error": "Department with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save()

        return Response(
            {
                "message": "Department added successfully",
                "department": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

class AppointmentViewSet(viewsets.ModelViewSet):
    """List/create appointments and enforce booking rules."""

    queryset = Appointment.objects.select_related(
        'patient', 'patient__registration', 'doctor', 'department'
    ).order_by('-appointment_date')
    serializer_class = AppointmentSerializer

    def _is_create_request(self):
        action = getattr(self, "action", None)
        if action:
            return action == "create"

        request = getattr(self, "request", None)
        return bool(request and request.method == "POST")

    def get_authenticators(self):
        if self._is_create_request():
            return [TokenAuthentication()]
        return super().get_authenticators()

    def get_permissions(self):
        if self._is_create_request():
            return [IsAuthenticated(), IsPatientUser()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()

        doctor_id = self.request.query_params.get("doctor_id")
        status_value = self.request.query_params.get("status")

        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
            
        if status_value:
            queryset = queryset.filter(status__iexact=status_value.strip())
        return queryset

    def perform_create(self, serializer):
        doctor = serializer.validated_data.get("doctor")
        appointment_date = serializer.validated_data.get("appointment_date")
        selected_date = to_local_date(appointment_date)

        with transaction.atomic():
            # Lock doctor row to prevent concurrent overbooking.
            CustomUser.objects.select_for_update().filter(id=doctor.id).first()

            booked_count = daily_booking_count(doctor, selected_date)

            if booked_count >= MAX_BOOKINGS_PER_DAY:
                doctor_name = f"{doctor.first_name} {doctor.last_name}".strip() or doctor.username
                next_available_date = self._find_next_available_date(doctor, selected_date + timedelta(days=1))
                payload = {
                    "message": f"No slots available for Dr. {doctor_name} on {selected_date.strftime('%d %b %Y')}"
                }

                if next_available_date:
                    payload["next_available_date"] = next_available_date.isoformat()
                    payload["next_available_message"] = (
                        f"Next available date: {next_available_date.strftime('%d %b %Y')}"
                    )

                raise DRFValidationError(payload)

            serializer.save(patient=self.request.user)

    def _find_next_available_date(self, doctor, start_date):
        """Find nearest date within 30 days that still has slot."""
        current_date = start_date

        max_days_to_check = 30
        for _ in range(max_days_to_check):
            booked_count = daily_booking_count(doctor, current_date)
            
            if booked_count < MAX_BOOKINGS_PER_DAY:
                return current_date

            current_date += timedelta(days=1)

        return None


class PatientBookingProfileView(APIView):
    """Return minimal profile details for the logged-in patient."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]

    def get(self, request):
        user = request.user

        registration = getattr(user, "registration", None)

        full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username

        return Response(
            {
                "id": user.id,
                "patient_id": registration.patient_id if registration else None,
                "name": full_name,
                "email": user.email,
                "phone_number": registration.phone_number if registration else None,
            },
            status=status.HTTP_200_OK,
        )


class PatientProfileView(APIView):
    """Read/update logged-in patient profile."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]
 
    def get(self, request):
        user = request.user

        registration = getattr(user, "registration", None)

        image_url = None

        if registration and registration.image:
            image_url = request.build_absolute_uri(registration.image.url)
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,

                "patient_id": registration.patient_id if registration else None,
                "phone_number": registration.phone_number if registration else "",
                "address": registration.address if registration else "",
                "image": image_url,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        user = request.user
        registration = getattr(user, "registration", None)

        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        email = request.data.get("email")
        phone_number = request.data.get("phone_number")
        address = request.data.get("address")
        image = request.FILES.get("image")
        remove_image = _is_truthy_flag(request.data.get("remove_image", ""))

        if first_name is not None:
            normalized_first_name = str(first_name).strip()
            if normalized_first_name and len(normalized_first_name) < 3:
                return Response(
                    {"first_name": "First name must be at least 3 characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.first_name = normalized_first_name

        if last_name is not None:
            user.last_name = str(last_name).strip()

        if email is not None:
            normalized_email = str(email).strip().lower()
            if not normalized_email:
                return Response(
                    {"email": "Email is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not _is_valid_gmail(normalized_email):
                return Response(
                    {"email": "Email must be a valid Gmail address (e.g., abc@gmail.com)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            email_exists = (
                CustomUser.objects
                .filter(email__iexact=normalized_email)
                .exclude(id=user.id)
                .exists()
            )
            if email_exists:
                return Response(
                    {"email": "This email is already registered."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.email = normalized_email

        if phone_number is not None:
            normalized_phone = str(phone_number).strip()
            if not normalized_phone.isdigit() or len(normalized_phone) != 10:
                return Response(
                    {"phone_number": "Phone number must be exactly 10 digits."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            phone_exists = (
                DoctorProfile.objects.filter(phone_number=normalized_phone)
                .exclude(user_id=user.id)
                .exists()
                or Registration.objects.filter(phone_number=normalized_phone)
                .exclude(user_id=user.id)
                .exists()
            )
            if phone_exists:
                return Response(
                    {"phone_number": "This phone number is already registered."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if registration:
                registration.phone_number = normalized_phone

        if address is not None:
            normalized_address = str(address).strip()
            if not normalized_address:
                return Response(
                    {"address": "Address is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if registration:
                registration.address = normalized_address

        with transaction.atomic():
            user.save(update_fields=["first_name", "last_name", "email"])
            if registration:
                if remove_image and registration.image:
                    registration.image.delete(save=False)
                    registration.image = None
                if image is not None:
                    registration.image = image
                registration.save()

        return self.get(request)


class PatientAppointmentsView(APIView):
    """Return appointments of current patient (optional status filter)."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]

    def get(self, request):
        status_value = str(request.query_params.get("status", "")).strip()

        appointments = Appointment.objects.select_related(
            "patient",
            "patient__registration",
            "doctor",
            "doctor__doctor_profile",
            "doctor__doctor_profile__department",
            "department",
        ).filter(patient=request.user).order_by("-appointment_date")

        if status_value:
            appointments = appointments.filter(status__iexact=status_value)

        data = AppointmentSerializer(appointments, many=True).data
        return Response(data, status=status.HTTP_200_OK)

class PatientAppointmentCancelView(APIView):
    """Allow patient to cancel own upcoming appointment."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]

    def post(self, request, booking_id):
        return self.patch(request, booking_id)

    def patch(self, request, booking_id):
        booking = get_object_or_404(
            Appointment.objects.select_related("patient", "doctor", "department"),
            id=booking_id,
            patient=request.user,
        )

        current_status = str(booking.status or "").strip().lower()
        if current_status in {"cancelled", "rejected"}:
            return Response(
                {"error": f"Cannot cancel appointment in '{booking.status}' status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(getattr(booking, "consulted_status", "") or "").strip().lower() == "consulted":
            return Response(
                {"error": "Cannot cancel an appointment that is already consulted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment_dt = getattr(booking, "appointment_date", None)
        if appointment_dt:
            now = timezone.now()
            if timezone.is_aware(now) and timezone.is_naive(appointment_dt):
                now = timezone.make_naive(now)
            elif timezone.is_naive(now) and timezone.is_aware(appointment_dt):
                now = timezone.make_aware(now)

            if appointment_dt <= now:
                return Response(
                    {"error": "Cannot cancel past appointments."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        booking.status = "Cancelled"
        booking.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "message": "Appointment cancelled successfully.",
                "appointment_id": booking.id,
            },
            status=status.HTTP_200_OK,
        )

class DepartmentDoctorsView(APIView):
    """List approved doctors for a department."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]

    def get(self, request):

        department_id = request.query_params.get("department_id")

        if not department_id:
            return Response(
                {"error": "department_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doctors = CustomUser.objects.filter(
            user_type=UserType.DOCTOR,
            is_active=True,
            doctor_profile__approval_status=DoctorProfile.STATUS_APPROVED,
            doctor_profile__department_id=department_id,
          ).select_related("doctor_profile").order_by("first_name", "last_name", "username")


        data = []

        for doctor in doctors:
            full_name = (
            f"{doctor.first_name} {doctor.last_name}".strip()
            or doctor.username
            )

            data.append(
                {
                    "id": doctor.id,
                    "name": full_name,
                    "email": doctor.email,
                }
            )

        return Response(data, status=status.HTTP_200_OK)
    

class DoctorAvailabilityView(APIView):
    """Check day-level availability and exact-slot collision."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]
 
    def get(self, request):

        doctor_id = request.query_params.get("doctor_id") 
        date_string = request.query_params.get("date")

        if not doctor_id or not date_string:
            return Response(
                {"error": "doctor_id and date are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        selected_date = parse_date(date_string)

        if not selected_date:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if selected_date <= timezone.localdate():
            return Response(
                {"error": "Only future dates allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        doctor = get_object_or_404(
            CustomUser.objects.filter(
                user_type=UserType.DOCTOR,
                is_active=True,
                doctor_profile__approval_status=DoctorProfile.STATUS_APPROVED,
            ),
            id=doctor_id,
        )

        appointments_count = daily_booking_count(doctor, selected_date)

        selected_slot_dt = None
        if date_string:
            selected_slot_dt = request.query_params.get("appointment_date")

        exact_slot_booked = False
        if selected_slot_dt:
            try:
                from django.utils.dateparse import parse_datetime
                slot_dt = parse_datetime(selected_slot_dt)
                if slot_dt is not None:
                    exact_slot_booked = Appointment.objects.filter(
                        doctor=doctor,
                        appointment_date=slot_dt,
                    ).exclude(status__iexact="Rejected").exclude(status__iexact="Cancelled").exists()
            except Exception:
                exact_slot_booked = False

        is_available = (appointments_count < MAX_BOOKINGS_PER_DAY) and (not exact_slot_booked)

        response = { 
            "doctor_id": doctor.id,
            "doctor_name": f"{doctor.first_name} {doctor.last_name}".strip() or doctor.username,
            "selected_date": selected_date.isoformat(),
            "appointments_count": appointments_count,
            "max_per_day": MAX_BOOKINGS_PER_DAY,
            "is_available": is_available,
        }
        if exact_slot_booked:
            response["message"] = "This slot is already booked. Please book another slot."

        return Response(response, status=status.HTTP_200_OK)

    def _find_next_available_date(self, doctor, start_date):
        """Find next date (within 30 days) that still has an open slot."""

        current_date = start_date

        max_days_to_check = 30

        for _ in range(max_days_to_check):
            booked_count = daily_booking_count(doctor, current_date)

            if booked_count < MAX_BOOKINGS_PER_DAY:
                return current_date
            
            current_date += timedelta(days=1)
        return None


class DoctorNotificationsView(APIView):
    """Show latest approved upcoming appointments for doctor."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def get(self, request):
        doctor = request.user

        approved_appointments = Appointment.objects.select_related(
            "patient",
            "patient__registration",
        ).filter(
            doctor=doctor,
            status__iexact="Approved",
            appointment_date__gte=timezone.now(),
        ).order_by("-updated_at")[:20]

        notifications = []

        for appointment in approved_appointments:
            patient_name = (
                f"{appointment.patient.first_name or ''} "
                f"{appointment.patient.last_name or ''}"
            ).strip() or appointment.patient.username

            display_date = (
                timezone.localtime(appointment.appointment_date)
                .strftime("%d %b %Y")
                if appointment.appointment_date
                else None 
            )
            notifications.append(
                {
                    "id": appointment.id,
                    "appointment_id": appointment.id,
                    "updated_at": (
                        appointment.updated_at.isoformat()
                        if appointment.updated_at
                        else None
                    ),
                    "appointment_date": (
                        appointment.appointment_date.isoformat()
                        if appointment.appointment_date
                        else None
                    ),
                    "patient_name": patient_name,
                    "message": (
                        f"New appointment booked by "
                        f"{patient_name} for {display_date}"
                    ),
                }
            )

        return Response({"notifications": notifications}, status=status.HTTP_200_OK)


class DoctorAppointmentConsultStatusView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def patch(self, request, appointment_id):
        action = str(request.data.get("action", "")).strip().lower()
        if action in {"consult", "consulted"}:
            target_status = Appointment.CONSULTED
        elif action in {"not consult", "not-consulted", "not_consulted", "not consulted"}:
            target_status = Appointment.NOT_CONSULTED
        else:
            return Response(
                {"error": "Invalid action. Use 'consulted' or 'not_consulted'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = get_object_or_404(
            Appointment.objects.select_related("doctor", "patient"),
            id=appointment_id,
            doctor=request.user,
        )

        booking_status = str(appointment.status or "").strip().lower()
        if booking_status in {"rejected", "cancelled"}:
            return Response(
                {"error": f"Cannot update consulted status for '{appointment.status}' appointments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if getattr(appointment, "consulted_status_updated_at", None):
            return Response(
                {"error": "Consulted status is already updated for this appointment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment_datetime = getattr(appointment, "appointment_date", None)
        if not appointment_datetime:
            return Response(
                {"error": "Appointment date/time is missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        if timezone.is_aware(now) and timezone.is_naive(appointment_datetime):
            now = timezone.make_naive(now)
        elif timezone.is_naive(now) and timezone.is_aware(appointment_datetime):
            now = timezone.make_aware(now)

        if appointment_datetime > now:
            return Response(
                {
                    "error": (
                        "Consulted status can be updated only after the appointment "
                        "date and time is reached."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.consulted_status = target_status
        appointment.consulted_status_updated_at = timezone.now()

        update_fields = ["consulted_status", "consulted_status_updated_at", "updated_at"]
        if target_status == Appointment.CONSULTED:
            appointment.status = "Completed"
            update_fields.append("status")

        appointment.save(update_fields=update_fields)

        return Response(
            {
                "message": f"Consulted status updated to '{target_status}'.",
                "appointment_id": appointment.id,
                "consulted_status": appointment.consulted_status,
                "status": appointment.status,
            },
            status=status.HTTP_200_OK,
        )


class DoctorProfileView(APIView):
    """Read/update logged-in doctor profile."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def get(self, request):
        user = request.user
        profile = getattr(user, "doctor_profile", None)

        image_url = None
        if profile and profile.image:
            image_url = request.build_absolute_uri(profile.image.url) 

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,

                "phone_number": profile.phone_number if profile else "",
                "department_id": profile.department_id if profile else None,
                "department_name": profile.department.name if profile and profile.department else None,
                "approval_status": profile.approval_status if profile else None,
                "image": image_url,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
    
        user = request.user
        profile = getattr(user, "doctor_profile", None)
        
        if not profile:
            return Response(
                {"error": "Doctor profile not found."},
                  status=status.HTTP_404_NOT_FOUND)
        
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        email = request.data.get("email")
        phone_number = request.data.get("phone_number")
        image = request.FILES.get("image")
        remove_image = _is_truthy_flag(request.data.get("remove_image", ""))

        if first_name is not None:
            normalized_first_name = str(first_name).strip()
            if normalized_first_name and len(normalized_first_name) < 3:
                return Response(
                    {"first_name": "First name must be at least 3 characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.first_name = normalized_first_name

        if last_name is not None:
            user.last_name = str(last_name).strip()

        if email is not None:
            normalized_email = str(email).strip().lower()

            if not normalized_email:
                return Response({"email": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
            if not _is_valid_gmail(normalized_email):
                return Response(
                    {"email": "Email must be a valid Gmail address (e.g., abc@gmail.com)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
             
             # Check duplicate email (excluding current user)
            email_exists = CustomUser.objects.filter(email__iexact=normalized_email).exclude(id=user.id).exists()

            if email_exists:
                return Response({"email": "This email is already registered."}, status=status.HTTP_400_BAD_REQUEST)
            
            user.email = normalized_email

        if phone_number is not None:
            normalized_phone = str(phone_number).strip()

            if not normalized_phone.isdigit() or len(normalized_phone) != 10:
                return Response(
                    {"phone_number": "Phone number must be exactly 10 digits."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            phone_exists = (
                DoctorProfile.objects.filter(phone_number=normalized_phone)
                .exclude(user_id=user.id)
                .exists()
                or Registration.objects.filter(phone_number=normalized_phone)
                .exclude(user_id=user.id)
                .exists()
            )
            if phone_exists:
                return Response(
                    {"phone_number": "This phone number is already registered."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
             
            profile.phone_number = normalized_phone

        with transaction.atomic():
            user.save(update_fields=["first_name", "last_name", "email"])

            if remove_image and profile.image:
                profile.image.delete(save=False)
                profile.image = None

            if image is not None:
                profile.image = image
            profile.save()

        return self.get(request)


class DoctorForgotPasswordRequestView(APIView):
    """Generate and send OTP for doctor password reset."""

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()

        if not email:
            return Response(
                {"error": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doctor = CustomUser.objects.filter(
            user_type=UserType.DOCTOR,
            email__iexact=email,
        ).first()

        if not doctor:
            return Response(
                {"error": "Doctor account not found for this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        otp_code = get_random_string(6, allowed_chars="0123456789")
        expires_at = timezone.now() + timedelta(minutes=10)

        DoctorPasswordResetOTP.objects.filter(
            user=doctor,
            is_used=False,
        ).update(is_used=True)

        DoctorPasswordResetOTP.objects.create(
            user=doctor,
            otp_code=otp_code,
            expires_at=expires_at,
        )

        try:
            send_mail(
                subject="Doctor Password Reset OTP",
                message=(
                    f"Hello Dr. {doctor.first_name or doctor.username},\n\n"
                    f"Your OTP for password reset is: {otp_code}\n"
                    "This OTP is valid for 10 minutes.\n\n"
                    "If you did not request this, please ignore this email."
                ),
                from_email=getattr(
                    settings,
                    "DEFAULT_FROM_EMAIL",
                    settings.EMAIL_HOST_USER,
                ),
                recipient_list=[doctor.email],
                fail_silently=False,
            )
        except Exception as exc:
            return Response(
                {"error": f"Failed to send OTP email. {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": "OTP sent to your email."},
            status=status.HTTP_200_OK,
          )

class DoctorForgotPasswordResetView(APIView):
    """Verify OTP and set new password for doctor."""

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        otp = str(request.data.get("otp", "")).strip()
        new_password = str(request.data.get("new_password", ""))

        if not email or not otp or not new_password:
            return Response(
                {"error": "Email, OTP and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        doctor = CustomUser.objects.filter(user_type=UserType.DOCTOR, email__iexact=email).first()

        if not doctor:
            return Response({"error": "Doctor account not found for this email."}, status=status.HTTP_404_NOT_FOUND)

        otp_record = DoctorPasswordResetOTP.objects.filter(
            user=doctor,
            otp_code=otp,
            is_used=False,
            expires_at__gte=timezone.now(),
        ).order_by("-created_at").first()

        if not otp_record:
            return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _validate_password_policy_or_raise(new_password)
        except DjangoValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            doctor.set_password(new_password)
            doctor.save(update_fields=["password"])

            otp_record.is_used = True
            otp_record.save(update_fields=["is_used"])

        return Response({"message": "Password reset successful. Please login."}, status=status.HTTP_200_OK)


class DoctorChangePasswordView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def post(self, request):
        current_password = str(request.data.get("current_password", ""))
        new_password = str(request.data.get("new_password", ""))

        if not current_password or not new_password:
            return Response(
                {"error": "current_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doctor = request.user

        if not doctor.check_password(current_password):
            return Response(
                {"current_password": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=doctor)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doctor.set_password(new_password)
        doctor.save(update_fields=["password"])

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class PatientForgotPasswordRequestView(APIView):
    """Generate and send OTP for patient password reset."""
    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        patient = CustomUser.objects.filter(user_type=UserType.PATIENT, email__iexact=email).first()
        if not patient:
            return Response({"error": "Patient account not found for this email."}, status=status.HTTP_404_NOT_FOUND)

        otp_code = get_random_string(6, allowed_chars="0123456789")
        expires_at = timezone.now() + timedelta(minutes=10)

        PatientPasswordResetOTP.objects.filter(user=patient, is_used=False).update(is_used=True)
        PatientPasswordResetOTP.objects.create(
            user=patient,
            otp_code=otp_code,
            expires_at=expires_at,
        )

        try:
            send_mail(
                subject="Patient Password Reset OTP",
                message=(
                    f"Hello {patient.first_name or patient.username},\n\n"
                    f"Your OTP for password reset is: {otp_code}\n"
                    "This OTP is valid for 10 minutes.\n\n"
                    "If you did not request this, please ignore this email."
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER),
                recipient_list=[patient.email],
                fail_silently=False,
            )
        except Exception as exc:
            return Response(
                {"error": f"Failed to send OTP email. {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message": "OTP sent to your email."}, status=status.HTTP_200_OK)


class PatientForgotPasswordResetView(APIView):
    """Verify OTP and set new password for patient."""
    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        otp = str(request.data.get("otp", "")).strip()
        new_password = str(request.data.get("new_password", ""))

        if not email or not otp or not new_password:
            return Response(
                {"error": "Email, OTP and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient = CustomUser.objects.filter(
            user_type=UserType.PATIENT,
            email__iexact=email,
        ).first()
        if not patient:
            return Response(
                {"error": "Patient account not found for this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        otp_record = PatientPasswordResetOTP.objects.filter(
            user=patient,
            otp_code=otp,
            is_used=False,
            expires_at__gte=timezone.now(),
        ).order_by("-created_at").first()

        if not otp_record:
            return Response(
                {"error": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            _validate_password_policy_or_raise(new_password)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            patient.set_password(new_password)
            patient.save(update_fields=["password"])
            otp_record.is_used = True
            otp_record.save(update_fields=["is_used"])

        return Response(
            {"message": "Password reset successful. Please login."},
            status=status.HTTP_200_OK,
        )


class PatientChangePasswordView(APIView):
    """Change patient password using current password."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]

    def post(self, request):
        current_password = str(request.data.get("current_password", ""))
        new_password = str(request.data.get("new_password", ""))

        if not current_password or not new_password:
            return Response(
                {"error": "current_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient = request.user

        if not patient.check_password(current_password):
            return Response(
                {"current_password": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            _validate_password_policy_or_raise(new_password)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient.set_password(new_password)
        patient.save(update_fields=["password"])

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class PatientSignupView(APIView):
    """Create patient account and send credentials via email."""
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            patient_id = getattr(serializer, "generated_patient_id", None)
            email_error = getattr(serializer, "email_error", None)
            payload = {"message": "Patient registered successfully. Patient ID and password sent to email."}
            if patient_id:
                payload["patient_id"] = patient_id
            if email_error:
                payload["message"] = (
                    "Patient registered, but credentials email was not sent. "
                    "Please check backend email configuration."
                )
                payload["email_error"] = email_error
                payload["email_hint"] = (
                    "Set EMAIL_HOST_PASSWORD (Gmail app password) or "
                    "create backend/hospital_backend/email_app_password.txt"
                )
                payload["email_sent"] = False
                if getattr(settings, "DEBUG", False):
                    payload["temporary_password"] = getattr(serializer, "generated_password", None)
                return Response(payload, status=status.HTTP_201_CREATED)
            payload["email_sent"] = True
            return Response(payload, status=status.HTTP_201_CREATED)
        if "email" in serializer.errors:
            return Response({"email": "This email is already registered"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PatientEmailCheckView(APIView):
    """Check whether an email is already registered."""

    def get(self, request): 
        email = request.query_params.get("email")

        if not email:
            return Response(
                {"email": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = email.strip().lower()

        email_exists = CustomUser.objects.filter(
            email__iexact=email
        ).exists()

        if email_exists:
            return Response(
                {
                    "available": False,
                    "email": "This email is already registered"
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {"available": True},
            status=status.HTTP_200_OK
        )

class DoctorSignupView(APIView):
    def post(self, request):
        serializer = DoctorSignupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": (
                        "Account created successfully. Please wait for admin approval"
                    )
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PatientLoginView(APIView):
    """Login endpoint for patient users."""

    def post(self, request):
        identifier = (
            request.data.get("username")
            or request.data.get("email")
            or request.data.get("identifier")
        )
        password = request.data.get("password")

        if not identifier or not password:
            return Response(
                {"error": "Username/email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        identifier = identifier.strip()
        password = password.strip()

        users = CustomUser.objects.filter(
            Q(username__iexact=identifier) |
            Q(email__iexact=identifier)
        )

        if not users.exists():
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = None

        for candidate in users:
            authenticated_user = authenticate(
                request,
                username=candidate.username,
                password=password
            )

            if authenticated_user:
                user = authenticated_user
                break

        if not user:
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if int(getattr(user, "user_type", 0)) == UserType.DOCTOR:
            profile = getattr(user, "doctor_profile", None)
            if not profile or profile.approval_status != DoctorProfile.STATUS_APPROVED:
                return Response(
                    {"error": "Doctor account is pending admin approval."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        patient_id = None

        try:
            registration = user.registration
            patient_id = registration.patient_id
        except Registration.DoesNotExist:
            pass

        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                "message": "Login successful",
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "patient_id": patient_id,
                    "user_type": user.user_type,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                },
            },
            status=status.HTTP_200_OK,
        )


class DoctorLoginView(APIView):
    """Login endpoint for doctor users."""
    def post(self, request):
        identifier = (
            request.data.get("username")
            or request.data.get("email")
            or request.data.get("identifier")
        )
        password = request.data.get("password")

        if not identifier or not password:
            return Response(
                {"error": "Username/email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        identifier = str(identifier).strip()
        password = str(password).strip()

        users = CustomUser.objects.filter(
            Q(username__iexact=identifier) |
            Q(email__iexact=identifier)
        )

        if not users.exists():
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = None
        for candidate in users:
            authenticated_user = authenticate(
                request,
                username=candidate.username,
                password=password
            )
            if authenticated_user:
                user = authenticated_user
                break

        if not user:
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if int(getattr(user, "user_type", 0)) != UserType.DOCTOR:
            return Response(
                {"error": "Invalid doctor credentials."},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = getattr(user, "doctor_profile", None)
        if not profile or profile.approval_status != DoctorProfile.STATUS_APPROVED:
            return Response(
                {"error": "Doctor account is pending admin approval."},
                status=status.HTTP_403_FORBIDDEN,
            )

        token, created = Token.objects.get_or_create(user=user)
        return Response(
            {
                "message": "Login successful",
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "user_type": user.user_type,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                },
            },
            status=status.HTTP_200_OK,
        )


def _serialize_patient(user, request=None):
    """Convert patient user object to API response dictionary."""

    registration = getattr(user, "registration", None) # Get patient registration details (if available)

    image_url = None # Prepare image URL

    if registration and registration.image:
        image_url = registration.image.url

        if request is not None:
            image_url = request.build_absolute_uri(image_url) # # Convert to absolute URL if request object is provided

    patient_data = { # Build response data
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "status": user.status,
        "patient_id": registration.patient_id if registration else None,
        "phone_number": registration.phone_number if registration else None,
        "address": registration.address if registration else None,
        "image": image_url,
    }

    return patient_data

class AdminPatientListView(APIView):
    """Admin API to view all registered patients."""

    def get(self, request):
        patients = CustomUser.objects.filter(
            user_type=UserType.PATIENT,
            is_staff=False,
            is_superuser=False,
        )

        patients = patients.select_related("registration").order_by("-id")

        patient_list = []

        for patient in patients:
            patient_data = _serialize_patient(patient, request=request)
            patient_list.append(patient_data)

        return Response(
            patient_list,
            status=status.HTTP_200_OK
        )


class AdminPatientDetailView(APIView):
    """Admin API to view and delete a single patient."""

    def get(self, request, patient_id):

        patient = get_object_or_404(
            CustomUser.objects.select_related("registration").filter(
                user_type=UserType.PATIENT,
                is_staff=False,
                is_superuser=False,
            ),
            id=patient_id,
        )

        patient_data = _serialize_patient(patient, request=request)

        return Response(
            patient_data,
            status=status.HTTP_200_OK
        )

    def delete(self, request, patient_id):

        patient = get_object_or_404(
            
            CustomUser.objects.filter(
                user_type=UserType.PATIENT,
                is_staff=False,
                is_superuser=False,
            ),
            id=patient_id,
        )

        patient.delete()

        return Response({"message": "Patient deleted successfully"}, status=status.HTTP_200_OK)


def _serialize_doctor(user, request=None):
    """Convert doctor user object to API response dictionary."""
    
    profile = getattr(user, "doctor_profile", None)

    department = None
    if profile and profile.department:
        department = profile.department.name
 
    image_url = None

    if profile and profile.image:
        image_url = profile.image.url

        if request:
            image_url = request.build_absolute_uri(image_url)

    doctor_data = {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": profile.phone_number if profile else None,
        "place": getattr(profile, "place", None) if profile else None,
        "image": image_url,
        "department": department,
        "approval_status": (
            profile.approval_status if profile else DoctorProfile.STATUS_PENDING
        ),
    }

    return doctor_data


class AdminDoctorListView(APIView):
    """Admin API to list all doctors."""

    def get(self, request):

        doctors = CustomUser.objects.filter(
            user_type=UserType.DOCTOR,
            is_staff=False,
            is_superuser=False,
        )

        doctors = doctors.select_related(
            "doctor_profile",
            "doctor_profile__department"
        )

        doctors = doctors.order_by("-id")

        data = []
        for doctor in doctors:
            doctor_data = _serialize_doctor(doctor, request=request)
            data.append(doctor_data)                                                                            

        return Response(data, status=status.HTTP_200_OK)

class AdminDoctorDetailView(APIView):
    """Admin API to delete doctor account."""
        
    def delete(self, request, doctor_id):

        doctors = CustomUser.objects.filter(
            user_type=UserType.DOCTOR,
            is_staff=False,
            is_superuser=False
        )

        doctor = get_object_or_404(doctors, id=doctor_id)

        doctor.delete()
        return Response({"message": "Doctor deleted successfully"}, status=status.HTTP_200_OK)


class AdminDoctorResetPasswordView(APIView):
    def post(self, request, doctor_id):
        doctor = get_object_or_404(
            CustomUser.objects.select_related("doctor_profile").filter(
                user_type=UserType.DOCTOR,
                is_staff=False,
                is_superuser=False,
            ),
            id=doctor_id,
        )
        profile = getattr(doctor, "doctor_profile", None)
        if not profile:
            return Response({"error": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        temporary_password = get_random_string(10)
        doctor.set_password(temporary_password)
        try:
            with transaction.atomic():
                doctor.save(update_fields=["password"])
                send_mail(
                    subject="Doctor Account Password Reset",
                    message=(
                        f"Hello Dr. {doctor.get_full_name() or doctor.username},\n\n"
                        "Your login password has been reset by admin.\n"
                        f"Temporary password: {temporary_password}\n\n"
                        "Please login and change your password."
                    ),
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER),
                    recipient_list=[doctor.email],
                    fail_silently=False,
                )
        except Exception as exc:
            return Response(
                {"error": f"Failed to reset doctor password. {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = {"message": "Doctor password reset email sent successfully."}
        if settings.DEBUG:
            data["temporary_password"] = temporary_password
        return Response(data, status=status.HTTP_200_OK)


class AdminDoctorStatusView(APIView):
    def patch(self, request, doctor_id):

        action = str(request.data.get("action", "")).strip().lower()

        if action not in ["approve", "reject"]:
            return Response(
                {"error": "Invalid action. Use 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doctor = get_object_or_404(
            CustomUser.objects.select_related("doctor_profile").filter(
                user_type=UserType.DOCTOR,
                is_staff=False,
                is_superuser=False,
            ),
            id=doctor_id,
        )

        profile = getattr(doctor, "doctor_profile", None)

        if not profile:
            return Response(
                {"error": "Doctor profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if profile.approval_status != DoctorProfile.STATUS_PENDING:
            return Response(
                {"error": f"Doctor already {profile.approval_status.lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doctor_name = doctor.get_full_name().strip() or doctor.username
        temporary_password = None

        if action == "approve":
            temporary_password = _generate_strong_password(10)
            login_url = getattr(settings, "FRONTEND_LOGIN_URL", "http://127.0.0.1:5173/login")
            mail_subject = "Doctor Account Approved"
            mail_message = (
                f"Hello Dr. {doctor_name},\n\n"
                "Your doctor account has been approved by admin.\n"
                f"Temporary password: {temporary_password}\n"
                f"Login Link: {login_url}\n\n"
                "Please login and change your password."
            )
        else:
            mail_subject = "Doctor Account Rejected"
            mail_message = (
                f"Hello Dr. {doctor_name},\n\n"
                "Your doctor account request was rejected by admin.\n"
                "Please contact hospital administration for details."
            )

        with transaction.atomic():

            if action == "approve":
                profile.approval_status = DoctorProfile.STATUS_APPROVED
                doctor.is_active = True
                doctor.status = 1
                doctor.set_password(temporary_password)

            if action == "reject":
                profile.approval_status = DoctorProfile.STATUS_REJECTED
                doctor.is_active = False
                doctor.status = 0

            profile.save()
            doctor.save()

        email_error = None
        try:
            send_mail(
                subject=mail_subject,
                message=mail_message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER),
                recipient_list=[doctor.email],
                fail_silently=False,
            )
        except Exception as exc:
            email_error = str(exc)

        response_data = {"message": f"Doctor {profile.approval_status.lower()} successfully"}
        if email_error:
            response_data["message"] += ", but email could not be sent."
            response_data["email_error"] = email_error
        else:
            response_data["message"] += ". Email sent successfully."

        return Response(
            response_data,
            status=status.HTTP_200_OK,
        )
                                
class AdminBookingListView(APIView):
    """Admin API to list bookings with optional status filters."""

    def get(self, request):

        
        status_value = request.query_params.get("status", "")
        status_value = str(status_value).strip()
        consulted_status_value = request.query_params.get("consulted_status", "")
        consulted_status_value = str(consulted_status_value).strip()

        bookings = Appointment.objects.select_related(
            "patient",
            "patient__registration",
            "doctor",
            "department",
        ).order_by("-appointment_date")

        if status_value:
            bookings = bookings.filter(status__iexact=status_value)
                                                                                                     
        if consulted_status_value:
            bookings = bookings.filter(consulted_status__iexact=consulted_status_value)
                                                                                                     
        serializer = AppointmentSerializer(bookings, many=True)
        data = serializer.data

        return Response(data, status=status.HTTP_200_OK)


class AdminBookingStatusView(APIView):
    """Admin action endpoint to approve/reject appointment."""
    
    def patch(self, request, booking_id):

        action = request.data.get("action", "")
        action = str(action).strip().lower()

        booking = get_object_or_404(
            Appointment.objects.select_related(
                "doctor",
                "patient",
                "patient__registration",
                "department",
            ),
            id=booking_id,
        )

        if action == "approve":
            booking.status = "Approved"

        elif action == "reject":
            booking.status = "Rejected"

        else:
            return Response(
                {"error": "Invalid action. Use 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.save(update_fields=["status", "updated_at"])

        patient_name = booking.patient.get_full_name().strip() or booking.patient.username
        doctor_name = booking.doctor.get_full_name().strip() or booking.doctor.username
        appointment_local = timezone.localtime(booking.appointment_date)
        appointment_text = appointment_local.strftime("%d %b %Y, %I:%M %p")
        department_name = booking.department.name if booking.department else "-"

        patient_id = None
        registration = getattr(booking.patient, "registration", None)
        if registration:
            patient_id = registration.patient_id

        if action == "approve":
            email_subject = "Appointment Approved"
            email_body = (
                f"Hello {patient_name},\n\n"
                "Your appointment request has been approved.\n"
                f"Appointment ID: {booking.id}\n"
                f"Patient ID: {patient_id or '-'}\n"
                f"Doctor: Dr. {doctor_name}\n"
                f"Department: {department_name}\n"
                f"Date & Time: {appointment_text}\n"
                f"Status: {booking.status}\n"
            )
        else:
            email_subject = "Appointment Rejected"
            email_body = (
                f"Hello {patient_name},\n\n"
                "Your appointment request has been rejected.\n"
                f"Appointment ID: {booking.id}\n"
                f"Patient ID: {patient_id or '-'}\n"
                f"Doctor: Dr. {doctor_name}\n"
                f"Department: {department_name}\n"
                f"Date & Time: {appointment_text}\n"
                f"Status: {booking.status}\n\n"
                "Please book another slot."
            )

        email_error = None
        try:
            send_mail(
                subject=email_subject,
                message=email_body,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER),
                recipient_list=[booking.patient.email],
                fail_silently=False,
            )
        except Exception as exc:
            email_error = str(exc)

        response_data = {"message": f"Booking {booking.status.lower()} successfully"}
        if email_error:
            response_data["message"] += " But email could not be sent."
            response_data["email_error"] = email_error
        else:
            response_data["message"] += " Email sent successfully."

        return Response(
            response_data,
            status=status.HTTP_200_OK,
        )
    

@api_view(['POST'])
@authentication_classes([TokenOrBearerAuthentication])
@permission_classes([IsAdminRole])
def admin_add_doctor(request):
    serializer = AdminAddDoctorSerializer(data=request.data)
    if not serializer.is_valid():
        # Return exact validation errors (gmail format, 10-digit phone, already-registered, etc.)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    email_error = getattr(serializer, "email_error", None)

    payload = {"message": "Doctor added successfully. Password sent to email."}

    if email_error:
        payload["message"] = (
            "Doctor added, but credentials email was not sent. "
            "Please check backend email configuration."
        )
        payload["email_error"] = email_error
        payload["email_hint"] = (
            "Set EMAIL_HOST_PASSWORD (Gmail app password) or "
            "create backend/hospital_backend/email_app_password.txt"
        )
        payload["email_sent"] = False

        if getattr(settings, "DEBUG", False):
            payload["temporary_password"] = getattr(serializer, "generated_password", None)

        return Response(payload, status=status.HTTP_201_CREATED)

    payload["email_sent"] = True
    return Response(payload, status=status.HTTP_201_CREATED)


#  Add Patient API
@api_view(['POST'])
@authentication_classes([TokenOrBearerAuthentication])
@permission_classes([IsAdminRole])
def add_patient(request):
    
    # Step 1: വരുന്ന data serializer-ലേക്ക് pass ചെയ്യുന്നു
    serializer = UserRegistrationSerializer(data=request.data)

    # Step 2: data valid ആണോ check ചെയ്യുന്നു
    if serializer.is_valid():
        
        # Step 3: data save ചെയ്യുന്നു (DB-ൽ)
        serializer.save()

        # Step 4: optional values എടുക്കുന്നു
        patient_id = getattr(serializer, "generated_patient_id", None)
        email_error = getattr(serializer, "email_error", None)

        # Step 5: default response
        response_data = {
            "message": "Patient added successfully. Patient ID and password sent to email."
        }

        # patient_id ഉണ്ടെങ്കിൽ add ചെയ്യുന്നു
        if patient_id:
            response_data["patient_id"] = patient_id

        #  Email send fail ആയാൽ
        if email_error:
            response_data["message"] = (
                "Patient added, but email sending failed. Check email configuration."
            )
            response_data["email_error"] = email_error
            response_data["email_hint"] = (
                "Set EMAIL_HOST_PASSWORD or configure email properly"
            )
            response_data["email_sent"] = False

            # Debug mode-ൽ password കാണിക്കും (production-ൽ avoid ചെയ്യണം)
            if getattr(settings, "DEBUG", False):
                response_data["temporary_password"] = getattr(
                    serializer, "generated_password", None
                )

            return Response(response_data, status=status.HTTP_201_CREATED)

        #  Email success
        response_data["email_sent"] = True
        return Response(response_data, status=status.HTTP_201_CREATED)

    #  Validation error
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#  Patient Login API
@api_view(['POST'])
def patient_login(request):
    
    # Step 1: request-ിൽ നിന്ന് email & password എടുക്കുന്നു
    email = request.data.get("email")
    password = request.data.get("password")

    # Step 2: user authenticate ചെയ്യുന്നു
    user = authenticate(username=email, password=password)

    # Step 3: valid user ആണെങ്കിൽ token create/get ചെയ്യുന്നു
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key})

    #  Invalid login
    return Response({"error": "Invalid credentials"}, status=401)

