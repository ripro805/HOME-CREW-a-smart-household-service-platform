from djoser import email


class ActivationEmail(email.ActivationEmail):
    """Custom activation email that uses DOMAIN setting instead of request host"""
    
    def get_context_data(self):
        context = super().get_context_data()
        # Override the domain and protocol from DJOSER settings
        context['domain'] = self.context.get('domain')
        context['protocol'] = self.context.get('protocol', 'http')
        return context


