"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { RecordActivityPanel } from "@/components/record-activity/record-activity-panel";
import { ClipboardIcon, MailIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { getDeal, listContacts, listCrmCompanies, listCurrencies, listPipelines, listScopeOfWorkTemplates, updateDeal } from "@/lib/api/admin";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";

import styles from "./page.module.css";

const activityTabs = [
  { id: "all", label: "All Activities", emptyTitle: "No activity yet", emptyBody: "Calls, emails, notes, meetings, and tasks for this project will appear here." },
  { id: "notes", label: "Notes", emptyTitle: "No notes yet", emptyBody: "Commercial context, risks, and next-step notes will appear here." },
  { id: "tasks", label: "Tasks", emptyTitle: "No tasks yet", emptyBody: "Assigned follow-up work for this project will appear here." },
  { id: "meetings", label: "Meetings", emptyTitle: "No meetings yet", emptyBody: "Meeting history and upcoming sessions for this project will appear here." },
  { id: "attachments", label: "Attachments", emptyTitle: "", emptyBody: "" },
];

const emptyDealForm = {
  name: "",
  companyId: "",
  contactId: "",
  pipelineId: "",
  stage: "",
  amount: "",
  expectedCloseDate: "",
  scopeTemplateId: "",
  scopeOfWork: "",
  notes: "",
};

function pipelineMatchesCompany(pipeline, company) {
  if (!pipeline || !company) {
    return false;
  }
  if (!pipeline.company_id || !company.tenant_company_id) {
    return true;
  }
  return String(pipeline.company_id) === String(company.tenant_company_id);
}

function normalizePaginatedResponse(data) {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      results: data,
    };
  }

  return {
    count: data?.count || 0,
    results: data?.results || [],
  };
}

function stringToHue(value) {
  return value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
}

function getInitials(value, fallback = "NA") {
  const initials = (value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || fallback;
}

function formatCurrency(symbol, amount) {
  const numericAmount = Number(amount || 0);
  return `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numericAmount)}`;
}

function formatLongDate(value) {
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

function formatDateForInput(value) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
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

function CompanyAvatar({ name }) {
  const safeName = name || "No company";
  const hue = stringToHue(safeName);

  return (
    <span
      className={styles.companyAvatar}
      style={{
        background: `linear-gradient(135deg, oklch(0.94 0.03 ${hue}), oklch(0.89 0.05 ${hue + 18}))`,
        color: `oklch(0.42 0.08 ${hue})`,
      }}
    >
      {getInitials(safeName, "NC")}
    </span>
  );
}

function OwnerAvatar({ name }) {
  const safeName = name || "Owner";
  const hue = stringToHue(safeName);

  return (
    <span
      className={styles.ownerAvatar}
      style={{
        background: `oklch(0.91 0.07 ${hue})`,
        color: `oklch(0.4 0.11 ${hue})`,
      }}
    >
      {getInitials(safeName, "U")}
    </span>
  );
}

function StageBadge({ value, color }) {
  return (
    <span
      className={styles.stageBadge}
      style={{ background: `color-mix(in oklch, ${color || "#7C5F35"} 18%, var(--surface))`, color: color || "#7C5F35" }}
    >
      <span className={styles.stageDot} style={{ background: color || "#7C5F35" }} />
      {value || "No stage"}
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

function ActionLinkRow({ label, value, href, icon, external = false }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      {href ? (
        <a className={styles.actionLink} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
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

function DealEditorModal({
  form,
  companyOptions,
  contactOptions,
  pipelineOptions,
  stageOptions,
  scopeOfWorkTemplateOptions,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Edit project">
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>Projects</p>
            <h2>Edit project</h2>
            <p className={styles.copy}>Update the commercial details without leaving the detail page.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={onSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Project name</span>
              <input name="name" value={form.name} onChange={onChange} required />
            </label>
            <label className={styles.field}>
              <span>Company</span>
              <SearchableSelect
                ariaLabel="Company"
                name="companyId"
                value={form.companyId}
                onChange={onChange}
                options={[{ value: "", label: "Select company" }, ...companyOptions]}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Contact</span>
              <SearchableSelect
                ariaLabel="Contact"
                name="contactId"
                value={form.contactId}
                onChange={onChange}
                options={[{ value: "", label: "No contact" }, ...contactOptions]}
              />
            </label>
            <label className={styles.field}>
              <span>Pipeline</span>
              <SearchableSelect
                ariaLabel="Pipeline"
                name="pipelineId"
                value={form.pipelineId}
                onChange={onChange}
                options={[{ value: "", label: "Select pipeline" }, ...pipelineOptions]}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Stage</span>
              <SearchableSelect
                ariaLabel="Stage"
                name="stage"
                value={form.stage}
                onChange={onChange}
                options={[{ value: "", label: "Select stage" }, ...stageOptions]}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Amount</span>
              <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={onChange} required />
            </label>
            <label className={styles.field}>
              <span>Expected close date</span>
              <input name="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={onChange} />
            </label>
          </div>

          <label className={styles.field}>
            <span>Notes</span>
            <textarea name="notes" value={form.notes} onChange={onChange} rows={4} />
          </label>

          <label className={styles.field}>
            <span>Scope template</span>
            <SearchableSelect
              ariaLabel="Scope template"
              name="scopeTemplateId"
              value={form.scopeTemplateId}
              onChange={onChange}
              options={[{ value: "", label: scopeOfWorkTemplateOptions.length ? "No template" : "No templates available" }, ...scopeOfWorkTemplateOptions]}
            />
          </label>

          <label className={styles.field}>
            <span>Scope of work</span>
            <textarea name="scopeOfWork" value={form.scopeOfWork} onChange={onChange} rows={6} />
          </label>

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit">
              Save project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authState = useAuthenticatedUser();
  const [state, setState] = useState({ loading: true, deal: null, error: "" });
  const [dealForm, setDealForm] = useState(emptyDealForm);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [scopeOfWorkTemplates, setScopeOfWorkTemplates] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("EGP");
  const [saveMessage, setSaveMessage] = useState({ error: "", success: "" });
  const [activeTab, setActiveTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (authState.loading || !authState.user || !params?.dealId) {
      return;
    }

    const token = getAccessToken();
    let active = true;

    Promise.all([
      getDeal(token, params.dealId),
      listCrmCompanies(token, { page: 1, page_size: 200 }),
      listContacts(token, { page: 1, page_size: 300 }),
      listPipelines(token, { kind: "deals" }),
      listCurrencies(token, { company_id: authState.user.company?.id || authState.user.companies?.[0]?.id || "" }),
      listScopeOfWorkTemplates(token, { company_id: authState.user.company?.id || authState.user.companies?.[0]?.id || "" }),
    ])
      .then(([dealData, companiesData, contactsData, pipelinesData, currenciesData, scopeOfWorkTemplatesData]) => {
        if (!active) {
          return;
        }

        const companies = normalizePaginatedResponse(companiesData).results;
        const normalizedContacts = normalizePaginatedResponse(contactsData).results;
        const defaultCurrency = currenciesData.find((currency) => currency.is_default) || currenciesData[0];

        setCompanies(companies);
        setContacts(normalizedContacts);
        setPipelines(pipelinesData);
        setScopeOfWorkTemplates(scopeOfWorkTemplatesData || []);
        setCurrencySymbol(defaultCurrency?.symbol || "EGP");
        setState({ loading: false, deal: dealData, error: "" });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setState({ loading: false, deal: null, error: error.message || "Unable to load project." });
      });

    return () => {
      active = false;
    };
  }, [authState.loading, authState.user, params]);

  const activePanel = useMemo(() => activityTabs.find((tab) => tab.id === activeTab) || activityTabs[0], [activeTab]);

  const selectedFormPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === dealForm.pipelineId) || null,
    [pipelines, dealForm.pipelineId],
  );
  const selectedFormCompany = useMemo(
    () => companies.find((company) => String(company.id) === dealForm.companyId) || null,
    [companies, dealForm.companyId],
  );
  const visibleCompanyOptions = useMemo(() => {
    const compatibleCompanies = selectedFormPipeline
      ? companies.filter((company) => pipelineMatchesCompany(selectedFormPipeline, company))
      : companies;
    const source = compatibleCompanies.length ? compatibleCompanies : companies;
    return source.map((company) => ({ value: String(company.id), label: company.name }));
  }, [companies, selectedFormPipeline]);
  const visibleContactOptions = useMemo(() => {
    const source = dealForm.companyId ? contacts.filter((contact) => String(contact.company?.id || "") === dealForm.companyId) : contacts;
    return source.map((contact) => ({
      value: String(contact.id),
      label: `${contact.full_name} - ${contact.title || "Contact"}`,
    }));
  }, [contacts, dealForm.companyId]);

  const visiblePipelineOptions = useMemo(() => {
    const compatiblePipelines = selectedFormCompany
      ? pipelines.filter((pipeline) => pipelineMatchesCompany(pipeline, selectedFormCompany))
      : pipelines;
    const source = compatiblePipelines.length ? compatiblePipelines : pipelines;
    return source.map((pipeline) => ({ value: String(pipeline.id), label: pipeline.name }));
  }, [pipelines, selectedFormCompany]);
  const scopeOfWorkTemplateOptions = useMemo(
    () => scopeOfWorkTemplates.map((template) => ({ value: String(template.id), label: template.name })),
    [scopeOfWorkTemplates],
  );
  const dealTopbarUsers = useMemo(() => {
    const detailPipeline = pipelines.find((pipeline) => String(pipeline.id) === String(state.deal?.pipeline_id)) || null;
    return detailPipeline ? detailPipeline.team || [] : uniqueTeamUsers(pipelines);
  }, [pipelines, state.deal]);

  const stageOptions = useMemo(
    () => (selectedFormPipeline?.statuses || []).map((statusItem) => ({ value: statusItem.name, label: statusItem.name })),
    [selectedFormPipeline],
  );

  function updateDealForm(event) {
    const { name, value } = event.target;

    setDealForm((current) => {
      const nextState = { ...current, [name]: value };
      if (name === "scopeTemplateId") {
        const nextTemplate = scopeOfWorkTemplates.find((template) => String(template.id) === value) || null;
        nextState.scopeTemplateId = value;
        if (nextTemplate) {
          nextState.scopeOfWork = nextTemplate.content || "";
        }
      }
      if (name === "pipelineId") {
        const nextPipeline = pipelines.find((pipeline) => String(pipeline.id) === value);
        const compatibleCompanies = nextPipeline ? companies.filter((company) => pipelineMatchesCompany(nextPipeline, company)) : companies;
        const companyPool = compatibleCompanies.length ? compatibleCompanies : companies;
        const nextCompany = companyPool.find((company) => String(company.id) === current.companyId) || companyPool[0] || null;
        nextState.stage = nextPipeline?.statuses?.[0]?.name || "";
        nextState.companyId = nextCompany ? String(nextCompany.id) : "";
        if (!nextCompany || !contacts.some((contact) => String(contact.id) === current.contactId && String(contact.company?.id || "") === String(nextCompany.id))) {
          nextState.contactId = "";
        }
      }
      if (name === "companyId") {
        const nextCompany = companies.find((company) => String(company.id) === value) || null;
        const compatiblePipelines = nextCompany ? pipelines.filter((pipeline) => pipelineMatchesCompany(pipeline, nextCompany)) : pipelines;
        const pipelinePool = compatiblePipelines.length ? compatiblePipelines : pipelines;
        const nextPipeline = pipelinePool.find((pipeline) => String(pipeline.id) === current.pipelineId) || pipelinePool[0] || null;
        const stillMatches = contacts.some((contact) => String(contact.id) === current.contactId && String(contact.company?.id) === value);
        if (!stillMatches) {
          nextState.contactId = "";
        }
        nextState.pipelineId = nextPipeline ? String(nextPipeline.id) : "";
        nextState.stage = nextPipeline?.statuses?.find((statusItem) => statusItem.name === current.stage)?.name || nextPipeline?.statuses?.[0]?.name || "";
      }
      return nextState;
    });
  }

  function openEditModal() {
    if (!state.deal) {
      return;
    }

    setDealForm({
      name: state.deal.name || "",
      companyId: state.deal.company?.id ? String(state.deal.company.id) : "",
      contactId: state.deal.contact?.id ? String(state.deal.contact.id) : "",
      pipelineId: state.deal.pipeline_id ? String(state.deal.pipeline_id) : "",
      stage: state.deal.stage || "",
      amount: String(state.deal.amount || ""),
      expectedCloseDate: formatDateForInput(state.deal.expected_close_date),
      scopeTemplateId: "",
      scopeOfWork: state.deal.scope_of_work || "",
      notes: state.deal.notes || "",
    });
    setModalOpen(true);
    setSaveMessage({ error: "", success: "" });
  }

  function closeModal() {
    setModalOpen(false);
    setDealForm(emptyDealForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!state.deal) {
      return;
    }

    const payload = {
      name: dealForm.name.trim(),
      company_id: Number(dealForm.companyId),
      contact_id: dealForm.contactId ? Number(dealForm.contactId) : null,
      pipeline_id: Number(dealForm.pipelineId),
      stage: dealForm.stage,
      amount: dealForm.amount ? Number(dealForm.amount) : 0,
      expected_close_date: dealForm.expectedCloseDate || null,
      scope_of_work: dealForm.scopeOfWork.trim(),
      notes: dealForm.notes.trim(),
    };

    try {
      const updatedDeal = await updateDeal(getAccessToken(), state.deal.id, payload);
      setState({ loading: false, deal: updatedDeal, error: "" });
      setSaveMessage({ error: "", success: "Project updated." });
      closeModal();
    } catch (error) {
      setSaveMessage({ error: error.message || "Unable to save project.", success: "" });
    }
  }

  if (authState.loading || state.loading) {
    return null;
  }

  if (!authState.user) {
    return null;
  }

  const deal = state.deal;

  return (
    <DashboardShell
      sidebar={<Sidebar user={authState.user} />}
      topbar={
        <Topbar
          user={authState.user}
          memberUsers={dealTopbarUsers}
          breadcrumbs={[
            { label: "Workspace", href: "/dashboard" },
            { label: "Projects", href: "/projects" },
            { label: deal?.name || "Project" },
          ]}
        />
      }
    >
      <div className={styles.page}>
        {state.error ? <p className={styles.error}>{state.error}</p> : null}
        {saveMessage.error ? <p className={styles.error}>{saveMessage.error}</p> : null}
        {saveMessage.success ? <p className={styles.success}>{saveMessage.success}</p> : null}

        {deal ? (
          <div className={styles.layout}>
            <section className={styles.sidebarPanel}>
              <div className={styles.panelHeader}>
                <div className={styles.panelHero}>
                  <CompanyAvatar name={deal.company?.name || deal.name} />
                  <div>
                    <p className={styles.panelTitle}>{deal.name}</p>
                    <p className={styles.panelMeta}>{deal.company?.name || "No company linked"}</p>
                  </div>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={openEditModal}>
                  Edit
                </button>
              </div>

              <div className={styles.panelBody}>
                <DetailRow label="Amount" value={formatCurrency(currencySymbol, deal.amount)} />
                <DetailRow label="Pipeline" value={deal.pipeline_name || "No pipeline"} />
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Stage</span>
                  <StageBadge value={deal.stage} color={deal.stage_color} />
                </div>
                <DetailRow label="Owner" value={deal.owner?.full_name || "Unassigned"} />
                <DetailRow label="Days in stage" value={`${deal.days_in_stage || 0}d`} mono />
                <DetailRow label="Expected close" value={formatLongDate(deal.expected_close_date)} mono />
                <DetailRow label="Created" value={formatLongDate(deal.created_at)} mono />
                <DetailRow label="Updated" value={formatLongDate(deal.updated_at)} mono />
              </div>
            </section>

            <section className={styles.activityPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Activity</p>
                  <h2>Timeline</h2>
                </div>
                <StageBadge value={deal.stage} color={deal.stage_color} />
              </div>

              <div className={styles.tabBar} role="tablist" aria-label="Project activity tabs">
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
                    targetType="deal"
                    targetId={deal.id}
                    active
                    includeRelated
                    relatedScope="deal_contact"
                    showSource
                    description="Upload files directly on this project and also review files from the selected linked contact."
                  />
                ) : activeTab === "notes" || activeTab === "tasks" || activeTab === "meetings" ? (
                  <RecordActivityPanel targetType="deal" targetId={deal.id} activeTab={activeTab} active />
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

            <section className={styles.contextPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Context</p>
                  <h2>Relationships</h2>
                </div>
              </div>

              <div className={styles.panelBody}>
                <article className={styles.infoCard}>
                  <div className={styles.infoCardHeader}>
                    <div className={styles.ownerCell}>
                      <CompanyAvatar name={deal.company?.name || "No company"} />
                      <div className={styles.infoMeta}>
                        <strong>{deal.company?.name || "No company linked"}</strong>
                        <span>Associated company</span>
                      </div>
                    </div>
                  </div>
                  {deal.company?.id ? (
                    <button className={styles.secondaryButton} type="button" onClick={() => router.push(`/companies/${deal.company.id}`)}>
                      Open company detail
                    </button>
                  ) : null}
                </article>

                <article className={styles.infoCard}>
                  <div className={styles.infoCardHeader}>
                    <div className={styles.ownerCell}>
                      <OwnerAvatar name={deal.contact?.full_name || "No contact"} />
                      <div className={styles.infoMeta}>
                        <strong>{deal.contact?.full_name || "No contact linked"}</strong>
                        <span>{deal.contact?.title || "Primary contact"}</span>
                      </div>
                    </div>
                  </div>
                  {deal.contact?.id ? (
                    <>
                      <ActionLinkRow
                        label="Email"
                        value={deal.contact?.email || "No email"}
                        href={deal.contact?.email ? `mailto:${deal.contact.email}` : ""}
                        icon={<MailIcon />}
                      />
                      <button className={styles.secondaryButton} type="button" onClick={() => router.push(`/contacts/${deal.contact.id}`)}>
                        Open contact detail
                      </button>
                    </>
                  ) : (
                    <div className={styles.emptyStateCompact}>
                      <strong>No contact linked</strong>
                      <p>You can add one from the edit modal whenever needed.</p>
                    </div>
                  )}
                </article>

                <article className={styles.infoCard}>
                  <div className={styles.infoCardHeader}>
                    <div>
                      <p className={styles.eyebrow}>Scope of work</p>
                      <div className={styles.infoMeta}>
                        <strong>Project scope</strong>
                      </div>
                    </div>
                  </div>
                  <p className={styles.noteText}>{deal.scope_of_work || "No scope of work yet."}</p>
                </article>

                <article className={styles.infoCard}>
                  <div className={styles.infoCardHeader}>
                    <div>
                      <p className={styles.eyebrow}>Notes</p>
                      <div className={styles.infoMeta}>
                        <strong>Project notes</strong>
                      </div>
                    </div>
                  </div>
                  <p className={styles.noteText}>{deal.notes || "No notes yet."}</p>
                </article>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <DealEditorModal
          form={dealForm}
          companyOptions={visibleCompanyOptions}
          contactOptions={visibleContactOptions}
          pipelineOptions={visiblePipelineOptions}
          stageOptions={stageOptions}
          scopeOfWorkTemplateOptions={scopeOfWorkTemplateOptions}
          onChange={updateDealForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      ) : null}
    </DashboardShell>
  );
}
