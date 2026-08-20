import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Printer, BookOpen } from 'lucide-react';
import { UI_TRANSLATIONS, type Language } from '../locales';
import type { Person, Story } from '../types';

interface BookPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  stories: Story[];
  onPrint: () => void;
  lang: Language;
}

export const BookPreviewModal: React.FC<BookPreviewModalProps> = ({
  isOpen,
  onClose,
  people,
  stories,
  onPrint,
  lang,
}) => {
  const t = UI_TRANSLATIONS[lang];
  const [bookTitle, setBookTitle] = useState(lang === 'uk' ? 'Моя книга Спадщини' : 'My Heritage Storybook');
  const [authorName, setAuthorName] = useState(lang === 'uk' ? 'Дарина' : 'Daryna');
  const [currentPage, setCurrentPage] = useState<number>(0);

  const totalPages = 1 + people.length;

  if (!isOpen) return null;

  const getLocalizedValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['en'] || '';
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div className="modal-container" style={{ maxWidth: '750px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-serif-brand)' }}>
            <BookOpen size={20} style={{ color: 'var(--amber-gold)' }} />
            <span>{lang === 'uk' ? 'Перегляд книги' : 'Scrapbook Preview'}</span>
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label={t.cancel}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem', background: 'var(--bg-parchment-light)' }}>
          {currentPage === 0 ? (
            <div className="book-preview-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="scrapbook-cover">
                <h3 className="scrapbook-cover-title" style={{ fontFamily: 'var(--font-serif-brand)' }}>{bookTitle}</h3>
                <div style={{ height: '2px', width: '80px', background: 'var(--amber-gold)', margin: '1rem 0' }}></div>
                <h4 className="scrapbook-cover-subtitle">{lang === 'uk' ? 'Архів спогадів від' : 'A Living Archive by'} {authorName}</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="cover-title-input" style={{ fontSize: '0.7rem' }}>
                    {lang === 'uk' ? 'Назва обкладинки' : 'Book Title'}
                  </label>
                  <input
                    id="cover-title-input"
                    type="text"
                    className="form-input"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cover-author-input" style={{ fontSize: '0.7rem' }}>
                    {lang === 'uk' ? 'Автор книги' : 'Compiler / Author'}
                  </label>
                  <input
                    id="cover-author-input"
                    type="text"
                    className="form-input"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            (() => {
              const person = people[currentPage - 1];
              if (!person) return null;

              const personStories = stories.filter((s) => s.personId === person.id);
              const localizedPName = getLocalizedValue(person.name);

              return (
                <div className="book-preview-modal-body">
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <img
                      src={person.photo}
                      alt={localizedPName}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--amber-border)' }}
                    />
                    <div>
                      <h3 style={{ fontSize: '1.7rem', color: 'var(--text-slate)', fontWeight: 700, fontFamily: 'var(--font-serif-brand)' }}>
                        {localizedPName}
                      </h3>
                      <div style={{ fontStyle: 'italic', color: 'var(--amber-gold)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
                        {getLocalizedValue(person.relationship)}
                      </div>
                    </div>
                  </div>

                  {person.bio && (
                    <blockquote style={{ borderLeft: '3px solid var(--amber-border)', paddingLeft: '1rem', fontStyle: 'italic', color: 'var(--text-slate-muted)', margin: '1rem 0 1.5rem', fontSize: '0.95rem' }}>
                      "{getLocalizedValue(person.bio)}"
                    </blockquote>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px dashed var(--border-muted)', margin: '1.5rem 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {personStories.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-slate-light)', fontSize: '0.9rem' }}>
                        {t.noStoriesPrint}
                      </p>
                    ) : (
                      personStories.map((story) => (
                        <article key={story.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '1.25rem', color: 'var(--text-slate)', fontWeight: 600 }}>
                            {getLocalizedValue(story.title)}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--amber-gold)', fontWeight: 700 }}>
                            {getLocalizedValue(story.date)}
                          </span>
                          <p style={{ fontSize: '0.92rem', color: 'var(--text-slate-muted)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                            {getLocalizedValue(story.content)}
                          </p>
                          {story.image && (
                            <img
                              src={story.image}
                              alt={getLocalizedValue(story.title)}
                              style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '4px', marginTop: '0.25rem', border: '1px solid var(--border-muted)' }}
                            />
                          )}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-slate-light)', borderTop: '1px dashed var(--amber-border)', paddingTop: '0.4rem', marginTop: '0.25rem' }}>
                            {t.storySharedBy} {getLocalizedValue(story.contributor)}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })()
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.5rem' }}>
            <button
              className="control-btn"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              style={{ opacity: currentPage === 0 ? 0.3 : 1, cursor: currentPage === 0 ? 'default' : 'pointer' }}
              title={lang === 'uk' ? 'Попередня сторінка' : 'Previous page'}
            >
              <ChevronLeft size={24} />
            </button>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-slate-muted)', fontWeight: 600, flex: 1, textAlign: 'center' }}>
              {currentPage === 0
                ? (lang === 'uk' ? 'Обкладинка книги' : 'Book Cover')
                : `${lang === 'uk' ? 'Особа' : 'Person'} ${currentPage} / ${people.length}`}
            </span>

            <button
              className="control-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              style={{ opacity: currentPage === totalPages - 1 ? 0.3 : 1, cursor: currentPage === totalPages - 1 ? 'default' : 'pointer' }}
              title={lang === 'uk' ? 'Наступна сторінка' : 'Next page'}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div className="modal-footer" style={{ background: 'var(--bg-card)' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '4px' }}>
            {lang === 'uk' ? 'Закрити' : 'Close'}
          </button>
          <button className="btn wax-seal-btn" onClick={onPrint} style={{ borderRadius: '4px' }}>
            <Printer size={16} />
            <span>{lang === 'uk' ? 'Друк книги (PDF)' : 'Print Book (PDF)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
