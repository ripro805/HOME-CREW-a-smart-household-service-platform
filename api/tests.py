from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@homecrew.com',
    ADMIN_CONTACT_EMAIL='admin@homecrew.com',
)
class ContactMessageApiTests(APITestCase):
    def test_contact_message_sends_email_to_admin(self):
        payload = {
            'first_name': 'Rifat',
            'last_name': 'Hasan',
            'phone': '+8801700000000',
            'email': 'customer@example.com',
            'message': 'I need deep cleaning and AC servicing this weekend.',
        }

        response = self.client.post('/api/v1/contact/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['admin@homecrew.com'])
        self.assertEqual(mail.outbox[0].reply_to, ['customer@example.com'])
        self.assertIn('Rifat Hasan', mail.outbox[0].subject)

    def test_contact_message_rejects_invalid_payload(self):
        payload = {
            'first_name': 'Rifat',
            'last_name': '',
            'phone': '12',
            'email': 'bad-email',
            'message': 'short',
        }

        response = self.client.post('/api/v1/contact/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('last_name', response.data)
        self.assertIn('phone', response.data)
        self.assertIn('email', response.data)
        self.assertIn('message', response.data)
