"""Application routes.

This file intentionally keeps URL definitions flat and explicit so beginners can
quickly scan all available API endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AddDepartmentView,
    AdminBookingListView,
    AdminBookingStatusView,
    AdminDoctorDetailView,
    AdminDoctorListView,
    AdminDoctorResetPasswordView,
    AdminDoctorStatusView,
    AdminPatientDetailView,
    AdminPatientListView,
    AppointmentViewSet,
    CustomUserViewSet,
    DepartmentDoctorsView,
    DepartmentViewSet,
    DoctorAppointmentConsultStatusView,
    DoctorAvailabilityView,
    DoctorChangePasswordView,
    DoctorForgotPasswordRequestView,
    DoctorForgotPasswordResetView,
    DoctorLoginView,
    DoctorNotificationsView,
    DoctorProfileView,
    DoctorSignupView,
    PatientAppointmentCancelView,
    PatientAppointmentsView,
    PatientBookingProfileView,
    PatientChangePasswordView,
    PatientEmailCheckView,
    PatientForgotPasswordRequestView,
    PatientForgotPasswordResetView,
    PatientLoginView,
    PatientProfileView,
    PatientSignupView,
    RegistrationViewSet,
    add_patient,
    admin_add_doctor,
    admin_dashboard_api,
    test_api,
)

router = DefaultRouter()
router.register('users', CustomUserViewSet, basename='users')
router.register('registrations', RegistrationViewSet, basename='registrations')
router.register('departments', DepartmentViewSet, basename='departments')
router.register('appointments', AppointmentViewSet, basename='appointments')

urlpatterns = [
    # Health / utility
    path('test/', test_api),
    path('admin-dashboard/', admin_dashboard_api, name='admin-dashboard'),
    path('add-department/', AddDepartmentView.as_view(), name='add-department'),

    # Patient APIs
    path('patient-signup/', PatientSignupView.as_view(), name='patient-signup'),
    path('patient-email-check/', PatientEmailCheckView.as_view(), name='patient-email-check'),
    path('patient-login/', PatientLoginView.as_view(), name='patient-login'),
    path('patient-booking-profile/', PatientBookingProfileView.as_view(), name='patient-booking-profile'),
    path('patient-appointments/', PatientAppointmentsView.as_view(), name='patient-appointments'),
    path('patient-appointments/<int:booking_id>/cancel/', PatientAppointmentCancelView.as_view(), name='patient-appointment-cancel'),
    path('patient-profile/', PatientProfileView.as_view(), name='patient-profile'),
    path('patient-change-password/', PatientChangePasswordView.as_view(), name='patient-change-password'),
    path('patient-forgot-password/request-otp/', PatientForgotPasswordRequestView.as_view(), name='patient-forgot-password-request'),
    path('patient-forgot-password/reset/', PatientForgotPasswordResetView.as_view(), name='patient-forgot-password-reset'),

    # Doctor APIs
    path('doctor-signup/', DoctorSignupView.as_view(), name='doctor-signup'),
    path('doctor-login/', DoctorLoginView.as_view(), name='doctor-login'),
    path('doctor-profile/', DoctorProfileView.as_view(), name='doctor-profile'),
    path('doctor-notifications/', DoctorNotificationsView.as_view(), name='doctor-notifications'),
    path('doctor-availability/', DoctorAvailabilityView.as_view(), name='doctor-availability'),
    path('doctor-change-password/', DoctorChangePasswordView.as_view(), name='doctor-change-password'),
    path('doctor-forgot-password/request-otp/', DoctorForgotPasswordRequestView.as_view(), name='doctor-forgot-password-request'),
    path('doctor-forgot-password/reset/', DoctorForgotPasswordResetView.as_view(), name='doctor-forgot-password-reset'),
    path('doctor-appointments/<int:appointment_id>/consult-status/', DoctorAppointmentConsultStatusView.as_view(), name='doctor-appointment-consult-status'),

    path('department-doctors/', DepartmentDoctorsView.as_view(), name='department-doctors'),

    # Admin APIs
    path('admin-patients/', AdminPatientListView.as_view(), name='admin-patients'),
    path('admin-patients/<int:patient_id>/', AdminPatientDetailView.as_view(), name='admin-patient-detail'),
    path('admin-doctors/', AdminDoctorListView.as_view(), name='admin-doctors'),
    path('admin-doctors/<int:doctor_id>/', AdminDoctorDetailView.as_view(), name='admin-doctor-detail'),
    path('admin-doctors/<int:doctor_id>/reset-password/', AdminDoctorResetPasswordView.as_view(), name='admin-doctor-reset-password'),
    path('admin-doctors/<int:doctor_id>/status/', AdminDoctorStatusView.as_view(), name='admin-doctor-status'),
    path('admin-bookings/', AdminBookingListView.as_view(), name='admin-bookings'),
    path('admin-bookings/<int:booking_id>/status/', AdminBookingStatusView.as_view(), name='admin-booking-status'),

    path('admin/add-patient/', add_patient),
    path('admin/add-doctor/', admin_add_doctor),

    # DRF router URLs
    path('', include(router.urls)),
]
