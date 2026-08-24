import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Check } from 'lucide-react';
import { UI_TRANSLATIONS, type Language } from '../locales';
import type { Person } from '../types';

interface EditPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  onEditPerson: (personId: string, updatedData: {
    name: string;
    relationship: string;
    bio: string;
    photo: string;
  }) => void;
  lang: Language;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  isOpen,
  onClose,
  person,
  onEditPerson,
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
  const [photo, setPhoto] = useState('');
  const [customPhotoName, setCustomPhotoName] = useState('');

  const getLocalizedValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['en'] || '';
  };

  useEffect(() => {
    if (person) {
      setName(getLocalizedValue(person.name));
      setRelationship(getLocalizedValue(person.relationship));
      setBio(getLocalizedValue(person.bio));
      setPhoto(person.photo);
      setCustomPhotoName('');
    }
  }, [person, isOpen, lang]);

  if (!isOpen || !person) return null;

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
    onEditPerson(person.id, {
      name,
      relationship,
      bio,
      photo,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-labelledby="edit-person-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="edit-person-title" style={{ fontFamily: 'var(--font-heading)' }}>
            {lang === 'uk' ? 'Редагувати профіль' : 'Edit Profile'}
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label={t.cancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-person-name-input">{t.fullName}</label>
              <input
                id="edit-person-name-input"
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
              <label className="form-label" htmlFor="edit-person-relation-input">{t.relationshipLabel}</label>
              <input
                id="edit-person-relation-input"
                type="text"
                placeholder={t.relationInputPlaceholder}
                className="form-input"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-person-bio-input">{t.shortBio}</label>
              <textarea
                id="edit-person-bio-input"
                placeholder={t.bioPlaceholder}
                className="form-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" id="edit-portrait-photo-label">{t.portraitPhoto}</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }} role="group" aria-labelledby="edit-portrait-photo-label">
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
                        background: isSelected ? 'var(--color-accent-light)' : 'transparent',
                        border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
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
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                        {preset.name}
                      </span>
                      {isSelected && (
                        <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--color-accent)', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={8} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '4px' }} htmlFor="edit-portrait-upload">
                  <ImageIcon size={14} />
                  <span>{t.uploadCustomPhoto}</span>
                  <input
                    id="edit-portrait-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {(customPhotoName || photo.startsWith('data:')) && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Check size={12} style={{ color: '#27ae60' }} />
                    {customPhotoName || 'Custom photo'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '4px' }}>
              {t.cancel}
            </button>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: '4px' }}>
              {lang === 'uk' ? 'Зберегти зміни' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
