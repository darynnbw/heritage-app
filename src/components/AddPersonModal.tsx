import React, { useState } from 'react';
import { X, Image as ImageIcon, Check } from 'lucide-react';
import { UI_TRANSLATIONS, type Language } from '../locales';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPerson: (personData: {
    name: string;
    relationship: string;
    bio: string;
    photo: string;
  }) => void;
  lang: Language;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  isOpen,
  onClose,
  onAddPerson,
  lang,
}) => {
  const t = UI_TRANSLATIONS[lang];

  const PORTRAIT_PRESETS = [
    { name: t.presetRosa, url: '/rosa.png' },
    { name: t.presetKowalski, url: '/kowalski.png' },
    { name: t.presetNeighbor, url: '/neighbor.png' },
    { name: t.presetSilhouette, url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=300&auto=format&fit=crop' }
  ];

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState(PORTRAIT_PRESETS[0].url);
  const [customPhotoName, setCustomPhotoName] = useState('');

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomPhotoName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !relationship) return;
    onAddPerson({
      name,
      relationship,
      bio,
      photo,
    });
    setName('');
    setRelationship('');
    setBio('');
    setPhoto(PORTRAIT_PRESETS[0].url);
    setCustomPhotoName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-labelledby="add-person-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="add-person-title" style={{ fontFamily: 'var(--font-serif-brand)' }}>{t.addPersonTitle}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label={t.cancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="person-name-input">{t.fullName}</label>
              <input
                id="person-name-input"
                type="text"
                placeholder={t.namePlaceholder}
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="person-relation-input">{t.relationshipLabel}</label>
              <input
                id="person-relation-input"
                type="text"
                placeholder={t.relationInputPlaceholder}
                className="form-input"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="person-bio-input">{t.shortBio}</label>
              <textarea
                id="person-bio-input"
                placeholder={t.bioPlaceholder}
                className="form-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" id="portrait-photo-label">{t.portraitPhoto}</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }} role="group" aria-labelledby="portrait-photo-label">
                {PORTRAIT_PRESETS.map((preset, idx) => {
                  const isSelected = photo === preset.url && !customPhotoName;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPhoto(preset.url);
                        setCustomPhotoName('');
                      }}
                      aria-pressed={isSelected}
                      style={{
                        position: 'relative',
                        padding: '0.25rem',
                        background: isSelected ? 'var(--amber-light)' : 'transparent',
                        border: isSelected ? '2px solid var(--amber-gold)' : '1px solid var(--border-muted)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-slate-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                        {preset.name}
                      </span>
                      {isSelected && (
                        <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--amber-gold)', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={8} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '4px' }} htmlFor="custom-portrait-upload">
                  <ImageIcon size={14} />
                  <span>{t.uploadCustomPhoto}</span>
                  <input
                    id="custom-portrait-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {customPhotoName && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-slate-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Check size={12} style={{ color: '#27ae60' }} />
                    {customPhotoName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '4px' }}>
              {t.cancel}
            </button>
            <button type="submit" className="btn wax-seal-btn" style={{ borderRadius: '4px' }}>
              {t.addPerson}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
