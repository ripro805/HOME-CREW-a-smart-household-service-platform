from djoser.email import ActivationEmail, PasswordResetEmail
from django.conf import settings


def _frontend_context(context):
    """Override domain/protocol/site_name with frontend values from settings."""
    djoser_conf = settings.DJOSER
    context['domain']    = djoser_conf.get('DOMAIN', 'localhost:5173')
    context['protocol']  = djoser_conf.get('PROTOCOL', 'http')
    context['site_name'] = djoser_conf.get('SITE_NAME', 'HomeCrew')
    return context


class FrontendActivationEmail(ActivationEmail):
    def get_context_data(self):
        context = super().get_context_data()
        return _frontend_context(context)


class FrontendPasswordResetEmail(PasswordResetEmail):
    def get_context_data(self):
        context = super().get_context_data()
        return _frontend_context(context)
