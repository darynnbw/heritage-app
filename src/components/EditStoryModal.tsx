import React, { useState, useEffect } from 'react';
import { X, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import { UI_TRANSLATIONS, MEMORY_PROMPTS, type Language } from '../locales';
import type { Story } from '../types';

interface EditStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story | null;
  onEditStory: (storyId: string, updatedData: {
    title: string;
    date: string;
    content: string;
    contributor: string;
    image?: string;
  }) => void;
  lang: Language;
}

export const EditStoryModal: React.FC<EditStoryModalProps> = ({
  isOpen,
  onClose,
  story,
  onEditStory,
  lang,
}) => {
  const t = UI_TRANSLATIONS[lang];
  const sparks = MEMORY_PROMPTS[lang];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [contributor, setContributor] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [imageName, setImageName] = useState('');

  const getLocalizedValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['en'] || '';
  };

  useEffect(() => {
    if (story) {
      setTitle(getLocalizedValue(story.title));
      setDate(getLocalizedValue(story.date));
      setContent(getLocalizedValue(story.content));
      setContributor(getLocalizedValue(story.contributor));
      setImage(story.image);
      setImageName('');
    }
  }, [story, isOpen, lang]);

  if (!isOpen || !story) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setContent((prev) => {
      const spacing = prev ? '\n\n' : '';
      return `${prev}${spacing}*${prompt}*\n`;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !date) return;
    onEditStory(story.id, {
      title,
      date,
      content,
      contributor: contributor || (lang === 'uk' ? 'Користувач' : 'Heritage user'),
      image,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-labelledby="edit-story-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="edit-story-title" style={{ fontFamily: 'var(--font-serif-brand)' }}>
            {lang === 'uk' ? 'Редагувати спогад' : 'Edit Story'}
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label={t.cancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-story-title-input">{t.storyTitle}</label>
              <input
                id="edit-story-title-input"
                type="text"
                placeholder={t.storyTitlePlaceholder}
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="edit-story-date-input">{t.datePeriod}</label>
                <input
                  id="edit-story-date-input"
                  type="text"
                  placeholder={t.storyDatePlaceholder}
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-story-contributor-input">{t.contributorAttrib}</label>
                <input
                  id="edit-story-contributor-input"
                  type="text"
                  placeholder={t.contributorPlaceholder}
                  className="form-input"
                  value={contributor}
                  onChange={(e) => setContributor(e.target.value)}
                />
              </div>
            </div>

            {/* Prompted helper */}
            <div className="prompts-container" style={{ borderRadius: '4px' }}>
              <div className="prompts-heading">
                <Sparkles size={14} />
                <span>{t.memorySparks}</span>
              </div>
              <div className="prompt-suggestions">
                {sparks.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="prompt-suggestion-item"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-story-content-textarea">{t.storyMemoryLabel}</label>
              <textarea
                id="edit-story-content-textarea"
                placeholder={t.storyContentPlaceholder}
                className="form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-story-photo-upload-input">{t.attachPhoto}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, borderRadius: '4px' }}>
                  <ImageIcon size={16} />
                  <span>{t.chooseImage}</span>
                  <input
                    id="edit-story-photo-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {(imageName || image) && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-slate-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Check size={14} style={{ color: '#27ae60' }} />
                    {imageName || 'Attached image'}
                  </span>
                )}
                {image && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger-color)', borderRadius: '4px' }}
                    onClick={() => {
                      setImage(undefined);
                      setImageName('');
                    }}
                  >
                    {lang === 'uk' ? 'Видалити фото' : 'Remove Photo'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '4px' }}>
              {t.cancel}
            </button>
            <button type="submit" className="btn wax-seal-btn" style={{ borderRadius: '4px' }}>
              {lang === 'uk' ? 'Зберегти зміни' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
