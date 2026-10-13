import { useEffect, useRef, useState, type FormEvent } from 'react'
import './Profile.css'
import DashboardSidebar from './DashboardSidebar'
import { getInitials, saveProfile, useProfile, type ProfileData } from './profileData'
import { useNutritionGoals } from './settingsData'

type ProfileErrors = Partial<Record<keyof ProfileData, string>>

function Profile() {
  const [profile, setProfile] = useProfile()
  const [goals] = useNutritionGoals()
  const [form, setForm] = useState<ProfileData>(profile)
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [storageWarning, setStorageWarning] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const displayName = profile.fullName.trim() || 'Your Name'

  useEffect(() => {
    if (!isEditing) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { closeEditor(); return }
      if (event.key !== 'Tab') return
      const dialog = document.querySelector<HTMLElement>('.profile-modal')
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
      if (focusable.length === 0) { event.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; previouslyFocusedRef.current?.focus() }
  }, [isEditing])

  function openEditor() { setForm(profile); setErrors({}); setIsEditing(true) }
  function closeEditor() { setIsEditing(false); setErrors({}) }
  function updateField(field: keyof ProfileData, value: string) { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })) }
  function validateForm() {
    const nextErrors: ProfileErrors = {}
    if (!form.fullName.trim()) nextErrors.fullName = 'Enter your full name.'
    const numericFields = [{ field: 'age' as const, label: 'Age', min: 1, max: 120 }, { field: 'height' as const, label: 'Height', min: 50, max: 250 }, { field: 'weight' as const, label: 'Weight', min: 20, max: 500 }]
    for (const item of numericFields) {
      if (!form[item.field]) continue
      const value = Number(form[item.field])
      if (!Number.isFinite(value) || value < item.min || value > item.max) nextErrors[item.field] = `${item.label} must be between ${item.min} and ${item.max}.`
    }
    return nextErrors
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    const nextProfile = { ...form, fullName: form.fullName.trim() }
    setProfile(nextProfile)
    setStorageWarning(saveProfile(nextProfile) ? '' : 'Your profile was updated for this session, but may not persist after refreshing.')
    setIsEditing(false)
  }

  return (
    <div className="dashboard-shell profile-shell">
      <DashboardSidebar active="profile" />
      <main className="dashboard-main profile-main">
        {storageWarning && <p className="storage-warning" role="alert">{storageWarning}</p>}
        <header className="profile-page-header"><div><p className="dashboard-kicker">Your account</p><h1>Profile</h1><p className="profile-description">Manage your personal information and nutrition preferences.</p></div></header>
        <section className="profile-hero-card"><div className="profile-large-avatar">{getInitials(displayName)}</div><div><h2>{displayName}</h2><p>Calorie’d Member</p></div><button className="profile-edit-button" type="button" onClick={openEditor}>Edit Profile</button></section>
        <div className="profile-content-grid"><section className="profile-info-card"><div className="profile-card-heading"><div><p className="dashboard-kicker">About you</p><h2>Personal Information</h2></div></div><dl className="profile-details"><div><dt>Full Name</dt><dd>{profile.fullName || '—'}</dd></div><div><dt>Age</dt><dd>{profile.age ? `${profile.age} years` : '—'}</dd></div><div><dt>Height</dt><dd>{profile.height ? `${profile.height} cm` : '—'}</dd></div><div><dt>Weight</dt><dd>{profile.weight ? `${profile.weight} kg` : '—'}</dd></div></dl></section><section className="profile-goals-card"><p className="dashboard-kicker">Your daily target</p><h2>My Nutrition Goals</h2><div className="profile-goal-value"><strong>{goals.calories.toLocaleString()}</strong><span>calories per day</span></div><button className="manage-goals-button" type="button" disabled>Manage Goals in Settings</button><small>Settings will be available in a future update.</small></section></div>
      </main>

      {isEditing && <div className="profile-modal-backdrop" role="presentation"><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"><div className="profile-modal-header"><div><p className="dashboard-kicker">Your details</p><h2 id="edit-profile-title">Edit Profile</h2></div><button className="profile-modal-close" ref={closeButtonRef} type="button" onClick={closeEditor} aria-label="Close Edit Profile dialog">×</button></div><form className="profile-form" onSubmit={handleSubmit} noValidate><div className="profile-form-field profile-form-wide"><label htmlFor="profile-full-name">Full Name</label><input id="profile-full-name" type="text" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} aria-invalid={Boolean(errors.fullName)} placeholder="Your full name" />{errors.fullName && <span className="profile-field-error">{errors.fullName}</span>}</div><div className="profile-form-field"><label htmlFor="profile-age">Age <span>(optional)</span></label><input id="profile-age" type="number" min="1" max="120" value={form.age} onChange={(event) => updateField('age', event.target.value)} aria-invalid={Boolean(errors.age)} placeholder="Years" />{errors.age && <span className="profile-field-error">{errors.age}</span>}</div><div className="profile-form-field"><label htmlFor="profile-height">Height <span>(cm, optional)</span></label><input id="profile-height" type="number" min="50" max="250" value={form.height} onChange={(event) => updateField('height', event.target.value)} aria-invalid={Boolean(errors.height)} placeholder="cm" />{errors.height && <span className="profile-field-error">{errors.height}</span>}</div><div className="profile-form-field"><label htmlFor="profile-weight">Weight <span>(kg, optional)</span></label><input id="profile-weight" type="number" min="20" max="500" value={form.weight} onChange={(event) => updateField('weight', event.target.value)} aria-invalid={Boolean(errors.weight)} placeholder="kg" />{errors.weight && <span className="profile-field-error">{errors.weight}</span>}</div><div className="profile-modal-actions"><button className="profile-cancel-button" type="button" onClick={closeEditor}>Cancel</button><button className="profile-save-button" type="submit">Save Changes</button></div></form></section></div>}
    </div>
  )
}

export default Profile
