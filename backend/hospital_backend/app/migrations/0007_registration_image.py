from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0006_alter_appointment_status_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="registration",
            name="image",
            field=models.ImageField(blank=True, null=True, upload_to="patients/"),
        ),
    ]
