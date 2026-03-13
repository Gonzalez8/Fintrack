from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0001_initial"),
    ]

    operations = [
        # 1. Add new date fields (nullable initially for existing rows)
        migrations.AddField(
            model_name="interest",
            name="date_start",
            field=models.DateField(null=True),
        ),
        migrations.AddField(
            model_name="interest",
            name="date_end",
            field=models.DateField(null=True),
        ),
        # 2. Copy existing date → date_start and date_end
        migrations.RunSQL(
            sql="UPDATE transactions_interest SET date_start = date, date_end = date;",
            reverse_sql="UPDATE transactions_interest SET date = date_start;",
        ),
        # 3. Make date_start and date_end non-nullable
        migrations.AlterField(
            model_name="interest",
            name="date_start",
            field=models.DateField(),
        ),
        migrations.AlterField(
            model_name="interest",
            name="date_end",
            field=models.DateField(),
        ),
        # 4. Remove old date and annual_rate columns
        migrations.RemoveField(
            model_name="interest",
            name="date",
        ),
        migrations.RemoveField(
            model_name="interest",
            name="annual_rate",
        ),
        # 5. Update ordering
        migrations.AlterModelOptions(
            name="interest",
            options={"ordering": ["-date_end", "-created_at"]},
        ),
    ]
