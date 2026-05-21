import dynamic from "next/dynamic";

import { COUNTRY_OPTIONS } from "@/lib/countries";

import styles from "./contacts-screen.module.css";

const SOCIAL_PLATFORM_OPTIONS = ["LinkedIn", "Facebook", "Instagram", "X", "YouTube", "TikTok", "Behance", "Other"];
const CompanyLocationMap = dynamic(
  () => import("@/components/maps/company-location-map").then((module) => module.CompanyLocationMap),
  { ssr: false },
);

export function ContactsModal({
  mode,
  form,
  onChange,
  onPhoneChange,
  onAddPhone,
  onRemovePhone,
  onClose,
  onSubmit,
  companyOptions,
  pipelineOptions,
  statusOptions,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit contact" : "Create contact"}
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>Contacts</p>
            <h2>{mode === "edit" ? "Edit contact" : "Create contact"}</h2>
            <p className={styles.copy}>Use the same modal for creation and editing so contact records stay consistent.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={onSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Full name</span>
              <input name="fullName" value={form.fullName} onChange={onChange} placeholder="Ahmed Hassan" required />
            </label>
            <label className={styles.field}>
              <span>Job title</span>
              <input name="title" value={form.title} onChange={onChange} placeholder="Procurement Manager" required />
            </label>
            <label className={styles.field}>
              <span>Email</span>
              <input name="email" type="email" value={form.email} onChange={onChange} placeholder="ahmed@nilecontracting.com.eg" required />
            </label>
            <label className={styles.field}>
              <span>Company</span>
              <select name="companyId" value={form.companyId} onChange={onChange} required>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Pipeline</span>
              <select name="pipelineId" value={form.pipelineId} onChange={onChange}>
                <option value="">No pipeline</option>
                {pipelineOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {form.pipelineId ? (
              <label className={styles.field}>
                <span>Status</span>
                <select name="status" value={form.status} onChange={onChange}>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className={styles.field}>
              <span>Last touch</span>
              <input name="lastTouch" type="date" value={form.lastTouch} onChange={onChange} required />
            </label>
          </div>

          <div className={styles.phoneSection}>
            <div className={styles.sectionRow}>
              <span className={styles.sectionLabel}>Phone numbers</span>
              <button className={styles.inlineButton} type="button" onClick={onAddPhone}>
                Add number
              </button>
            </div>
            <div className={styles.phoneList}>
              {form.phoneNumbers.map((phone, index) => (
                <div key={`contact-phone-${index}`} className={styles.phoneRow}>
                  <input
                    value={phone}
                    onChange={(event) => onPhoneChange(index, event.target.value)}
                    placeholder={index === 0 ? "+20 10 1234 5678" : "Another Egypt mobile number"}
                    required={index === 0}
                  />
                  {form.phoneNumbers.length > 1 ? (
                    <button className={styles.inlineDanger} type="button" onClick={() => onRemovePhone(index)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <label className={styles.field}>
            <span>Notes</span>
            <textarea name="notes" value={form.notes} onChange={onChange} rows={4} placeholder="Met at the New Cairo tender meeting. Follow up next week with pricing." />
          </label>

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit">
              {mode === "edit" ? "Save contact" : "Create contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CompanyModal({
  mode = "create",
  form,
  industryOptions = [],
  onChange,
  onPhoneChange,
  onAddPhone,
  onRemovePhone,
  onSocialChange,
  onAddSocial,
  onRemoveSocial,
  onLocationChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit company" : "Create company"}
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>Companies</p>
            <h2>{mode === "edit" ? "Edit company" : "Create company"}</h2>
            <p className={styles.copy}>Capture the company details once so connected contacts can live under the same account.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={onSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Company name</span>
              <input name="name" value={form.name} onChange={onChange} placeholder="Nile Contracting" required />
            </label>
            <label className={styles.field}>
              <span>Company owner</span>
              <input name="ownerName" value={form.ownerName} onChange={onChange} placeholder="Mariam Hany" />
            </label>
            <label className={styles.field}>
              <span>Industry</span>
              <select name="industry" value={form.industry} onChange={onChange}>
                <option value="">Select industry</option>
                {industryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Email</span>
              <input name="email" type="email" value={form.email} onChange={onChange} placeholder="hello@nilecontracting.com.eg" />
            </label>
            <label className={styles.field}>
              <span>Website</span>
              <input name="website" type="url" value={form.website} onChange={onChange} placeholder="https://nilecontracting.com.eg" />
            </label>
            <label className={styles.field}>
              <span>Company size</span>
              <input name="employeeCount" type="number" min="1" value={form.employeeCount} onChange={onChange} placeholder="250" />
            </label>
          </div>

          <div className={styles.phoneSection}>
            <div className={styles.sectionRow}>
              <span className={styles.sectionLabel}>Phone numbers</span>
              <button className={styles.inlineButton} type="button" onClick={onAddPhone}>
                Add number
              </button>
            </div>
            <div className={styles.phoneList}>
              {form.phoneNumbers.map((phone, index) => (
                <div key={`phone-${index}`} className={styles.phoneRow}>
                  <input
                    value={phone}
                    onChange={(event) => onPhoneChange(index, event.target.value)}
                    placeholder={index === 0 ? "+20 2 2461 2345" : "Another Egypt office number"}
                  />
                  {form.phoneNumbers.length > 1 ? (
                    <button className={styles.inlineDanger} type="button" onClick={() => onRemovePhone(index)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.phoneSection}>
            <div className={styles.sectionRow}>
              <span className={styles.sectionLabel}>Other socials</span>
              <button className={styles.inlineButton} type="button" onClick={onAddSocial}>
                Add social
              </button>
            </div>
            <div className={styles.phoneList}>
              {form.socialLinks.length ? (
                form.socialLinks.map((social, index) => (
                  <div key={`social-${index}`} className={styles.socialRow}>
                    <select value={social.platform} onChange={(event) => onSocialChange(index, "platform", event.target.value)}>
                      <option value="">Select platform</option>
                      {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <input
                      value={social.url}
                      onChange={(event) => onSocialChange(index, "url", event.target.value)}
                      placeholder="www.youtube.com/@nilecontracting"
                    />
                    <button className={styles.inlineDanger} type="button" onClick={() => onRemoveSocial(index)}>
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className={styles.helperCopy}>Optional links like LinkedIn, YouTube, Facebook, Instagram, or any other company social.</p>
              )}
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Country</span>
              <select name="addressCountry" value={form.addressCountry} onChange={onChange}>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>State</span>
              <input name="addressState" value={form.addressState} onChange={onChange} placeholder="Cairo" />
            </label>
          </div>

          <label className={styles.field}>
            <span>Address</span>
            <textarea
              name="addressLine"
              value={form.addressLine}
              onChange={onChange}
              rows={4}
              placeholder="90 North Teseen St, Fifth Settlement, New Cairo"
            />
          </label>

          <div className={styles.mapSection}>
            <div className={styles.sectionRow}>
              <span className={styles.sectionLabel}>Location on map</span>
              <span className={styles.helperText}>Click the map to pin the company location.</span>
            </div>
            <CompanyLocationMap
              className={styles.mapCanvas}
              latitude={form.latitude ? Number(form.latitude) : null}
              longitude={form.longitude ? Number(form.longitude) : null}
              onSelect={onLocationChange}
              interactive
            />
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Latitude</span>
                <input name="latitude" value={form.latitude} onChange={onChange} placeholder="30.0444" />
              </label>
              <label className={styles.field}>
                <span>Longitude</span>
                <input name="longitude" value={form.longitude} onChange={onChange} placeholder="31.2357" />
              </label>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit">
              {mode === "edit" ? "Save company" : "Create company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ContactImportModal({
  fileName,
  loading,
  preview,
  mapping,
  selectedPipelineId,
  pipelineOptions,
  showDeleteImported,
  onFileChange,
  onPipelineChange,
  onMappingChange,
  onAnalyze,
  onImport,
  onDeleteImported,
  onClose,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Import contacts">
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>Contacts</p>
            <h2>Import from Excel</h2>
            <p className={styles.copy}>Upload a client lead sheet, review the detected mapping, then confirm the import.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>

        <div className={styles.modalBody}>
          <label className={styles.field}>
            <span>Excel file</span>
            <input type="file" accept=".xlsx,.xlsm" onChange={onFileChange} />
          </label>

          <label className={styles.field}>
            <span>Pipeline for imported contacts</span>
            <select value={selectedPipelineId} onChange={(event) => onPipelineChange(event.target.value)}>
              <option value="">No pipeline</option>
              {pipelineOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {fileName ? <p className={styles.helperCopy}>Selected file: {fileName}</p> : null}

          {!preview ? (
            <div className={styles.modalActions}>
              {showDeleteImported ? (
                <button className={styles.inlineDangerSoft} type="button" onClick={onDeleteImported} disabled={loading}>
                  Delete imported data
                </button>
              ) : null}
              <button className={styles.secondaryButton} type="button" onClick={onClose}>
                Cancel
              </button>
              <button className={styles.primaryButton} type="button" onClick={onAnalyze} disabled={!fileName || loading}>
                {loading ? "Analyzing..." : "Analyze file"}
              </button>
            </div>
          ) : (
            <>
              <div className={styles.importSummary}>
                <span>{preview.stats.row_count} parsed rows</span>
                <span>{preview.stats.sheet_count} sheets</span>
                <span>{preview.stats.unmatched_column_count} unmatched columns</span>
              </div>

              {preview.unmatched_columns.length ? (
                <p className={styles.warningCopy}>
                  Some columns were not recognized automatically. You can leave them ignored or map them manually below.
                </p>
              ) : null}

              <div className={styles.importSheetList}>
                {preview.sheets.map((sheet) => (
                  <section key={sheet.sheet_key} className={styles.importSheetCard}>
                    <div className={styles.sectionRow}>
                      <span className={styles.sectionLabel}>{sheet.sheet_name}</span>
                      {sheet.requires_manual_mapping ? <span className={styles.warningBadge}>Manual mapping needed</span> : null}
                    </div>

                    <div className={styles.importMappingList}>
                      {sheet.columns.map((column) => (
                        <div key={column.source_key} className={styles.importMappingRow}>
                          <div>
                            <strong>{column.header}</strong>
                          </div>
                          <select value={mapping[column.source_key] ?? column.suggested_field ?? ""} onChange={(event) => onMappingChange(column.source_key, event.target.value)}>
                            {preview.available_fields.map((option) => (
                              <option key={`${column.source_key}-${option.value || "ignore"}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    {sheet.preview_rows.length ? (
                      <div className={styles.importPreviewTableWrap}>
                        <table className={styles.importPreviewTable}>
                          <thead>
                            <tr>
                              <th>Company</th>
                              <th>Contact</th>
                              <th>Email</th>
                              <th>Phone</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.preview_rows.map((row, index) => (
                              <tr key={`${sheet.sheet_key}-row-${index}`}>
                                <td>{row.company_name || "—"}</td>
                                <td>{row.contact_name || "—"}</td>
                                <td>{row.contact_email || "—"}</td>
                                <td>{row.contact_phone || "—"}</td>
                                <td>{row.status || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>

              <div className={styles.modalActions}>
                {showDeleteImported ? (
                  <button className={styles.inlineDangerSoft} type="button" onClick={onDeleteImported} disabled={loading}>
                    Delete imported data
                  </button>
                ) : null}
                <button className={styles.secondaryButton} type="button" onClick={onClose}>
                  Cancel
                </button>
                <button className={styles.secondaryButton} type="button" onClick={onAnalyze} disabled={!fileName || loading}>
                  {loading ? "Refreshing..." : "Re-analyze"}
                </button>
                <button className={styles.primaryButton} type="button" onClick={onImport} disabled={!fileName || loading}>
                  {loading ? "Importing..." : "Import contacts"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
