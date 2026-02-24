from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("assets", "0014_add_data_retention_days"),
    ]

    operations = [
        migrations.DeleteModel(
            name="PriceSnapshot",
        ),
    ]
