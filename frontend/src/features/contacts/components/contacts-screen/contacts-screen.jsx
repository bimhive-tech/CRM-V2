"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { ClipboardIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import {
  createContact,
  createCrmCompany,
  deleteContact,
  deleteCrmCompany,
  listContacts,
  listCrmCompanies,
  listPipelines,
  listUsers,
  updateContact,
  updateCrmCompany,
} from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import { CompanyModal, ContactsModal } from "./contacts-modal";
import styles from "./contacts-screen.module.css";

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
  phone: "",
  companyId: "",
  ownerId: "",
  status: "Lead",
  lastTouch: "",
  notes: "",
};

const emptyCompanyForm = {
  name: "",
  ownerName: "",
  email: "",
  website: "",
  employeeCount: "",
  phoneNumbers: [""],
  addressCountry: "",
  addressState: "",
  addressLine: "",
};

function formatDateForInput(value) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

function formatDateForDisplay(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function normalizeStatusLabel(value) {
  return legacyStatusLabelMap[value] || value;
}

function stringToHue(value) {
  return (
    value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % 360
  );
}

function mapContactFromApi(contact) {
  return {
    id: contact.id,
    fullName: contact.full_name,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    companyId: contact.company?.id ? String(contact.company.id) : "",
    company: contact.company?.name || "No company",
    status: normalizeStatusLabel(contact.status),
    ownerId: contact.owner?.id ? String(contact.owner.id) : "",
    owner: contact.owner?.full_name || "Unassigned",
    lastTouch: formatDateForDisplay(contact.last_touch),
    lastTouchRaw: formatDateForInput(contact.last_touch),
    notes: contact.notes || "",
  };
}

function mapCompanyFromApi(company) {
  return {
    id: company.id,
    name: company.name,
    ownerName: company.owner_name || "No owner listed",
    email: company.email || "No email",
    website: company.website || "No website",
    phoneNumbers: company.phone_numbers?.length ? company.phone_numbers : company.phone_number ? [company.phone_number] : [],
    employeeCount: company.employee_count || null,
    address: company.address || "No address",
    addressCountry: company.address_country || "",
    addressState: company.address_state || "",
    addressLine: company.address_line || "",
    contacts: (company.contacts || []).map((contact) => ({
      id: contact.id,
      fullName: contact.full_name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      status: normalizeStatusLabel(contact.status),
    })),
  };
}

function mapContactToPayload(form) {
  return {
    full_name: form.fullName.trim(),
    title: form.title.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    company_id: Number(form.companyId),
    owner_id: form.ownerId ? Number(form.ownerId) : null,
    status: form.status.trim(),
    last_touch: form.lastTouch,
    notes: form.notes.trim(),
  };
}

function mapCompanyToPayload(form) {
  const phoneNumbers = form.phoneNumbers.map((number) => number.trim()).filter(Boolean);

  return {
    name: form.name.trim(),
    owner_name: form.ownerName.trim(),
    email: form.email.trim(),
    website: form.website.trim(),
    phone_numbers: phoneNumbers,
    phone_number: phoneNumbers[0] || "",
    address_country: form.addressCountry.trim(),
    address_state: form.addressState.trim(),
    address_line: form.addressLine.trim(),
    employee_count: form.employeeCount ? Number(form.employeeCount) : null,
  };
}

function toContactFormState(contact) {
  return {
    fullName: contact.fullName,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    companyId: contact.companyId,
    ownerId: contact.ownerId,
    status: contact.status,
    lastTouch: contact.lastTouchRaw,
    notes: contact.notes,
  };
}

function toCompanyFormState(company) {
  return {
    name: company.name || "",
    ownerName: company.ownerName || "",
    email: company.email === "No email" ? "" : company.email,
    website: company.website === "No website" ? "" : company.website,
    employeeCount: company.employeeCount ? String(company.employeeCount) : "",
    phoneNumbers: company.phoneNumbers.length ? company.phoneNumbers : [""],
    addressCountry: company.addressCountry || "",
    addressState: company.addressState || "",
    addressLine: company.addressLine || "",
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
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const hue = stringToHue(name || "owner");

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

export function ContactsScreen({ user }) {
  const token = getAccessToken();
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pipelineStatuses, setPipelineStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("companies");
  const [statusMessage, setStatusMessage] = useState({ error: "", success: "" });
  const [filters, setFilters] = useState({ search: "", status: "All statuses", owner: "All owners" });
  const [contactModalState, setContactModalState] = useState({ open: false, mode: "create", contactId: null });
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [companyModalState, setCompanyModalState] = useState({ open: false, mode: "create", companyId: null });
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);

  const statusOptions = useMemo(() => {
    const uniqueStatuses = [...new Set(pipelineStatuses.filter(Boolean))];
    return ["All statuses", ...(uniqueStatuses.length ? uniqueStatuses : ["Lead"])];
  }, [pipelineStatuses]);
  const contactStatusOptions = statusOptions.filter((option) => option !== "All statuses");
  const companyOptions = useMemo(() => companies.map((company) => ({ value: String(company.id), label: company.name })), [companies]);
  const ownerOptions = useMemo(
    () => [{ value: "", label: "Unassigned" }, ...owners.map((owner) => ({ value: String(owner.id), label: owner.full_name }))],
    [owners],
  );
  const ownerFilterOptions = useMemo(() => ["All owners", ...owners.map((owner) => owner.full_name)], [owners]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        !filters.search ||
        [contact.fullName, contact.email, contact.company, contact.title].some((value) =>
          value.toLowerCase().includes(filters.search.toLowerCase()),
        );
      const matchesStatus = filters.status === "All statuses" || contact.status === filters.status;
      const matchesOwner = filters.owner === "All owners" || contact.owner === filters.owner;

      return matchesSearch && matchesStatus && matchesOwner;
    });
  }, [contacts, filters]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      if (!filters.search) {
        return true;
      }

      const haystack = [
        company.name,
        company.ownerName,
        company.email,
        company.website,
        company.address,
        ...company.phoneNumbers,
        ...company.contacts.map((contact) => `${contact.fullName} ${contact.email} ${contact.phone}`),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(filters.search.toLowerCase());
    });
  }, [companies, filters.search]);

  const heroMeta = useMemo(() => {
    if (viewMode === "companies") {
      return `${companies.length} companies`;
    }
    return `${contacts.length} contacts`;
  }, [companies.length, contacts.length, viewMode]);

  const fetchContactsData = useCallback(async () => {
    const [contactsData, companiesData, usersData, pipelinesData] = await Promise.all([
      listContacts(token),
      listCrmCompanies(token),
      listUsers(token),
      listPipelines(token),
    ]);

    return {
      contactsData: contactsData.map(mapContactFromApi),
      companiesData: companiesData.map(mapCompanyFromApi),
      usersData,
      pipelineStatusesData: [...new Set(pipelinesData.flatMap((pipeline) => (pipeline.statuses || []).map((status) => status.name)))],
    };
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const { contactsData, companiesData, usersData, pipelineStatusesData } = await fetchContactsData();
      setContacts(contactsData);
      setCompanies(companiesData);
      setOwners(usersData);
      setPipelineStatuses(pipelineStatusesData);
      setStatusMessage({ error: "", success: "" });
    } catch (error) {
      setStatusMessage({ error: error.message || "Unable to load contacts.", success: "" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function hydrateContacts() {
      try {
        const { contactsData, companiesData, usersData, pipelineStatusesData } = await fetchContactsData();
        if (!active) {
          return;
        }
        setContacts(contactsData);
        setCompanies(companiesData);
        setOwners(usersData);
        setPipelineStatuses(pipelineStatusesData);
        setStatusMessage({ error: "", success: "" });
      } catch (error) {
        if (!active) {
          return;
        }
        setStatusMessage({ error: error.message || "Unable to load contacts.", success: "" });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    hydrateContacts();

    return () => {
      active = false;
    };
  }, [fetchContactsData]);

  function updateFilters(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function updateContactForm(event) {
    const { name, value } = event.target;
    setContactForm((current) => ({ ...current, [name]: value }));
  }

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

  function openCreateContactModal() {
    setContactForm({
      ...emptyContactForm,
      companyId: companyOptions[0]?.value || "",
      ownerId: ownerOptions[0]?.value || "",
      status: contactStatusOptions[0] || "Lead",
      lastTouch: new Date().toISOString().slice(0, 10),
    });
    setContactModalState({ open: true, mode: "create", contactId: null });
    setStatusMessage((current) => ({ ...current, error: "" }));
  }

  function openEditContactModal(contact) {
    setContactForm({
      ...toContactFormState(contact),
      status: contact.status || contactStatusOptions[0] || "Lead",
    });
    setContactModalState({ open: true, mode: "edit", contactId: contact.id });
    setStatusMessage((current) => ({ ...current, error: "" }));
  }

  function closeContactModal() {
    setContactModalState({ open: false, mode: "create", contactId: null });
    setContactForm(emptyContactForm);
  }

  function openCreateCompanyModal() {
    setCompanyForm(emptyCompanyForm);
    setCompanyModalState({ open: true, mode: "create", companyId: null });
    setStatusMessage((current) => ({ ...current, error: "" }));
  }

  function openEditCompanyModal(company) {
    setCompanyForm(toCompanyFormState(company));
    setCompanyModalState({ open: true, mode: "edit", companyId: company.id });
    setStatusMessage((current) => ({ ...current, error: "" }));
  }

  function closeCompanyModal() {
    setCompanyModalState({ open: false, mode: "create", companyId: null });
    setCompanyForm(emptyCompanyForm);
  }

  async function handleContactSubmit(event) {
    event.preventDefault();

    try {
      if (contactModalState.mode === "edit" && contactModalState.contactId) {
        await updateContact(token, contactModalState.contactId, mapContactToPayload(contactForm));
        setStatusMessage({ error: "", success: "Contact updated." });
      } else {
        await createContact(token, mapContactToPayload(contactForm));
        setStatusMessage({ error: "", success: "Contact created." });
      }

      await loadData();
      closeContactModal();
    } catch (error) {
      setStatusMessage({ error: error.message || "Unable to save contact.", success: "" });
    }
  }

  async function handleCompanySubmit(event) {
    event.preventDefault();

    try {
      if (companyModalState.mode === "edit" && companyModalState.companyId) {
        await updateCrmCompany(token, companyModalState.companyId, mapCompanyToPayload(companyForm));
        setStatusMessage({ error: "", success: "Company updated." });
      } else {
        await createCrmCompany(token, mapCompanyToPayload(companyForm));
        setStatusMessage({ error: "", success: "Company created." });
      }

      await loadData();
      closeCompanyModal();
    } catch (error) {
      setStatusMessage({ error: error.message || "Unable to save company.", success: "" });
    }
  }

  async function handleDelete(contactId) {
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact || !window.confirm(`Delete ${contact.fullName}?`)) {
      return;
    }

    try {
      await deleteContact(token, contactId);
      await loadData();
      setStatusMessage({ error: "", success: "Contact deleted." });
    } catch (error) {
      setStatusMessage({ error: error.message || "Unable to delete contact.", success: "" });
    }
  }

  async function handleDeleteCompany(companyId, companyName) {
    if (!window.confirm(`Delete ${companyName}?`)) {
      return;
    }

    try {
      await deleteCrmCompany(token, companyId);
      await loadData();
      setStatusMessage({ error: "", success: "Company deleted." });
    } catch (error) {
      setStatusMessage({ error: error.message || "Unable to delete company.", success: "" });
    }
  }

  function openCompanyDetails(companyId) {
    router.push(`/contacts/companies/${companyId}`);
  }

  return (
    <DashboardShell sidebar={<Sidebar user={user} />} topbar={<Topbar user={user} title="Contacts" />}>
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Contacts</p>
            <h1>People and companies in one shared directory</h1>
            <p className={styles.heroMeta}>{heroMeta}</p>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.secondaryButton} type="button">
              Import CSV
            </button>
            <button className={styles.secondaryButton} type="button" onClick={openCreateCompanyModal}>
              <PlusIcon />
              <span>New company</span>
            </button>
            <button className={styles.primaryButton} type="button" onClick={openCreateContactModal} disabled={!companyOptions.length}>
              <PlusIcon />
              <span>New contact</span>
            </button>
          </div>
        </section>

        {statusMessage.error ? <p className={styles.error}>{statusMessage.error}</p> : null}
        {statusMessage.success ? <p className={styles.success}>{statusMessage.success}</p> : null}

        <section className={styles.filterBar}>
          <div className={styles.viewToggle} role="tablist" aria-label="Directory views">
            <button
              className={`${styles.toggleButton} ${viewMode === "contacts" ? styles.toggleButtonActive : ""}`}
              type="button"
              onClick={() => setViewMode("contacts")}
            >
              Contacts
            </button>
            <button
              className={`${styles.toggleButton} ${viewMode === "companies" ? styles.toggleButtonActive : ""}`}
              type="button"
              onClick={() => setViewMode("companies")}
            >
              Companies
            </button>
          </div>

          <label className={styles.searchField}>
            <span className={styles.visuallyHidden}>Search directory</span>
            <span className={styles.searchIcon} aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              name="search"
              value={filters.search}
              onChange={updateFilters}
              placeholder={viewMode === "contacts" ? "Search by name, email, company, or title" : "Search by company, owner, contact, or website"}
            />
          </label>

          {viewMode === "contacts" ? (
            <>
              <label className={styles.filterField}>
                <span>Status</span>
                <select name="status" value={filters.status} onChange={updateFilters}>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.filterField}>
                <span>Owner</span>
                <select name="owner" value={filters.owner} onChange={updateFilters}>
                  {ownerFilterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setFilters({ search: "", status: "All statuses", owner: "All owners" })}
          >
            Reset
          </button>
        </section>

        <section className={styles.panel}>
          {loading ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <ClipboardIcon />
              </span>
              <strong>Loading directory</strong>
              <p>Please wait while we load your workspace records.</p>
            </div>
          ) : viewMode === "contacts" ? (
            filteredContacts.length ? (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Contact</th>
                        <th>Company</th>
                        <th>Status</th>
                        <th>Owner</th>
                        <th>Last touch</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id}>
                          <td>
                            <div className={styles.contactMeta}>
                              <strong>{contact.fullName}</strong>
                              <span>{contact.title}</span>
                              <span className={styles.monoText}>{contact.email}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.companyCell}>
                              <CompanyMark company={contact.company} />
                              <div className={styles.companyMeta}>
                                <strong>{contact.company}</strong>
                                <span className={styles.monoText}>{contact.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <ContactStatus value={contact.status} />
                          </td>
                          <td>
                            <div className={styles.ownerCell}>
                              <OwnerAvatar name={contact.owner} />
                              <span>{contact.owner}</span>
                            </div>
                          </td>
                          <td className={styles.monoText}>{contact.lastTouch}</td>
                          <td className={styles.actionsCell}>
                            <button className={styles.inlineButton} type="button" onClick={() => openEditContactModal(contact)}>
                              Edit
                            </button>
                            <button className={styles.inlineDanger} type="button" onClick={() => handleDelete(contact.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.mobileList}>
                  {filteredContacts.map((contact) => (
                    <article key={contact.id} className={styles.mobileCard}>
                      <div className={styles.mobileCardHeader}>
                        <div className={styles.mobileCardLead}>
                          <CompanyMark company={contact.company} />
                          <div className={styles.contactMeta}>
                            <strong>{contact.fullName}</strong>
                            <span>{contact.title}</span>
                          </div>
                        </div>
                        <ContactStatus value={contact.status} />
                      </div>

                      <div className={styles.mobileCardGrid}>
                        <div>
                          <p className={styles.mobileLabel}>Company</p>
                          <p className={styles.mobileValue}>{contact.company}</p>
                        </div>
                        <div>
                          <p className={styles.mobileLabel}>Owner</p>
                          <div className={styles.ownerCell}>
                            <OwnerAvatar name={contact.owner} />
                            <span>{contact.owner}</span>
                          </div>
                        </div>
                        <div>
                          <p className={styles.mobileLabel}>Email</p>
                          <p className={styles.mobileValueMono}>{contact.email}</p>
                        </div>
                        <div>
                          <p className={styles.mobileLabel}>Last touch</p>
                          <p className={styles.mobileValueMono}>{contact.lastTouch}</p>
                        </div>
                      </div>

                      <p className={styles.mobileNotes}>{contact.notes || "No notes yet."}</p>

                      <div className={styles.cardActions}>
                        <button className={styles.inlineButton} type="button" onClick={() => openEditContactModal(contact)}>
                          Edit
                        </button>
                        <button className={styles.inlineDanger} type="button" onClick={() => handleDelete(contact.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>
                  <ClipboardIcon />
                </span>
                <strong>No contacts yet</strong>
                <p>Create your first contact to start building your directory.</p>
              </div>
            )
          ) : filteredCompanies.length ? (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Owner</th>
                      <th>Email</th>
                      <th>Phone Numbers</th>
                      <th>Contacts</th>
                      <th>Website</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => (
                      <tr key={company.id} className={styles.clickableRow} onClick={() => openCompanyDetails(company.id)}>
                        <td>
                          <div className={styles.companyCell}>
                            <CompanyMark company={company.name} />
                            <div className={styles.companyMeta}>
                                <strong>{company.name}</strong>
                                <div className={styles.addressPreview}>
                                  <span className={styles.addressText}>{company.address}</span>
                                  <span className={styles.addressTooltip}>{company.address}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        <td>
                          <div className={styles.ownerCell}>
                            <OwnerAvatar name={company.ownerName} />
                            <span>{company.ownerName}</span>
                          </div>
                        </td>
                        <td className={styles.monoText}>{company.email}</td>
                        <td className={styles.monoText}>{company.phoneNumbers.join(" · ") || "No number"}</td>
                        <td>
                          <div className={styles.contactListCell}>
                            {company.contacts.length ? (
                              company.contacts.map((contact) => (
                                <span key={contact.id} className={styles.contactPill}>
                                  {contact.fullName}
                                </span>
                              ))
                            ) : (
                              <span className={styles.monoText}>No contacts</span>
                            )}
                          </div>
                        </td>
                        <td>{company.website !== "No website" ? company.website : "No website"}</td>
                        <td className={styles.actionsCell}>
                          <button
                            className={styles.inlineIconButton}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditCompanyModal(company);
                            }}
                            aria-label={`Edit ${company.name}`}
                            title="Edit company"
                          >
                            <EditIcon />
                          </button>
                          <button
                            className={`${styles.inlineIconButton} ${styles.inlineDangerIcon}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteCompany(company.id, company.name);
                            }}
                            aria-label={`Delete ${company.name}`}
                            title="Delete company"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.mobileList}>
                {filteredCompanies.map((company) => (
                  <article key={company.id} className={`${styles.mobileCard} ${styles.clickableCard}`} onClick={() => openCompanyDetails(company.id)}>
                    <div className={styles.mobileCardHeader}>
                      <div className={styles.mobileCardLead}>
                        <CompanyMark company={company.name} />
                        <div className={styles.companyMeta}>
                          <strong>{company.name}</strong>
                          <div className={styles.addressPreview}>
                            <span className={styles.addressText}>{company.address}</span>
                            <span className={styles.addressTooltip}>{company.address}</span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.inlineIconButton}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditCompanyModal(company);
                          }}
                          aria-label={`Edit ${company.name}`}
                        >
                          <EditIcon />
                        </button>
                        <button
                          className={`${styles.inlineIconButton} ${styles.inlineDangerIcon}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteCompany(company.id, company.name);
                          }}
                          aria-label={`Delete ${company.name}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div className={styles.mobileCardGrid}>
                      <div>
                        <p className={styles.mobileLabel}>Email</p>
                        <p className={styles.mobileValueMono}>{company.email}</p>
                      </div>
                      <div>
                        <p className={styles.mobileLabel}>Numbers</p>
                        <p className={styles.mobileValueMono}>{company.phoneNumbers.join(" · ") || "No number"}</p>
                      </div>
                      <div>
                        <p className={styles.mobileLabel}>Website</p>
                        <p className={styles.mobileValue}>{company.website}</p>
                      </div>
                      <div>
                        <p className={styles.mobileLabel}>Contacts</p>
                        <p className={styles.mobileValueMono}>{company.contacts.length}</p>
                      </div>
                    </div>

                    <p className={styles.mobileNotes}>{company.address}</p>
                    <div className={styles.contactListCell}>
                      {company.contacts.length ? (
                        company.contacts.map((contact) => (
                          <span key={contact.id} className={styles.contactPill}>
                            {contact.fullName}
                          </span>
                        ))
                      ) : (
                        <span className={styles.monoText}>No contacts</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <ClipboardIcon />
              </span>
              <strong>No companies yet</strong>
              <p>Create a company to start grouping contacts under a shared account.</p>
            </div>
          )}
        </section>
      </div>

      {contactModalState.open ? (
        <ContactsModal
          mode={contactModalState.mode}
          form={contactForm}
          onChange={updateContactForm}
          onClose={closeContactModal}
          onSubmit={handleContactSubmit}
          companyOptions={companyOptions}
          ownerOptions={ownerOptions}
          statusOptions={contactStatusOptions}
        />
      ) : null}

      {companyModalState.open ? (
        <CompanyModal
          mode={companyModalState.mode}
          form={companyForm}
          onChange={updateCompanyForm}
          onPhoneChange={updateCompanyPhone}
          onAddPhone={addCompanyPhone}
          onRemovePhone={removeCompanyPhone}
          onClose={closeCompanyModal}
          onSubmit={handleCompanySubmit}
        />
      ) : null}
    </DashboardShell>
  );
}
