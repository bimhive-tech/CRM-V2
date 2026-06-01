"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import {
  createConversation,
  deleteConversation,
  listConversationMessages,
  listConversationOptions,
  listConversations,
  sendConversationMessage,
  updateConversation,
} from "@/lib/api/admin";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";

import styles from "./page.module.css";

function getConversationLabel(conversation, currentUserId) {
  if (conversation.name) {
    return conversation.name;
  }
  return (conversation.participants || [])
    .filter((participant) => participant.id !== currentUserId)
    .map((participant) => participant.full_name)
    .join(", ");
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function ConversationModal({ title, form, users, onChange, onToggleUser, onSubmit, onClose, saving }) {
  return (
    <div className={styles.modalBackdrop}>
      <form className={styles.modal} onSubmit={onSubmit}>
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>Conversation</p>
            <h2>{title}</h2>
          </div>
          <button className={styles.ghostButton} type="button" onClick={onClose}>Close</button>
        </div>
        <label className={styles.field}>
          <span>Type</span>
          <select name="is_group" value={form.is_group ? "group" : "direct"} onChange={onChange}>
            <option value="direct">One on one</option>
            <option value="group">Group chat</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Chat name</span>
          <input name="name" value={form.name} onChange={onChange} placeholder="BIM Coordination Team" />
        </label>
        <div className={styles.field}>
          <span>Participants</span>
          <div className={styles.userGrid}>
            {users.map((user) => (
              <label key={user.id} className={styles.userChip}>
                <input
                  type="checkbox"
                  checked={form.participant_ids.includes(String(user.id))}
                  onChange={() => onToggleUser(String(user.id))}
                />
                <span>{user.full_name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? "Saving..." : "Save conversation"}</button>
        </div>
      </form>
    </div>
  );
}

export default function ConversationPage() {
  const authState = useAuthenticatedUser();
  const token = getAccessToken();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [composer, setComposer] = useState("");
  const [modalState, setModalState] = useState({ open: false, mode: "create" });
  const [form, setForm] = useState({ name: "", is_group: false, participant_ids: [] });
  const [state, setState] = useState({ loading: true, saving: false, error: "" });

  const canCreate = Boolean(authState.user?.is_platform_admin || authState.user?.permissions?.includes("conversations.create"));
  const canEdit = Boolean(authState.user?.is_platform_admin || authState.user?.permissions?.includes("conversations.update"));
  const canDelete = Boolean(authState.user?.is_platform_admin || authState.user?.permissions?.includes("conversations.delete"));

  useEffect(() => {
    if (!authState.user) {
      return;
    }

    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.all([listConversations(token), listConversationOptions(token)])
      .then(([nextConversations, nextOptions]) => {
        if (!active) {
          return;
        }
        setConversations(nextConversations);
        setOptions(nextOptions.users || []);
        setSelectedConversationId((current) => current || String(nextConversations[0]?.id || ""));
        setState({ loading: false, saving: false, error: "" });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setState({ loading: false, saving: false, error: error.message || "Unable to load conversations." });
      });

    return () => {
      active = false;
    };
  }, [authState.user, token]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    let active = true;
    listConversationMessages(token, selectedConversationId)
      .then((nextMessages) => {
        if (!active) {
          return;
        }
        setMessages(nextMessages);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setState((current) => ({ ...current, error: error.message || "Unable to load messages." }));
      });

    return () => {
      active = false;
    };
  }, [selectedConversationId, token]);

  if (authState.loading) {
    return null;
  }

  if (!authState.user) {
    return null;
  }

  const selectedConversation = conversations.find((item) => String(item.id) === selectedConversationId) || null;

  function openCreateModal() {
    setForm({ name: "", is_group: false, participant_ids: [] });
    setModalState({ open: true, mode: "create" });
  }

  function openEditModal() {
    if (!selectedConversation) {
      return;
    }
    setForm({
      name: selectedConversation.name || "",
      is_group: Boolean(selectedConversation.is_group),
      participant_ids: (selectedConversation.participants || []).map((participant) => String(participant.id)),
    });
    setModalState({ open: true, mode: "edit" });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "is_group" ? value === "group" : value,
    }));
  }

  function toggleUser(userId) {
    setForm((current) => ({
      ...current,
      participant_ids: current.participant_ids.includes(userId)
        ? current.participant_ids.filter((item) => item !== userId)
        : [...current.participant_ids, userId],
    }));
  }

  async function refreshConversations(preferredId = "") {
    const nextConversations = await listConversations(token);
    setConversations(nextConversations);
    setSelectedConversationId(preferredId || String(nextConversations[0]?.id || ""));
  }

  async function handleConversationSubmit(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "" }));

    try {
      if (modalState.mode === "create") {
        const created = await createConversation(token, form);
        await refreshConversations(String(created.id));
      } else if (selectedConversation) {
        await updateConversation(token, selectedConversation.id, form);
        await refreshConversations(String(selectedConversation.id));
      }
      setModalState({ open: false, mode: "create" });
      setState({ loading: false, saving: false, error: "" });
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || "Unable to save conversation." }));
    }
  }

  async function handleDeleteConversation() {
    if (!selectedConversation) {
      return;
    }
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      await deleteConversation(token, selectedConversation.id);
      await refreshConversations("");
      setMessages([]);
      setState({ loading: false, saving: false, error: "" });
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || "Unable to delete conversation." }));
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!selectedConversation || !composer.trim()) {
      return;
    }
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      await sendConversationMessage(token, selectedConversation.id, { body: composer.trim() });
      const [nextMessages, nextConversations] = await Promise.all([
        listConversationMessages(token, selectedConversation.id),
        listConversations(token),
      ]);
      setMessages(nextMessages);
      setConversations(nextConversations);
      setComposer("");
      setState({ loading: false, saving: false, error: "" });
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || "Unable to send the message." }));
    }
  }

  return (
    <DashboardShell
      sidebar={<Sidebar user={authState.user} />}
      topbar={<Topbar user={authState.user} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Conversation" }]} />}
    >
      <div className={styles.layout}>
        <section className={styles.sidebarPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Conversation</p>
              <h1>Chats</h1>
            </div>
            {canCreate ? (
              <button className={styles.primaryButton} type="button" onClick={openCreateModal}>New chat</button>
            ) : null}
          </div>

          {state.error ? <p className={styles.error}>{state.error}</p> : null}

          <div className={styles.conversationList}>
            {state.loading ? (
              <div className={styles.emptyState}>Loading conversations...</div>
            ) : conversations.length ? (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`${styles.conversationItem} ${String(conversation.id) === selectedConversationId ? styles.conversationItemActive : ""}`}
                  type="button"
                  onClick={() => setSelectedConversationId(String(conversation.id))}
                >
                  <strong>{getConversationLabel(conversation, authState.user.id) || "Untitled chat"}</strong>
                  <span>{conversation.latest_message?.body || "No messages yet."}</span>
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>You only see chats you are part of. Create one to get started.</div>
            )}
          </div>
        </section>

        <section className={styles.chatPanel}>
          {selectedConversation ? (
            <>
              <div className={styles.chatHeader}>
                <div>
                  <p className={styles.eyebrow}>Active chat</p>
                  <h2>{getConversationLabel(selectedConversation, authState.user.id) || "Untitled chat"}</h2>
                  <p className={styles.participants}>
                    {(selectedConversation.participants || []).map((participant) => participant.full_name).join(", ")}
                  </p>
                </div>
                <div className={styles.headerActions}>
                  {canEdit ? <button className={styles.ghostButton} type="button" onClick={openEditModal}>Edit</button> : null}
                  {canDelete ? <button className={styles.dangerButton} type="button" onClick={handleDeleteConversation}>Delete</button> : null}
                </div>
              </div>

              <div className={styles.messages}>
                {messages.length ? (
                  messages.map((message) => (
                    <article key={message.id} className={`${styles.message} ${message.sender?.id === authState.user.id ? styles.messageOwn : ""}`}>
                      <div className={styles.messageMeta}>
                        <strong>{message.sender?.full_name || "Unknown user"}</strong>
                        <span>{formatTimestamp(message.created_at)}</span>
                      </div>
                      <p>{message.body}</p>
                    </article>
                  ))
                ) : (
                  <div className={styles.emptyState}>No messages yet in this conversation.</div>
                )}
              </div>

              <form className={styles.composer} onSubmit={handleSendMessage}>
                <textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  placeholder="Write a message..."
                  rows={3}
                />
                <button className={styles.primaryButton} type="submit" disabled={state.saving || !composer.trim()}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className={styles.emptyChat}>
              Select a chat you can access, or create a new one if you have permission.
            </div>
          )}
        </section>
      </div>

      {modalState.open ? (
        <ConversationModal
          title={modalState.mode === "create" ? "Create conversation" : "Edit conversation"}
          form={form}
          users={options}
          onChange={handleFormChange}
          onToggleUser={toggleUser}
          onSubmit={handleConversationSubmit}
          onClose={() => setModalState({ open: false, mode: "create" })}
          saving={state.saving}
        />
      ) : null}
    </DashboardShell>
  );
}
