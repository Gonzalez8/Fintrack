from apps.core.cache import invalidate_user_cache, FINANCIAL_NAMESPACES


class OwnedByUserMixin:
    """
    ViewSet mixin that automatically filters querysets to the authenticated user
    and injects owner on creation. Must be listed BEFORE ModelViewSet in MRO.

    Automatically invalidates financial caches on create/update/delete.
    """

    # Subclasses can set this to False to skip cache invalidation
    invalidates_financial_cache = True

    def get_queryset(self):
        return super().get_queryset().filter(owner=self.request.user)

    def _invalidate(self):
        if self.invalidates_financial_cache:
            invalidate_user_cache(self.request.user.pk, *FINANCIAL_NAMESPACES)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
        self._invalidate()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._invalidate()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        self._invalidate()
