import React, { useState, useRef, useEffect } from 'react';
import type { Person, Relationship } from '../types';
import { PersonNode } from './PersonNode';
import { ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';
import type { Language } from '../locales';

interface CanvasProps {
  people: Person[];
  relationships: Relationship[];
  selectedPersonId: string | null;
  storiesCount: { [personId: string]: number };
  onSelectPerson: (id: string) => void;
  onUpdatePersonPosition: (id: string, x: number, y: number) => void;
  onEditRelationship: (rel: Relationship, clientX: number, clientY: number) => void;
  lang: Language;
}

export const Canvas: React.FC<CanvasProps> = ({
  people,
  relationships,
  selectedPersonId,
  storiesCount,
  onSelectPerson,
  onUpdatePersonPosition,
  onEditRelationship,
  lang,
}) => {
  const [zoom, setZoom] = useState<number>(0.95);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 80, y: 60 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Track drag distance to distinguish dragging from clicking
  const dragDistanceRef = useRef<number>(0);

  // Helper to extract localized string
  const getLocalizedValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val['en'] || '';
  };

  // Handle canvas panning on mouse down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('svg-connections-layer')) {
      // Don't pan if clicking nodes or badges
      return;
    }
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
    dragDistanceRef.current = 0;
  };

  // Handle node drag start
  const handleNodeDragStart = (e: React.MouseEvent, personId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    const person = people.find((p) => p.id === personId);
    if (!person) return;

    setDraggedNodeId(personId);
    dragDistanceRef.current = 0;

    const canvasMouseX = (e.clientX - panOffset.x) / zoom;
    const canvasMouseY = (e.clientY - panOffset.y) / zoom;

    dragStartOffsetRef.current = {
      x: canvasMouseX - person.x,
      y: canvasMouseY - person.y,
    };
  };

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPanOffset({ x: dx, y: dy });
        dragDistanceRef.current += Math.sqrt(dx * dx + dy * dy);
      } else if (draggedNodeId) {
        const canvasMouseX = (e.clientX - panOffset.x) / zoom;
        const canvasMouseY = (e.clientY - panOffset.y) / zoom;

        const newX = canvasMouseX - dragStartOffsetRef.current.x;
        const newY = canvasMouseY - dragStartOffsetRef.current.y;

        onUpdatePersonPosition(draggedNodeId, Math.max(10, Math.min(2500, newX)), Math.max(10, Math.min(2500, newY)));
        dragDistanceRef.current += 1;
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setDraggedNodeId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, draggedNodeId, panOffset, zoom, people, onUpdatePersonPosition]);

  // Handle Zoom shortcuts
  const zoomIn = () => setZoom((z) => Math.min(1.5, z + 0.1));
  const zoomOut = () => setZoom((z) => Math.max(0.4, z - 0.1));
  const zoomReset = () => {
    setZoom(0.95);
    setPanOffset({ x: 80, y: 60 });
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.05;
    let newZoom = zoom - e.deltaY * zoomFactor * 0.01;
    newZoom = Math.max(0.4, Math.min(1.5, newZoom));
    
    // Zoom toward mouse cursor
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const canvasX = (mouseX - panOffset.x) / zoom;
      const canvasY = (mouseY - panOffset.y) / zoom;

      setPanOffset({
        x: mouseX - canvasX * newZoom,
        y: mouseY - canvasY * newZoom,
      });
    }
    setZoom(newZoom);
  };

  // Helper to draw connection curves between nodes
  const renderConnections = () => {
    return relationships.map((rel) => {
      const fromNode = people.find((p) => p.id === rel.fromId);
      const toNode = people.find((p) => p.id === rel.toId);

      if (!fromNode || !toNode) return null;

      // Calculate node centers
      const xA = fromNode.x + 110;
      const cyA = fromNode.y + 60;
      const xB = toNode.x + 110;
      const cyB = toNode.y + 60;

      // Curved Bezier calculation
      const midX = (xA + xB) / 2;
      const midY = (cyA + cyB) / 2;
      
      // Calculate perpendicular offset for curve bend
      const dx = xB - xA;
      const dy = cyB - cyA;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      // Set bend offset (e.g. 35px perp offset)
      const offsetAmt = 35;
      const perpX = len > 0 ? -(dy / len) * offsetAmt : 0;
      const perpY = len > 0 ? (dx / len) * offsetAmt : 0;
      
      const ctrlX = midX + perpX;
      const ctrlY = midY + perpY;

      // Quadratic Bezier path formula
      const pathData = `M ${xA} ${cyA} Q ${ctrlX} ${ctrlY} ${xB} ${cyB}`;

      // Calculate midpoint on the quadratic Bezier curve at t=0.5
      const textX = 0.25 * xA + 0.5 * ctrlX + 0.25 * xB;
      const textY = 0.25 * cyA + 0.5 * ctrlY + 0.25 * cyB;

      const labelText = getLocalizedValue(rel.label);

      // Approximate text box width based on label length
      const textWidth = Math.max(80, labelText.length * 7 + 16);
      const textHeight = 22;

      return (
        <g key={rel.id} className="connection-group">
          {/* Main stroke line */}
          <path d={pathData} className="connection-line" />
          
          {/* Invisible thick line for easier hover triggers */}
          <path d={pathData} className="connection-line-hoverable" />

          {/* Connection Relationship Label Badge */}
          {labelText && (
            <g
              className="relationship-badge"
              transform={`translate(${textX}, ${textY})`}
              onClick={(e) => {
                e.stopPropagation();
                onEditRelationship(rel, e.clientX, e.clientY);
              }}
            >
              <rect
                x={-textWidth / 2}
                y={-textHeight / 2}
                width={textWidth}
                height={textHeight}
                className="relationship-text-rect"
              />
              <text className="relationship-text">{labelText}</text>
            </g>
          )}
        </g>
      );
    });
  };

  return (
    <div
      className="canvas-wrapper"
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
    >
      <div
        className="canvas-content"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
        }}
      >
        <svg className="svg-connections-layer">
          {renderConnections()}
        </svg>

        {people.map((person) => (
          <PersonNode
            key={person.id}
            person={person}
            isSelected={selectedPersonId === person.id}
            storyCount={storiesCount[person.id] || 0}
            onSelect={() => onSelectPerson(person.id)}
            onStartDrag={handleNodeDragStart}
            lang={lang}
          />
        ))}
      </div>

      <div className="canvas-controls">
        <button className="control-btn" onClick={zoomIn} title={lang === 'uk' ? 'Збільшити' : 'Zoom In'}>
          <ZoomIn size={18} />
        </button>
        <button className="control-btn" onClick={zoomOut} title={lang === 'uk' ? 'Зменшити' : 'Zoom Out'}>
          <ZoomOut size={18} />
        </button>
        <button className="control-btn" onClick={zoomReset} title={lang === 'uk' ? 'Скинути вигляд' : 'Reset View'}>
          <Maximize2 size={18} />
        </button>
        <div
          className="control-btn"
          title={lang === 'uk' ? 'Перетягуйте людей. Гортайте коліщатком для масштабування. Перетягуйте фон.' : 'Drag node to move. Scroll to zoom. Drag background to pan.'}
          style={{ cursor: 'help' }}
        >
          <Info size={18} />
        </div>
      </div>
    </div>
  );
};
