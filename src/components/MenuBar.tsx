import React from 'react';
import { Search, UserPlus, FileDown, Database, Users, Globe, Sun, Moon, Map, List } from 'lucide-react';
import { UI_TRANSLATIONS, type Language } from '../locales';

interface MenuBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddPersonClick: () => void;
  onExportPDF: () => void;
  onExportJSON: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  viewMode: 'map' | 'list';
  setViewMode: (mode: 'map' | 'list') => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  searchQuery,
  setSearchQuery,
  onAddPersonClick,
  onExportPDF,
  onExportJSON,
  lang,
  setLang,
  theme,
  setTheme,
  viewMode,
  setViewMode,
}) => {
  const t = UI_TRANSLATIONS[lang];

  return (
    <header className="menu-bar" id="app-menu-bar">
      <div className="brand-section">
        <div className="brand-logo">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <div>
          <h1 className="brand-title">{lang === 'uk' ? 'СПАДЩИНА' : 'HERITAGE'}</h1>
          <div className="brand-tagline">{t.tagline}</div>
        </div>
      </div>

      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="search-people-input"
        />
      </div>

      <div className="actions-container">
        {/* Language selector toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
          <Globe size={14} style={{ color: 'var(--color-muted-foreground)' }} />
          <button
            onClick={() => setLang('en')}
            style={{
              background: lang === 'en' ? 'var(--color-accent)' : 'transparent',
              color: lang === 'en' ? 'var(--color-on-accent)' : 'var(--color-muted-foreground)',
              border: 'none',
              borderRadius: '4px',
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            EN
          </button>
          <button
            onClick={() => setLang('uk')}
            style={{
              background: lang === 'uk' ? 'var(--color-accent)' : 'transparent',
              color: lang === 'uk' ? 'var(--color-on-accent)' : 'var(--color-muted-foreground)',
              border: 'none',
              borderRadius: '4px',
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            UA
          </button>
        </div>

        {/* Theme selector toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="control-btn"
          title={t.toggleTheme}
          style={{ width: '2.5rem', height: '2.5rem', border: '1px solid var(--color-border)', background: 'var(--color-background)', borderRadius: '6px' }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Mobile View Toggle Switch (Map vs. List) */}
        <div className="mobile-view-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
          <button
            onClick={() => setViewMode('map')}
            style={{
              background: viewMode === 'map' ? 'var(--color-accent)' : 'transparent',
              color: viewMode === 'map' ? 'var(--color-on-accent)' : 'var(--color-muted-foreground)',
              border: 'none',
              borderRadius: '4px',
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title={t.viewMap}
          >
            <Map size={12} />
            <span className="btn-label-desktop">{t.viewMap}</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              background: viewMode === 'list' ? 'var(--color-accent)' : 'transparent',
              color: viewMode === 'list' ? 'var(--color-on-accent)' : 'var(--color-muted-foreground)',
              border: 'none',
              borderRadius: '4px',
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title={t.viewList}
          >
            <List size={12} />
            <span className="btn-label-desktop">{t.viewList}</span>
          </button>
        </div>

        <div className="collab-badge" title="Collaboration active: sharing invite-only stories">
          <div className="collab-dot"></div>
          <Users size={14} />
          <span>{t.inviteOnly}</span>
        </div>

        <button
          className="btn btn-secondary"
          onClick={onExportJSON}
          title="Backup your stories and canvas in JSON format"
        >
          <Database size={16} />
          <span className="btn-label-desktop">{t.backupJson}</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onExportPDF}
          title="Export storybook to PDF format"
        >
          <FileDown size={16} />
          <span className="btn-label-desktop">{t.exportBook}</span>
        </button>

        <button
          className="btn btn-primary"
          onClick={onAddPersonClick}
          id="add-person-btn"
        >
          <UserPlus size={16} />
          <span>{t.addPerson}</span>
        </button>
      </div>
    </header>
  );
};
