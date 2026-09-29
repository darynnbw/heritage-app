import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronLeft, Plus } from 'lucide-react'
import { RELATIONSHIP_CHIPS, RELATIONSHIP_SUGGESTIONS } from './prompts'
import { triggerHaptic } from './haptics'
import type { Relative } from './types'

const SEARCH_AT = 8
const COMPACT_QUERY = '(max-width: 720px)'

type MenuCoords = {
  top: number
  left: number
  width: number
  maxHeight: number
  origin: 'top' | 'bottom'
}

function formatRelationship(value: string) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function useCompact() {
  const [compact, setCompact] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches
  ))

  useEffect(() => {
    const media = window.matchMedia(COMPACT_QUERY)
    function sync() {
      setCompact(media.matches)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return compact
}

export function PersonSelect({
  value,
  people,
  onChange,
  onCreate,
  labelledBy,
}: {
  value: string
  people: Relative[]
  onChange: (value: string) => void
  onCreate: (input: { name: string; relationship: string }) => Promise<void>
  labelledBy?: string
}) {
  const listboxId = useId()
  const searchId = useId()
  const compact = useCompact()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const otherInputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const closeTimer = useRef<number>(0)
  const [rendered, setRendered] = useState(false)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'add'>('list')
  const [coords, setCoords] = useState<MenuCoords | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [newRelationship, setNewRelationship] = useState('')
  const [otherOpen, setOtherOpen] = useState(false)
  const [nameError, setNameError] = useState('')
  const [relationshipError, setRelationshipError] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const selected = people.find((person) => person.id === value) ?? people[0] ?? null
  const showSearch = people.length >= SEARCH_AT
  const visiblePeople = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return people
    return people.filter((person) => {
      const rel = person.relationship.toLowerCase()
      return person.name.toLowerCase().includes(needle) || rel.includes(needle)
    })
  }, [people, query])
  const optionCount = visiblePeople.length + 1
  const chipSet = useMemo(() => new Set<string>(RELATIONSHIP_CHIPS), [])
  const normalizedRel = newRelationship.trim().toLowerCase()
  const otherSelected = otherOpen || (normalizedRel !== '' && !chipSet.has(normalizedRel))
  const relationshipMatches = useMemo(() => {
    if (!otherSelected) return []
    const needle = newRelationship.trim().toLowerCase()
    if (needle.length < 2) return []
    return RELATIONSHIP_SUGGESTIONS.filter(
      (item) => item.includes(needle) && item !== needle
    ).slice(0, 4)
  }, [otherSelected, newRelationship])

  function resetAddForm() {
    setNewName('')
    setNewRelationship('')
    setOtherOpen(false)
    setNameError('')
    setRelationshipError('')
    setCreateError('')
    setCreating(false)
  }

  function measure() {
    const trigger = triggerRef.current
    if (!trigger || compact) return
    const rect = trigger.getBoundingClientRect()
    const viewport = window.visualViewport
    const viewHeight = viewport?.height ?? window.innerHeight
    const viewWidth = viewport?.width ?? window.innerWidth
    const offsetTop = viewport?.offsetTop ?? 0
    const gap = 8
    const spaceBelow = viewHeight - (rect.bottom - offsetTop) - 16
    const spaceAbove = rect.top - offsetTop - 16
    const origin: 'top' | 'bottom' = spaceBelow < 180 && spaceAbove > spaceBelow ? 'bottom' : 'top'
    const maxHeight = Math.max(160, Math.min(mode === 'add' ? 420 : 360, origin === 'top' ? spaceBelow - gap : spaceAbove - gap))
    const width = Math.min(rect.width, viewWidth - 24)
    const left = Math.min(Math.max(12, rect.left), viewWidth - width - 12)
    const top = origin === 'top'
      ? rect.bottom + gap
      : rect.top - gap - maxHeight

    setCoords({ top, left, width, maxHeight, origin })
  }

  function openMenu() {
    triggerHaptic('selection')
    const selectedIndex = Math.max(0, people.findIndex((person) => person.id === value))
    setQuery('')
    setMode('list')
    resetAddForm()
    setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex)
    measure()
    setRendered(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true))
    })
  }

  function closeMenu(restoreFocus = true) {
    setOpen(false)
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      setRendered(false)
      setMode('list')
      resetAddForm()
    }, 280)
    if (restoreFocus) triggerRef.current?.focus()
  }

  function showAddForm() {
    triggerHaptic('selection')
    resetAddForm()
    setMode('add')
  }

  function backToList() {
    triggerHaptic('light')
    setMode('list')
    resetAddForm()
  }

  function choose(next: string) {
    triggerHaptic('selection')
    onChange(next)
    closeMenu()
  }

  async function submitNewPerson() {
    let hasError = false
    if (!newName.trim()) {
      setNameError('Add their name.')
      hasError = true
    }
    if (!newRelationship.trim()) {
      setRelationshipError('Choose how they relate to you.')
      hasError = true
    }
    if (hasError) return

    setCreating(true)
    setCreateError('')
    try {
      await onCreate({ name: newName.trim(), relationship: newRelationship.trim() })
      triggerHaptic('success')
      closeMenu()
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not add this person.')
      setCreating(false)
    }
  }

  useLayoutEffect(() => {
    if (!rendered) return
    measure()
  }, [rendered, compact, mode])

  useEffect(() => {
    if (!rendered) return

    function onReposition() {
      measure()
    }

    window.addEventListener('resize', onReposition)
    window.visualViewport?.addEventListener('resize', onReposition)
    window.visualViewport?.addEventListener('scroll', onReposition)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('resize', onReposition)
      window.visualViewport?.removeEventListener('resize', onReposition)
      window.visualViewport?.removeEventListener('scroll', onReposition)
      document.body.style.overflow = previousOverflow
    }
  }, [rendered, compact])

  useEffect(() => {
    return () => window.clearTimeout(closeTimer.current)
  }, [])

  useEffect(() => {
    if (!open || mode !== 'add' || otherOpen) return
    const frame = window.requestAnimationFrame(() => nameRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, mode, otherOpen])

  useEffect(() => {
    if (!open || mode !== 'add' || !otherOpen) return
    const frame = window.requestAnimationFrame(() => otherInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, mode, otherOpen])

  useEffect(() => {
    if (!open || mode !== 'list') return
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!finePointer) return
    optionRefs.current[activeIndex]?.focus({ preventScroll: true })
  }, [open, mode])

  useEffect(() => {
    if (!rendered) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (mode === 'add') backToList()
        else closeMenu()
        return
      }
      if (mode !== 'list') return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % optionCount)
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + optionCount) % optionCount)
      }
      if (event.key === 'Home') {
        event.preventDefault()
        setActiveIndex(0)
      }
      if (event.key === 'End') {
        event.preventDefault()
        setActiveIndex(optionCount - 1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rendered, optionCount, mode])

  const menuReady = rendered && (compact || coords)

  return (
    <div className="mvp-person-select">
      <button
        ref={triggerRef}
        type="button"
        className={`mvp-person-select-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={labelledBy}
        onClick={() => (rendered ? closeMenu() : openMenu())}
      >
        <span className="mvp-person-select-value">
          {selected ? (
            <>
              <span className="mvp-person-select-name">{selected.name}</span>
              {selected.relationship && (
                <span className="mvp-person-select-rel">{formatRelationship(selected.relationship)}</span>
              )}
            </>
          ) : (
            'Choose someone'
          )}
        </span>
        <ChevronDown className="mvp-person-select-chevron" size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {menuReady && createPortal(
        <div
          className={`mvp-person-select-layer${compact ? ' is-sheet' : ''}`}
          onClick={() => closeMenu()}
        >
          <div className={`mvp-person-select-scrim${open ? ' is-open' : ''}`} />
          <div
            id={listboxId}
            role="dialog"
            aria-labelledby={labelledBy}
            className={`mvp-person-select-menu${compact ? ' is-sheet' : ` origin-${coords?.origin ?? 'top'}`}${mode === 'add' ? ' is-adding' : ''}${open ? ' is-open' : ''}`}
            style={compact || !coords ? undefined : {
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {compact && (
              <div className="mvp-person-select-sheet-head">
                <div className="mvp-sheet-grabber" />
                {mode === 'add' ? (
                  <div className="mvp-person-select-nav">
                    <button type="button" className="mvp-person-select-back" onClick={backToList}>
                      <ChevronLeft size={20} strokeWidth={2.2} aria-hidden="true" />
                      Back
                    </button>
                    <p className="mvp-person-select-sheet-title">Someone new</p>
                  </div>
                ) : (
                  <p className="mvp-person-select-sheet-title">Who is this about?</p>
                )}
              </div>
            )}
            {!compact && mode === 'add' && (
              <div className="mvp-person-select-nav">
                <button type="button" className="mvp-person-select-back" onClick={backToList}>
                  <ChevronLeft size={20} strokeWidth={2.2} aria-hidden="true" />
                  Back
                </button>
                <p className="mvp-person-select-sheet-title">Someone new</p>
              </div>
            )}

            {mode === 'add' ? (
              <form
                className="mvp-person-select-add-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitNewPerson()
                }}
              >
                <label className="mvp-subfield">
                  <span className="mvp-label">Name</span>
                  <input
                    ref={nameRef}
                    className="mvp-input"
                    value={newName}
                    onChange={(event) => {
                      setNewName(event.target.value)
                      setNameError('')
                    }}
                    autoComplete="off"
                    enterKeyHint="next"
                  />
                  {nameError && <p className="mvp-error">{nameError}</p>}
                </label>
                <div className="mvp-subfield">
                  <span className="mvp-label">Relationship to you</span>
                  <div className="mvp-relationship-chips" role="group" aria-label="Relationship options">
                    {RELATIONSHIP_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className={`mvp-relationship-chip${normalizedRel === chip ? ' selected' : ''}`}
                        aria-pressed={normalizedRel === chip}
                        onClick={() => {
                          setNewRelationship(chip)
                          setOtherOpen(false)
                          setRelationshipError('')
                        }}
                      >
                        {formatRelationship(chip)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`mvp-relationship-chip${otherSelected ? ' selected' : ''}`}
                      aria-pressed={otherSelected}
                      onClick={() => {
                        setOtherOpen(true)
                        if (chipSet.has(normalizedRel)) setNewRelationship('')
                        setRelationshipError('')
                      }}
                    >
                      Other
                    </button>
                  </div>
                  {otherSelected && (
                    <div className="mvp-person-select-other">
                      <input
                        ref={otherInputRef}
                        className="mvp-input"
                        value={newRelationship}
                        onChange={(event) => {
                          setNewRelationship(event.target.value)
                          setRelationshipError('')
                        }}
                        placeholder="e.g. mentor, cousin"
                        autoComplete="off"
                      />
                      {relationshipMatches.length > 0 && (
                        <div className="mvp-person-select-suggests" role="listbox" aria-label="Relationship suggestions">
                          {relationshipMatches.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="mvp-person-select-suggest"
                              onClick={() => {
                                setNewRelationship(item)
                                setOtherOpen(!chipSet.has(item))
                                setRelationshipError('')
                              }}
                            >
                              {formatRelationship(item)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {relationshipError && <p className="mvp-error">{relationshipError}</p>}
                </div>
                {createError && <p className="mvp-error">{createError}</p>}
                <button className="mvp-btn mvp-btn-primary mvp-btn-block" type="submit" disabled={creating}>
                  {creating ? 'Adding…' : 'Add person'}
                </button>
              </form>
            ) : (
              <>
                {showSearch && (
                  <div className="mvp-person-select-search">
                    <label className="mvp-sr-only" htmlFor={searchId}>Search people</label>
                    <input
                      id={searchId}
                      className="mvp-input mvp-person-select-search-input"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setActiveIndex(0)
                      }}
                      placeholder="Search"
                      autoComplete="off"
                      enterKeyHint="search"
                    />
                  </div>
                )}
                <div className="mvp-person-select-list" role="listbox">
                  {visiblePeople.length === 0 && (
                    <p className="mvp-person-select-empty">No one matches that.</p>
                  )}
                  {visiblePeople.map((person, index) => {
                    const selectedOption = person.id === value
                    return (
                      <button
                        key={person.id}
                        ref={(node) => { optionRefs.current[index] = node }}
                        type="button"
                        role="option"
                        aria-selected={selectedOption}
                        className={`mvp-person-select-option${selectedOption ? ' is-selected' : ''}${activeIndex === index ? ' is-active' : ''}`}
                        style={{ '--i': Math.min(index, 5) } as CSSProperties}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(person.id)}
                      >
                        <span className="mvp-person-select-option-copy">
                          <span className="mvp-person-select-option-name">{person.name}</span>
                          {person.relationship && (
                            <span className="mvp-person-select-option-rel">{formatRelationship(person.relationship)}</span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="mvp-person-select-footer">
                  <button
                    ref={(node) => { optionRefs.current[visiblePeople.length] = node }}
                    type="button"
                    className={`mvp-person-select-option mvp-person-select-add${activeIndex === visiblePeople.length ? ' is-active' : ''}`}
                    style={{ '--i': Math.min(visiblePeople.length, 5) } as CSSProperties}
                    onMouseEnter={() => setActiveIndex(visiblePeople.length)}
                    onClick={showAddForm}
                  >
                    <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
                    Add someone…
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
