import { useState, useEffect } from 'react';
import type { Person, Story, Relationship } from './types';
import { MenuBar } from './components/MenuBar';
import { Canvas } from './components/Canvas';
import { ProfilePanel } from './components/ProfilePanel';
import { AddStoryModal } from './components/AddStoryModal';
import { AddPersonModal } from './components/AddPersonModal';
import { EditPersonModal } from './components/EditPersonModal';
import { EditStoryModal } from './components/EditStoryModal';
import { BookPreviewModal } from './components/BookPreviewModal';
import { CustomConfirmModal } from './components/CustomConfirmModal';
import { Check, Sparkles, BookOpen, AlertCircle, Trash2 } from 'lucide-react';
import { UI_TRANSLATIONS, type Language } from './locales';
import { getAllFromStore, saveAllToStore } from './db';

const INITIAL_PEOPLE: Person[] = [
  {
    id: 'rosa',
    name: { en: 'Rosa (Grandma)', uk: 'Бабуся Роза' },
    relationship: { en: 'Grandmother', uk: 'Бабуся' },
    bio: {
      en: 'Escaped to Canada from Kyiv in 1948. Kept a handwritten book of family recipes and a chest of late-night jokes.',
      uk: 'У 1948 році виїхала з Києва до Канади. Зберегла зошит із сімейними рецептами та скриню дотепних жартів.'
    },
    photo: '/rosa.png',
    x: 180,
    y: 200,
    audioClips: [
      {
        id: 'rosa_laugh',
        title: { en: "Grandma Rosa's laughter and singing", uk: 'Сміх та спів бабусі Рози' },
        duration: '0:42'
      },
      {
        id: 'rosa_recipe',
        title: { en: 'Recipe details for potato & onion Pierogi', uk: 'Рецепт вареників з картоплею та цибулею' },
        duration: '1:15'
      }
    ]
  },
  {
    id: 'kowalski',
    name: { en: 'Mr. Kowalski', uk: 'Пан Ковальський' },
    relationship: { en: '3rd Grade Teacher', uk: 'Вчитель 3-го класу' },
    bio: {
      en: 'He taught history with boundless passion and made map-drawing fun. Passed away in 2012, but his lessons remain.',
      uk: 'Викладав історію з безмежним захватом і робив малювання карт захопливим. Помер у 2012 році, але його наука живе.'
    },
    photo: '/kowalski.png',
    x: 620,
    y: 120,
    audioClips: [
      {
        id: 'kowalski_history',
        title: { en: 'Folklore and historical stories of ancient Kyiv', uk: 'Фольклор та історія стародавнього Києва' },
        duration: '2:10'
      }
    ]
  },
  {
    id: 'halyna',
    name: { en: 'Mrs. Halyna', uk: 'Пані Галина' },
    relationship: { en: 'Kyiv Courtyard Neighbor', uk: 'Сусідка з київського дворика' },
    bio: {
      en: 'Lived next door on Yaroslaviv Val Street. Kept our courtyard blooming with bright orange marigolds in old paint cans.',
      uk: 'Жила по сусідству на вулиці Ярославів Вал. Робила наш дворик яскравим завдяки чорнобривцям у старих банках з-під фарби.'
    },
    photo: '/neighbor.png',
    x: 400,
    y: 440,
    audioClips: [
      {
        id: 'halyna_greeting',
        title: { en: "Halyna's courtyard greeting & song", uk: 'Вітання та пісня пані Галини з дворика' },
        duration: '0:24'
      }
    ]
  }
];

const INITIAL_RELATIONSHIPS: Relationship[] = [
  {
    id: 'rel1',
    fromId: 'rosa',
    toId: 'halyna',
    label: { en: 'courtyard friends in Kyiv (until 1948)', uk: 'подруги з дворика в Києві (до 1948)' }
  },
  {
    id: 'rel2',
    fromId: 'halyna',
    toId: 'kowalski',
    label: { en: 'sent letters until 1987', uk: 'листувалися до 1987 року' }
  }
];

const INITIAL_STORIES: Story[] = [
  {
    id: 's1',
    personId: 'rosa',
    title: { en: "Grandma Rosa's Journey to Winnipeg", uk: 'Подорож бабусі Рози до Вінніпега' },
    date: { en: 'Autumn, 1948', uk: 'Осінь 1948 року' },
    content: {
      en: 'After the war, Grandma Rosa arrived in Canada with nothing but a small wooden suitcase and a handwritten book of family recipes. She told me the first thing she did was buy a cup of black coffee and wonder how she would ever learn English. But within a year, she was baking traditional Kyiv breads for the entire neighborhood.',
      uk: 'Після війни бабуся Роза прибула до Канади лише з невеликою дерев’яною валізою та переписаними від руки сімейними рецептами. Вона згадувала, як першим ділом купила чашку чорної кави і думала, як вивчити англійську. Але вже за рік вона випікала традиційний київський хліб для всього району.'
    },
    contributor: { en: 'Daryna', uk: 'Дарина' },
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 's2',
    personId: 'rosa',
    title: { en: 'The Pierogi Sunday Tradition', uk: 'Традиційні недільні вареники' },
    date: { en: 'Summer, 1995', uk: 'Літо 1995 року' },
    content: {
      en: "Every Sunday afternoon, the kitchen would fill with steam and the scent of fried onions. Grandma would hand-pinch each pierogi, teaching us to press the edges exactly three times. 'A leaking pierogi is a crime against history,' she'd joke.",
      uk: 'Щонеділі по обіді кухня наповнювалася парою та ароматом смаженої цибулі. Бабуся вручну ліпила кожен вареник, вчачи нас защіпувати краї рівно три рази. «Дірявий вареник — це злочин перед історією», — жартувала вона.'
    },
    contributor: { en: 'Aunt Rosa', uk: 'Тітка Роза' }
  },
  {
    id: 's3',
    personId: 'kowalski',
    title: { en: 'The Classroom Globe Story', uk: 'Історія про шкільний глобус' },
    date: { en: 'Autumn, 1974', uk: 'Осінь 1974 року' },
    content: {
      en: "Mr. Kowalski had a giant dented tin globe in the corner of the classroom. If we got a history question right, he let us spin it and point blindly. Wherever our finger landed, he'd tell a 5-minute story about the history or folklore of that specific spot. That's how I first heard about Kyiv's ancient golden gates.",
      uk: 'У кутку класу пана Ковальського стояв гігантський погнутий залізний глобус. Якщо ми правильно відповідали на питання з історії, він дозволяв нам розкрутити його та ткнути пальцем всліпу. Куди б ми не влучили, він розповідал 5-хвилинну історію про це місце. Саме так я вперше почула про київські Золоті ворота.'
    },
    contributor: { en: 'Daryna', uk: 'Дарина' }
  },
  {
    id: 's4',
    personId: 'halyna',
    title: { en: 'The Marigolds of Yaroslaviv Val', uk: 'Чорнобривці на Ярославовім Валу' },
    date: { en: 'May, 1988', uk: 'Травень 1988 року' },
    content: {
      en: "Mrs. Halyna planted chornobryvtsi (marigolds) in old paint cans all around our courtyard. In the spring heat, the smell was intoxicating. She'd sit on the bench cracking sunflower seeds and telling stories of who lived in our building before it was subdivided.",
      uk: 'Пані Галина висаджувала чорнобривці у старих банках з-під фарби по всьому нашому дворику. У весняному теплі аромат був просто запаморочливим. Вона сиділа на лавці, лузала насіння та розповідала історії про тих, хто жив у нашому будинку до його перепланування.'
    },
    contributor: { en: 'Daryna', uk: 'Дарина' }
  }
];

function App() {
  const [lang, setLang] = useState<Language>(() => {
    const local = localStorage.getItem('heritage_lang');
    return (local as Language) || 'en';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const local = localStorage.getItem('heritage_theme');
    if (local === 'light' || local === 'dark') return local;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [viewMode, setViewMode] = useState<'map' | 'list'>(() => {
    const local = localStorage.getItem('heritage_view_mode');
    return (local as 'map' | 'list') || 'map';
  });

  // Main collections loaded from IndexedDB
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Focus & selections
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals visibility
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);
  const [isBookPreviewOpen, setIsBookPreviewOpen] = useState(false);
  const [welcomeActive, setWelcomeActive] = useState<boolean>(() => {
    return !localStorage.getItem('heritage_welcomed');
  });

  // Rebuilding Modification triggers
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  // In-app alert dialogues state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Visual relationship edit popover state
  const [relPopover, setRelPopover] = useState<{
    rel: Relationship;
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // Action feedback toast
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const t = UI_TRANSLATIONS[lang];

  // Initialize DB and fetch records
  useEffect(() => {
    async function loadData() {
      try {
        const storedPeople = await getAllFromStore<Person>('people');
        const storedRelationships = await getAllFromStore<Relationship>('relationships');
        const storedStories = await getAllFromStore<Story>('stories');

        if (storedPeople.length === 0) {
          // Setup defaults
          await saveAllToStore('people', INITIAL_PEOPLE);
          await saveAllToStore('relationships', INITIAL_RELATIONSHIPS);
          await saveAllToStore('stories', INITIAL_STORIES);

          setPeople(INITIAL_PEOPLE);
          setRelationships(INITIAL_RELATIONSHIPS);
          setStories(INITIAL_STORIES);
        } else {
          setPeople(storedPeople);
          setRelationships(storedRelationships);
          setStories(storedStories);
        }
      } catch (err) {
        console.error('Failed to initialize database, using memory defaults:', err);
        setPeople(INITIAL_PEOPLE);
        setRelationships(INITIAL_RELATIONSHIPS);
        setStories(INITIAL_STORIES);
      } finally {
        setDbLoaded(true);
      }
    }
    loadData();
  }, []);

  // Save updates into DB
  useEffect(() => {
    if (dbLoaded) {
      saveAllToStore('people', people).catch(e => console.error('IndexedDB write error:', e));
    }
  }, [people, dbLoaded]);

  useEffect(() => {
    if (dbLoaded) {
      saveAllToStore('relationships', relationships).catch(e => console.error('IndexedDB write error:', e));
    }
  }, [relationships, dbLoaded]);

  useEffect(() => {
    if (dbLoaded) {
      saveAllToStore('stories', stories).catch(e => console.error('IndexedDB write error:', e));
    }
  }, [stories, dbLoaded]);

  // Sync settings metadata
  useEffect(() => {
    localStorage.setItem('heritage_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('heritage_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('heritage_view_mode', viewMode);
  }, [viewMode]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Helper to extract localized text
  const getLocalizedValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['en'] || '';
  };

  // Helper to update localized strings in objects
  const updateLocalizedStringValue = (existing: any, newVal: string): any => {
    if (typeof existing === 'string') {
      return newVal;
    } else if (existing && typeof existing === 'object') {
      return {
        ...existing,
        [lang]: newVal
      };
    }
    return newVal;
  };

  // Drag node
  const handleUpdatePersonPosition = (id: string, x: number, y: number) => {
    setPeople((prevPeople) =>
      prevPeople.map((p) => (p.id === id ? { ...p, x, y } : p))
    );
  };

  // Save new node
  const handleAddPerson = (personData: { name: string; relationship: string; bio: string; photo: string }) => {
    const newId = `person_${Date.now()}`;
    const newPerson: Person = {
      id: newId,
      name: personData.name,
      relationship: personData.relationship,
      bio: personData.bio,
      photo: personData.photo,
      x: 350 + Math.floor(Math.random() * 200),
      y: 200 + Math.floor(Math.random() * 200),
      audioClips: []
    };
    setPeople((prev) => [...prev, newPerson]);
    setSelectedPersonId(newId);
    showToast(`${personData.name} ${t.toastAdded}`);
  };

  // Save edit node
  const handleEditPerson = (personId: string, updatedData: { name: string; relationship: string; bio: string; photo: string }) => {
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id === personId) {
          return {
            ...p,
            name: updateLocalizedStringValue(p.name, updatedData.name),
            relationship: updateLocalizedStringValue(p.relationship, updatedData.relationship),
            bio: updateLocalizedStringValue(p.bio, updatedData.bio),
            photo: updatedData.photo,
          };
        }
        return p;
      })
    );
    showToast(lang === 'uk' ? 'Профіль успішно оновлено!' : 'Profile updated successfully!');
  };

  // Save new story
  const handleAddStory = (storyData: {
    title: string;
    date: string;
    content: string;
    contributor: string;
    image?: string;
  }) => {
    if (!selectedPersonId) return;
    const newStory: Story = {
      id: `story_${Date.now()}`,
      personId: selectedPersonId,
      ...storyData,
    };
    setStories((prev) => [newStory, ...prev]);
    showToast(`"${storyData.title}" ${t.toastStoryShared}`);
  };

  // Save edit story
  const handleEditStory = (storyId: string, updatedData: { title: string; date: string; content: string; contributor: string; image?: string }) => {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id === storyId) {
          return {
            ...s,
            title: updateLocalizedStringValue(s.title, updatedData.title),
            date: updateLocalizedStringValue(s.date, updatedData.date),
            content: updateLocalizedStringValue(s.content, updatedData.content),
            contributor: updateLocalizedStringValue(s.contributor, updatedData.contributor),
            image: updatedData.image
          };
        }
        return s;
      })
    );
    showToast(lang === 'uk' ? 'Спогад успішно оновлено!' : 'Story updated successfully!');
  };

  // Draw relationship line
  const handleAddRelationship = (toId: string, label: string) => {
    if (!selectedPersonId) return;
    
    const exists = relationships.some(
      (r) =>
        (r.fromId === selectedPersonId && r.toId === toId) ||
        (r.fromId === toId && r.toId === selectedPersonId)
    );

    if (exists) {
      showToast(t.toastAlreadyConnected, 'error');
      return;
    }

    const newRel: Relationship = {
      id: `rel_${Date.now()}`,
      fromId: selectedPersonId,
      toId,
      label,
    };
    setRelationships((prev) => [...prev, newRel]);
    const partner = people.find((p) => p.id === toId);
    showToast(`${t.toastConnected} ${getLocalizedValue(partner?.name)}!`);
  };

  // Delete person node and clean up connected resources (using Custom Confirmation modal)
  const handleDeletePerson = (id: string) => {
    const target = people.find(p => p.id === id);
    if (!target) return;

    const targetName = getLocalizedValue(target.name);
    
    setConfirmModal({
      title: lang === 'uk' ? 'Видалити картку?' : 'Remove Node?',
      message: t.confirmRemoveNode.replace('{name}', targetName),
      confirmLabel: lang === 'uk' ? 'Видалити' : 'Remove',
      cancelLabel: t.cancel,
      onConfirm: () => {
        setPeople((prev) => prev.filter((p) => p.id !== id));
        setRelationships((prev) => prev.filter((r) => r.fromId !== id && r.toId !== id));
        setStories((prev) => prev.filter((s) => s.personId !== id));
        setSelectedPersonId(null);
        setConfirmModal(null);
        showToast(t.toastRemovedNode);
      }
    });
  };

  // Delete story (using Custom Confirmation modal)
  const handleDeleteStory = (id: string) => {
    setConfirmModal({
      title: lang === 'uk' ? 'Видалити спогад?' : 'Delete Story?',
      message: lang === 'uk' 
        ? 'Ви впевнені, що хочете видалити цей спогад з архіву?'
        : 'Are you sure you want to delete this story from the archive?',
      confirmLabel: lang === 'uk' ? 'Видалити' : 'Delete',
      cancelLabel: t.cancel,
      onConfirm: () => {
        setStories((prev) => prev.filter((s) => s.id !== id));
        setConfirmModal(null);
        showToast(t.toastRemovedStory);
      }
    });
  };

  // Handle relationship badge click (opens custom popover)
  const handleEditRelationship = (rel: Relationship, clientX: number, clientY: number) => {
    setRelPopover({
      rel,
      x: Math.min(clientX - 100, window.innerWidth - 260),
      y: Math.min(clientY - 120, window.innerHeight - 180),
      label: getLocalizedValue(rel.label),
    });
  };

  // Record audio saves
  const handleAddAudioClip = (personId: string, clip: { id: string; title: string; duration: string; url: string }) => {
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id === personId) {
          return {
            ...p,
            audioClips: [...(p.audioClips || []), clip],
          };
        }
        return p;
      })
    );
    showToast(lang === 'uk' ? 'Голосовий запис додано!' : 'Voice memory saved successfully!');
  };

  // Exports
  const handleExportPDF = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const backupData = {
      people,
      relationships,
      stories,
      exportedAt: new Date().toISOString(),
      app: 'Heritage'
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `heritage_archive_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(t.toastBackupDownloaded);
  };

  // Close welcome
  const closeWelcome = () => {
    setWelcomeActive(false);
    localStorage.setItem('heritage_welcomed', 'true');
  };

  // Query filter
  const getFilteredPeople = () => {
    if (!searchQuery) return people;
    const query = searchQuery.toLowerCase();
    
    return people.filter((p) => {
      const nameMatch = getLocalizedValue(p.name).toLowerCase().includes(query);
      const relationMatch = getLocalizedValue(p.relationship).toLowerCase().includes(query);
      const bioMatch = getLocalizedValue(p.bio).toLowerCase().includes(query);
      
      const personStories = stories.filter((s) => s.personId === p.id);
      const storyMatch = personStories.some(
        (s) =>
          getLocalizedValue(s.title).toLowerCase().includes(query) ||
          getLocalizedValue(s.content).toLowerCase().includes(query)
      );

      return nameMatch || relationMatch || bioMatch || storyMatch;
    });
  };

  const getStoriesCountMap = () => {
    const counts: { [personId: string]: number } = {};
    people.forEach((p) => {
      counts[p.id] = stories.filter((s) => s.personId === p.id).length;
    });
    return counts;
  };

  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null;
  const selectedPersonStories = stories.filter((s) => s.personId === selectedPersonId);

  return (
    <div className={`app-container light-pattern ${viewMode === 'list' ? 'list-mode' : 'map-mode'}`}>
      {/* Top Header */}
      <MenuBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddPersonClick={() => setIsAddPersonOpen(true)}
        onExportPDF={() => setIsBookPreviewOpen(true)}
        onExportJSON={handleExportJSON}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Main Container */}
      <main style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Map Canvas Component */}
        <Canvas
          people={getFilteredPeople()}
          relationships={relationships}
          selectedPersonId={selectedPersonId}
          storiesCount={getStoriesCountMap()}
          onSelectPerson={(id) => {
            setSelectedPersonId(id);
            setRelPopover(null);
          }}
          onUpdatePersonPosition={handleUpdatePersonPosition}
          onEditRelationship={handleEditRelationship}
          lang={lang}
        />

        {/* Custom Popover for Relationship edits */}
        {relPopover && (
          <div
            className="custom-rel-popover"
            style={{ left: `${relPopover.x}px`, top: `${relPopover.y}px` }}
          >
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>
                {lang === 'uk' ? 'Зв\'язок / роль між ними' : 'Connection description'}
              </label>
              <input
                type="text"
                className="form-input"
                value={relPopover.label}
                onChange={(e) => setRelPopover({ ...relPopover, label: e.target.value })}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setRelationships((prev) =>
                    prev.map((r) =>
                      r.id === relPopover.rel.id
                        ? { ...r, label: updateLocalizedStringValue(r.label, relPopover.label) }
                        : r
                    )
                  );
                  setRelPopover(null);
                  showToast(t.toastRelLabelUpdated);
                }}
              >
                {lang === 'uk' ? 'Зберегти' : 'Save'}
              </button>
              <button
                className="btn btn-danger-outline"
                style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => {
                  setRelationships((prev) => prev.filter((r) => r.id !== relPopover.rel.id));
                  setRelPopover(null);
                  showToast(lang === 'uk' ? 'Зв\'язок видалено' : 'Connection deleted.');
                }}
                title={lang === 'uk' ? 'Видалити зв\'язок' : 'Delete connection'}
              >
                <Trash2 size={12} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => setRelPopover(null)}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        )}

        {/* Mobile Responsive List View Component */}
        <div className="people-list-view">
          <h2 className="mobile-section-title">{t.mobileHeader}</h2>
          <div className="mobile-cards-grid">
            {getFilteredPeople().map((person) => {
              const pStoriesCount = getStoriesCountMap()[person.id] || 0;
              const localizedPName = getLocalizedValue(person.name);
              return (
                <div
                  key={person.id}
                  className="mobile-person-card"
                  onClick={() => setSelectedPersonId(person.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPersonId(person.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedPersonId === person.id}
                  aria-label={`${localizedPName}, ${getLocalizedValue(person.relationship)}`}
                >
                  <img src={person.photo} alt={localizedPName} className="mobile-person-portrait" />
                  <div className="mobile-person-details">
                    <div className="mobile-person-name">{localizedPName}</div>
                    <div className="mobile-person-relation">{getLocalizedValue(person.relationship)}</div>
                  </div>
                  {pStoriesCount > 0 && (
                    <span className="mobile-story-count-pill">
                      {pStoriesCount} {lang === 'uk' ? 'спогадів' : 'stories'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sliding detail Profile Panel */}
        <ProfilePanel
          person={selectedPerson}
          stories={selectedPersonStories}
          relationships={relationships}
          allPeople={people}
          isOpen={selectedPersonId !== null}
          onClose={() => {
            setSelectedPersonId(null);
            setRelPopover(null);
          }}
          onAddStoryClick={() => setIsAddStoryOpen(true)}
          onAddRelationship={handleAddRelationship}
          onDeletePerson={handleDeletePerson}
          onDeleteStory={handleDeleteStory}
          onEditPersonClick={() => {
            if (selectedPerson) setEditingPerson(selectedPerson);
          }}
          onEditStoryClick={(story) => setEditingStory(story)}
          onAddAudioClip={handleAddAudioClip}
          lang={lang}
        />
      </main>

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onAddPerson={handleAddPerson}
        lang={lang}
      />

      {/* Edit Person Modal */}
      <EditPersonModal
        isOpen={editingPerson !== null}
        onClose={() => setEditingPerson(null)}
        person={editingPerson}
        onEditPerson={handleEditPerson}
        lang={lang}
      />

      {/* Add Story Modal */}
      <AddStoryModal
        isOpen={isAddStoryOpen}
        onClose={() => setIsAddStoryOpen(false)}
        personName={selectedPerson ? getLocalizedValue(selectedPerson.name) : ''}
        onAddStory={handleAddStory}
        lang={lang}
      />

      {/* Edit Story Modal */}
      <EditStoryModal
        isOpen={editingStory !== null}
        onClose={() => setEditingStory(null)}
        story={editingStory}
        onEditStory={handleEditStory}
        lang={lang}
      />

      {/* Scrapbook Visual Preview Modal */}
      <BookPreviewModal
        isOpen={isBookPreviewOpen}
        onClose={() => setIsBookPreviewOpen(false)}
        people={people}
        stories={stories}
        onPrint={handleExportPDF}
        lang={lang}
      />

      {/* Custom Confirmation Overlays */}
      {confirmModal && (
        <CustomConfirmModal
          isOpen={confirmModal !== null}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Welcome Guide Dialog Overlay */}
      {welcomeActive && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-container welcome-overlay" role="dialog" aria-labelledby="welcome-title">
            <div className="welcome-logo">
              <svg
                width="64"
                height="64"
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
            
            <h2 className="welcome-title" id="welcome-title">{t.welcomeTitle}</h2>
            
            <p className="welcome-text">
              {t.welcomeText}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', background: 'var(--amber-light)', padding: '1rem 1.5rem', borderRadius: '10px', border: '1px solid var(--amber-border)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Sparkles size={16} style={{ color: 'var(--amber-gold)', flexShrink: 0, marginTop: '0.1rem' }} />
                <span>{t.welcomeDrag}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                <BookOpen size={16} style={{ color: 'var(--amber-gold)', flexShrink: 0, marginTop: '0.1rem' }} />
                <span>{t.welcomeClick}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Check size={16} style={{ color: 'var(--amber-gold)', flexShrink: 0, marginTop: '0.1rem' }} />
                <span>{t.welcomeDraw}</span>
              </div>
            </div>

            <button className="btn btn-primary" onClick={closeWelcome} style={{ width: '100%', justifyContent: 'center' }}>
              {t.beginCurating}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="toast-notification" role="alert" aria-live="polite">
          {toast.type === 'error' ? (
            <AlertCircle size={16} style={{ color: '#e74c3c' }} />
          ) : (
            <Check size={16} style={{ color: 'var(--amber-gold)' }} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Print View Book Container */}
      <div className="print-book-container">
        <header className="print-book-header">
          <h1>{lang === 'uk' ? 'Книга Спадщини' : 'Heritage Storybook'}</h1>
          <p>{t.tagline}</p>
        </header>

        {people.map((person) => {
          const personStories = stories.filter((s) => s.personId === person.id);
          return (
            <section key={person.id} className="print-person-section">
              <h2 className="print-person-title">{getLocalizedValue(person.name)} — {getLocalizedValue(person.relationship)}</h2>
              {person.bio && <p className="print-person-bio">"{getLocalizedValue(person.bio)}"</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {personStories.length === 0 ? (
                  <p style={{ fontSize: '0.95rem', color: '#555', fontStyle: 'italic' }}>
                    {t.noStoriesPrint}
                  </p>
                ) : (
                  personStories.map((story) => (
                    <article key={story.id} className="print-story">
                      <h3 className="print-story-title">{getLocalizedValue(story.title)}</h3>
                      <div className="print-story-date">{getLocalizedValue(story.date)}</div>
                      <p className="print-story-body">{getLocalizedValue(story.content)}</p>
                      <div className="print-story-meta">{t.storySharedBy} {getLocalizedValue(story.contributor)}</div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default App;
