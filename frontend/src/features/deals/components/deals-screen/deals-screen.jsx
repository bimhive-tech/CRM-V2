"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { DealsIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { createDeal, deleteDeal, listContacts, listCrmCompanies, listCurrencies, listDeals, listPipelines, updateDeal } from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import styles from "./deals-screen.module.css";

const emptyDealForm = {
  name: "",
  companyId: "",
  contactId: "",
  pipelineId: "",
  stage: "",
  amount: "",
  expectedCloseDate: "",
  notes: "",
};

function pipelineMatchesCompany(pipeline, company) {
  if (!pipeline || !company) {
    return false;
  }
  return String(pipeline.company_id || "") === String(company.tenant_company_id || "");
}

function getDealsStorageKey(user) {
  const companyId = user?.company?.id || user?.companies?.[0]?.id || "default";
  return `crm:last-deals-pipeline:${companyId}`;
}

function readStoredPipelineId(user) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getDealsStorageKey(user)) || "";
}

function normalizePaginatedResponse(data) {
  if (Array.isArray(data)) {
    return { count: data.length, results: data };
  }

  return {
    count: data?.count || 0,
    results: data?.results || [],
  };
}

function formatCurrency(symbol, amount) {
  const numericAmount = Number(amount || 0);
  return `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numericAmount)}`;
}

function formatShortDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function stringToHue(value) {
  return value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
}

function getInitials(value, fallback = "NA") {
  const parts = (value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);

  const initials =
    parts.length >= 2
      ? parts.map((part) => part[0]?.toUpperCase()).join("")
      : parts[0]
        ? parts[0].slice(0, 2).toUpperCase()
        : "";
  return initials || fallback;
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
      <span className={styles.companyAvatarLabel}>{getInitials(safeName, "NC")}</span>
    </span>
  );
}

function OwnerAvatar({ name }) {
  const safeName = name || "Owner";
  const initials = getInitials(safeName, "U");
  const hue = stringToHue(safeName);

  return (
    <span
      className={styles.ownerAvatar}
      style={{
        background: `oklch(0.91 0.09 ${hue})`,
        color: `oklch(0.42 0.12 ${hue})`,
      }}
    >
      {initials || "U"}
    </span>
  );
}

function DealModal({
  mode,
  form,
  companyOptions,
  contactOptions,
  pipelineOptions,
  stageOptions,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={mode === "edit" ? "Edit project" : "Create project"}>
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>Projects</p>
            <h2>{mode === "edit" ? "Edit project" : "Create project"}</h2>
            <p className={styles.copy}>Use the same modal for creation and editing so opportunity records stay consistent.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={onSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Project name</span>
              <input name="name" value={form.name} onChange={onChange} placeholder="Nile Contracting - Annual Fit-Out Package" required />
            </label>
            <label className={styles.field}>
              <span>Company</span>
              <SearchableSelect
                ariaLabel="Company"
                name="companyId"
                value={form.companyId}
                onChange={onChange}
                options={[{ value: "", label: companyOptions.length ? "Select company" : "No companies available" }, ...companyOptions]}
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
                options={[{ value: "", label: contactOptions.length ? "No contact" : "No contacts available" }, ...contactOptions]}
              />
            </label>
            <label className={styles.field}>
              <span>Pipeline</span>
              <SearchableSelect
                ariaLabel="Pipeline"
                name="pipelineId"
                value={form.pipelineId}
                onChange={onChange}
                options={[{ value: "", label: pipelineOptions.length ? "Select pipeline" : "No pipelines available" }, ...pipelineOptions]}
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
                options={[{ value: "", label: stageOptions.length ? "Select stage" : "No stages available" }, ...stageOptions]}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Amount</span>
              <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={onChange} placeholder="250000" required />
            </label>
            <label className={styles.field}>
              <span>Expected close date</span>
              <input name="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={onChange} />
            </label>
          </div>

          <label className={styles.field}>
            <span>Notes</span>
            <textarea name="notes" value={form.notes} onChange={onChange} rows={4} placeholder="Waiting for final pricing approval and consultant sign-off." />
          </label>

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit">
              {mode === "edit" ? "Save project" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DealsScreen({ user }) {
  const token = getAccessToken();
  const router = useRouter();
  const [pipelines, setPipelines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("EGP");
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [isGroupedByStage, setIsGroupedByStage] = useState(true);
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const [modalState, setModalState] = useState({ open: false, mode: "create", dealId: null });
  const [dealForm, setDealForm] = useState(emptyDealForm);
  const initialStoredPipelineId = useState(() => readStoredPipelineId(user))[0];
  const selectedCompanyId = user?.company?.id || user?.companies?.[0]?.id || "";

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === selectedPipelineId) || null,
    [pipelines, selectedPipelineId],
  );
  const topbarTeamUsers = useMemo(
    () => (selectedPipeline ? selectedPipeline.team || [] : uniqueTeamUsers(pipelines)),
    [pipelines, selectedPipeline],
  );
  const pipelineOptions = useMemo(() => pipelines.map((pipeline) => ({ value: String(pipeline.id), label: pipeline.name })), [pipelines]);
  const selectedFormPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === dealForm.pipelineId) || null,
    [pipelines, dealForm.pipelineId],
  );
  const visibleCompanyOptions = useMemo(() => {
    const compatibleCompanies = selectedFormPipeline
      ? companies.filter((company) => pipelineMatchesCompany(selectedFormPipeline, company))
      : companies;
    return compatibleCompanies.map((company) => ({ value: String(company.id), label: company.name }));
  }, [companies, selectedFormPipeline]);
  const allCompanyOptions = useMemo(
    () => companies.map((company) => ({ value: String(company.id), label: company.name })),
    [companies],
  );
  const visibleContactOptions = useMemo(() => {
    const companyContacts = dealForm.companyId
      ? companies.find((company) => String(company.id) === dealForm.companyId)?.contacts || []
      : companies.flatMap((company) => company.contacts || []);
    const fallbackContacts = dealForm.companyId ? contacts.filter((contact) => String(contact.company?.id || "") === dealForm.companyId) : contacts;
    const source = companyContacts.length ? companyContacts : fallbackContacts;
    return source.map((contact) => ({
      value: String(contact.id),
      label: `${contact.full_name} - ${contact.title || "Contact"}`,
    }));
  }, [companies, contacts, dealForm.companyId]);
  const selectedFormCompany = useMemo(
    () => companies.find((company) => String(company.id) === dealForm.companyId) || null,
    [companies, dealForm.companyId],
  );
  const visiblePipelineOptions = useMemo(() => {
    const compatiblePipelines = selectedFormCompany
      ? pipelines.filter((pipeline) => pipelineMatchesCompany(pipeline, selectedFormCompany))
      : pipelines;
    return compatiblePipelines.map((pipeline) => ({ value: String(pipeline.id), label: pipeline.name }));
  }, [pipelines, selectedFormCompany]);
  const stageOptions = useMemo(
    () => (selectedFormPipeline?.statuses || []).map((statusItem) => ({ value: statusItem.name, label: statusItem.name })),
    [selectedFormPipeline],
  );

  const visibleDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesPipeline = !selectedPipelineId || String(deal.pipeline_id) === selectedPipelineId;
      const matchesCompany = companyFilter === "all" || String(deal.company?.id) === companyFilter;
      const haystack = `${deal.name} ${deal.company?.name || ""} ${deal.contact?.full_name || ""}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
      return matchesPipeline && matchesCompany && matchesSearch;
    });
  }, [companyFilter, deals, search, selectedPipelineId]);

  const groupedDeals = useMemo(() => {
    const groups = new Map();
    (selectedPipeline?.statuses || []).forEach((statusItem) => {
      groups.set(statusItem.name, {
        id: statusItem.id,
        name: statusItem.name,
        color: statusItem.color,
        deals: [],
        total: 0,
      });
    });

    visibleDeals.forEach((deal) => {
      if (!groups.has(deal.stage)) {
        groups.set(deal.stage, {
          id: deal.stage,
          name: deal.stage,
          color: deal.stage_color || "#7C5F35",
          deals: [],
          total: 0,
        });
      }
      const group = groups.get(deal.stage);
      group.deals.push(deal);
      group.total += Number(deal.amount || 0);
    });

    return [...groups.values()].filter((group) => group.deals.length);
  }, [selectedPipeline, visibleDeals]);

  const totalAmount = useMemo(
    () => visibleDeals.reduce((sum, deal) => sum + Number(deal.amount || 0), 0),
    [visibleDeals],
  );

  useEffect(() => {
    const tokenValue = getAccessToken();
    let active = true;

    async function hydrate() {
      try {
        const [pipelinesResult, companiesResult, contactsResult, currenciesResult] = await Promise.allSettled([
          listPipelines(tokenValue, { kind: "deals" }),
          listCrmCompanies(tokenValue, { page: 1, page_size: 200 }),
          listContacts(tokenValue, { page: 1, page_size: 300 }),
          listCurrencies(tokenValue, { company_id: selectedCompanyId }),
        ]);

        if (!active) {
          return;
        }

        if (pipelinesResult.status !== "fulfilled") {
          throw pipelinesResult.reason;
        }

        const pipelinesData = pipelinesResult.value || [];
        const normalizedCompanies =
          companiesResult.status === "fulfilled" ? normalizePaginatedResponse(companiesResult.value).results : [];
        const normalizedContacts =
          contactsResult.status === "fulfilled" ? normalizePaginatedResponse(contactsResult.value).results : [];
        const currenciesData = currenciesResult.status === "fulfilled" ? currenciesResult.value || [] : [];
        const defaultCurrency = currenciesData.find((currency) => currency.is_default) || currenciesData[0];

        setPipelines(pipelinesData);
        setCompanies(normalizedCompanies);
        setContacts(normalizedContacts);
        setCurrencySymbol(defaultCurrency?.symbol || "EGP");

        const storedPipeline = pipelinesData.find((pipeline) => String(pipeline.id) === initialStoredPipelineId);
        const nextPipelineId = storedPipeline ? String(storedPipeline.id) : pipelinesData[0] ? String(pipelinesData[0].id) : "";
        setSelectedPipelineId(nextPipelineId);

        const helperFailures = [companiesResult, contactsResult, currenciesResult].filter((result) => result.status === "rejected");
        setStatus({
          loading: false,
          error: helperFailures.length ? "" : "",
          success: "",
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus({
          loading: false,
          error: error.message || "Unable to load projects workspace. If the backend was just updated, make sure migrations were applied.",
          success: "",
        });
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, [initialStoredPipelineId, selectedCompanyId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = getDealsStorageKey(user);
    if (selectedPipelineId) {
      window.localStorage.setItem(storageKey, selectedPipelineId);
      return;
    }

    window.localStorage.removeItem(storageKey);
  }, [selectedPipelineId, user]);

  useEffect(() => {
    let active = true;

    async function hydrateDeals() {
      if (!selectedPipelineId) {
        setDeals([]);
        return;
      }

      try {
        const dealsData = await listDeals(token, { page: 1, page_size: 300, pipeline_id: selectedPipelineId });
        if (!active) {
          return;
        }
        setDeals(normalizePaginatedResponse(dealsData).results);
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus((current) => ({
          ...current,
          error: error.message || "Unable to load projects. If the backend was just updated, make sure migrations were applied.",
        }));
      }
    }

    hydrateDeals();

    return () => {
      active = false;
    };
  }, [selectedPipelineId, token]);

  function setMessage(error = "", success = "") {
    setStatus((current) => ({ ...current, error, success, loading: false }));
  }

  async function loadDealOptions() {
    const [nextPipelines, nextCompanies, nextContacts] = await Promise.all([
      pipelines.length ? Promise.resolve(pipelines) : listPipelines(token, { kind: "deals" }),
      companies.length ? Promise.resolve(companies) : listCrmCompanies(token, { page: 1, page_size: 200 }).then((data) => normalizePaginatedResponse(data).results),
      contacts.length ? Promise.resolve(contacts) : listContacts(token, { page: 1, page_size: 300 }).then((data) => normalizePaginatedResponse(data).results),
    ]);

    setPipelines(nextPipelines || []);
    setCompanies(nextCompanies || []);
    setContacts(nextContacts || []);

    return {
      pipelines: nextPipelines || [],
      companies: nextCompanies || [],
      contacts: nextContacts || [],
    };
  }

  function updateDealForm(event) {
    const { name, value } = event.target;

    setDealForm((current) => {
      const nextState = { ...current, [name]: value };
      if (name === "pipelineId") {
        const nextPipeline = pipelines.find((pipeline) => String(pipeline.id) === value);
        const compatibleCompanies = nextPipeline ? companies.filter((company) => pipelineMatchesCompany(nextPipeline, company)) : companies;
        const nextCompany = compatibleCompanies.find((company) => String(company.id) === current.companyId) || compatibleCompanies[0] || null;
        nextState.stage = nextPipeline?.statuses?.[0]?.name || "";
        nextState.companyId = nextCompany ? String(nextCompany.id) : "";
        if (!nextCompany || !contacts.some((contact) => String(contact.id) === current.contactId && String(contact.company?.id || "") === String(nextCompany.id))) {
          nextState.contactId = "";
        }
      }
      if (name === "companyId" && current.contactId) {
        const stillMatches = contacts.some((contact) => String(contact.id) === current.contactId && String(contact.company?.id) === value);
        if (!stillMatches) {
          nextState.contactId = "";
        }
      }
      if (name === "companyId") {
        const nextCompany = companies.find((company) => String(company.id) === value) || null;
        const compatiblePipelines = nextCompany ? pipelines.filter((pipeline) => pipelineMatchesCompany(pipeline, nextCompany)) : pipelines;
        const nextPipeline = compatiblePipelines.find((pipeline) => String(pipeline.id) === current.pipelineId) || compatiblePipelines[0] || null;
        nextState.pipelineId = nextPipeline ? String(nextPipeline.id) : "";
        nextState.stage = nextPipeline?.statuses?.find((statusItem) => statusItem.name === current.stage)?.name || nextPipeline?.statuses?.[0]?.name || "";
      }
      return nextState;
    });
  }

  async function openCreateModal() {
    setMessage();
    try {
      const { pipelines: nextPipelines, companies: nextCompanies } = await loadDealOptions();
      const firstPipeline = selectedPipeline || nextPipelines[0] || null;

      if (!firstPipeline) {
        setMessage("Create a projects pipeline first.");
        return;
      }

      if (!nextCompanies.length) {
        setMessage("Create a CRM company first before adding a project.");
        return;
      }

      const compatibleCompanies = firstPipeline
        ? nextCompanies.filter((company) => pipelineMatchesCompany(firstPipeline, company))
        : nextCompanies;
      const firstCompanyWithContacts = compatibleCompanies.find((company) => (company.contacts || []).length > 0) || null;
      const defaultCompany = firstCompanyWithContacts || compatibleCompanies[0] || null;

      if (!defaultCompany) {
        setMessage("Create a CRM company in the same company workspace as this projects pipeline first.");
        return;
      }

      setDealForm({
        ...emptyDealForm,
        companyId: defaultCompany ? String(defaultCompany.id) : "",
        pipelineId: firstPipeline ? String(firstPipeline.id) : "",
        stage: firstPipeline?.statuses?.[0]?.name || "",
      });
      setModalState({ open: true, mode: "create", dealId: null });
    } catch (error) {
      setMessage(error.message || "Unable to load project options.");
    }
  }

  async function openEditModal(deal) {
    try {
      await loadDealOptions();
    } catch (error) {
      setMessage(error.message || "Unable to load project options.");
      return;
    }

    setDealForm({
      name: deal.name || "",
      companyId: deal.company?.id ? String(deal.company.id) : "",
      contactId: deal.contact?.id ? String(deal.contact.id) : "",
      pipelineId: deal.pipeline_id ? String(deal.pipeline_id) : selectedPipelineId,
      stage: deal.stage || "",
      amount: String(deal.amount || ""),
      expectedCloseDate: deal.expected_close_date || "",
      notes: deal.notes || "",
    });
    setModalState({ open: true, mode: "edit", dealId: deal.id });
    setMessage();
  }

  function closeModal() {
    setModalState({ open: false, mode: "create", dealId: null });
    setDealForm(emptyDealForm);
  }

  async function refreshDeals(nextPipelineId = selectedPipelineId) {
    if (!nextPipelineId) {
      setDeals([]);
      return;
    }

    const dealsData = await listDeals(token, { page: 1, page_size: 300, pipeline_id: nextPipelineId });
    setDeals(normalizePaginatedResponse(dealsData).results);
  }

  async function handleDealSubmit(event) {
    event.preventDefault();

    if (!dealForm.companyId) {
      setMessage("Create or select a CRM company before saving a project.");
      return;
    }

    if (!dealForm.pipelineId) {
      setMessage("Select a projects pipeline before saving.");
      return;
    }

    if (!dealForm.stage) {
      setMessage("Select a stage before saving.");
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
      notes: dealForm.notes.trim(),
    };

    try {
      if (modalState.mode === "edit" && modalState.dealId) {
        await updateDeal(token, modalState.dealId, payload);
        setMessage("", "Project updated.");
      } else {
        await createDeal(token, payload);
        setMessage("", "Project created.");
      }

      if (payload.pipeline_id && String(payload.pipeline_id) !== selectedPipelineId) {
        setSelectedPipelineId(String(payload.pipeline_id));
      } else {
        await refreshDeals();
      }
      closeModal();
    } catch (error) {
      setMessage(error.message || "Unable to save project.");
    }
  }

  async function handleDeleteDeal(deal) {
    if (!window.confirm(`Delete ${deal.name}?`)) {
      return;
    }

    try {
      await deleteDeal(token, deal.id);
      await refreshDeals();
      setMessage("", "Project deleted.");
    } catch (error) {
      setMessage(error.message || "Unable to delete project.");
    }
  }

  if (status.loading) {
    return null;
  }

  return (
    <DashboardShell
      sidebar={<Sidebar user={user} />}
      topbar={<Topbar user={user} memberUsers={topbarTeamUsers} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Projects" }]} />}
    >
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <h1>Projects</h1>
            <p className={styles.heroMeta}>
              {visibleDeals.length} projects - {formatCurrency(currencySymbol, totalAmount)} total
            </p>
          </div>
          <div className={styles.heroActions}>
            <button
              className={styles.metaBadge}
              type="button"
              onClick={() => setIsGroupedByStage((current) => !current)}
              aria-pressed={isGroupedByStage}
            >
              {isGroupedByStage ? "Grouped by stage" : "Normal view"}
            </button>
            <button className={styles.primaryButton} type="button" onClick={openCreateModal} disabled={!pipelines.length}>
              <PlusIcon />
              <span>New project</span>
            </button>
          </div>
        </section>

        {status.error ? <p className={styles.error}>{status.error}</p> : null}
        {status.success ? <p className={styles.success}>{status.success}</p> : null}

        <section className={styles.filterBar}>
          <label className={styles.searchField}>
            <span className={styles.visuallyHidden}>Search projects</span>
            <span className={styles.searchIcon} aria-hidden="true">
              <SearchIcon />
            </span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, companies, contacts..." />
          </label>

          <label className={styles.filterField}>
            <span className={styles.visuallyHidden}>Pipeline</span>
            <SearchableSelect ariaLabel="Pipeline" value={selectedPipelineId} onValueChange={setSelectedPipelineId} options={pipelineOptions} />
          </label>

          <label className={styles.filterField}>
            <span className={styles.visuallyHidden}>Company</span>
            <SearchableSelect
              ariaLabel="Company filter"
              value={companyFilter}
              onValueChange={setCompanyFilter}
              options={[{ value: "all", label: "All companies" }, ...allCompanyOptions]}
            />
          </label>
        </section>

        {selectedPipeline && visibleDeals.length ? (
          <section className={styles.panel}>
            <div className={styles.tableHeader}>
              <span>Project</span>
              <span>Amount</span>
              <span>Primary contact</span>
              <span>Close date</span>
              <span>In stage</span>
              <span>Owner</span>
              <span className={styles.actionHeader}>Actions</span>
            </div>
            {isGroupedByStage
              ? groupedDeals.map((group) => (
                  <article key={group.id} className={styles.stageSection}>
                    <div className={styles.stageHeader}>
                      <div className={styles.stageLead}>
                        <span className={styles.stageDot} style={{ background: group.color }} />
                        <strong>{group.name}</strong>
                        <span className={styles.stageCount}>{group.deals.length}</span>
                      </div>
                      <span className={styles.stageTotal}>{formatCurrency(currencySymbol, group.total)}</span>
                    </div>

                    <div className={styles.rows}>
                      {group.deals.map((deal) => (
                        <div
                          key={deal.id}
                          className={styles.dealRow}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/deals/${deal.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/deals/${deal.id}`);
                            }
                          }}
                        >
                          <div className={styles.dealIdentity}>
                            <CompanyAvatar name={deal.company?.name || "No company"} />
                            <div>
                              <strong>{deal.name}</strong>
                              <span>{deal.company?.name || "No company"}</span>
                            </div>
                          </div>
                          <div className={styles.amountCell}>{formatCurrency(currencySymbol, deal.amount)}</div>
                          <div className={styles.contactCell}>{deal.contact?.full_name || "No contact"}</div>
                          <div className={styles.dateCell}>{formatShortDate(deal.expected_close_date)}</div>
                          <div className={styles.daysCell}>{deal.days_in_stage}d</div>
                          <div className={styles.ownerCell}>
                            <OwnerAvatar name={deal.owner?.full_name || "Unassigned"} />
                          </div>
                          <div className={styles.rowActions}>
                            <button
                              className={styles.inlineIconButton}
                              type="button"
                              aria-label={`Edit ${deal.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditModal(deal);
                              }}
                            >
                              <EditIcon />
                            </button>
                            <button
                              className={styles.deleteIconButton}
                              type="button"
                              aria-label={`Delete ${deal.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteDeal(deal);
                              }}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              : (
                  <div className={styles.rows}>
                    {visibleDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className={styles.dealRow}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/deals/${deal.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/deals/${deal.id}`);
                          }
                        }}
                      >
                        <div className={styles.dealIdentity}>
                          <CompanyAvatar name={deal.company?.name || "No company"} />
                          <div>
                            <strong>{deal.name}</strong>
                            <span>{deal.company?.name || "No company"}</span>
                          </div>
                        </div>
                        <div className={styles.amountCell}>{formatCurrency(currencySymbol, deal.amount)}</div>
                        <div className={styles.contactCell}>{deal.contact?.full_name || "No contact"}</div>
                        <div className={styles.dateCell}>{formatShortDate(deal.expected_close_date)}</div>
                        <div className={styles.daysCell}>{deal.days_in_stage}d</div>
                        <div className={styles.ownerCell}>
                          <OwnerAvatar name={deal.owner?.full_name || "Unassigned"} />
                        </div>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.inlineIconButton}
                            type="button"
                            aria-label={`Edit ${deal.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(deal);
                            }}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className={styles.deleteIconButton}
                            type="button"
                            aria-label={`Delete ${deal.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteDeal(deal);
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </section>
        ) : (
          <section className={`${styles.panel} ${styles.emptyState}`}>
            <span className={styles.emptyIcon}>
              <DealsIcon />
            </span>
            <strong>No projects yet</strong>
            <p>Create your first opportunity and it will appear here grouped under its stage.</p>
            <button className={styles.primaryButton} type="button" onClick={openCreateModal}>
              <PlusIcon />
              <span>Create first project</span>
            </button>
          </section>
        )}

        {modalState.open ? (
          <DealModal
            mode={modalState.mode}
            form={dealForm}
            companyOptions={visibleCompanyOptions}
            contactOptions={visibleContactOptions}
            pipelineOptions={visiblePipelineOptions}
            stageOptions={stageOptions}
            onChange={updateDealForm}
            onClose={closeModal}
            onSubmit={handleDealSubmit}
          />
        ) : null}
      </div>
    </DashboardShell>
  );
}
