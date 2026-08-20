import React, { useState, useEffect, useRef } from 'react';
import type { Person, Story, Relationship } from '../types';
import { X, Play, Pause, Trash2, Link2, BookOpen, Volume2, Plus, User, Mic, Square, Edit, Edit3 } from 'lucide-react';
import { UI_TRANSLATIONS, type Language } from '../locales';

interface ProfilePanelProps {
  person: Person | null;
  stories: Story[];
  relationships: Relationship[];
  allPeople: Person[];
  isOpen: boolean;
  onClose: () => void;
  onAddStoryClick: () => void;
  onAddRelationship: (toId: string, label: string) => void;
  onDeletePerson: (id: string) => void;
  onDeleteStory: (id: string) => void;
  onEditPersonClick: () => void;
  onEditStoryClick: (story: Story) => void;
  onAddAudioClip: (personId: string, clip: { id: string; title: string; duration: string; url: string }) => void;
  lang: Language;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({
  person,
  stories,
  relationships,
  allPeople,
  isOpen,
  onClose,
  onAddStoryClick,
  onAddRelationship,
  onDeletePerson,
  onDeleteStory,
  onEditPersonClick,
  onEditStoryClick,
  onAddAudioClip,
  lang,
}) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [id: string]: number }>({});
  const [showConnectForm, setShowConnectForm] = useState<boolean>(false);
  const [connectToId, setConnectToId] = useState<string>('');
  const [connectLabel, setConnectLabel] = useState<string>('');

  // Audio Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [showClipTitleForm, setShowClipTitleForm] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [newClipTitle, setNewClipTitle] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const t = UI_TRANSLATIONS[lang];

  // Reset state when person changes (Hoisted functions stopActiveAudio & cancelRecording are called here)
  useEffect(() => {
    setShowConnectForm(false);
    setConnectToId('');
    setConnectLabel('');
    stopActiveAudio();
    cancelRecording();
  }, [person]);

  // Hoisted: stopActiveAudio
  function stopActiveAudio() {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setPlayingAudioId(null);
  }

  // Hoisted: cancelRecording
  function cancelRecording() {
    setIsRecording(false);
    setShowClipTitleForm(false);
    setRecordedAudioUrl(null);
    setNewClipTitle('');
    setRecordDuration(0);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  }

  // Simulate audio player progress for mock files
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (playingAudioId && !playingAudioId.startsWith('rec_')) {
      const clip = person?.audioClips?.find(c => c.id === playingAudioId);
      if (clip && !clip.url) {
        timer = setInterval(() => {
          setAudioProgress((prev) => {
            const current = prev[playingAudioId] || 0;
            if (current >= 100) {
              setPlayingAudioId(null);
              return { ...prev, [playingAudioId]: 0 };
            }
            return { ...prev, [playingAudioId]: current + 2 };
          });
        }, 100);
      }
    }
    return () => clearInterval(timer);
  }, [playingAudioId, person]);

  if (!person) return null;

  // Toggle play/pause for audio
  const handlePlayAudio = (clip: any) => {
    if (playingAudioId === clip.id) {
      stopActiveAudio();
      return;
    }

    stopActiveAudio();

    if (clip.url) {
      const audio = new Audio(clip.url);
      activeAudioRef.current = audio;
      setPlayingAudioId(clip.id);

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((prev) => ({
            ...prev,
            [clip.id]: (audio.currentTime / audio.duration) * 100,
          }));
        }
      };

      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioProgress((prev) => ({ ...prev, [clip.id]: 0 }));
        activeAudioRef.current = null;
      };

      audio.play().catch((err) => {
        console.error('Error playing recording:', err);
        setPlayingAudioId(null);
      });
    } else {
      setPlayingAudioId(clip.id);
    }
  };

  // Start micro recorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudioUrl(reader.result as string);
          setShowClipTitleForm(true);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordDuration(0);
      setIsRecording(true);
      mediaRecorder.start();

      recordTimerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert(lang === 'uk' ? 'Помилка доступу до мікрофону' : 'Microphone access denied or unsupported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const handleSaveRecording = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedAudioUrl || !newClipTitle) return;

    const formattedDuration = `${Math.floor(recordDuration / 60)}:${(recordDuration % 60).toString().padStart(2, '0')}`;
    onAddAudioClip(person.id, {
      id: `rec_${Date.now()}`,
      title: newClipTitle,
      duration: formattedDuration,
      url: recordedAudioUrl
    });

    cancelRecording();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectablePeople = () => {
    const existingConnections = relationships
      .filter((r) => r.fromId === person.id || r.toId === person.id)
      .map((r) => (r.fromId === person.id ? r.toId : r.fromId));

    return allPeople.filter(
      (p) => p.id !== person.id && !existingConnections.includes(p.id)
    );
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectToId || !connectLabel) return;
    onAddRelationship(connectToId, connectLabel);
    setShowConnectForm(false);
    setConnectToId('');
    setConnectLabel('');
  };

  const personRelationships = relationships.filter(
    (r) => r.fromId === person.id || r.toId === person.id
  );

  const getLocalizedValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['en'] || '';
  };

  const localizedName = getLocalizedValue(person.name);

  return (
    <div className={`profile-panel-container ${isOpen ? 'open' : ''}`} id="person-profile-panel" role="dialog" aria-label={`${localizedName} profile`}>
      {/* Visual Spiral Binders */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '-2px', width: '4px', background: 'var(--amber-border)', zIndex: 12 }} />

      {/* Panel Header */}
      <div className="panel-header" style={{ paddingLeft: '2.5rem' }}>
        <button className="panel-close-btn" onClick={onClose} aria-label={t.cancel}>
          <X size={20} />
        </button>

        <img src={person.photo} alt={localizedName} className="panel-portrait" />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 className="panel-name" style={{ fontFamily: 'var(--font-serif-brand)' }}>{localizedName}</h2>
          <button
            className="control-btn"
            style={{ width: '2.2rem', height: '2.2rem', color: 'var(--text-slate-light)' }}
            onClick={onEditPersonClick}
            title={lang === 'uk' ? 'Редагувати профіль' : 'Edit profile'}
          >
            <Edit size={16} />
          </button>
        </div>
        
        <div className="panel-relation">{getLocalizedValue(person.relationship)}</div>
        {person.bio && <p className="panel-bio">"{getLocalizedValue(person.bio)}"</p>}
      </div>

      {/* Lined Notebook Page Scrollbox */}
      <div className="panel-content" style={{ paddingLeft: '3rem' }}>
        {/* Connections List */}
        <div className="media-attachments">
          <h3 className="section-label">{t.connections}</h3>
          {personRelationships.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-slate-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif-story)' }}>
              {t.noConnections}
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {personRelationships.map((r) => {
                const partnerId = r.fromId === person.id ? r.toId : r.fromId;
                const partner = allPeople.find((p) => p.id === partnerId);
                return partner ? (
                  <span
                    key={r.id}
                    className="node-relationship"
                    style={{ background: 'var(--amber-light)', borderColor: 'var(--amber-border)', borderRadius: '4px' }}
                    title={getLocalizedValue(r.label)}
                  >
                    <strong>{getLocalizedValue(partner.name)}</strong> ({getLocalizedValue(r.label)})
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* Connect Node Form */}
          {!showConnectForm ? (
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'fit-content', marginTop: '0.5rem' }}
              onClick={() => setShowConnectForm(true)}
            >
              <Link2 size={14} />
              <span>{t.connectToSomeone}</span>
            </button>
          ) : (
            <form onSubmit={handleConnectSubmit} className="relationship-edit-popover" style={{ position: 'relative', width: '100%', boxShadow: 'none', border: '1px dashed var(--amber-border)', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '4px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }} htmlFor="connect-person-select">{t.connectTo}</label>
                <select
                  id="connect-person-select"
                  value={connectToId}
                  onChange={(e) => setConnectToId(e.target.value)}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  required
                >
                  <option value="">{t.selectPersonPlaceholder}</option>
                  {getConnectablePeople().map((p) => (
                    <option key={p.id} value={p.id}>
                      {getLocalizedValue(p.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.7rem' }} htmlFor="connect-label-input">{t.relationshipContext}</label>
                <input
                  id="connect-label-input"
                  type="text"
                  placeholder={t.relationshipPlaceholder}
                  value={connectLabel}
                  onChange={(e) => setConnectLabel(e.target.value)}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  {t.saveLine}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setShowConnectForm(false)}
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Audio Memories */}
        <div className="media-attachments">
          <h3 className="section-label">{t.voiceMemories}</h3>
          
          {/* Recorder Panel */}
          {!isRecording && !showClipTitleForm ? (
            <button
              className="btn btn-secondary animate-fade-in"
              style={{ width: 'fit-content', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={startRecording}
            >
              <Mic size={14} style={{ color: 'var(--wax-red)' }} />
              <span>{lang === 'uk' ? 'Записати голос' : 'Record Voice Memory'}</span>
            </button>
          ) : isRecording ? (
            <div className="voice-recorder-section" style={{ borderRadius: '4px' }}>
              <div className="voice-recorder-controls">
                <button className="record-btn-pulsing" onClick={stopRecording} title="Stop recording">
                  <Square size={14} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-color)' }}>
                    {lang === 'uk' ? 'Запис...' : 'Recording...'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-slate-muted)' }}>
                    {formatTimer(recordDuration)}
                  </span>
                </div>
                <div className="voice-wave-container">
                  <div className="voice-wave-bar" style={{ animationDelay: '0.1s' }}></div>
                  <div className="voice-wave-bar" style={{ animationDelay: '0.3s' }}></div>
                  <div className="voice-wave-bar" style={{ animationDelay: '0.5s' }}></div>
                  <div className="voice-wave-bar" style={{ animationDelay: '0.2s' }}></div>
                  <div className="voice-wave-bar" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', width: 'fit-content' }} onClick={cancelRecording}>
                {t.cancel}
              </button>
            </div>
          ) : showClipTitleForm ? (
            <form onSubmit={handleSaveRecording} className="voice-recorder-section" style={{ borderStyle: 'solid', borderRadius: '4px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }} htmlFor="recording-title-input">
                  {lang === 'uk' ? 'Назва запису' : 'Recording Title'}
                </label>
                <input
                  id="recording-title-input"
                  type="text"
                  required
                  placeholder={lang === 'uk' ? 'напр. Спогади про дворик' : 'e.g. Courtyard history story'}
                  value={newClipTitle}
                  onChange={(e) => setNewClipTitle(e.target.value)}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                  {lang === 'uk' ? 'Зберегти' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={cancelRecording}>
                  {t.cancel}
                </button>
              </div>
            </form>
          ) : null}

          {/* Audio Clips */}
          {person.audioClips && person.audioClips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              {person.audioClips.map((clip) => {
                const isPlaying = playingAudioId === clip.id;
                const progress = audioProgress[clip.id] || 0;
                return (
                  <div key={clip.id} className="audio-player-card" style={{ borderRadius: '4px' }}>
                    <button className="audio-play-btn" onClick={() => handlePlayAudio(clip)} aria-label={isPlaying ? 'Pause voice clip' : 'Play voice clip'}>
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <div className="audio-info">
                      <div className="audio-title" style={{ fontFamily: 'var(--font-serif-story)' }}>{getLocalizedValue(clip.title)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        {isPlaying ? (
                          <div style={{ flex: 1, height: '4px', background: 'var(--border-muted)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--amber-gold)' }}></div>
                          </div>
                        ) : (
                          <Volume2 size={12} style={{ color: 'var(--text-slate-light)' }} />
                        )}
                        <span className="audio-duration">{isPlaying ? `${Math.round(progress / 10)}s / ${clip.duration}` : clip.duration}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stories List */}
        <div className="stories-section">
          <h3 className="section-label">{t.storiesAndMemories}</h3>
          {stories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-card)', border: '1px dashed var(--amber-border)', borderRadius: '4px' }}>
              <BookOpen size={24} style={{ color: 'var(--text-slate-light)', marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-slate-muted)', fontFamily: 'var(--font-serif-story)' }}>
                {t.noStories}
              </p>
            </div>
          ) : (
            stories.map((story) => (
              <article key={story.id} className="story-card" style={{ borderRadius: '4px' }}>
                <div className="story-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 className="story-title" style={{ fontFamily: 'var(--font-serif-story)' }}>{getLocalizedValue(story.title)}</h4>
                    <button
                      className="control-btn"
                      style={{ width: '1.8rem', height: '1.8rem', color: 'var(--text-slate-light)' }}
                      onClick={() => onEditStoryClick(story)}
                      title={lang === 'uk' ? 'Редагувати спогад' : 'Edit story'}
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                  <span className="story-date">{getLocalizedValue(story.date)}</span>
                </div>
                <p className="story-body" style={{ fontFamily: 'var(--font-serif-story)' }}>{getLocalizedValue(story.content)}</p>
                
                {story.image && (
                  <img src={story.image} alt={getLocalizedValue(story.title)} className="story-media-preview" style={{ borderRadius: '2px' }} />
                )}

                <div className="story-footer">
                  <div className="story-author">
                    <User size={12} />
                    <span>{t.storySharedBy} {getLocalizedValue(story.contributor) || 'Heritage user'}</span>
                  </div>
                  <button
                    className="control-btn"
                    style={{ color: 'var(--text-slate-light)', width: '2rem', height: '2rem' }}
                    onClick={() => onDeleteStory(story.id)}
                    title={lang === 'uk' ? 'Видалити спогад' : 'Delete story'}
                    aria-label={lang === 'uk' ? 'Видалити спогад' : 'Delete story'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {/* Panel Footer */}
      <div className="panel-footer" style={{ paddingLeft: '2.5rem' }}>
        <button
          className="btn btn-danger-outline"
          onClick={() => onDeletePerson(person.id)}
          title={t.removeNode}
          aria-label={t.removeNode}
          style={{ borderRadius: '4px' }}
        >
          <Trash2 size={16} />
          <span>{t.removeNode}</span>
        </button>

        <button className="btn btn-primary wax-seal-btn" onClick={onAddStoryClick} id="add-story-btn" style={{ borderRadius: '4px' }}>
          <Plus size={16} />
          <span>{t.addStory}</span>
        </button>
      </div>
    </div>
  );
};
