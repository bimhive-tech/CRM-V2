from django.urls import path

from apps.conversations.views import ConversationDetailView, ConversationListCreateView, ConversationMessageListCreateView, ConversationOptionsView


urlpatterns = [
    path("", ConversationListCreateView.as_view(), name="conversation-list"),
    path("options/", ConversationOptionsView.as_view(), name="conversation-options"),
    path("<int:pk>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path("<int:conversation_pk>/messages/", ConversationMessageListCreateView.as_view(), name="conversation-messages"),
]
