from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0016_doctorprofile_place"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="consulted_status_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
