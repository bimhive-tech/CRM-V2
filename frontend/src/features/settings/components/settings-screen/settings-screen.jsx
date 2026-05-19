"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import {
  createCompany,
  createCurrency,
  createPipelineStatusTemplate,
  createRole,
  createUser,
  deleteCompany,
  deleteRole,
  deleteCurrency,
  deletePipelineStatusTemplate,
  deleteUser,
  listCompanies,
  listCurrencies,
  listPipelineStatusTemplates,
  listRoles,
  listUsers,
  deleteCompanyLogo,
  uploadCompanyLogo,
  updateCompany,
  updateCurrency,
  updatePipelineStatusTemplate,
  updateRole,
  updateUser,
} from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import { SettingsModal } from "./settings-modal";
import styles from "./settings-screen.module.css";

const companyInitialState = { name: "", email: "", phone_number: "", website: "", address: "", is_active: true };
const roleInitialState = { name: "", description: "" };
const currencyInitialState = { code: "", name: "", symbol: "", is_default: false, is_active: true };
const statusTemplateInitialState = { name: "", color: "#7C5F35", position: 0 };
const userInitialState = {
  email: "",
  full_name: "",
  password: "",
  role: "user",
  primary_company_id: "",
  company_ids: [],
  role_ids: [],
  is_active: true,
};

function StatusBadge({ tone = "neutral", children }) {
  return (
    <span className={`${styles.statusBadge} ${tone === "danger" ? styles.statusBadgeDanger : styles.statusBadgeNeutral}`}>
      <span className={styles.statusDot} />
      {children}
    </span>
  );
}

function formatRoleName(value) {
  return value.replaceAll("_", " ");
}

function getVisibleTabs(user) {
  const items = [
    { id: "company-info", label: "Company Info" },
    { id: "users", label: "User Management" },
    { id: "roles", label: "Roles" },
    { id: "master-data", label: "Master Data" },
  ];

  if (user?.is_platform_admin) {
    items.push({ id: "companies", label: "Companies" });
  }

  return items;
}

function toCompanyForm(company) {
  return {
    name: company.name || "",
    email: company.email || "",
    phone_number: company.phone_number || "",
    website: company.website || "",
    address: company.address || "",
    is_active: company.is_active,
  };
}

function toRoleForm(role) {
  return { name: role.name, description: role.description || "" };
}

function toCurrencyForm(currency) {
  return {
    code: currency.code || "",
    name: currency.name || "",
    symbol: currency.symbol || "",
    is_default: Boolean(currency.is_default),
    is_active: Boolean(currency.is_active),
  };
}

function toStatusTemplateForm(template) {
  return {
    name: template.name || "",
    color: template.color || "#7C5F35",
    position: Number(template.position || 0),
  };
}

function toUserForm(user) {
  return {
    email: user.email,
    full_name: user.full_name,
    password: "",
    role: user.role || "user",
    primary_company_id: user.company?.id ? String(user.company.id) : "",
    company_ids: user.companies.map((company) => String(company.id)),
    role_ids: user.roles.map((role) => String(role.id)),
    is_active: user.is_active,
  };
}

function getSelectedCompanyId(user, companies) {
  if (user?.company?.id) {
    return String(user.company.id);
  }
  if (user?.companies?.[0]?.id) {
    return String(user.companies[0].id);
  }
  if (companies[0]?.id) {
    return String(companies[0].id);
  }
  return "";
}

function CompanyFormFields({
  form,
  onChange,
  logoUrl = "",
  onLogoChange = null,
  onLogoRemove = null,
  logoUploading = false,
  showActiveToggle = true,
}) {
  return (
    <>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Company name</span>
          <input name="name" value={form.name} onChange={onChange} placeholder="Ember Construction" required />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" value={form.email} onChange={onChange} placeholder="hello@company.com" />
        </label>
        <label className={styles.field}>
          <span>Phone number</span>
          <input name="phone_number" value={form.phone_number} onChange={onChange} placeholder="+1 555 123 4567" />
        </label>
        <label className={styles.field}>
          <span>Website</span>
          <input name="website" type="url" value={form.website} onChange={onChange} placeholder="https://company.com" />
        </label>
      </div>
      <label className={styles.field}>
        <span>Address</span>
        <textarea name="address" value={form.address} onChange={onChange} placeholder="Street, city, state, postal code" rows={4} />
      </label>
      <div className={styles.logoSection}>
        {logoUrl ? (
          <div className={styles.logoPreviewWrap}>
            <Image
              className={styles.logoPreview}
              src={logoUrl}
              alt="Company logo preview"
              width={180}
              height={96}
              style={{ width: "auto", height: "auto" }}
              unoptimized
            />
          </div>
        ) : (
          <div className={styles.logoPlaceholder}>No logo yet</div>
        )}
        <label className={styles.field}>
          <span>Logo upload</span>
          <input type="file" accept="image/*" onChange={onLogoChange} disabled={!onLogoChange || logoUploading} />
            <small className={styles.helperText}>
              {logoUploading
                ? "Uploading logo..."
                : "PNG, JPG, or WEBP only. Max 15MB. Max dimensions 2400px by 2400px. The logo keeps its natural shape in the sidebar."}
            </small>
          {logoUrl && onLogoRemove ? (
            <button className={styles.inlineDangerButton} type="button" onClick={onLogoRemove} disabled={logoUploading}>
              Remove logo
            </button>
          ) : null}
        </label>
      </div>
      {showActiveToggle ? (
        <label className={styles.check}>
          <input name="is_active" type="checkbox" checked={form.is_active} onChange={onChange} />
          <span>Active company</span>
        </label>
      ) : null}
    </>
  );
}

export function SettingsScreen({
  user,
  companies: initialCompanies,
  users: initialUsers,
  roles: initialRoles,
}) {
  const token = getAccessToken();
  const tabs = useMemo(() => getVisibleTabs(user), [user]);
  const [activeTab, setActiveTab] = useState("company-info");
  const [companies, setCompanies] = useState(initialCompanies);
  const [users, setUsers] = useState(initialUsers);
  const [roles, setRoles] = useState(initialRoles);
  const [currencies, setCurrencies] = useState([]);
  const [statusTemplates, setStatusTemplates] = useState([]);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [modalState, setModalState] = useState({ type: null, mode: "create", itemId: null });
  const [companyForm, setCompanyForm] = useState(companyInitialState);
  const [logoUploading, setLogoUploading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(getSelectedCompanyId(user, initialCompanies));
  const [companyInfoForm, setCompanyInfoForm] = useState(() => {
    const initialCompany = initialCompanies.find((company) => String(company.id) === getSelectedCompanyId(user, initialCompanies));
    return initialCompany ? toCompanyForm(initialCompany) : companyInitialState;
  });
  const [roleForm, setRoleForm] = useState(roleInitialState);
  const [userForm, setUserForm] = useState(userInitialState);
  const [currencyForm, setCurrencyForm] = useState(currencyInitialState);
  const [statusTemplateForm, setStatusTemplateForm] = useState(statusTemplateInitialState);

  const selectedCompany = companies.find((company) => String(company.id) === selectedCompanyId) || null;
  const shellUser = useMemo(() => {
    if (!selectedCompany) {
      return user;
    }

    const nextCompanies = (user.companies || []).map((company) =>
      company.id === selectedCompany.id ? { ...company, ...selectedCompany } : company,
    );

    return {
      ...user,
      company: user.company?.id === selectedCompany.id ? { ...user.company, ...selectedCompany } : user.company,
      companies: nextCompanies,
    };
  }, [selectedCompany, user]);

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: String(company.id), label: company.name, is_active: company.is_active })),
    [companies],
  );
  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: String(role.id), label: role.name, is_system: role.is_system })),
    [roles],
  );
  const visibleUsers = useMemo(() => {
    if (user?.is_platform_admin) {
      return users;
    }
    return users.filter((targetUser) => targetUser.companies.some((company) => String(company.id) === selectedCompanyId));
  }, [selectedCompanyId, user, users]);
  const visibleRoles = useMemo(() => roles.filter((role) => !role.is_system || user?.is_platform_admin), [roles, user]);

  useEffect(() => {
    if (!selectedCompanyId) {
      return;
    }

    let active = true;

    Promise.all([
      listCurrencies(token, { company_id: selectedCompanyId }),
      listPipelineStatusTemplates(token, { company_id: selectedCompanyId }),
    ])
      .then(([nextCurrencies, nextTemplates]) => {
        if (!active) {
          return;
        }
        setCurrencies(nextCurrencies);
        setStatusTemplates(nextTemplates);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setStatus((current) => ({ ...current, error: error.message || "Unable to load master data." }));
      });

    return () => {
      active = false;
    };
  }, [selectedCompanyId, token]);

  function setMessage(error = "", success = "") {
    setStatus({ error, success });
  }

  function handleSelectedCompanyChange(event) {
    const nextCompanyId = event.target.value;
    setSelectedCompanyId(nextCompanyId);
    const nextCompany = companies.find((company) => String(company.id) === nextCompanyId) || null;
    setCompanyInfoForm(nextCompany ? toCompanyForm(nextCompany) : companyInitialState);
    setMessage();
  }

  async function refreshAll() {
    const [nextCompanies, nextUsers, nextRoles] = await Promise.all([
      listCompanies(token),
      listUsers(token),
      listRoles(token),
    ]);
    setCompanies(nextCompanies);
    setUsers(nextUsers);
    setRoles(nextRoles);
    const nextSelectedCompanyId =
      nextCompanies.find((company) => String(company.id) === selectedCompanyId)?.id
        ? selectedCompanyId
        : getSelectedCompanyId(user, nextCompanies);
    const nextSelectedCompany = nextCompanies.find((company) => String(company.id) === nextSelectedCompanyId);
    setSelectedCompanyId(nextSelectedCompanyId);
    setCompanyInfoForm(nextSelectedCompany ? toCompanyForm(nextSelectedCompany) : companyInitialState);
  }

  function closeModal() {
    setModalState({ type: null, mode: "create", itemId: null });
    setCompanyForm(companyInitialState);
    setRoleForm(roleInitialState);
    setUserForm(userInitialState);
    setCurrencyForm(currencyInitialState);
    setStatusTemplateForm(statusTemplateInitialState);
  }

  function openCompanyModal(mode, company = null) {
    setModalState({ type: "company", mode, itemId: company?.id || null });
    setCompanyForm(company ? toCompanyForm(company) : companyInitialState);
    setMessage();
  }

  function openRoleModal(mode, role = null) {
    setModalState({ type: "role", mode, itemId: role?.id || null });
    setRoleForm(role ? toRoleForm(role) : roleInitialState);
    setMessage();
  }

  function openUserModal(mode, targetUser = null) {
    setModalState({ type: "user", mode, itemId: targetUser?.id || null });
    setUserForm(
      targetUser
        ? toUserForm(targetUser)
        : {
            ...userInitialState,
            primary_company_id: selectedCompanyId || "",
            company_ids: selectedCompanyId ? [selectedCompanyId] : [],
          },
    );
    setMessage();
  }

  function openCurrencyModal(mode, currency = null) {
    setModalState({ type: "currency", mode, itemId: currency?.id || null });
    setCurrencyForm(currency ? toCurrencyForm(currency) : currencyInitialState);
    setMessage();
  }

  function openStatusTemplateModal(mode, template = null) {
    setModalState({ type: "status-template", mode, itemId: template?.id || null });
    setStatusTemplateForm(template ? toStatusTemplateForm(template) : { ...statusTemplateInitialState, position: statusTemplates.length });
    setMessage();
  }

  function updateCompanyForm(event) {
    const { name, value, type, checked } = event.target;
    setCompanyForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function updateCompanyInfoForm(event) {
    const { name, value, type, checked } = event.target;
    setCompanyInfoForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function updateRoleForm(event) {
    const { name, value } = event.target;
    setRoleForm((current) => ({ ...current, [name]: value }));
  }

  function updateCurrencyForm(event) {
    const { name, value, type, checked } = event.target;
    setCurrencyForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function updateStatusTemplateForm(event) {
    const { name, value } = event.target;
    setStatusTemplateForm((current) => ({ ...current, [name]: name === "position" ? Number(value) : value }));
  }

  function updateUserForm(event) {
    const { name, value, type, checked } = event.target;
    setUserForm((current) => {
      if (name === "primary_company_id") {
        const nextCompanyIds = value && !current.company_ids.includes(value) ? [...current.company_ids, value] : current.company_ids;
        return { ...current, primary_company_id: value, company_ids: nextCompanyIds };
      }

      return { ...current, [name]: type === "checkbox" ? checked : value };
    });
  }

  function toggleUserAssignment(field, value) {
    setUserForm((current) => {
      const nextValues = current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value];

      return {
        ...current,
        [field]: nextValues,
        primary_company_id:
          field === "company_ids" && current.primary_company_id === value && !nextValues.includes(value)
            ? ""
            : current.primary_company_id,
      };
    });
  }

  async function handleCompanySubmit(event) {
    event.preventDefault();
    setMessage();

    try {
      const payload = {
        name: companyForm.name.trim(),
        email: companyForm.email.trim(),
        phone_number: companyForm.phone_number.trim(),
        website: companyForm.website.trim(),
        address: companyForm.address.trim(),
        is_active: companyForm.is_active,
      };
      if (modalState.mode === "edit" && modalState.itemId) {
        await updateCompany(token, modalState.itemId, payload);
        setMessage("", "Company updated.");
      } else {
        await createCompany(token, payload);
        setMessage("", "Company created.");
      }
      await refreshAll();
      closeModal();
    } catch (error) {
      setMessage(error.message || "Unable to save company.");
    }
  }

  async function handleCompanyInfoSubmit(event) {
    event.preventDefault();
    setMessage();

    if (!selectedCompanyId) {
      setMessage("No company selected.");
      return;
    }

    try {
      await updateCompany(token, selectedCompanyId, {
        name: companyInfoForm.name.trim(),
        email: companyInfoForm.email.trim(),
        phone_number: companyInfoForm.phone_number.trim(),
        website: companyInfoForm.website.trim(),
        address: companyInfoForm.address.trim(),
        is_active: companyInfoForm.is_active,
      });
      await refreshAll();
      setMessage("", "Company info updated.");
    } catch (error) {
      setMessage(error.message || "Unable to save company info.");
    }
  }

  async function handleRoleSubmit(event) {
    event.preventDefault();
    setMessage();

    try {
      const payload = { name: roleForm.name.trim(), description: roleForm.description.trim() };
      if (modalState.mode === "edit" && modalState.itemId) {
        await updateRole(token, modalState.itemId, payload);
        setMessage("", "Role updated.");
      } else {
        await createRole(token, payload);
        setMessage("", "Role created.");
      }
      await refreshAll();
      closeModal();
    } catch (error) {
      setMessage(error.message || "Unable to save role.");
    }
  }

  async function refreshMasterData() {
    if (!selectedCompanyId) {
      return;
    }

    const [nextCurrencies, nextTemplates] = await Promise.all([
      listCurrencies(token, { company_id: selectedCompanyId }),
      listPipelineStatusTemplates(token, { company_id: selectedCompanyId }),
    ]);

    setCurrencies(nextCurrencies);
    setStatusTemplates(nextTemplates);
  }

  async function handleUserSubmit(event) {
    event.preventDefault();
    setMessage();

    try {
      const payload = {
        email: userForm.email.trim(),
        full_name: userForm.full_name.trim(),
        role: user?.is_platform_admin ? userForm.role : "user",
        company_id: user?.is_platform_admin ? userForm.primary_company_id || null : selectedCompanyId || null,
        company_ids: user?.is_platform_admin ? userForm.company_ids : selectedCompanyId ? [selectedCompanyId] : [],
        role_ids: userForm.role_ids,
        is_active: userForm.is_active,
      };

      if (userForm.password.trim()) {
        payload.password = userForm.password.trim();
      }

      if (modalState.mode === "edit" && modalState.itemId) {
        await updateUser(token, modalState.itemId, payload);
        setMessage("", "User updated.");
      } else {
        if (!payload.password) {
          throw new Error("Password is required.");
        }
        await createUser(token, payload);
        setMessage("", "User created.");
      }

      await refreshAll();
      closeModal();
    } catch (error) {
      setMessage(error.message || "Unable to save user.");
    }
  }

  async function handleCurrencySubmit(event) {
    event.preventDefault();
    setMessage();

    try {
      const payload = {
        code: currencyForm.code.trim(),
        name: currencyForm.name.trim(),
        symbol: currencyForm.symbol.trim(),
        is_default: currencyForm.is_default,
        is_active: currencyForm.is_active,
      };

      if (modalState.mode === "edit" && modalState.itemId) {
        await updateCurrency(token, modalState.itemId, payload);
        setMessage("", "Currency updated.");
      } else {
        await createCurrency(token, payload, { company_id: selectedCompanyId });
        setMessage("", "Currency created.");
      }

      await refreshMasterData();
      closeModal();
    } catch (error) {
      setMessage(error.message || "Unable to save currency.");
    }
  }

  async function handleStatusTemplateSubmit(event) {
    event.preventDefault();
    setMessage();

    try {
      const payload = {
        name: statusTemplateForm.name.trim(),
        color: statusTemplateForm.color.trim(),
        position: statusTemplateForm.position,
      };

      if (modalState.mode === "edit" && modalState.itemId) {
        await updatePipelineStatusTemplate(token, modalState.itemId, payload);
        setMessage("", "Default pipeline status updated.");
      } else {
        await createPipelineStatusTemplate(token, payload, { company_id: selectedCompanyId });
        setMessage("", "Default pipeline status created.");
      }

      await refreshMasterData();
      closeModal();
    } catch (error) {
      setMessage(error.message || "Unable to save default pipeline status.");
    }
  }

  async function handleDelete(kind, itemId, label) {
    const confirmed = window.confirm(`Delete ${label}?`);
    if (!confirmed) {
      return;
    }

    setMessage();

    try {
      if (kind === "company") {
        await deleteCompany(token, itemId);
      } else if (kind === "role") {
        await deleteRole(token, itemId);
      } else if (kind === "currency") {
        await deleteCurrency(token, itemId);
      } else if (kind === "status-template") {
        await deletePipelineStatusTemplate(token, itemId);
      } else {
        await deleteUser(token, itemId);
      }

      if (kind === "currency" || kind === "status-template") {
        await refreshMasterData();
      } else {
        await refreshAll();
      }
      setMessage("", `${label} deleted.`);
      if (modalState.itemId === itemId) {
        closeModal();
      }
    } catch (error) {
      setMessage(error.message || `Unable to delete ${label}.`);
    }
  }

  async function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file || !selectedCompanyId) {
      return;
    }

    setLogoUploading(true);
    setMessage();

    try {
      await uploadCompanyLogo(token, selectedCompanyId, file);
      await refreshAll();
      setMessage("", "Company logo uploaded.");
    } catch (error) {
      setMessage(error.message || "Unable to upload company logo.");
    } finally {
      setLogoUploading(false);
      event.target.value = "";
    }
  }

  async function handleLogoRemove() {
    if (!selectedCompanyId || !selectedCompany?.logo_url) {
      return;
    }

    const confirmed = window.confirm("Remove this company logo?");
    if (!confirmed) {
      return;
    }

    setLogoUploading(true);
    setMessage();

    try {
      await deleteCompanyLogo(token, selectedCompanyId);
      await refreshAll();
      setMessage("", "Company logo removed.");
    } catch (error) {
      setMessage(error.message || "Unable to remove company logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <DashboardShell
      sidebar={<Sidebar user={shellUser} />}
      topbar={<Topbar user={shellUser} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Settings" }]} />}
    >
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Administration</p>
            <h1>Settings</h1>
            <p className={styles.copy}>
              Manage company settings, user access, roles, and master data from one warm, structured admin workspace.
            </p>
          </div>
        </section>

        {status.error ? <p className={styles.error}>{status.error}</p> : null}
        {status.success ? <p className={styles.success}>{status.success}</p> : null}

        <section className={styles.tabBar} aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {activeTab === "company-info" ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Company Info</p>
                <h2>Edit company details</h2>
              </div>
            </div>

            <form className={styles.panelBody} onSubmit={handleCompanyInfoSubmit}>
              {user?.is_platform_admin && companyOptions.length ? (
                <label className={styles.field}>
                  <span>Company context</span>
                  <select value={selectedCompanyId} onChange={handleSelectedCompanyChange}>
                    {companyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <CompanyFormFields
                form={companyInfoForm}
                onChange={updateCompanyInfoForm}
                logoUrl={selectedCompany?.logo_url || ""}
                onLogoChange={handleLogoChange}
                onLogoRemove={handleLogoRemove}
                logoUploading={logoUploading}
                showActiveToggle={false}
              />

              <div className={styles.modalActions}>
                <button className={styles.primaryButton} type="submit" disabled={!selectedCompany}>
                  Save company info
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {activeTab === "users" ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>User Management</p>
                <h2>Users and assignments</h2>
              </div>
              <button className={styles.primaryButton} type="button" onClick={() => openUserModal("create")}>
                Create user
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Roles</th>
                    <th>Companies</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((targetUser) => (
                    <tr key={targetUser.id}>
                      <td>{targetUser.full_name}</td>
                      <td className={styles.monoCell}>{targetUser.email}</td>
                      <td>{targetUser.roles.map((role) => role.name).join(", ") || formatRoleName(targetUser.role)}</td>
                      <td>{targetUser.companies.map((company) => company.name).join(", ") || "None"}</td>
                      <td>
                        <StatusBadge tone={targetUser.is_active ? "neutral" : "danger"}>
                          {targetUser.is_active ? "Active" : "Inactive"}
                        </StatusBadge>
                      </td>
                      <td className={styles.actionsCell}>
                        <button className={styles.inlineButton} type="button" onClick={() => openUserModal("edit", targetUser)}>
                          Edit
                        </button>
                        <button
                          className={styles.inlineDanger}
                          type="button"
                          onClick={() => handleDelete("user", targetUser.id, targetUser.full_name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "roles" ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Roles</p>
                <h2>Reusable permission labels</h2>
              </div>
              <button className={styles.primaryButton} type="button" onClick={() => openRoleModal("create")}>
                Create role
              </button>
            </div>

            <div className={styles.listGrid}>
              {visibleRoles.map((role) => (
                <article key={role.id} className={styles.listCard}>
                  <div className={styles.listCardHeader}>
                    <div>
                      <p className={styles.listTitle}>{role.name}</p>
                      <p className={styles.listMeta}>{role.slug}</p>
                    </div>
                    {role.is_system ? <StatusBadge>System</StatusBadge> : <StatusBadge>Custom</StatusBadge>}
                  </div>
                  <p className={styles.bodyCopy}>{role.description || "No description yet."}</p>
                  <div className={styles.cardActions}>
                    <button className={styles.inlineButton} type="button" onClick={() => openRoleModal("edit", role)}>
                      Edit
                    </button>
                    <button
                      className={styles.inlineDanger}
                      type="button"
                      disabled={role.is_system}
                      onClick={() => handleDelete("role", role.id, role.name)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "master-data" ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Master Data</p>
                <h2>Currencies and default pipeline statuses</h2>
              </div>
              {user?.is_platform_admin && companyOptions.length ? (
                <label className={styles.field}>
                  <span>Company context</span>
                  <select value={selectedCompanyId} onChange={handleSelectedCompanyChange}>
                    {companyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className={styles.panelBody}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>Currencies</p>
                    <h2>Available currencies</h2>
                  </div>
                  <button className={styles.primaryButton} type="button" onClick={() => openCurrencyModal("create")} disabled={!selectedCompanyId}>
                    Create currency
                  </button>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Symbol</th>
                        <th>Default</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencies.map((currency) => (
                        <tr key={currency.id}>
                          <td className={styles.monoCell}>{currency.code}</td>
                          <td>{currency.name}</td>
                          <td className={styles.monoCell}>{currency.symbol || currency.code}</td>
                          <td>{currency.is_default ? <StatusBadge>Default</StatusBadge> : "No"}</td>
                          <td>
                            <StatusBadge tone={currency.is_active ? "neutral" : "danger"}>
                              {currency.is_active ? "Active" : "Inactive"}
                            </StatusBadge>
                          </td>
                          <td className={styles.actionsCell}>
                            <button className={styles.inlineButton} type="button" onClick={() => openCurrencyModal("edit", currency)}>
                              Edit
                            </button>
                            <button className={styles.inlineDanger} type="button" onClick={() => handleDelete("currency", currency.id, currency.name)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>Pipeline Defaults</p>
                    <h2>Statuses created with every new pipeline</h2>
                  </div>
                  <button className={styles.primaryButton} type="button" onClick={() => openStatusTemplateModal("create")} disabled={!selectedCompanyId}>
                    Add status
                  </button>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Name</th>
                        <th>Color</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusTemplates.map((template) => (
                        <tr key={template.id}>
                          <td className={styles.monoCell}>{template.position + 1}</td>
                          <td>{template.name}</td>
                          <td className={styles.monoCell}>{template.color}</td>
                          <td className={styles.actionsCell}>
                            <button className={styles.inlineButton} type="button" onClick={() => openStatusTemplateModal("edit", template)}>
                              Edit
                            </button>
                            <button
                              className={styles.inlineDanger}
                              type="button"
                              onClick={() => handleDelete("status-template", template.id, template.name)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {activeTab === "companies" ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Companies</p>
                <h2>Company records</h2>
              </div>
              <button className={styles.primaryButton} type="button" onClick={() => openCompanyModal("create")}>
                Create company
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td className={styles.monoCell}>{company.slug}</td>
                      <td>
                        <StatusBadge tone={company.is_active ? "neutral" : "danger"}>
                          {company.is_active ? "Active" : "Inactive"}
                        </StatusBadge>
                      </td>
                      <td className={styles.actionsCell}>
                        <button className={styles.inlineButton} type="button" onClick={() => openCompanyModal("edit", company)}>
                          Edit
                        </button>
                        <button
                          className={styles.inlineDanger}
                          type="button"
                          onClick={() => handleDelete("company", company.id, company.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {modalState.type === "company" ? (
          <SettingsModal
            title={modalState.mode === "edit" ? "Edit company" : "Create company"}
            description="Use the same modal for creation and editing so company records stay consistent."
            onClose={closeModal}
            onSubmit={handleCompanySubmit}
            submitLabel={modalState.mode === "edit" ? "Save company" : "Create company"}
          >
            <CompanyFormFields form={companyForm} onChange={updateCompanyForm} />
          </SettingsModal>
        ) : null}

        {modalState.type === "role" ? (
          <SettingsModal
            title={modalState.mode === "edit" ? "Edit role" : "Create role"}
            description="Roles are reusable and can be assigned to many users."
            onClose={closeModal}
            onSubmit={handleRoleSubmit}
            submitLabel={modalState.mode === "edit" ? "Save role" : "Create role"}
          >
            <label className={styles.field}>
              <span>Role name</span>
              <input name="name" value={roleForm.name} onChange={updateRoleForm} placeholder="Sales Manager" required />
            </label>
            <label className={styles.field}>
              <span>Description</span>
              <textarea
                name="description"
                value={roleForm.description}
                onChange={updateRoleForm}
                placeholder="What this role is responsible for."
                rows={4}
              />
            </label>
          </SettingsModal>
        ) : null}

        {modalState.type === "user" ? (
          <SettingsModal
            title={modalState.mode === "edit" ? "Edit user" : "Create user"}
            description="Users can have multiple roles and belong to multiple companies."
            onClose={closeModal}
            onSubmit={handleUserSubmit}
            submitLabel={modalState.mode === "edit" ? "Save user" : "Create user"}
          >
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Full name</span>
                <input name="full_name" value={userForm.full_name} onChange={updateUserForm} placeholder="Maya Patel" required />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input name="email" type="email" value={userForm.email} onChange={updateUserForm} placeholder="maya@embercrm.com" required />
              </label>
              <label className={styles.field}>
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  value={userForm.password}
                  onChange={updateUserForm}
                  placeholder={modalState.mode === "edit" ? "Leave blank to keep current password" : "Minimum 8 characters"}
                />
              </label>
              <label className={styles.field}>
                <span>Fallback role</span>
                <select name="role" value={user?.is_platform_admin ? userForm.role : "user"} onChange={updateUserForm} disabled={!user?.is_platform_admin}>
                  {user?.is_platform_admin ? <option value="platform_admin">Platform admin</option> : null}
                  {user?.is_platform_admin ? <option value="company_admin">Company admin</option> : null}
                  <option value="user">User</option>
                </select>
              </label>
              {user?.is_platform_admin ? (
                <label className={styles.field}>
                  <span>Primary company</span>
                  <select name="primary_company_id" value={userForm.primary_company_id} onChange={updateUserForm}>
                    <option value="">No primary company</option>
                    {companyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className={styles.field}>
                  <span>Primary company</span>
                  <input value={selectedCompany?.name || "No company selected"} readOnly />
                </label>
              )}
            </div>

            <div className={styles.assignmentSection}>
              <p className={styles.assignmentTitle}>Assigned roles</p>
              <div className={styles.optionGrid}>
                {roleOptions
                  .filter((option) => !option.is_system)
                  .map((option) => (
                  <label key={option.value} className={styles.optionCard}>
                    <input
                      type="checkbox"
                      checked={userForm.role_ids.includes(option.value)}
                      onChange={() => toggleUserAssignment("role_ids", option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {user?.is_platform_admin ? (
              <div className={styles.assignmentSection}>
                <p className={styles.assignmentTitle}>Assigned companies</p>
                <div className={styles.optionGrid}>
                  {companyOptions.map((option) => (
                    <label key={option.value} className={styles.optionCard}>
                      <input
                        type="checkbox"
                        checked={userForm.company_ids.includes(option.value)}
                        onChange={() => toggleUserAssignment("company_ids", option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <label className={styles.check}>
              <input name="is_active" type="checkbox" checked={userForm.is_active} onChange={updateUserForm} />
              <span>Active user</span>
            </label>
          </SettingsModal>
        ) : null}

        {modalState.type === "currency" ? (
          <SettingsModal
            title={modalState.mode === "edit" ? "Edit currency" : "Create currency"}
            description="Currencies are maintained per company and one can be marked as the default."
            onClose={closeModal}
            onSubmit={handleCurrencySubmit}
            submitLabel={modalState.mode === "edit" ? "Save currency" : "Create currency"}
          >
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Code</span>
                <input name="code" value={currencyForm.code} onChange={updateCurrencyForm} placeholder="EGP" required />
              </label>
              <label className={styles.field}>
                <span>Name</span>
                <input name="name" value={currencyForm.name} onChange={updateCurrencyForm} placeholder="Egyptian Pound" required />
              </label>
              <label className={styles.field}>
                <span>Symbol</span>
                <input name="symbol" value={currencyForm.symbol} onChange={updateCurrencyForm} placeholder="$ or EGP" />
              </label>
            </div>

            <label className={styles.check}>
              <input name="is_default" type="checkbox" checked={currencyForm.is_default} onChange={updateCurrencyForm} />
              <span>Set as default currency</span>
            </label>

            <label className={styles.check}>
              <input name="is_active" type="checkbox" checked={currencyForm.is_active} onChange={updateCurrencyForm} />
              <span>Active currency</span>
            </label>
          </SettingsModal>
        ) : null}

        {modalState.type === "status-template" ? (
          <SettingsModal
            title={modalState.mode === "edit" ? "Edit default pipeline status" : "Create default pipeline status"}
            description="These statuses are added automatically whenever a new pipeline is created for the selected company."
            onClose={closeModal}
            onSubmit={handleStatusTemplateSubmit}
            submitLabel={modalState.mode === "edit" ? "Save status" : "Create status"}
          >
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Status name</span>
                <input name="name" value={statusTemplateForm.name} onChange={updateStatusTemplateForm} placeholder="Qualified" required />
              </label>
              <label className={styles.field}>
                <span>Color</span>
                <input name="color" value={statusTemplateForm.color} onChange={updateStatusTemplateForm} placeholder="#2C7FB8" required />
              </label>
              <label className={styles.field}>
                <span>Position</span>
                <input
                  name="position"
                  type="number"
                  min="0"
                  value={statusTemplateForm.position}
                  onChange={updateStatusTemplateForm}
                />
              </label>
            </div>
          </SettingsModal>
        ) : null}
      </div>
    </DashboardShell>
  );
}
