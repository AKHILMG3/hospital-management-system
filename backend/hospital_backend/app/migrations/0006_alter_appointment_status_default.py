from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0005_doctorprofile"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appointment",
            name="status",
            field=models.CharField(default="Pending", max_length=20),
        ),
    ]
