"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { RecordActivityPanel } from "@/components/record-activity/record-activity-panel";
import { ClipboardIcon, GlobeIcon, LinkedInIcon, MailIcon, PhoneIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { CompanyModal } from "@/features/contacts/components/contacts-screen/contacts-modal";
import { getCrmCompany, listCompanyIndustries, listPipelines, updateCrmCompany } from "@/lib/api/admin";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";

import styles from "./page.module.css";

const CompanyLocationMap = dynamic(
  () => import("@/components/maps/company-location-map").then((module) => module.CompanyLocationMap),
  { ssr: false },
);

const activityTabs = [
  { id: "all", label: "All Activities", emptyTitle: "No activity yet", emptyBody: "Calls, emails, notes, meetings, and tasks for this company will appear here." },
  { id: "notes", label: "Notes", emptyTitle: "No notes yet", emptyBody: "Capture internal context, handoff details, and follow-up observations here." },
  { id: "emails", label: "Emails", emptyTitle: "No emails yet", emptyBody: "Email history connected to this company will appear here." },
  { id: "calls", label: "Calls", emptyTitle: "No calls yet", emptyBody: "Logged call activity for this company will appear here." },
  { id: "tasks", label: "Tasks", emptyTitle: "No tasks yet", emptyBody: "Assigned follow-up work and reminders will appear here." },
  { id: "meetings", label: "Meetings", emptyTitle: "No meetings yet", emptyBody: "Meeting history and upcoming sessions will appear here." },
  { id: "attachments", label: "Attachments", emptyTitle: "", emptyBody: "" },
];

const emptyCompanyForm = {
  name: "",
  industry: "",
  ownerName: "",
  email: "",
  website: "",
  linkedinUrl: "",
  socialLinks: [],
  employeeCount: "",
  phoneNumbers: [""],
  addressCountry: DEFAULT_COUNTRY,
  addressState: "",
  addressLine: "",
  latitude: "",
  longitude: "",
};

function stringToHue(value) {
  return value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
}

function normalizeWebsiteUrl(value) {
  if (!value) {
    return "";
  }

  return /^(https?:)?\/\//i.test(value) ? value : `https://${value}`;
}

function toCompanyFormState(company) {
  return {
    name: company.name || "",
    industry: company.industry || "",
    ownerName: company.owner_name || "",
    email: company.email || "",
    website: company.website || "",
    linkedinUrl: company.linkedin_url || "",
    socialLinks: company.social_links?.length ? company.social_links : [],
    employeeCount: company.employee_count ? String(company.employee_count) : "",
    phoneNumbers: company.phone_numbers?.length ? company.phone_numbers : [""],
    addressCountry: company.address_country || DEFAULT_COUNTRY,
    addressState: company.address_state || "",
    addressLine: company.address_line || "",
    latitude: company.latitude !== null && company.latitude !== undefined ? String(company.latitude) : "",
    longitude: company.longitude !== null && company.longitude !== undefined ? String(company.longitude) : "",
  };
}

function mapCompanyToPayload(form) {
  const phoneNumbers = form.phoneNumbers.map((number) => number.trim()).filter(Boolean);
  const website = form.website.trim();
  const linkedinUrl = form.linkedinUrl.trim();
  const socialLinks = form.socialLinks
    .map((item) => ({
      platform: item.platform.trim(),
      url: item.url.trim(),
    }))
    .filter((item) => item.platform && item.url)
    .map((item) => ({
      ...item,
      url: normalizeWebsiteUrl(item.url),
    }));

  return {
    name: form.name.trim(),
    industry: form.industry.trim(),
    owner_name: form.ownerName.trim(),
    email: form.email.trim(),
    website: website ? normalizeWebsiteUrl(website) : "",
    linkedin_url: linkedinUrl ? normalizeWebsiteUrl(linkedinUrl) : "",
    social_links: socialLinks,
    phone_numbers: phoneNumbers,
    phone_number: phoneNumbers[0] || "",
    address_country: form.addressCountry.trim(),
    address_state: form.addressState.trim(),
    address_line: form.addressLine.trim(),
    latitude: form.latitude ? Number(form.latitude) : null,
    longitude: form.longitude ? Number(form.longitude) : null,
    employee_count: form.employeeCount ? Number(form.employeeCount) : null,
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

function SocialLinksBlock({ items }) {
  if (!items.length) {
    return <DetailRow label="Other socials" value="No additional socials" />;
  }

  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>Other socials</span>
      <div className={styles.socialList}>
        {items.map((item, index) => (
          <a
            key={`${item.platform}-${item.url}-${index}`}
            className={styles.socialLink}
            href={normalizeWebsiteUrl(item.url)}
            target="_blank"
            rel="noreferrer"
            title={item.url}
          >
            <span className={styles.socialPlatform}>{item.platform}</span>
            <span className={styles.detailValueMono}>{item.url}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function formatPhoneNumbers(contact) {
  const numbers = contact.phone_numbers?.length ? contact.phone_numbers : contact.phone ? [contact.phone] : [];
  return numbers.join(" · ") || "No phone";
}

function normalizeContactPath(contactId) {
  return `/contacts/${contactId}`;
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

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authState = useAuthenticatedUser();
  const [state, setState] = useState({ loading: true, company: null, error: "" });
  const [activeTab, setActiveTab] = useState("all");
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [industryOptions, setIndustryOptions] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ error: "", success: "" });

  useEffect(() => {
    if (authState.loading || !authState.user || !params?.companyId) {
      return;
    }

    const token = getAccessToken();
    let active = true;

    Promise.all([getCrmCompany(token, params.companyId), listCompanyIndustries(token), listPipelines(token)])
      .then(([company, industries, pipelinesData]) => {
        if (!active) {
          return;
        }
        setIndustryOptions(industries);
        setPipelines(pipelinesData);
        setState({ loading: false, company, error: "" });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setState({ loading: false, company: null, error: error.message || "Unable to load company." });
      });

    return () => {
      active = false;
    };
  }, [authState.loading, authState.user, params]);

  const activePanel = useMemo(
    () => activityTabs.find((tab) => tab.id === activeTab) || activityTabs[0],
    [activeTab],
  );
  const companyTopbarUsers = useMemo(() => uniqueTeamUsers(pipelines), [pipelines]);

  function updateCompanyForm(event) {
    const { name, value } = event.target;
    setCompanyForm((current) => ({ ...current, [name]: value }));
  }

  function updateCompanyPhone(index, value) {
    setCompanyForm((current) => ({
      ...current,
      phoneNumbers: current.phoneNumbers.map((phone, phoneIndex) => (phoneIndex === index ? value : phone)),
    }));
  }

  function addCompanyPhone() {
    setCompanyForm((current) => ({ ...current, phoneNumbers: [...current.phoneNumbers, ""] }));
  }

  function removeCompanyPhone(index) {
    setCompanyForm((current) => ({
      ...current,
      phoneNumbers: current.phoneNumbers.filter((_, phoneIndex) => phoneIndex !== index),
    }));
  }

  function updateCompanySocial(index, field, value) {
    setCompanyForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addCompanySocial() {
    setCompanyForm((current) => ({
      ...current,
      socialLinks: [...current.socialLinks, { platform: "LinkedIn", url: "" }],
    }));
  }

  function removeCompanySocial(index) {
    setCompanyForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateCompanyLocation(latitude, longitude) {
    setCompanyForm((current) => ({
      ...current,
      latitude: String(latitude),
      longitude: String(longitude),
    }));
  }

  function openEditCompanyModal() {
    if (!state.company) {
      return;
    }
    setCompanyForm(toCompanyFormState(state.company));
    setCompanyModalOpen(true);
    setSaveMessage({ error: "", success: "" });
  }

  function closeCompanyModal() {
    setCompanyModalOpen(false);
    setCompanyForm(emptyCompanyForm);
  }

  async function handleCompanySubmit(event) {
    event.preventDefault();

    if (!state.company) {
      return;
    }

    try {
      const token = getAccessToken();
      const updatedCompany = await updateCrmCompany(token, state.company.id, mapCompanyToPayload(companyForm));
      setState({ loading: false, company: updatedCompany, error: "" });
      setSaveMessage({ error: "", success: "Company updated." });
      closeCompanyModal();
    } catch (error) {
      setSaveMessage({ error: error.message || "Unable to save company.", success: "" });
    }
  }

  if (authState.loading || state.loading) {
    return null;
  }

  if (!authState.user) {
    return null;
  }

  const company = state.company;
  const visibleContacts = (company?.contacts || []).slice(0, 4);
  const hasLocation = Number.isFinite(company?.latitude) && Number.isFinite(company?.longitude);

  return (
    <DashboardShell
      sidebar={<Sidebar user={authState.user} />}
      topbar={
        <Topbar
          user={authState.user}
          memberUsers={companyTopbarUsers}
          breadcrumbs={[
            { label: "Workspace", href: "/dashboard" },
            { label: "Companies", href: "/companies" },
            { label: company?.name || "Company" },
          ]}
        />
      }
    >
      <div className={styles.page}>
        {state.error ? <p className={styles.error}>{state.error}</p> : null}
        {saveMessage.error ? <p className={styles.error}>{saveMessage.error}</p> : null}
        {saveMessage.success ? <p className={styles.success}>{saveMessage.success}</p> : null}

        {company ? (
          <div className={styles.layout}>
            <section className={styles.sidebarPanel}>
              <div className={styles.panelHeader}>
                <div className={styles.panelHero}>
                  <CompanyMark company={company.name} />
                  <div>
                    <p className={styles.panelTitle}>{company.name}</p>
                    <p className={styles.panelMeta}>{company.contacts?.length || 0} contacts</p>
                  </div>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={openEditCompanyModal}>
                  Edit
                </button>
              </div>

              <div className={styles.panelBody}>
                <DetailRow label="Owner name" value={company.owner_name || "No owner listed"} />
                <DetailRow label="Industry" value={company.industry || "No industry"} />
                <ExternalActionRow
                  label="Email"
                  value={company.email || "No email"}
                  href={company.email ? `mailto:${company.email}` : ""}
                  icon={<MailIcon />}
                />
                <ExternalActionRow
                  label="Website"
                  value={company.website || "No website"}
                  href={company.website ? normalizeWebsiteUrl(company.website) : ""}
                  icon={<GlobeIcon />}
                  external
                />
                <ExternalActionRow
                  label="LinkedIn"
                  value={company.linkedin_url || "No LinkedIn"}
                  href={company.linkedin_url ? normalizeWebsiteUrl(company.linkedin_url) : ""}
                  icon={<LinkedInIcon />}
                  external
                />
                <SocialLinksBlock items={company.social_links || []} />
                <ExternalActionRow
                  label="Phone numbers"
                  value={(company.phone_numbers || []).join(" · ") || "No numbers"}
                  href={company.phone_numbers?.[0] ? `tel:${company.phone_numbers[0]}` : ""}
                  icon={<PhoneIcon />}
                />
                <DetailRow label="Country" value={company.address_country || "—"} />
                <DetailRow label="State" value={company.address_state || "—"} />
                <DetailRow label="Address" value={company.address_line || company.address || "No address"} />
                <DetailRow
                  label="Company size"
                  value={company.employee_count ? `${company.employee_count} people` : "Not set"}
                  mono
                />
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Location</span>
                  {hasLocation ? (
                    <div className={styles.mapWrap}>
                      <CompanyLocationMap
                        latitude={company.latitude}
                        longitude={company.longitude}
                        className={styles.mapCanvas}
                        height={220}
                      />
                      <span className={styles.mapCaption}>
                        {company.latitude.toFixed(5)}, {company.longitude.toFixed(5)}
                      </span>
                    </div>
                  ) : (
                    <span className={styles.detailValue}>No map pin selected</span>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.activityPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Activity</p>
                  <h2>Timeline</h2>
                </div>
              </div>

              <div className={styles.tabBar} role="tablist" aria-label="Company activity tabs">
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
                  <AttachmentsPanel
                    targetType="company"
                    targetId={company.id}
                    active
                    includeRelated
                    relatedScope="company_contacts"
                    showSource
                    description="Upload files directly on this company and also review files that were uploaded on linked contacts."
                  />
                ) : activeTab === "all" || activeTab === "notes" || activeTab === "tasks" || activeTab === "meetings" ? (
                  <RecordActivityPanel targetType="company" targetId={company.id} activeTab={activeTab} active />
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

            <section className={styles.contactsPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Associated contacts</p>
                  <h2>{company.contacts?.length || 0} people</h2>
                </div>
              </div>

              <div className={styles.panelBody}>
                {visibleContacts.length ? (
                  <div className={styles.contactCards}>
                    {visibleContacts.map((contact) => (
                      <article
                        key={contact.id}
                        className={styles.contactCard}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(normalizeContactPath(contact.id))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(normalizeContactPath(contact.id));
                          }
                        }}
                      >
                        <div className={styles.contactCardHeader}>
                          <div className={styles.ownerCell}>
                            <OwnerAvatar name={contact.full_name} />
                            <div className={styles.contactMeta}>
                              <strong>{contact.full_name}</strong>
                              <span>{contact.title || "No title"}</span>
                            </div>
                          </div>
                          <ContactStatus value={contact.status} />
                        </div>

                        <div className={styles.contactDetails}>
                          <DetailRow label="Email" value={contact.email || "No email"} mono />
                          <DetailRow label="Phone" value={formatPhoneNumbers(contact)} mono />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyStateCompact}>
                    <strong>No contacts yet</strong>
                    <p>Contacts linked to this company will appear here.</p>
                  </div>
                )}

                {company.contacts?.length ? (
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => router.push(`/contacts?companyId=${company.id}`)}
                  >
                    Show all associated contacts
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {companyModalOpen ? (
          <CompanyModal
            mode="edit"
            form={companyForm}
            industryOptions={industryOptions.map((industry) => ({ value: industry.name, label: industry.name }))}
            onChange={updateCompanyForm}
          onPhoneChange={updateCompanyPhone}
          onAddPhone={addCompanyPhone}
          onRemovePhone={removeCompanyPhone}
          onSocialChange={updateCompanySocial}
          onAddSocial={addCompanySocial}
          onRemoveSocial={removeCompanySocial}
          onLocationChange={updateCompanyLocation}
          onClose={closeCompanyModal}
          onSubmit={handleCompanySubmit}
        />
      ) : null}
    </DashboardShell>
  );
}
