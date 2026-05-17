from apps.accounts.models import User


def user_queryset():
    return User.objects.select_related("company").prefetch_related("companies", "roles").all()
