"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AttachmentIcon,
  CalendarIcon,
  CheckIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/dashboard/dashboard-icons";
import {
  createRecordActivity,
  deleteRecordActivity,
  listRecordActivities,
  updateRecordActivity,
} from "@/lib/api/admin";
import { listAuditLog } from "@/lib/api/activity";
import { getAccessToken } from "@/lib/session";

import styles from "./record-activity-panel.module.css";

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function initialsForName(name) {
  return (
    (name || "User")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(currentMonth, selectedDate, items) {
  const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startWeekday = (start.getDay() + 6) % 7;
  const totalDays = end.getDate();
  const days = [];
  for (let index = 0; index < startWeekday; index += 1) {
    days.push({ key: `blank-${index}`, blank: true });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const iso = toIsoDate(date);
    days.push({
      key: iso,
      value: iso,
      day,
      selected: selectedDate === iso,
      hasItems: items.some((item) => item.activity_date === iso),
    });
  }
  return days;
}

function normalizeActivityPayload(payload, kind, mode = "create") {
  const normalized = {};

  if (kind) {
    normalized.kind = kind;
  }

  if (mode === "create" || Object.prototype.hasOwnProperty.call(payload || {}, "title")) {
    normalized.title = (payload?.title || "").trim();
  }

  if (mode === "create" || Object.prototype.hasOwnProperty.call(payload || {}, "description")) {
    normalized.description = (payload?.description || "").trim();
  }

  if (payload?.activity_date) {
    normalized.activity_date = payload.activity_date;
  }

  if (typeof payload?.is_done === "boolean") {
    normalized.is_done = payload.is_done;
  }

  if (payload?.position !== undefined && payload?.position !== null && payload?.position !== "") {
    normalized.position = payload.position;
  }

  return normalized;
}

function normalizeDateValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}

const emptyDraft = {
  title: "",
  description: "",
  activity_date: "",
};

function labelForKind(kind) {
  return kind === "meeting" ? "Meeting" : kind === "task" ? "Task" : "Note";
}

function labelForAuditEntry(entry) {
  if (entry?.event_type === "attachment") {
    return "Attachment";
  }
  return labelForKind(entry?.metadata?.activity_kind || "note");
}

function ActivityEditor({ kind, draft, onChange, onSubmit, onCancel, saving, submitLabel }) {
  return (
    <form className={styles.editor} onSubmit={onSubmit}>
      <input
        className={styles.input}
        value={draft.title}
        onChange={(event) => onChange("title", event.target.value)}
        placeholder={kind === "task" ? "Task title" : kind === "meeting" ? "Meeting title" : "Note title"}
        required
      />
      {kind === "meeting" ? (
        <input
          className={styles.input}
          type="date"
          value={draft.activity_date}
          onChange={(event) => onChange("activity_date", event.target.value)}
          required
        />
      ) : null}
      <textarea
        className={styles.textarea}
        value={draft.description}
        onChange={(event) => onChange("description", event.target.value)}
        placeholder={kind === "task" ? "Add task details" : kind === "meeting" ? "Agenda, location, or notes" : "Write your note"}
        rows={3}
      />
      <div className={styles.editorActions}>
        <button className={styles.secondaryButton} type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className={styles.primaryButton} type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function NoteList({ items, onCreate, onUpdate, onDelete, saving }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState(emptyDraft);

  return (
    <div className={styles.stack}>
      <div className={styles.sectionHeader}>
        <div>
          <strong>Notes</strong>
          <p>Capture multiple updates, context, and follow-up history.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => setEditingId("new")}>
          <PlusIcon />
          <span>Add note</span>
        </button>
      </div>

      {editingId === "new" ? (
        <ActivityEditor
          kind="note"
          draft={draft}
          saving={saving}
          submitLabel="Save note"
          onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
          onCancel={() => {
            setEditingId(null);
            setDraft(emptyDraft);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            onCreate("note", draft, () => {
              setEditingId(null);
              setDraft(emptyDraft);
            });
          }}
        />
      ) : null}

      {items.length ? (
        <div className={styles.list}>
          {items.map((item) => {
            const isEditing = editingId === item.id;

            return (
              <article key={item.id} className={styles.card}>
                {isEditing ? (
                  <ActivityEditor
                    kind="note"
                    draft={editingDraft}
                    saving={saving}
                    submitLabel="Update note"
                    onChange={(field, value) => setEditingDraft((current) => ({ ...current, [field]: value }))}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(event) => {
                      event.preventDefault();
                      onUpdate(item.id, editingDraft, () => setEditingId(null));
                    }}
                  />
                ) : (
                  <>
                    <div className={styles.cardHeader}>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{formatDate(item.activity_date)}</p>
                      </div>
                      <div className={styles.iconActions}>
                        <button
                          className={styles.iconButton}
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingDraft({
                              title: item.title,
                              description: item.description || "",
                              activity_date: item.activity_date,
                            });
                          }}
                          aria-label="Edit note"
                        >
                          <EditIcon />
                        </button>
                        <button className={`${styles.iconButton} ${styles.dangerIconButton}`} type="button" onClick={() => onDelete(item.id)} aria-label="Delete note">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    {item.description ? <p className={styles.bodyCopy}>{item.description}</p> : null}
                    <div className={styles.metaRow}>
                      <span className={styles.avatar}>{initialsForName(item.created_by?.full_name)}</span>
                      <span>{item.created_by?.full_name || "Unknown user"}</span>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>No notes yet</strong>
          <p>Use notes to capture multiple updates and keep context organized.</p>
        </div>
      )}
    </div>
  );
}

function TaskList({ items, onCreate, onUpdate, onDelete, onReorder, saving }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState(emptyDraft);
  const [draggedId, setDraggedId] = useState(null);

  return (
    <div className={styles.stack}>
      <div className={styles.sectionHeader}>
        <div>
          <strong>Tasks</strong>
          <p>Track follow-ups, mark them done, and drag to reorder priority.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => setEditingId("new")}>
          <PlusIcon />
          <span>Add task</span>
        </button>
      </div>

      {editingId === "new" ? (
        <ActivityEditor
          kind="task"
          draft={draft}
          saving={saving}
          submitLabel="Save task"
          onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
          onCancel={() => {
            setEditingId(null);
            setDraft(emptyDraft);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            onCreate("task", draft, () => {
              setEditingId(null);
              setDraft(emptyDraft);
            });
          }}
        />
      ) : null}

      {items.length ? (
        <div className={styles.list}>
          {items.map((item, index) => (
            <article
              key={item.id}
              className={`${styles.card} ${item.is_done ? styles.cardDone : ""}`}
              draggable
              onDragStart={() => setDraggedId(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedId || draggedId === item.id) {
                  return;
                }
                onReorder(draggedId, item.id);
                setDraggedId(null);
              }}
              onDragEnd={() => setDraggedId(null)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.taskLead}>
                  <button
                    className={`${styles.checkButton} ${item.is_done ? styles.checkButtonDone : ""}`}
                    type="button"
                    onClick={() => onUpdate(item.id, { is_done: !item.is_done })}
                    aria-label={item.is_done ? "Mark task as not done" : "Mark task as done"}
                  >
                    {item.is_done ? <CheckIcon /> : null}
                  </button>
                  <div>
                    <strong>{item.title}</strong>
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                </div>
                <div className={styles.iconActions}>
                  <button
                    className={styles.iconButton}
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingDraft({
                        title: item.title,
                        description: item.description || "",
                        activity_date: item.activity_date,
                      });
                    }}
                    aria-label="Edit task"
                  >
                    <EditIcon />
                  </button>
                  <button className={`${styles.iconButton} ${styles.dangerIconButton}`} type="button" onClick={() => onDelete(item.id)} aria-label="Delete task">
                    <TrashIcon />
                  </button>
                </div>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.orderChip}>#{index + 1}</span>
                <span>{item.is_done ? "Done" : "Open"}</span>
              </div>
              {editingId === item.id ? (
                <ActivityEditor
                  kind="task"
                  draft={editingDraft}
                  saving={saving}
                  submitLabel="Update task"
                  onChange={(field, value) => setEditingDraft((current) => ({ ...current, [field]: value }))}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(event) => {
                    event.preventDefault();
                    onUpdate(item.id, editingDraft, () => setEditingId(null));
                  }}
                />
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>No tasks yet</strong>
          <p>Add tasks here, mark them done with the check, and drag them into the right order.</p>
        </div>
      )}
    </div>
  );
}

function MeetingsCalendar({ items, onCreate, onUpdate, onDelete, saving }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState(emptyDraft);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));

  const days = useMemo(() => buildCalendarDays(currentMonth, selectedDate, items), [currentMonth, items, selectedDate]);
  const selectedItems = useMemo(
    () => items.filter((item) => item.activity_date === selectedDate),
    [items, selectedDate],
  );
  const meetingDraft = useMemo(
    () => ({
      ...draft,
      activity_date: draft.activity_date || selectedDate,
    }),
    [draft, selectedDate],
  );

  return (
    <div className={styles.stack}>
      <div className={styles.sectionHeader}>
        <div>
          <strong>Meetings</strong>
          <p>Pick a day on the calendar and manage meetings or events for that date.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => setEditingId("new")}>
          <PlusIcon />
          <span>Add meeting</span>
        </button>
      </div>

      <div className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <button className={styles.secondaryButton} type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
            Prev
          </button>
          <strong>{monthLabel(currentMonth)}</strong>
          <button className={styles.secondaryButton} type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
            Next
          </button>
        </div>
        <div className={styles.weekdays}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className={styles.calendarGrid}>
          {days.map((day) =>
            day.blank ? (
              <span key={day.key} className={styles.calendarBlank} />
            ) : (
              <button
                key={day.key}
                className={`${styles.dayButton} ${day.selected ? styles.dayButtonSelected : ""}`}
                type="button"
                onClick={() => setSelectedDate(day.value)}
              >
                <span>{day.day}</span>
                {day.hasItems ? <span className={styles.dayDot} /> : null}
              </button>
            ),
          )}
        </div>
      </div>

      {editingId === "new" ? (
        <ActivityEditor
          kind="meeting"
          draft={meetingDraft}
          saving={saving}
          submitLabel="Save meeting"
          onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
          onCancel={() => {
            setEditingId(null);
            setDraft(emptyDraft);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            onCreate("meeting", meetingDraft, () => {
              setEditingId(null);
              setDraft(emptyDraft);
            });
          }}
        />
      ) : null}

      <div className={styles.sectionHeader}>
        <div>
          <strong>{formatDate(selectedDate) || "Selected day"}</strong>
          <p>{selectedItems.length ? `${selectedItems.length} meeting(s)` : "No meetings scheduled"}</p>
        </div>
      </div>

      {selectedItems.length ? (
        <div className={styles.list}>
          {selectedItems.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.taskLead}>
                  <span className={styles.calendarIconWrap}>
                    <CalendarIcon />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{formatDate(item.activity_date)}</p>
                  </div>
                </div>
                <div className={styles.iconActions}>
                  <button
                    className={styles.iconButton}
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingDraft({
                        title: item.title,
                        description: item.description || "",
                        activity_date: item.activity_date,
                      });
                    }}
                    aria-label="Edit meeting"
                  >
                    <EditIcon />
                  </button>
                  <button className={`${styles.iconButton} ${styles.dangerIconButton}`} type="button" onClick={() => onDelete(item.id)} aria-label="Delete meeting">
                    <TrashIcon />
                  </button>
                </div>
              </div>
              {item.description ? <p className={styles.bodyCopy}>{item.description}</p> : null}
              {editingId === item.id ? (
                <ActivityEditor
                  kind="meeting"
                  draft={editingDraft}
                  saving={saving}
                  submitLabel="Update meeting"
                  onChange={(field, value) => setEditingDraft((current) => ({ ...current, [field]: value }))}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(event) => {
                    event.preventDefault();
                    onUpdate(item.id, editingDraft, () => setEditingId(null));
                  }}
                />
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>No meetings on this day</strong>
          <p>Select a date and add a meeting or event for it.</p>
        </div>
      )}
    </div>
  );
}

function AllActivitiesList({ items, onCreate, saving }) {
  const [composerKind, setComposerKind] = useState("");
  const [draft, setDraft] = useState(emptyDraft);

  return (
    <div className={styles.stack}>
      <div className={styles.sectionHeader}>
        <div>
          <strong>All activities</strong>
          <p>See notes, tasks, and meetings together in one timeline.</p>
        </div>
        <div className={styles.quickActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => setComposerKind("note")}>
            <PlusIcon />
            <span>Note</span>
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => setComposerKind("task")}>
            <PlusIcon />
            <span>Task</span>
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => setComposerKind("meeting")}>
            <PlusIcon />
            <span>Meeting</span>
          </button>
        </div>
      </div>

      {composerKind ? (
        <ActivityEditor
          kind={composerKind}
          draft={composerKind === "meeting" ? { ...draft, activity_date: draft.activity_date || toIsoDate(new Date()) } : draft}
          saving={saving}
          submitLabel={`Save ${labelForKind(composerKind).toLowerCase()}`}
          onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
          onCancel={() => {
            setComposerKind("");
            setDraft(emptyDraft);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(composerKind, composerKind === "meeting" ? { ...draft, activity_date: draft.activity_date || toIsoDate(new Date()) } : draft, () => {
              setComposerKind("");
              setDraft(emptyDraft);
            });
          }}
        />
      ) : null}

      {items.length ? (
        <div className={styles.list}>
          {items.map((entry) => (
            <article key={entry.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.taskLead}>
                  {entry.metadata?.activity_kind === "task" ? (
                    <span className={`${styles.checkButton} ${entry.metadata?.is_done ? styles.checkButtonDone : ""}`}>
                      {entry.metadata?.is_done ? <CheckIcon /> : null}
                    </span>
                  ) : entry.event_type === "attachment" ? (
                    <span className={styles.calendarIconWrap}>
                      <AttachmentIcon />
                    </span>
                  ) : entry.metadata?.activity_kind === "meeting" ? (
                    <span className={styles.calendarIconWrap}>
                      <CalendarIcon />
                    </span>
                  ) : (
                    <span className={styles.avatar}>{entry.actor_initials || initialsForName(entry.actor_name)}</span>
                  )}
                  <div>
                    <div className={styles.inlineMeta}>
                      <strong>{entry.title}</strong>
                      <span className={styles.kindBadge}>{labelForAuditEntry(entry)}</span>
                    </div>
                    <p>{formatDate(entry.metadata?.activity_date || entry.created_at)}</p>
                  </div>
                </div>
              </div>
              {entry.description ? <p className={styles.bodyCopy}>{entry.description}</p> : null}
              <div className={styles.metaRow}>
                <span>{entry.actor_name || "System"}</span>
                <span>{entry.action_label}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>No activity yet</strong>
          <p>Notes, tasks, and meetings will appear here together once you add them.</p>
        </div>
      )}
    </div>
  );
}

export function RecordActivityPanel({ targetType, targetId, activeTab, active = false }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: false, saving: false, error: "" });

  const kind = activeTab === "notes" ? "note" : activeTab === "tasks" ? "task" : activeTab === "meetings" ? "meeting" : activeTab === "all" ? "all" : "";

  const loadItems = useCallback(async () => {
    if (!kind || !targetId) {
      return;
    }

    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      if (kind === "all") {
        const data = await listAuditLog(getAccessToken(), {
          target_type: targetType,
          target_id: targetId,
        });
        setItems(data?.results || []);
      } else {
        const data = await listRecordActivities(getAccessToken(), {
          target_type: targetType,
          target_id: targetId,
          kind,
        });
        setItems(data || []);
      }
      setState((current) => ({ ...current, loading: false }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message || "Unable to load items." }));
    }
  }, [kind, targetId, targetType]);

  useEffect(() => {
    if (!active || !kind || !targetId) {
      return;
    }
    loadItems();
  }, [active, kind, targetId, loadItems]);

  async function createItem(nextKind, payload, onDone) {
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      await createRecordActivity(
        getAccessToken(),
        normalizeActivityPayload(payload, nextKind, "create"),
        { target_type: targetType, target_id: targetId },
      );
      await loadItems();
      setState((current) => ({ ...current, saving: false }));
      onDone?.();
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || `Unable to save ${nextKind}.` }));
    }
  }

  async function updateItem(itemId, payload, onDone) {
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      const nextKind = payload?.kind || items.find((item) => item.id === itemId)?.kind;
      await updateRecordActivity(getAccessToken(), itemId, normalizeActivityPayload(payload, nextKind, "update"));
      await loadItems();
      setState((current) => ({ ...current, saving: false }));
      onDone?.();
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || "Unable to update item." }));
    }
  }

  async function deleteItem(itemId) {
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      await deleteRecordActivity(getAccessToken(), itemId);
      setItems((current) => current.filter((item) => item.id !== itemId));
      setState((current) => ({ ...current, saving: false }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || "Unable to delete item." }));
    }
  }

  async function reorderTask(draggedId, droppedId) {
    const currentItems = [...items];
    const draggedIndex = currentItems.findIndex((item) => item.id === draggedId);
    const droppedIndex = currentItems.findIndex((item) => item.id === droppedId);
    if (draggedIndex < 0 || droppedIndex < 0) {
      return;
    }

    const [dragged] = currentItems.splice(draggedIndex, 1);
    currentItems.splice(droppedIndex, 0, dragged);
    setItems(currentItems.map((item, index) => ({ ...item, position: index + 1 })));

    try {
      await Promise.all(
        currentItems.map((item, index) =>
          updateRecordActivity(getAccessToken(), item.id, { position: index + 1 }),
        ),
      );
      await loadItems();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || "Unable to reorder tasks." }));
      await loadItems();
    }
  }

  if (!kind) {
    return null;
  }

  return (
    <div className={styles.wrap}>
      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.loading ? <div className={styles.emptyState}><strong>Loading</strong><p>Please wait while we load this tab.</p></div> : null}
      {!state.loading && kind === "note" ? (
        <NoteList items={items} onCreate={createItem} onUpdate={updateItem} onDelete={deleteItem} saving={state.saving} />
      ) : null}
      {!state.loading && kind === "all" ? (
        <AllActivitiesList items={items} onCreate={createItem} saving={state.saving} />
      ) : null}
      {!state.loading && kind === "task" ? (
        <TaskList items={items} onCreate={createItem} onUpdate={updateItem} onDelete={deleteItem} onReorder={reorderTask} saving={state.saving} />
      ) : null}
      {!state.loading && kind === "meeting" ? (
        <MeetingsCalendar items={items} onCreate={createItem} onUpdate={updateItem} onDelete={deleteItem} saving={state.saving} />
      ) : null}
    </div>
  );
}
