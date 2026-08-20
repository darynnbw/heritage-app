import React from 'react';
import type { Person } from '../types';
import type { Language } from '../locales';

interface PersonNodeProps {
  person: Person;
  isSelected: boolean;
  storyCount: number;
  onSelect: () => void;
  onStartDrag: (e: React.MouseEvent, personId: string) => void;
  lang: Language;
}

export const PersonNode: React.FC<PersonNodeProps> = ({
  person,
  isSelected,
  storyCount,
  onSelect,
  onStartDrag,
  lang,
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    onStartDrag(e, person.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const getLocalizedValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['en'] || '';
  };

  const localizedName = getLocalizedValue(person.name);
  const localizedRelationship = getLocalizedValue(person.relationship);

  return (
    <div
      className={`person-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: `${person.x}px`,
        top: `${person.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      id={`person-node-${person.id}`}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${localizedName}, ${localizedRelationship}. ${storyCount} stories shared.`}
    >
      <div className="portrait-wrapper">
        <img
          src={person.photo}
          alt={localizedName}
          className="portrait-image"
          draggable="false"
        />
        {storyCount > 0 && (
          <span className="story-badge" title={`${storyCount} stories shared`}>
            {storyCount}
          </span>
        )}
      </div>

      <h3 className="node-name">{localizedName}</h3>
      <span className="node-relationship" title={localizedRelationship}>
        {localizedRelationship}
      </span>
    </div>
  );
};
