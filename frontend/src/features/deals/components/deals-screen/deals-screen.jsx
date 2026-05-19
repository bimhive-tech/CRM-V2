"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { DealsIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
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
  probability: "",
  expectedCloseDate: "",
  notes: "",
};

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

function OwnerAvatar({ name }) {
  const safeName = name || "Owner";
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
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={mode === "edit" ? "Edit deal" : "Create deal"}>
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>Deals</p>
            <h2>{mode === "edit" ? "Edit deal" : "Create deal"}</h2>
            <p className={styles.copy}>Use the same modal for creation and editing so opportunity records stay consistent.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={onSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Deal name</span>
              <input name="name" value={form.name} onChange={onChange} placeholder="Nile Contracting - Annual Fit-Out Package" required />
            </label>
            <label className={styles.field}>
              <span>Company</span>
              <select name="companyId" value={form.companyId} onChange={onChange} required>
                <option value="">Select company</option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Contact</span>
              <select name="contactId" value={form.contactId} onChange={onChange}>
                <option value="">No contact</option>
                {contactOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Pipeline</span>
              <select name="pipelineId" value={form.pipelineId} onChange={onChange} required>
                <option value="">Select pipeline</option>
                {pipelineOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Stage</span>
              <select name="stage" value={form.stage} onChange={onChange} required>
                <option value="">Select stage</option>
                {stageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Amount</span>
              <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={onChange} placeholder="250000" required />
            </label>
            <label className={styles.field}>
              <span>Probability</span>
              <input name="probability" type="number" min="0" max="100" value={form.probability} onChange={onChange} placeholder="45" required />
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
              {mode === "edit" ? "Save deal" : "Create deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DealsScreen({ user }) {
  const token = getAccessToken();
  const [pipelines, setPipelines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("EGP");
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const [modalState, setModalState] = useState({ open: false, mode: "create", dealId: null });
  const [dealForm, setDealForm] = useState(emptyDealForm);
  const initialStoredPipelineId = useState(() => readStoredPipelineId(user))[0];
  const selectedCompanyId = user?.company?.id || user?.companies?.[0]?.id || "";

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === selectedPipelineId) || null,
    [pipelines, selectedPipelineId],
  );
  const pipelineOptions = useMemo(() => pipelines.map((pipeline) => ({ value: String(pipeline.id), label: pipeline.name })), [pipelines]);
  const companyOptions = useMemo(() => companies.map((company) => ({ value: String(company.id), label: company.name })), [companies]);
  const visibleContactOptions = useMemo(() => {
    const source = dealForm.companyId ? contacts.filter((contact) => String(contact.company?.id || "") === dealForm.companyId) : contacts;
    return source.map((contact) => ({
      value: String(contact.id),
      label: `${contact.full_name} - ${contact.title || "Contact"}`,
    }));
  }, [contacts, dealForm.companyId]);
  const stageOptions = useMemo(
    () => (selectedPipeline?.statuses || []).map((statusItem) => ({ value: statusItem.name, label: statusItem.name })),
    [selectedPipeline],
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
        const [pipelinesData, companiesData, contactsData, currenciesData] = await Promise.all([
          listPipelines(tokenValue),
          listCrmCompanies(tokenValue, { page: 1, page_size: 200 }),
          listContacts(tokenValue, { page: 1, page_size: 300 }),
          listCurrencies(tokenValue, { company_id: selectedCompanyId }),
        ]);

        if (!active) {
          return;
        }

        const normalizedCompanies = normalizePaginatedResponse(companiesData).results;
        const normalizedContacts = normalizePaginatedResponse(contactsData).results;
        const defaultCurrency = currenciesData.find((currency) => currency.is_default) || currenciesData[0];

        setPipelines(pipelinesData);
        setCompanies(normalizedCompanies);
        setContacts(normalizedContacts);
        setCurrencySymbol(defaultCurrency?.symbol || "EGP");

        const storedPipeline = pipelinesData.find((pipeline) => String(pipeline.id) === initialStoredPipelineId);
        const nextPipelineId = storedPipeline ? String(storedPipeline.id) : pipelinesData[0] ? String(pipelinesData[0].id) : "";
        setSelectedPipelineId(nextPipelineId);
        setStatus({ loading: false, error: "", success: "" });
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus({
          loading: false,
          error: error.message || "Unable to load deals workspace. If the backend was just updated, make sure migrations were applied.",
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
          error: error.message || "Unable to load deals. If the backend was just updated, make sure migrations were applied.",
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

  function updateDealForm(event) {
    const { name, value } = event.target;

    setDealForm((current) => {
      const nextState = { ...current, [name]: value };
      if (name === "pipelineId") {
        const nextPipeline = pipelines.find((pipeline) => String(pipeline.id) === value);
        nextState.stage = nextPipeline?.statuses?.[0]?.name || "";
      }
      if (name === "companyId" && current.contactId) {
        const stillMatches = contacts.some((contact) => String(contact.id) === current.contactId && String(contact.company?.id) === value);
        if (!stillMatches) {
          nextState.contactId = "";
        }
      }
      return nextState;
    });
  }

  function openCreateModal() {
    const firstPipeline = selectedPipeline || pipelines[0] || null;
    setDealForm({
      ...emptyDealForm,
      companyId: companies[0] ? String(companies[0].id) : "",
      pipelineId: firstPipeline ? String(firstPipeline.id) : "",
      stage: firstPipeline?.statuses?.[0]?.name || "",
    });
    setModalState({ open: true, mode: "create", dealId: null });
    setMessage();
  }

  function openEditModal(deal) {
    setDealForm({
      name: deal.name || "",
      companyId: deal.company?.id ? String(deal.company.id) : "",
      contactId: deal.contact?.id ? String(deal.contact.id) : "",
      pipelineId: deal.pipeline_id ? String(deal.pipeline_id) : selectedPipelineId,
      stage: deal.stage || "",
      amount: String(deal.amount || ""),
      probability: String(deal.probability ?? ""),
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

    const payload = {
      name: dealForm.name.trim(),
      company_id: Number(dealForm.companyId),
      contact_id: dealForm.contactId ? Number(dealForm.contactId) : null,
      pipeline_id: Number(dealForm.pipelineId),
      stage: dealForm.stage,
      amount: dealForm.amount ? Number(dealForm.amount) : 0,
      probability: dealForm.probability ? Number(dealForm.probability) : 0,
      expected_close_date: dealForm.expectedCloseDate || null,
      notes: dealForm.notes.trim(),
    };

    try {
      if (modalState.mode === "edit" && modalState.dealId) {
        await updateDeal(token, modalState.dealId, payload);
        setMessage("", "Deal updated.");
      } else {
        await createDeal(token, payload);
        setMessage("", "Deal created.");
      }

      if (payload.pipeline_id && String(payload.pipeline_id) !== selectedPipelineId) {
        setSelectedPipelineId(String(payload.pipeline_id));
      } else {
        await refreshDeals();
      }
      closeModal();
    } catch (error) {
      setMessage(error.message || "Unable to save deal.");
    }
  }

  async function handleDeleteDeal(deal) {
    if (!window.confirm(`Delete ${deal.name}?`)) {
      return;
    }

    try {
      await deleteDeal(token, deal.id);
      await refreshDeals();
      setMessage("", "Deal deleted.");
    } catch (error) {
      setMessage(error.message || "Unable to delete deal.");
    }
  }

  if (status.loading) {
    return null;
  }

  return (
    <DashboardShell
      sidebar={<Sidebar user={user} />}
      topbar={<Topbar user={user} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Deals" }]} />}
    >
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <h1>Deals</h1>
            <p className={styles.heroMeta}>
              {visibleDeals.length} deals · {formatCurrency(currencySymbol, totalAmount)} total
            </p>
          </div>
          <div className={styles.heroActions}>
            <div className={styles.metaBadge}>Grouped by stage</div>
            <button className={styles.primaryButton} type="button" onClick={openCreateModal}>
              <PlusIcon />
              <span>New deal</span>
            </button>
          </div>
        </section>

        {status.error ? <p className={styles.error}>{status.error}</p> : null}
        {status.success ? <p className={styles.success}>{status.success}</p> : null}

        <section className={styles.filterBar}>
          <label className={styles.searchField}>
            <span className={styles.visuallyHidden}>Search deals</span>
            <span className={styles.searchIcon} aria-hidden="true">
              <SearchIcon />
            </span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search deals, companies, contacts..." />
          </label>

          <label className={styles.filterField}>
            <span className={styles.visuallyHidden}>Pipeline</span>
            <select value={selectedPipelineId} onChange={(event) => setSelectedPipelineId(event.target.value)}>
              {pipelineOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.visuallyHidden}>Company</span>
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="all">All companies</option>
              {companyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {selectedPipeline && groupedDeals.length ? (
          <section className={styles.panel}>
            {groupedDeals.map((group) => (
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
                    <div key={deal.id} className={styles.dealRow}>
                      <div className={styles.dealIdentity}>
                        <span className={styles.dealMark}>{(deal.company?.name || "D").slice(0, 2).toUpperCase()}</span>
                        <div>
                          <strong>{deal.name}</strong>
                          <span>{deal.company?.name || "No company"}</span>
                        </div>
                      </div>
                      <div className={styles.amountCell}>{formatCurrency(currencySymbol, deal.amount)}</div>
                      <div className={styles.progressCell}>
                        <div className={styles.progressTrack}>
                          <span className={styles.progressFill} style={{ width: `${deal.probability || 0}%`, background: group.color }} />
                        </div>
                        <span>{deal.probability || 0}%</span>
                      </div>
                      <div className={styles.dateCell}>{formatShortDate(deal.expected_close_date)}</div>
                      <div className={styles.daysCell}>{deal.days_in_stage}d</div>
                      <div className={styles.ownerCell}>
                        <OwnerAvatar name={deal.owner?.full_name || "Unassigned"} />
                      </div>
                      <div className={styles.rowActions}>
                        <button className={styles.inlineIconButton} type="button" aria-label={`Edit ${deal.name}`} onClick={() => openEditModal(deal)}>
                          <EditIcon />
                        </button>
                        <button className={styles.deleteIconButton} type="button" aria-label={`Delete ${deal.name}`} onClick={() => handleDeleteDeal(deal)}>
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className={`${styles.panel} ${styles.emptyState}`}>
            <span className={styles.emptyIcon}>
              <DealsIcon />
            </span>
            <strong>No deals yet</strong>
            <p>Create your first opportunity and it will appear here grouped under its stage.</p>
            <button className={styles.primaryButton} type="button" onClick={openCreateModal}>
              <PlusIcon />
              <span>Create first deal</span>
            </button>
          </section>
        )}

        {modalState.open ? (
          <DealModal
            mode={modalState.mode}
            form={dealForm}
            companyOptions={companyOptions}
            contactOptions={visibleContactOptions}
            pipelineOptions={pipelineOptions}
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
