import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import { UI_TRANSLATIONS, MEMORY_PROMPTS, type Language } from '../locales';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  onAddStory: (storyData: {
    title: string;
    date: string;
    content: string;
    contributor: string;
    image?: string;
  }) => void;
  lang: Language;
}

export const AddStoryModal: React.FC<AddStoryModalProps> = ({
  isOpen,
  onClose,
  personName,
  onAddStory,
  lang,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [contributor, setContributor] = useState(lang === 'uk' ? 'Дарина' : 'Daryna');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [imageName, setImageName] = useState('');

  if (!isOpen) return null;

  const t = UI_TRANSLATIONS[lang];
  const sparks = MEMORY_PROMPTS[lang];

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
    onAddStory({
      title,
      date,
      content,
      contributor: contributor || (lang === 'uk' ? 'Користувач' : 'Heritage user'),
      image,
    });
    setTitle('');
    setDate('');
    setContent('');
    setImage(undefined);
    setImageName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-labelledby="add-story-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="add-story-title" style={{ fontFamily: 'var(--font-heading)' }}>{t.addStory} ({personName})</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label={t.cancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="story-title-input">{t.storyTitle}</label>
              <input
                id="story-title-input"
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
                <label className="form-label" htmlFor="story-date-input">{t.datePeriod}</label>
                <input
                  id="story-date-input"
                  type="text"
                  placeholder={t.storyDatePlaceholder}
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="story-contributor-input">{t.contributorAttrib}</label>
                <input
                  id="story-contributor-input"
                  type="text"
                  placeholder={t.contributorPlaceholder}
                  className="form-input"
                  value={contributor}
                  onChange={(e) => setContributor(e.target.value)}
                />
              </div>
            </div>

            {/* Prompted Entry helper */}
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
              <label className="form-label" htmlFor="story-content-textarea">{t.storyMemoryLabel}</label>
              <textarea
                id="story-content-textarea"
                placeholder={t.storyContentPlaceholder}
                className="form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="story-photo-upload-input">{t.attachPhoto}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, borderRadius: '4px' }}>
                  <ImageIcon size={16} />
                  <span>{t.chooseImage}</span>
                  <input
                    id="story-photo-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {imageName && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Check size={14} style={{ color: '#27ae60' }} />
                    {imageName}
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
              {t.saveStory}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
