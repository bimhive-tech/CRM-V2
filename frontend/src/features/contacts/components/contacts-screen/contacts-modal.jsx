import styles from "./contacts-screen.module.css";

export function ContactsModal({ mode, form, onChange, onClose, onSubmit, companyOptions, pipelineOptions, statusOptions }) {
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
              <span>Phone</span>
              <input name="phone" value={form.phone} onChange={onChange} placeholder="+20 10 1234 5678" required />
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

export function CompanyModal({ mode = "create", form, onChange, onPhoneChange, onAddPhone, onRemovePhone, onClose, onSubmit }) {
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
              <span>Email</span>
              <input name="email" type="email" value={form.email} onChange={onChange} placeholder="hello@nilecontracting.com.eg" />
            </label>
            <label className={styles.field}>
              <span>Website</span>
              <input name="website" type="url" value={form.website} onChange={onChange} placeholder="https://nilecontracting.com.eg" />
            </label>
            <label className={styles.field}>
              <span>LinkedIn</span>
              <input name="linkedinUrl" type="url" value={form.linkedinUrl} onChange={onChange} placeholder="https://linkedin.com/company/nile-contracting" />
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

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Country</span>
              <input name="addressCountry" value={form.addressCountry} onChange={onChange} placeholder="Egypt" />
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
