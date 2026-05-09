from rest_framework.authentication import TokenAuthentication, get_authorization_header


class TokenOrBearerAuthentication(TokenAuthentication):
    """
    Accept both:
    - Authorization: Token <key>   (DRF default)
    - Authorization: Bearer <key>  (common in SPAs)
    """

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth:
            return None

        keyword = auth[0].decode().lower()
        if keyword in {"token", "bearer"}:
            if len(auth) == 1:
                return None
            if len(auth) > 2:
                return None
            try:
                token = auth[1].decode()
            except UnicodeError:
                return None
            if token.strip().lower() in {"null", "undefined", ""}:
                return None
            return self.authenticate_credentials(token)

        return None
