from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import Role, User, UserRole
from apps.companies.models import Company
from apps.companies.storage import signed_logo_url


class CompanySummarySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    def get_logo_url(self, obj):
        return signed_logo_url(obj.logo_key)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "slug",
            "owner_name",
            "email",
            "phone_number",
            "phone_numbers",
            "website",
            "address",
            "address_country",
            "address_state",
            "address_line",
            "employee_count",
            "logo_url",
            "is_active",
        ]


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "slug", "description", "is_system", "created_at"]
        read_only_fields = ["id", "slug", "created_at", "is_system"]


class RoleSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "slug", "is_system"]


class UserSerializer(serializers.ModelSerializer):
    company = CompanySummarySerializer(read_only=True)
    companies = CompanySummarySerializer(many=True, read_only=True)
    roles = RoleSummarySerializer(many=True, read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )
    company_ids = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Company.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    role_ids = serializers.PrimaryKeyRelatedField(
        source="roles",
        queryset=Role.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    is_platform_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "company",
            "company_id",
            "companies",
            "company_ids",
            "roles",
            "role_ids",
            "is_platform_admin",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
        allow_null=True,
        required=False,
    )
    company_ids = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Company.objects.all(),
        many=True,
        required=False,
    )
    role_ids = serializers.PrimaryKeyRelatedField(
        source="roles",
        queryset=Role.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "password",
            "role",
            "company_id",
            "company_ids",
            "role_ids",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_role(self, value):
        if value not in UserRole.values:
            raise serializers.ValidationError("Invalid role.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        companies = validated_data.pop("companies", [])
        roles = validated_data.pop("roles", [])
        user = User.objects.create_user(password=password, **validated_data)
        if companies:
            user.companies.set(companies)
        elif user.company_id:
            user.companies.set([user.company])
        if roles:
            user.roles.set(roles)
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=False)
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
        allow_null=True,
        required=False,
    )
    company_ids = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Company.objects.all(),
        many=True,
        required=False,
    )
    role_ids = serializers.PrimaryKeyRelatedField(
        source="roles",
        queryset=Role.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "password",
            "role",
            "company_id",
            "company_ids",
            "role_ids",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_role(self, value):
        if value not in UserRole.values:
            raise serializers.ValidationError("Invalid role.")
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        companies = validated_data.pop("companies", None)
        roles = validated_data.pop("roles", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)

        if password:
            instance.set_password(password)

        instance.save()
        if companies is not None:
            instance.companies.set(companies)
        elif instance.company_id:
            instance.companies.set([instance.company])
        if roles is not None:
            instance.roles.set(roles)
        return instance


class AdminRoleCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description"]
        read_only_fields = ["id"]


class CRMTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    def validate(self, attrs):
        credentials = {
            "email": attrs.get("email"),
            "password": attrs.get("password"),
        }
        user = authenticate(**credentials)
        if not user:
            raise serializers.ValidationError({"detail": "Invalid email or password."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account is inactive."})

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }
