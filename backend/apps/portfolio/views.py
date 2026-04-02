from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.cache import NS_PORTFOLIO, get_user_cache, set_user_cache

from .services import calculate_portfolio_full


class PortfolioView(APIView):
    def get(self, request):
        cached = get_user_cache(request.user.pk, NS_PORTFOLIO)
        if cached is not None:
            return Response(cached)

        data = calculate_portfolio_full(request.user)
        set_user_cache(request.user.pk, NS_PORTFOLIO, data, timeout=60)
        return Response(data)
