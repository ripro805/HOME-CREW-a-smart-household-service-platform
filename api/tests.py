from django.core import mail
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import SupportConversation, SupportMessage


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


class SupportConversationApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.client_user = user_model.objects.create_user(
            email="client@example.com",
            password="secret123",
            first_name="Client",
            last_name="User",
            role="client",
        )
        self.admin_user = user_model.objects.create_user(
            email="admin@example.com",
            password="secret123",
            first_name="Admin",
            last_name="User",
            role="admin",
            is_staff=True,
        )

    def test_client_can_create_chat_and_admin_can_reply(self):
        self.client.force_authenticate(user=self.client_user)
        create_response = self.client.post(
            "/api/v1/support/conversations/",
            {
                "subject": "Need help with booking",
                "message": "Hi, I need help choosing the right cleaning package.",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SupportConversation.objects.count(), 1)
        conversation = SupportConversation.objects.get()
        self.assertEqual(conversation.client, self.client_user)
        self.assertEqual(conversation.messages.count(), 1)

        self.client.force_authenticate(user=self.admin_user)
        admin_list_response = self.client.get("/api/v1/support/conversations/")
        self.assertEqual(admin_list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_list_response.data[0]["unread_count"], 1)

        admin_detail_response = self.client.get(f"/api/v1/support/conversations/{conversation.id}/")
        self.assertEqual(admin_detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_detail_response.data["unread_count"], 0)
        self.assertEqual(len(admin_detail_response.data["messages"]), 1)

        reply_response = self.client.post(
            f"/api/v1/support/conversations/{conversation.id}/messages/",
            {"body": "Thanks for reaching out. I can help with that."},
            format="json",
        )
        self.assertEqual(reply_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SupportMessage.objects.count(), 2)

        self.client.force_authenticate(user=self.client_user)
        client_list_response = self.client.get("/api/v1/support/conversations/")
        self.assertEqual(client_list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(client_list_response.data[0]["unread_count"], 1)

        client_detail_response = self.client.get(f"/api/v1/support/conversations/{conversation.id}/")
        self.assertEqual(client_detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(client_detail_response.data["unread_count"], 0)
        self.assertEqual(len(client_detail_response.data["messages"]), 2)

    def test_admin_can_update_conversation_status(self):
        conversation = SupportConversation.objects.create(
            client=self.client_user,
            subject="Need support",
        )
        SupportMessage.objects.create(
            conversation=conversation,
            sender=self.client_user,
            body="Please help me with an order issue.",
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/v1/support/conversations/{conversation.id}/status/",
            {"status": SupportConversation.STATUS_RESOLVED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        conversation.refresh_from_db()
        self.assertEqual(conversation.status, SupportConversation.STATUS_RESOLVED)
