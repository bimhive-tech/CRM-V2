from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_platform_admin)


class CanAccessSettings(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.can_access_settings)


class HasAppPermission(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user
        permission_code = getattr(view, "permission_required", None)
        permission_map = getattr(view, "permission_map", {})
        permission_code = permission_code or permission_map.get(request.method)

        if not permission_code:
            return bool(user and user.is_authenticated)

        return bool(user and user.is_authenticated and user.has_app_permission(permission_code))
