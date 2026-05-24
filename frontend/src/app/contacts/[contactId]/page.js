"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { RecordActivityPanel } from "@/components/record-activity/record-activity-panel";
import { ClipboardIcon, GlobeIcon, LinkedInIcon, MailIcon, PhoneIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { ContactsModal } from "@/features/contacts/components/contacts-screen/contacts-modal";
import { getContact, listCrmCompanies, listPipelines, updateContact } from "@/lib/api/admin";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";

import styles from "./page.module.css";

const activityTabs = [
  { id: "all", label: "All Activities", emptyTitle: "No activity yet", emptyBody: "Calls, emails, notes, meetings, and tasks for this contact will appear here." },
  { id: "notes", label: "Notes", emptyTitle: "No notes yet", emptyBody: "Capture relationship context, handoff notes, and follow-up details here." },
  { id: "emails", label: "Emails", emptyTitle: "No emails yet", emptyBody: "Email history connected to this contact will appear here." },
  { id: "calls", label: "Calls", emptyTitle: "No calls yet", emptyBody: "Logged call activity for this contact will appear here." },
  { id: "tasks", label: "Tasks", emptyTitle: "No tasks yet", emptyBody: "Assigned follow-up work and reminders will appear here." },
  { id: "meetings", label: "Meetings", emptyTitle: "No meetings yet", emptyBody: "Meeting history and upcoming sessions will appear here." },
  { id: "attachments", label: "Attachments", emptyTitle: "", emptyBody: "" },
];

const legacyStatusLabelMap = {
  lead: "Lead",
  qualified: "Qualified",
  customer: "Customer",
  at_risk: "At Risk",
};

const emptyContactForm = {
  fullName: "",
  title: "",
  email: "",
  phoneNumbers: [""],
  companyId: "",
  pipelineId: "",
  status: "Lead",
  lastTouch: "",
  notes: "",
};

const COMPANY_OPTIONS_PAGE_SIZE = 200;

function normalizeStatusLabel(value) {
  return legacyStatusLabelMap[value] || value;
}

function stringToHue(value) {
  return value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
}

function normalizeWebsiteUrl(value) {
  if (!value) {
    return "";
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function formatDateForInput(value) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

function formatDateForLongDisplay(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalizePaginatedResponse(data) {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }

  return {
    count: data?.count || 0,
    next: data?.next || null,
    previous: data?.previous || null,
    results: data?.results || [],
  };
}

function mapContactToView(contact) {
  return {
    id: contact.id,
    fullName: contact.full_name,
    title: contact.title || "",
    email: contact.email || "",
    phoneNumbers: contact.phone_numbers?.length ? contact.phone_numbers : contact.phone ? [contact.phone] : [],
    companyId: contact.company?.id ? String(contact.company.id) : "",
    companyName: contact.company?.name || "No company",
    companyEmail: contact.company?.email || "",
    companyWebsite: contact.company?.website || "",
    companyLinkedinUrl: contact.company?.linkedin_url || "",
    companyPhoneNumbers: contact.company?.phone_numbers || [],
    companyAddress: contact.company?.address || "",
    ownerName: contact.owner?.full_name || "Unassigned",
    pipelineId: contact.pipeline?.id ? String(contact.pipeline.id) : "",
    pipelineName: contact.pipeline?.name || "No pipeline",
    status: normalizeStatusLabel(contact.status) || "Lead",
    notes: contact.notes || "",
    lastTouch: formatDateForInput(contact.last_touch),
    lastTouchDisplay: formatDateForLongDisplay(contact.last_touch),
    createdAtDisplay: formatDateForLongDisplay(contact.created_at),
  };
}

function mapContactToPayload(form) {
  const phoneNumbers = form.phoneNumbers.map((number) => number.trim()).filter(Boolean);

  return {
    full_name: form.fullName.trim(),
    title: form.title.trim(),
    email: form.email.trim(),
    phone: phoneNumbers[0] || "",
    phone_numbers: phoneNumbers,
    company_id: Number(form.companyId),
    pipeline_id: form.pipelineId ? Number(form.pipelineId) : null,
    status: form.status.trim(),
    last_touch: form.lastTouch,
    notes: form.notes.trim(),
  };
}

function toContactFormState(contact) {
  return {
    fullName: contact.fullName,
    title: contact.title,
    email: contact.email,
    phoneNumbers: contact.phoneNumbers?.length ? contact.phoneNumbers : [""],
    companyId: contact.companyId,
    pipelineId: contact.pipelineId,
    status: contact.status,
    lastTouch: contact.lastTouch,
    notes: contact.notes,
  };
}

function CompanyMark({ company }) {
  const initials = company
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const hue = stringToHue(company);

  return (
    <span
      className={styles.companyMark}
      style={{
        background: `oklch(0.92 0.05 ${hue})`,
        color: `oklch(0.44 0.1 ${hue})`,
      }}
    >
      {initials}
    </span>
  );
}

function OwnerAvatar({ name }) {
  const safeName = name || "No owner";
  const initials = safeName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const hue = stringToHue(safeName);

  return (
    <span
      className={styles.ownerAvatar}
      style={{
        background: `oklch(0.91 0.07 ${hue})`,
        color: `oklch(0.4 0.11 ${hue})`,
      }}
    >
      {initials}
    </span>
  );
}

function ContactStatus({ value }) {
  const toneClass =
    value === "Qualified"
      ? styles.statusQualified
      : value === "Proposal"
        ? styles.statusProposal
        : value === "Negotiation"
          ? styles.statusNegotiation
          : value === "Customer"
            ? styles.statusCustomer
            : value === "At Risk"
              ? styles.statusRisk
              : styles.statusLead;

  return (
    <span className={`${styles.statusBadge} ${toneClass}`}>
      <span className={styles.statusDot} />
      {value}
    </span>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={mono ? styles.detailValueMono : styles.detailValue}>{value || "—"}</span>
    </div>
  );
}

function ExternalActionRow({ label, value, href, icon, external = false }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      {href ? (
        <a
          className={styles.actionLink}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          title={value}
        >
          <span className={styles.actionIcon} aria-hidden="true">
            {icon}
          </span>
          <span className={styles.detailValueMono}>{value}</span>
        </a>
      ) : (
        <span className={styles.detailValueMono}>{value || "—"}</span>
      )}
    </div>
  );
}

function PhoneNumberBlock({ numbers }) {
  if (!numbers.length) {
    return <span className={styles.detailValueMono}>No phone</span>;
  }

  return (
    <div className={styles.phoneNumberList}>
      {numbers.map((number, index) => (
        <a
          key={`${number}-${index}`}
          className={styles.actionLink}
          href={`tel:${number}`}
          title={number}
        >
          <span className={styles.actionIcon} aria-hidden="true">
            <PhoneIcon />
          </span>
          <span className={styles.detailValueMono}>{number}</span>
        </a>
      ))}
    </div>
  );
}

function uniqueTeamUsers(pipelines) {
  const seen = new Set();
  const users = [];
  for (const pipeline of pipelines || []) {
    for (const member of pipeline.team || []) {
      if (seen.has(member.id)) {
        continue;
      }
      seen.add(member.id);
      users.push(member);
    }
  }
  return users;
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authState = useAuthenticatedUser();
  const [state, setState] = useState({ loading: true, contact: null, error: "" });
  const [activeTab, setActiveTab] = useState("all");
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ error: "", success: "" });
  const [companyOptions, setCompanyOptions] = useState([]);
  const [pipelines, setPipelines] = useState([]);

  useEffect(() => {
    if (authState.loading || !authState.user || !params?.contactId) {
      return;
    }

    const token = getAccessToken();
    let active = true;

    Promise.all([
      getContact(token, params.contactId),
      listCrmCompanies(token, { page: 1, page_size: COMPANY_OPTIONS_PAGE_SIZE }),
      listPipelines(token),
    ])
      .then(([contactData, companiesData, pipelinesData]) => {
        if (!active) {
          return;
        }

        const companies = normalizePaginatedResponse(companiesData).results;
        setCompanyOptions(companies.map((company) => ({ value: String(company.id), label: company.name })));
        setPipelines(pipelinesData);
        setState({ loading: false, contact: mapContactToView(contactData), error: "" });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setState({ loading: false, contact: null, error: error.message || "Unable to load contact." });
      });

    return () => {
      active = false;
    };
  }, [authState.loading, authState.user, params]);

  const activePanel = useMemo(
    () => activityTabs.find((tab) => tab.id === activeTab) || activityTabs[0],
    [activeTab],
  );

  const statusOptions = useMemo(() => {
    const selectedPipeline = pipelines.find((pipeline) => String(pipeline.id) === contactForm.pipelineId) || null;
    if (!selectedPipeline) {
      return [contactForm.status || "Lead"];
    }

    const statuses = (selectedPipeline.statuses || []).map((status) => normalizeStatusLabel(status.name)).filter(Boolean);
    return statuses.length ? [...new Set(statuses)] : [contactForm.status || "Lead"];
  }, [contactForm.pipelineId, contactForm.status, pipelines]);

  const pipelineOptions = useMemo(
    () => pipelines.map((pipeline) => ({ value: String(pipeline.id), label: pipeline.name })),
    [pipelines],
  );
  const contactTopbarUsers = useMemo(() => {
    const detailPipeline = pipelines.find((pipeline) => String(pipeline.id) === String(state.contact?.pipelineId)) || null;
    return detailPipeline ? detailPipeline.team || [] : uniqueTeamUsers(pipelines);
  }, [pipelines, state.contact]);

  function updateContactForm(event) {
    const { name, value } = event.target;
    setContactForm((current) => {
      if (name !== "pipelineId") {
        return { ...current, [name]: value };
      }

      const nextPipeline = pipelines.find((pipeline) => String(pipeline.id) === value) || null;
      const nextStatuses = (nextPipeline?.statuses || []).map((status) => normalizeStatusLabel(status.name)).filter(Boolean);
      return {
        ...current,
        pipelineId: value,
        status: value ? nextStatuses[0] || current.status || "Lead" : "Lead",
      };
    });
  }

  function updateContactPhone(index, value) {
    setContactForm((current) => ({
      ...current,
      phoneNumbers: current.phoneNumbers.map((phone, phoneIndex) => (phoneIndex === index ? value : phone)),
    }));
  }

  function addContactPhone() {
    setContactForm((current) => ({ ...current, phoneNumbers: [...current.phoneNumbers, ""] }));
  }

  function removeContactPhone(index) {
    setContactForm((current) => ({
      ...current,
      phoneNumbers: current.phoneNumbers.filter((_, phoneIndex) => phoneIndex !== index),
    }));
  }

  function openEditContactModal() {
    if (!state.contact) {
      return;
    }

    setContactForm(toContactFormState(state.contact));
    setContactModalOpen(true);
    setSaveMessage({ error: "", success: "" });
  }

  function closeContactModal() {
    setContactModalOpen(false);
    setContactForm(emptyContactForm);
  }

  async function handleContactSubmit(event) {
    event.preventDefault();

    if (!state.contact) {
      return;
    }

    try {
      const token = getAccessToken();
      const updatedContact = await updateContact(token, state.contact.id, mapContactToPayload(contactForm));
      setState({ loading: false, contact: mapContactToView(updatedContact), error: "" });
      setSaveMessage({ error: "", success: "Contact updated." });
      closeContactModal();
    } catch (error) {
      setSaveMessage({ error: error.message || "Unable to save contact.", success: "" });
    }
  }

  if (authState.loading || state.loading) {
    return null;
  }

  if (!authState.user) {
    return null;
  }

  const contact = state.contact;

  return (
    <DashboardShell
      sidebar={<Sidebar user={authState.user} />}
      topbar={
        <Topbar
          user={authState.user}
          memberUsers={contactTopbarUsers}
          breadcrumbs={[
            { label: "Workspace", href: "/dashboard" },
            { label: "Contacts", href: "/contacts" },
            { label: contact?.fullName || "Contact" },
          ]}
        />
      }
    >
      <div className={styles.page}>
        {state.error ? <p className={styles.error}>{state.error}</p> : null}
        {saveMessage.error ? <p className={styles.error}>{saveMessage.error}</p> : null}
        {saveMessage.success ? <p className={styles.success}>{saveMessage.success}</p> : null}

        {contact ? (
          <div className={styles.layout}>
            <section className={styles.sidebarPanel}>
              <div className={styles.panelHeader}>
                <div className={styles.panelHero}>
                  <OwnerAvatar name={contact.fullName} />
                  <div>
                    <p className={styles.panelTitle}>{contact.fullName}</p>
                    <p className={styles.panelMeta}>{contact.title || "No title"}</p>
                  </div>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={openEditContactModal}>
                  Edit
                </button>
              </div>

              <div className={styles.panelBody}>
                <DetailRow label="Company" value={contact.companyName} />
                <DetailRow label="Owner" value={contact.ownerName} />
                <DetailRow label="Pipeline" value={contact.pipelineName} />
                <DetailRow label="Stage" value={contact.status} />
                <ExternalActionRow
                  label="Email"
                  value={contact.email || "No email"}
                  href={contact.email ? `mailto:${contact.email}` : ""}
                  icon={<MailIcon />}
                />
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Phone numbers</span>
                  <PhoneNumberBlock numbers={contact.phoneNumbers || []} />
                </div>
                <DetailRow label="Last updated" value={contact.lastTouchDisplay} mono />
                <DetailRow label="Created" value={contact.createdAtDisplay} mono />
              </div>
            </section>

            <section className={styles.activityPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Activity</p>
                  <h2>Timeline</h2>
                </div>
                <ContactStatus value={contact.status} />
              </div>

              <div className={styles.tabBar} role="tablist" aria-label="Contact activity tabs">
                {activityTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className={styles.activityBody}>
                {activeTab === "attachments" ? (
                  <AttachmentsPanel targetType="contact" targetId={contact.id} active />
                ) : activeTab === "all" || activeTab === "notes" || activeTab === "tasks" || activeTab === "meetings" ? (
                  <RecordActivityPanel targetType="contact" targetId={contact.id} activeTab={activeTab} active />
                ) : (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>
                      <ClipboardIcon />
                    </span>
                    <strong>{activePanel.emptyTitle}</strong>
                    <p>{activePanel.emptyBody}</p>
                  </div>
                )}
              </div>
            </section>

            <section className={styles.companyPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Associated company</p>
                  <h2>{contact.companyName}</h2>
                </div>
              </div>

              <div className={styles.panelBody}>
                {contact.companyId ? (
                  <>
                    <a className={styles.companyLink} href={`/companies/${contact.companyId}`}>
                      <div className={styles.companyPreview}>
                        <CompanyMark company={contact.companyName} />
                        <div className={styles.companyMeta}>
                          <strong>{contact.companyName}</strong>
                          <span>{contact.companyAddress || "No address"}</span>
                        </div>
                      </div>
                    </a>

                    <ExternalActionRow
                      label="Company email"
                      value={contact.companyEmail || "No email"}
                      href={contact.companyEmail ? `mailto:${contact.companyEmail}` : ""}
                      icon={<MailIcon />}
                    />
                    <ExternalActionRow
                      label="Website"
                      value={contact.companyWebsite || "No website"}
                      href={contact.companyWebsite ? normalizeWebsiteUrl(contact.companyWebsite) : ""}
                      icon={<GlobeIcon />}
                      external
                    />
                    <ExternalActionRow
                      label="LinkedIn"
                      value={contact.companyLinkedinUrl || "No LinkedIn"}
                      href={contact.companyLinkedinUrl ? normalizeWebsiteUrl(contact.companyLinkedinUrl) : ""}
                      icon={<LinkedInIcon />}
                      external
                    />
                    <ExternalActionRow
                      label="Phone numbers"
                      value={contact.companyPhoneNumbers.join(" · ") || "No numbers"}
                      href={contact.companyPhoneNumbers[0] ? `tel:${contact.companyPhoneNumbers[0]}` : ""}
                      icon={<PhoneIcon />}
                    />
                  </>
                ) : (
                  <div className={styles.emptyStateCompact}>
                    <strong>No company linked</strong>
                    <p>This contact is not connected to a company yet.</p>
                  </div>
                )}

                <article className={styles.contactCard}>
                  <div className={styles.contactCardHeader}>
                    <div>
                      <p className={styles.eyebrow}>Notes</p>
                      <div className={styles.contactMeta}>
                        <strong>Relationship context</strong>
                      </div>
                    </div>
                  </div>
                  <div className={styles.contactDetails}>
                    <p className={styles.noteText}>{contact.notes || "No notes yet."}</p>
                  </div>
                </article>

                {contact.companyId ? (
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => router.push(`/companies/${contact.companyId}`)}
                  >
                    Open company detail
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {contactModalOpen ? (
        <ContactsModal
          mode="edit"
          form={contactForm}
          onChange={updateContactForm}
          onPhoneChange={updateContactPhone}
          onAddPhone={addContactPhone}
          onRemovePhone={removeContactPhone}
          onClose={closeContactModal}
          onSubmit={handleContactSubmit}
          companyOptions={companyOptions}
          pipelineOptions={pipelineOptions}
          statusOptions={statusOptions}
        />
      ) : null}
    </DashboardShell>
  );
}
