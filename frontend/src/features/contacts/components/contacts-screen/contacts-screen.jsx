"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { ClipboardIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  createContact,
  createCrmCompany,
  deleteContact,
  deleteCrmCompany,
  deleteImportedContactData,
  executeContactImportWithPipeline,
  listCompanyIndustries,
  listContacts,
  listCrmCompanies,
  listPipelines,
  previewContactImport,
  updateContact,
  updateCrmCompany,
} from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import { CompanyModal, ContactImportModal, ContactsModal } from "./contacts-modal";
import styles from "./contacts-screen.module.css";

const legacyStatusLabelMap = {
  lead: "Lead",
  qualified: "Qualified",
  customer: "Customer",
  at_risk: "At Risk",
};

const fallbackStatusColors = {
  Lead: "#8C7A61",
  Qualified: "#2C7FB8",
  Proposal: "#C66A1E",
  Negotiation: "#D18918",
  Customer: "#3E9B64",
  "At Risk": "#C64F3E",
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

const emptyCompanyForm = {
  name: "",
  industry: "",
  ownerName: "",
  email: "",
  website: "",
  socialLinks: [],
  employeeCount: "",
  phoneNumbers: [""],
  addressCountry: "Egypt",
  addressState: "",
  addressLine: "",
  latitude: "",
  longitude: "",
};

const DIRECTORY_PAGE_SIZE = 10;
const COMPANY_OPTIONS_PAGE_SIZE = 200;

function getInitialFilters(searchParams, mode) {
  return {
    search: "",
    status: "All statuses",
    pipelineId: "All pipelines",
    companyId: mode === "contacts" ? searchParams.get("companyId") || "All companies" : "All companies",
  };
}

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

function formatLastTouch(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - target.getTime()) / 86400000);

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "1 day ago";
  }

  if (diffDays <= 6) {
    return `${diffDays} days ago`;
  }

  return formatDateForDisplay(value);
}

function normalizeStatusLabel(value) {
  return legacyStatusLabelMap[value] || value;
}

function hexToRgb(value) {
  const normalized = value?.replace("#", "");
  if (!normalized || normalized.length !== 6) {
    return null;
  }

  const channel = Number.parseInt(normalized, 16);
  if (Number.isNaN(channel)) {
    return null;
  }

  return {
    r: (channel >> 16) & 255,
    g: (channel >> 8) & 255,
    b: channel & 255,
  };
}

function getStatusTone(color) {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return {
      background: "oklch(0.95 0.01 80)",
      color: "oklch(0.45 0.02 80)",
    };
  }

  return {
    background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`,
    color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
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
    phoneNumbers: contact.phone_numbers?.length ? contact.phone_numbers : contact.phone ? [contact.phone] : [],
    companyId: contact.company?.id ? String(contact.company.id) : "",
    company: contact.company?.name || "No company",
    pipelineId: contact.pipeline?.id ? String(contact.pipeline.id) : "",
    pipeline: contact.pipeline?.name || "",
    status: normalizeStatusLabel(contact.status),
    ownerId: contact.owner?.id ? String(contact.owner.id) : "",
    owner: contact.owner?.full_name || "Unassigned",
    lastTouch: formatLastTouch(contact.last_touch),
    lastTouchRaw: formatDateForInput(contact.last_touch),
    notes: contact.notes || "",
  };
}

function mapCompanyFromApi(company) {
  return {
    id: company.id,
    name: company.name,
    industry: company.industry || "",
    ownerName: company.owner_name || "No owner listed",
    email: company.email || "No email",
    website: company.website || "No website",
    linkedinUrl: company.linkedin_url || "",
    socialLinks: company.social_links || [],
    phoneNumbers: company.phone_numbers?.length ? company.phone_numbers : company.phone_number ? [company.phone_number] : [],
    employeeCount: company.employee_count || null,
    address: company.address || "No address",
    addressCountry: company.address_country || "",
    addressState: company.address_state || "",
    addressLine: company.address_line || "",
    latitude: company.latitude,
    longitude: company.longitude,
    contacts: (company.contacts || []).map((contact) => ({
      id: contact.id,
      fullName: contact.full_name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      phoneNumbers: contact.phone_numbers?.length ? contact.phone_numbers : contact.phone ? [contact.phone] : [],
      status: normalizeStatusLabel(contact.status),
    })),
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

function mapCompanyToPayload(form) {
  const phoneNumbers = form.phoneNumbers.map((number) => number.trim()).filter(Boolean);
  const socialLinks = form.socialLinks
    .map((item) => ({
      platform: item.platform.trim(),
      url: item.url.trim(),
    }))
    .filter((item) => item.platform && item.url)
    .map((item) => ({
      ...item,
      url: item.url.startsWith("www.") ? `https://${item.url}` : item.url,
    }));
  const website = form.website.trim();

  return {
    name: form.name.trim(),
    industry: form.industry.trim(),
    owner_name: form.ownerName.trim(),
    email: form.email.trim(),
    website: website.startsWith("www.") ? `https://${website}` : website,
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

function toContactFormState(contact) {
  return {
    fullName: contact.fullName,
    title: contact.title,
    email: contact.email,
    phoneNumbers: contact.phoneNumbers?.length ? contact.phoneNumbers : [""],
    companyId: contact.companyId,
    pipelineId: contact.pipelineId,
    status: contact.status,
    lastTouch: contact.lastTouchRaw,
    notes: contact.notes,
  };
}

function toCompanyFormState(company) {
  return {
    name: company.name || "",
    industry: company.industry || "",
    ownerName: company.ownerName || "",
    email: company.email === "No email" ? "" : company.email,
    website: company.website === "No website" ? "" : company.website,
    socialLinks: company.socialLinks?.length ? company.socialLinks : [],
    employeeCount: company.employeeCount ? String(company.employeeCount) : "",
    phoneNumbers: company.phoneNumbers.length ? company.phoneNumbers : [""],
    addressCountry: company.addressCountry || "Egypt",
    addressState: company.addressState || "",
    addressLine: company.addressLine || "",
    latitude: company.latitude !== null && company.latitude !== undefined ? String(company.latitude) : "",
    longitude: company.longitude !== null && company.longitude !== undefined ? String(company.longitude) : "",
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

function ContactStatus({ value, color }) {
  const tone = getStatusTone(color || fallbackStatusColors[value] || fallbackStatusColors.Lead);
  return (
    <span className={styles.statusBadge} style={tone}>
      <span className={styles.statusDot} />
      {value || "No stage"}
    </span>
  );
}

function PaginationControls({ page, totalPages, count, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={styles.paginationBar}>
      <p className={styles.paginationMeta}>
        {count} total · Page {page} of {totalPages}
      </p>
      <div className={styles.paginationActions}>
        <button className={styles.secondaryButton} type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}

function CompanyContactsPreview({ contacts }) {
  if (!contacts.length) {
    return <span className={styles.monoText}>No contacts</span>;
  }

  return (
    <span className={styles.contactOverflowPill}>+{contacts.length}</span>
  );
}

function PhoneNumberStack({ numbers, emptyLabel = "No phone" }) {
  if (!numbers.length) {
    return <span className={styles.monoText}>{emptyLabel}</span>;
  }

  return (
    <div className={styles.phoneNumberStack}>
      {numbers.map((number, index) => (
        <span key={`${number}-${index}`} className={styles.monoText}>
          {number}
        </span>
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

function DirectoryScreen({ user, mode = "contacts" }) {
  const token = getAccessToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isContactsView = mode === "contacts";
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [industryOptions, setIndustryOptions] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ error: "", success: "" });
  const [filters, setFilters] = useState(() => getInitialFilters(searchParams, mode));
  const deferredSearch = useDeferredValue(filters.search);
  const [contactPage, setContactPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const [contactsPagination, setContactsPagination] = useState({ count: 0, next: null, previous: null, totalPages: 1 });
  const [companiesPagination, setCompaniesPagination] = useState({ count: 0, next: null, previous: null, totalPages: 1 });
  const [contactModalState, setContactModalState] = useState({ open: false, mode: "create", contactId: null });
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [companyModalState, setCompanyModalState] = useState({ open: false, mode: "create", companyId: null });
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [importState, setImportState] = useState({
    open: false,
    file: null,
    preview: null,
    mapping: {},
    pipelineId: "",
    loading: false,
  });

  const pipelineOptions = useMemo(
    () => [{ value: "All pipelines", label: "All pipelines" }, ...pipelines.map((pipeline) => ({ value: String(pipeline.id), label: pipeline.name }))],
    [pipelines],
  );
  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === filters.pipelineId) || null,
    [filters.pipelineId, pipelines],
  );
  const topbarTeamUsers = useMemo(
    () => (selectedPipeline ? selectedPipeline.team || [] : uniqueTeamUsers(pipelines)),
    [pipelines, selectedPipeline],
  );
  const statusOptions = useMemo(() => {
    const sourceStatuses = selectedPipeline
      ? (selectedPipeline.statuses || []).map((status) => normalizeStatusLabel(status.name))
      : pipelines.flatMap((pipeline) => (pipeline.statuses || []).map((status) => normalizeStatusLabel(status.name)));
    const uniqueStatuses = [...new Set(sourceStatuses.filter(Boolean))];
    return ["All stages", ...(uniqueStatuses.length ? uniqueStatuses : ["Lead"])];
  }, [pipelines, selectedPipeline]);
  const contactStatusOptions = statusOptions.filter((option) => option !== "All stages");
  const companyOptions = useMemo(() => allCompanies.map((company) => ({ value: String(company.id), label: company.name })), [allCompanies]);
  const companyIndustryOptions = useMemo(
    () => industryOptions.map((industry) => ({ value: industry.name, label: industry.name })),
    [industryOptions],
  );
  const contactPipelineOptions = useMemo(
    () => pipelines.map((pipeline) => ({ value: String(pipeline.id), label: pipeline.name })),
    [pipelines],
  );
  const statusColorMap = useMemo(() => {
    const nextMap = new Map();
    pipelines.forEach((pipeline) => {
      (pipeline.statuses || []).forEach((statusItem) => {
        nextMap.set(`${pipeline.id}:${normalizeStatusLabel(statusItem.name)}`, statusItem.color || fallbackStatusColors[normalizeStatusLabel(statusItem.name)] || fallbackStatusColors.Lead);
      });
    });
    return nextMap;
  }, [pipelines]);

  const heroMeta = useMemo(() => {
    if (!isContactsView) {
      return `${companiesPagination.count} companies`;
    }
    return `${contactsPagination.count} contacts`;
  }, [companiesPagination.count, contactsPagination.count, isContactsView]);
  const modalStatusOptions = useMemo(() => {
    const selectedContactPipeline = pipelines.find((pipeline) => String(pipeline.id) === contactForm.pipelineId) || null;
    if (!selectedContactPipeline) {
      return contactStatusOptions.length ? contactStatusOptions : ["Lead"];
    }

    const statuses = (selectedContactPipeline.statuses || []).map((status) => normalizeStatusLabel(status.name));
    return statuses.length ? [...new Set(statuses)] : ["Lead"];
  }, [contactForm.pipelineId, contactStatusOptions, pipelines]);
  const loading = initialLoading || directoryLoading;

  const fetchStaticData = useCallback(async () => {
    const [companiesResult, pipelinesResult, industriesResult] = await Promise.allSettled([
      listCrmCompanies(token, { page: 1, page_size: COMPANY_OPTIONS_PAGE_SIZE }),
      listPipelines(token),
      listCompanyIndustries(token),
    ]);

    if (pipelinesResult.status !== "fulfilled") {
      throw pipelinesResult.reason;
    }

    const normalizedCompanies =
      companiesResult.status === "fulfilled" ? normalizePaginatedResponse(companiesResult.value) : normalizePaginatedResponse([]);
    return {
      allCompaniesData: normalizedCompanies.results.map(mapCompanyFromApi),
      pipelinesData: pipelinesResult.value || [],
      industriesData: industriesResult.status === "fulfilled" ? industriesResult.value || [] : [],
    };
  }, [token]);

  const loadContactsPage = useCallback(
    async (page = contactPage) => {
      const response = normalizePaginatedResponse(
        await listContacts(token, {
          page,
          page_size: DIRECTORY_PAGE_SIZE,
          search: deferredSearch,
          status: filters.status !== "All stages" ? filters.status : undefined,
          pipeline_id: filters.pipelineId !== "All pipelines" ? filters.pipelineId : undefined,
          company_id: filters.companyId !== "All companies" ? filters.companyId : undefined,
        }),
      );

      startTransition(() => {
        setContacts(response.results.map(mapContactFromApi));
        setContactsPagination({
          count: response.count,
          next: response.next,
          previous: response.previous,
          totalPages: Math.max(1, Math.ceil(response.count / DIRECTORY_PAGE_SIZE)),
        });
      });
    },
    [contactPage, deferredSearch, filters.companyId, filters.pipelineId, filters.status, token],
  );

  const loadCompaniesPage = useCallback(
    async (page = companyPage) => {
      const response = normalizePaginatedResponse(
        await listCrmCompanies(token, {
          page,
          page_size: DIRECTORY_PAGE_SIZE,
          search: deferredSearch,
        }),
      );

      startTransition(() => {
        setCompanies(response.results.map(mapCompanyFromApi));
        setCompaniesPagination({
          count: response.count,
          next: response.next,
          previous: response.previous,
          totalPages: Math.max(1, Math.ceil(response.count / DIRECTORY_PAGE_SIZE)),
        });
      });
    },
    [companyPage, deferredSearch, token],
  );

  async function loadStaticData() {
    try {
      const { allCompaniesData, pipelinesData, industriesData } = await fetchStaticData();
      setAllCompanies(allCompaniesData);
      setPipelines(pipelinesData);
      setIndustryOptions(industriesData);
    } catch (error) {
      setStatusMessage({ error: error.message || `Unable to load ${isContactsView ? "contacts" : "companies"}.`, success: "" });
    }
  }

  useEffect(() => {
    let active = true;

    async function hydrateStaticData() {
      try {
        const { allCompaniesData, pipelinesData, industriesData } = await fetchStaticData();
        if (!active) {
          return;
        }
        startTransition(() => {
          setAllCompanies(allCompaniesData);
          setPipelines(pipelinesData);
          setIndustryOptions(industriesData);
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setStatusMessage({ error: error.message || `Unable to load ${isContactsView ? "contacts" : "companies"}.`, success: "" });
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    }

    hydrateStaticData();

    return () => {
      active = false;
    };
  }, [fetchStaticData, isContactsView]);

  useEffect(() => {
    let active = true;

    async function hydrateDirectory() {
      setDirectoryLoading(true);
      try {
        if (isContactsView) {
          await loadContactsPage(contactPage);
        } else {
          await loadCompaniesPage(companyPage);
        }
        if (!active) {
          return;
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setStatusMessage((current) => ({ ...current, error: error.message || `Unable to load ${isContactsView ? "contacts" : "companies"}.` }));
      } finally {
        if (active) {
          setDirectoryLoading(false);
        }
      }
    }

    hydrateDirectory();

    return () => {
      active = false;
    };
  }, [companyPage, contactPage, isContactsView, loadCompaniesPage, loadContactsPage]);

  useEffect(() => {
    if (filters.status === "All stages") {
      return;
    }

    if (!contactStatusOptions.includes(filters.status)) {
      setFilters((current) => ({ ...current, status: "All stages" }));
      setContactPage(1);
    }
  }, [contactStatusOptions, filters.status]);

  function updateFilters(event) {
    const { name, value } = event.target;
    setFilters((current) => {
      const nextFilters = { ...current, [name]: value };
      if (name === "pipelineId") {
        const nextPipeline = pipelines.find((pipeline) => String(pipeline.id) === value) || null;
        const nextStatuses = nextPipeline
          ? (nextPipeline.statuses || []).map((status) => normalizeStatusLabel(status.name))
          : pipelines.flatMap((pipeline) => (pipeline.statuses || []).map((status) => normalizeStatusLabel(status.name)));
        if (!nextStatuses.includes(current.status)) {
          nextFilters.status = "All stages";
        }
      }
      return nextFilters;
    });
    if (isContactsView) {
      setContactPage(1);
    } else {
      setCompanyPage(1);
    }
  }

  function updateContactForm(event) {
    const { name, value } = event.target;
    setContactForm((current) => {
      if (name !== "pipelineId") {
        return { ...current, [name]: value };
      }

      const nextPipeline = pipelines.find((pipeline) => String(pipeline.id) === value) || null;
      const nextStatuses = nextPipeline
        ? (nextPipeline.statuses || []).map((status) => normalizeStatusLabel(status.name))
        : contactStatusOptions;

      return {
        ...current,
        pipelineId: value,
        status: nextStatuses.includes(current.status) ? current.status : nextStatuses[0] || "Lead",
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

  function updateCompanySocial(index, field, value) {
    setCompanyForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addCompanySocial() {
    setCompanyForm((current) => ({ ...current, socialLinks: [...current.socialLinks, { platform: "", url: "" }] }));
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
    const defaultPipelineId = filters.pipelineId !== "All pipelines" ? filters.pipelineId : "";

    setContactForm({
      ...emptyContactForm,
      companyId: companyOptions[0]?.value || "",
      pipelineId: defaultPipelineId,
      status: "Lead",
      lastTouch: new Date().toISOString().slice(0, 10),
    });
    setContactModalState({ open: true, mode: "create", contactId: null });
    setStatusMessage((current) => ({ ...current, error: "" }));
  }

  function openEditContactModal(contact) {
    const selectedContactPipeline = pipelines.find((pipeline) => String(pipeline.id) === contact.pipelineId) || null;
    const availableStatuses = selectedContactPipeline
      ? (selectedContactPipeline.statuses || []).map((status) => normalizeStatusLabel(status.name))
      : [];

    setContactForm({
      ...toContactFormState(contact),
      pipelineId: contact.pipelineId || "",
      status: contact.status || availableStatuses[0] || "Lead",
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

  function openImportModal() {
    setImportState({
      open: true,
      file: null,
      preview: null,
      mapping: {},
      pipelineId: "",
      loading: false,
    });
    setStatusMessage((current) => ({ ...current, error: "" }));
  }

  function closeImportModal() {
    setImportState({
      open: false,
      file: null,
      preview: null,
      mapping: {},
      pipelineId: "",
      loading: false,
    });
  }

  function updateImportFile(event) {
    const nextFile = event.target.files?.[0] || null;
    setImportState((current) => ({
      ...current,
      file: nextFile,
      preview: null,
      mapping: {},
    }));
  }

  function updateImportMapping(sourceKey, value) {
    setImportState((current) => ({
      ...current,
      mapping: {
        ...current.mapping,
        [sourceKey]: value,
      },
    }));
  }

  function updateImportPipeline(value) {
    setImportState((current) => ({ ...current, pipelineId: value }));
  }

  async function analyzeImportFile() {
    if (!importState.file) {
      return;
    }

    setImportState((current) => ({ ...current, loading: true }));
    try {
      const preview = await previewContactImport(token, importState.file);
      const suggestedMapping = {};
      preview.sheets.forEach((sheet) => {
        sheet.columns.forEach((column) => {
          suggestedMapping[column.source_key] = column.suggested_field || "";
        });
      });
      setImportState((current) => ({
        ...current,
        preview,
        mapping: suggestedMapping,
        loading: false,
      }));
    } catch (error) {
      setImportState((current) => ({ ...current, loading: false }));
      setStatusMessage({ error: error.message || "Unable to analyze import file.", success: "" });
    }
  }

  async function handleExecuteImport() {
    if (!importState.file) {
      return;
    }

    setImportState((current) => ({ ...current, loading: true }));
    try {
      const response = await executeContactImportWithPipeline(token, importState.file, importState.mapping, importState.pipelineId);
      await Promise.all([loadContactsPage(1), loadCompaniesPage(1), loadStaticData()]);
      setContactPage(1);
      setCompanyPage(1);
      closeImportModal();
      setStatusMessage({
        error: "",
        success: `Imported ${response.result.created_links + response.result.updated_links} company-contact links.`,
      });
    } catch (error) {
      setImportState((current) => ({ ...current, loading: false }));
      setStatusMessage({ error: error.message || "Unable to import contacts.", success: "" });
    }
  }

  async function handleDeleteImportedData() {
    if (!user?.is_platform_admin) {
      return;
    }
    if (!window.confirm("Delete importer-created data for this tenant company? This is for development cleanup only.")) {
      return;
    }

    setImportState((current) => ({ ...current, loading: true }));
    try {
      const response = await deleteImportedContactData(token);
      await Promise.all([loadContactsPage(1), loadCompaniesPage(1), loadStaticData()]);
      setContactPage(1);
      setCompanyPage(1);
      setStatusMessage({
        error: "",
        success: `Deleted ${response.deleted_links} imported links, ${response.deleted_contacts} imported contacts, and ${response.deleted_companies} imported companies.`,
      });
      setImportState((current) => ({ ...current, loading: false }));
    } catch (error) {
      setImportState((current) => ({ ...current, loading: false }));
      setStatusMessage({ error: error.message || "Unable to delete imported data.", success: "" });
    }
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

      await Promise.all([loadContactsPage(contactPage), loadStaticData()]);
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

      await Promise.all([loadCompaniesPage(companyPage), loadStaticData()]);
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
      await Promise.all([loadContactsPage(contactPage), loadStaticData()]);
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
      await Promise.all([loadCompaniesPage(companyPage), loadStaticData()]);
      setStatusMessage({ error: "", success: "Company deleted." });
    } catch (error) {
      setStatusMessage({ error: error.message || "Unable to delete company.", success: "" });
    }
  }

  function openCompanyDetails(companyId) {
    router.push(`/companies/${companyId}`);
  }

  function openContactDetails(contactId) {
    router.push(`/contacts/${contactId}`);
  }

  return (
    <DashboardShell
      sidebar={<Sidebar user={user} />}
      topbar={
        <Topbar
          user={user}
          memberUsers={topbarTeamUsers}
          breadcrumbs={[
            { label: "Workspace", href: "/dashboard" },
            { label: isContactsView ? "Contacts" : "Companies" },
          ]}
        />
      }
    >
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <h1>{isContactsView ? "Contacts" : "Companies"}</h1>
            <p className={styles.heroMeta}>{heroMeta}</p>
          </div>
          <div className={styles.heroActions}>
            {isContactsView ? <button className={styles.secondaryButton} type="button" onClick={openImportModal}>Import</button> : null}
            {!isContactsView ? (
              <button className={styles.primaryButton} type="button" onClick={openCreateCompanyModal}>
                <PlusIcon />
                <span>Add company</span>
              </button>
            ) : (
              <button className={styles.primaryButton} type="button" onClick={openCreateContactModal} disabled={!companyOptions.length}>
                <PlusIcon />
                <span>Add contact</span>
              </button>
            )}
          </div>
        </section>

        {statusMessage.error ? <p className={styles.error}>{statusMessage.error}</p> : null}
        {statusMessage.success ? <p className={styles.success}>{statusMessage.success}</p> : null}

        <section className={styles.filterBar}>
          <label className={styles.searchField}>
            <span className={styles.visuallyHidden}>Search directory</span>
            <span className={styles.searchIcon} aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              name="search"
              value={filters.search}
              onChange={updateFilters}
              placeholder={isContactsView ? "Search contacts, companies, emails..." : "Search companies, owners, websites..."}
            />
          </label>

          {isContactsView ? (
            <>
              <label className={styles.filterField}>
                <span className={styles.visuallyHidden}>Pipeline</span>
                <SearchableSelect ariaLabel="Pipeline filter" name="pipelineId" value={filters.pipelineId} onChange={updateFilters} options={pipelineOptions} />
              </label>

              {filters.pipelineId !== "All pipelines" ? (
                <div className={styles.statusTabs} role="tablist" aria-label="Stage filters">
                  {statusOptions.map((option) => {
                    const label = option === "All stages" ? "All" : option;
                    const active = filters.status === option;
                    return (
                      <button
                        key={option}
                        className={`${styles.statusTab} ${active ? styles.statusTabActive : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          setFilters((current) => ({ ...current, status: option }));
                          setContactPage(1);
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : null}

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
          ) : isContactsView ? (
            contacts.length ? (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Contact</th>
                        <th>Company</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Last updated</th>
                        <th>Owner</th>
                        <th aria-label="Open contact" />
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact) => (
                        <tr key={contact.id} className={styles.clickableRow} onClick={() => openContactDetails(contact.id)}>
                          <td>
                            <div className={styles.contactCell}>
                              <OwnerAvatar name={contact.fullName} />
                              <div className={styles.contactMeta}>
                                <strong>{contact.fullName}</strong>
                                <span>{contact.title}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.companyCell}>
                              <CompanyMark company={contact.company} />
                              <div className={styles.companyMeta}>
                                <span>{contact.company}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={styles.monoText}>{contact.email}</span>
                          </td>
                            <td>
                              <PhoneNumberStack numbers={contact.phoneNumbers || []} />
                            </td>
                          <td className={styles.lastTouchCell}>{contact.lastTouch}</td>
                          <td>
                            <div className={styles.ownerTooltipWrap}>
                              <div className={styles.ownerCell}>
                                <OwnerAvatar name={contact.owner} />
                              </div>
                              <span className={styles.ownerTooltip}>{contact.owner}</span>
                            </div>
                          </td>
                          <td className={styles.rowArrowCell}>
                            <div className={styles.rowActions}>
                              <button
                                className={styles.inlineIconButton}
                                type="button"
                                aria-label={`Edit ${contact.fullName}`}
                                title="Edit contact"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditContactModal(contact);
                                }}
                              >
                                <EditIcon />
                              </button>
                              <button
                                className={styles.deleteIconButton}
                                type="button"
                                aria-label={`Delete ${contact.fullName}`}
                                title="Delete contact"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDelete(contact.id);
                                }}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  page={contactPage}
                  totalPages={contactsPagination.totalPages}
                  count={contactsPagination.count}
                  onPageChange={setContactPage}
                />

                <div className={styles.mobileList}>
                  {contacts.map((contact) => (
                    <article key={contact.id} className={`${styles.mobileCard} ${styles.clickableCard}`} onClick={() => openContactDetails(contact.id)}>
                      <div className={styles.mobileCardHeader}>
                        <div className={styles.mobileCardLead}>
                          <OwnerAvatar name={contact.fullName} />
                          <div className={styles.contactMeta}>
                            <strong>{contact.fullName}</strong>
                            <span>{contact.title}</span>
                          </div>
                        </div>
                        <ContactStatus value={contact.status} color={statusColorMap.get(`${contact.pipelineId}:${contact.status}`)} />
                      </div>

                      <div className={styles.mobileCardGrid}>
                        <div>
                          <p className={styles.mobileLabel}>Company</p>
                          <p className={styles.mobileValue}>{contact.company}</p>
                        </div>
                        <div>
                          <p className={styles.mobileLabel}>Owner</p>
                          <div className={styles.ownerTooltipWrap}>
                            <div className={styles.ownerCell}>
                              <OwnerAvatar name={contact.owner} />
                            </div>
                            <span className={styles.ownerTooltip}>{contact.owner}</span>
                          </div>
                        </div>
                        <div>
                          <p className={styles.mobileLabel}>Email</p>
                          <p className={styles.mobileValueMono}>{contact.email}</p>
                        </div>
                        <div>
                          <p className={styles.mobileLabel}>Phone</p>
                          <PhoneNumberStack numbers={contact.phoneNumbers || []} />
                        </div>
                        <div>
                          <p className={styles.mobileLabel}>Last updated</p>
                          <p className={styles.mobileValueMono}>{contact.lastTouch}</p>
                        </div>
                      </div>

                      <p className={styles.mobileNotes}>{contact.notes || "No notes yet."}</p>

                      <div className={styles.cardActions}>
                        <button
                          className={styles.inlineButton}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditContactModal(contact);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.inlineDanger}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(contact.id);
                          }}
                        >
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
          ) : companies.length ? (
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
                    {companies.map((company) => (
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
                        <td><CompanyContactsPreview contacts={company.contacts} /></td>
                        <td>{company.website !== "No website" ? company.website : "No website"}</td>
                        <td className={styles.actionsCell}>
                          <div className={styles.rowActions}>
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                page={companyPage}
                totalPages={companiesPagination.totalPages}
                count={companiesPagination.count}
                onPageChange={setCompanyPage}
              />

              <div className={styles.mobileList}>
                {companies.map((company) => (
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
                    <CompanyContactsPreview contacts={company.contacts} />
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
          onPhoneChange={updateContactPhone}
          onAddPhone={addContactPhone}
          onRemovePhone={removeContactPhone}
          onClose={closeContactModal}
          onSubmit={handleContactSubmit}
          companyOptions={companyOptions}
          pipelineOptions={contactPipelineOptions}
          statusOptions={modalStatusOptions}
        />
      ) : null}

      {companyModalState.open ? (
        <CompanyModal
          mode={companyModalState.mode}
          form={companyForm}
          industryOptions={companyIndustryOptions}
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

      {importState.open ? (
        <ContactImportModal
          fileName={importState.file?.name || ""}
          loading={importState.loading}
          preview={importState.preview}
          mapping={importState.mapping}
          selectedPipelineId={importState.pipelineId}
          pipelineOptions={contactPipelineOptions}
          showDeleteImported={Boolean(user?.is_platform_admin)}
          onFileChange={updateImportFile}
          onPipelineChange={updateImportPipeline}
          onMappingChange={updateImportMapping}
          onAnalyze={analyzeImportFile}
          onImport={handleExecuteImport}
          onDeleteImported={handleDeleteImportedData}
          onClose={closeImportModal}
        />
      ) : null}
    </DashboardShell>
  );
}

export function ContactsScreen({ user }) {
  return <DirectoryScreen user={user} mode="contacts" />;
}

export function CompaniesScreen({ user }) {
  return <DirectoryScreen user={user} mode="companies" />;
}
