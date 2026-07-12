/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SlidePresentation, Slide, SlideElement } from '../types';
import {
  Presentation,
  Plus,
  Trash2,
  Copy,
  Download,
  Palette,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  FileCode2,
  Minimize2,
  Eye,
  Type,
  Square,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { MathRenderer } from './QuestionBankView';

export default function SlideBuilderView() {
  const { presentations, addPresentation, updatePresentation, deletePresentation, showToast } = useApp();

  const [activePresId, setActivePresId] = useState<string | null>(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Presentation Mode state
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentingSlideIdx, setPresentingSlideIdx] = useState(0);

  // Load first presentation by default
  useEffect(() => {
    if (!activePresId && presentations.length > 0) {
      setActivePresId(presentations[0].id);
    }
  }, [presentations, activePresId]);

  const activePres = presentations.find((p) => p.id === activePresId);
  const activeSlide = activePres?.slides[activeSlideIdx];

  const handleCreatePresentation = () => {
    const fresh = addPresentation({
      title: 'New PowerPoint Lecture',
      slides: [
        {
          id: 'slide-1',
          title: 'Welcome Slide',
          background: 'bg-slate-900',
          notes: 'Speaker notes go here...',
          elements: [
            {
              id: 'el-1',
              type: 'text',
              content: '# Masterclass Slide\nCreated via Slide Builder.',
              x: 10,
              y: 20,
              width: 80,
              height: 50,
              style: { color: '#f8fafc', fontSize: 24 },
            }
          ]
        }
      ],
      theme: 'dark',
    });
    setActivePresId(fresh.id);
    setActiveSlideIdx(0);
  };

  const handleAddSlide = () => {
    if (!activePres) return;
    const newSlide: Slide = {
      id: 'slide-' + Date.now(),
      title: `Slide ${activePres.slides.length + 1}`,
      background: 'bg-slate-900',
      notes: 'New slide notes...',
      elements: [
        {
          id: 'el-' + Date.now(),
          type: 'text',
          content: '## New Slide Title\nAdd bullet points or science equations.',
          x: 10,
          y: 20,
          width: 80,
          height: 60,
          style: { color: '#e2e8f0', fontSize: 20 },
        }
      ],
    };

    updatePresentation({
      ...activePres,
      slides: [...activePres.slides, newSlide],
    });
    setActiveSlideIdx(activePres.slides.length);
  };

  const handleDuplicateSlide = () => {
    if (!activePres || !activeSlide) return;
    const duplicated: Slide = {
      ...activeSlide,
      id: 'slide-' + Date.now(),
      title: `${activeSlide.title} (Copy)`,
      elements: activeSlide.elements.map((el) => ({ ...el, id: 'el-' + Math.random().toString(36).substr(2, 5) })),
    };

    const newSlides = [...activePres.slides];
    newSlides.splice(activeSlideIdx + 1, 0, duplicated);

    updatePresentation({
      ...activePres,
      slides: newSlides,
    });
    setActiveSlideIdx(activeSlideIdx + 1);
  };

  const handleDeleteSlide = () => {
    if (!activePres || activePres.slides.length <= 1) {
      showToast('A presentation must have at least one slide.', 'warning');
      return;
    }
    const newSlides = activePres.slides.filter((_, idx) => idx !== activeSlideIdx);
    updatePresentation({
      ...activePres,
      slides: newSlides,
    });
    setActiveSlideIdx(Math.max(0, activeSlideIdx - 1));
  };

  const handleReorder = (dir: 'up' | 'down') => {
    if (!activePres) return;
    const newSlides = [...activePres.slides];
    const targetIdx = dir === 'up' ? activeSlideIdx - 1 : activeSlideIdx + 1;

    if (targetIdx < 0 || targetIdx >= newSlides.length) return;

    // Swap
    const temp = newSlides[activeSlideIdx];
    newSlides[activeSlideIdx] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;

    updatePresentation({
      ...activePres,
      slides: newSlides,
    });
    setActiveSlideIdx(targetIdx);
  };

  const handleAddElement = (type: 'text' | 'shape') => {
    if (!activePres || !activeSlide) return;

    const newEl: SlideElement = {
      id: 'el-' + Date.now(),
      type,
      content: type === 'text' ? 'Double click to edit textbox layer' : 'rectangle',
      x: 30,
      y: 30,
      width: 40,
      height: 20,
      style: {
        color: '#f8fafc',
        fontSize: 16,
        backgroundColor: type === 'shape' ? '#10b981' : undefined,
        borderRadius: type === 'shape' ? '8px' : undefined,
      },
    };

    const updatedSlide = {
      ...activeSlide,
      elements: [...activeSlide.elements, newEl],
    };

    updatePresentation({
      ...activePres,
      slides: activePres.slides.map((s, idx) => (idx === activeSlideIdx ? updatedSlide : s)),
    });
  };

  const handleUpdateElement = (elId: string, updates: Partial<SlideElement>) => {
    if (!activePres || !activeSlide) return;

    const updatedSlide = {
      ...activeSlide,
      elements: activeSlide.elements.map((el) => (el.id === elId ? { ...el, ...updates } : el)),
    };

    updatePresentation({
      ...activePres,
      slides: activePres.slides.map((s, idx) => (idx === activeSlideIdx ? updatedSlide : s)),
    });
  };

  const handleUpdateNotes = (notes: string) => {
    if (!activePres || !activeSlide) return;

    const updatedSlide = { ...activeSlide, notes };
    updatePresentation({
      ...activePres,
      slides: activePres.slides.map((s, idx) => (idx === activeSlideIdx ? updatedSlide : s)),
    });
  };

  const handleUpdateBackground = (bgClass: string) => {
    if (!activePres || !activeSlide) return;

    const updatedSlide = { ...activeSlide, background: bgClass };
    updatePresentation({
      ...activePres,
      slides: activePres.slides.map((s, idx) => (idx === activeSlideIdx ? updatedSlide : s)),
    });
  };

  // Keyboard controls for Presenter Mode
  useEffect(() => {
    if (!isPresenting) return;

    const handleKey = (e: KeyboardEvent) => {
      if (!activePres) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (presentingSlideIdx < activePres.slides.length - 1) {
          setPresentingSlideIdx((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (presentingSlideIdx > 0) {
          setPresentingSlideIdx((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        setIsPresenting(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPresenting, presentingSlideIdx, activePres]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto pb-10 select-none">
      {/* Deck Selector and slide thumbnail list (1 col) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider">Slide Decks</h3>
          <button
            onClick={handleCreatePresentation}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded"
            title="Create Slide Deck"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Presentation lists */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2.5 space-y-1">
          {presentations.map((p) => {
            const isSelected = activePresId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActivePresId(p.id);
                  setActiveSlideIdx(0);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${
                  isSelected
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-900/30 hover:bg-slate-800 border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Presentation className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold truncate">{p.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Thumbnail slider (reorder slides list) */}
        {activePres && (
          <div className="space-y-2 pt-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Deck Slides</span>
            <div className="space-y-1 bg-slate-950/40 p-2 border border-slate-900 rounded-xl max-h-52 overflow-y-auto">
              {activePres.slides.map((sld, idx) => {
                const isActive = activeSlideIdx === idx;
                return (
                  <div
                    key={sld.id}
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer ${
                      isActive ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                    }`}
                  >
                    <span className="truncate">
                      {idx + 1}. {sld.title}
                    </span>
                    {isActive && (
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder('up');
                          }}
                          disabled={idx === 0}
                          className="p-0.5 hover:bg-slate-700 text-slate-400 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder('down');
                          }}
                          disabled={idx === activePres.slides.length - 1}
                          className="p-0.5 hover:bg-slate-700 text-slate-400 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Slide canvas Editor area (2 cols) */}
      <div className="lg:col-span-2 space-y-4">
        {activePres && activeSlide ? (
          <div className="space-y-4">
            {/* Toolbar header */}
            <div className="flex justify-between items-center bg-slate-900/40 p-3 border border-slate-800/80 rounded-2xl">
              <span className="text-xs font-bold text-slate-300">
                Editing: Slide {activeSlideIdx + 1} of {activePres.slides.length}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPresentingSlideIdx(activeSlideIdx);
                    setIsPresenting(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-violet-600 hover:bg-violet-700 text-slate-100 rounded-lg text-xs font-bold shadow cursor-pointer transition"
                >
                  <Maximize2 className="w-4 h-4" /> Start Show
                </button>
                <button
                  onClick={handleAddSlide}
                  className="p-1 hover:bg-slate-800 text-slate-300 rounded border border-slate-850"
                  title="Add Slide"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDuplicateSlide}
                  className="p-1 hover:bg-slate-800 text-slate-300 rounded border border-slate-850"
                  title="Duplicate Slide"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteSlide}
                  className="p-1 hover:bg-rose-950 text-rose-400 rounded border border-slate-850"
                  title="Delete Slide"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simulated PowerPoint Aspect Canvas (16:9 widescreen) */}
            <div className="relative w-full aspect-[16/9] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center p-6">
              {/* Slide Background Layer */}
              <div className={`absolute inset-0 transition-all ${activeSlide.background}`}>
                {/* Radial glowing effect for premium touch */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)] pointer-events-none" />
              </div>

              {/* Dynamic Slides Elements */}
              <div className="relative w-full h-full text-slate-100 font-sans p-6 flex flex-col justify-between z-10 select-text">
                {/* Slide Header / Editable Title */}
                <input
                  type="text"
                  value={activeSlide.title}
                  onChange={(e) => {
                    const updated = { ...activeSlide, title: e.target.value };
                    updatePresentation({
                      ...activePres,
                      slides: activePres.slides.map((s, idx) => (idx === activeSlideIdx ? updated : s)),
                    });
                  }}
                  className="bg-transparent border-b border-transparent focus:border-slate-800 text-xl font-bold font-display tracking-tight outline-none pb-1 text-slate-100 w-full"
                />

                {/* Sub-layers stream */}
                <div className="flex-1 mt-4 relative">
                  {activeSlide.elements.map((el) => {
                    return (
                      <div
                        key={el.id}
                        style={{
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: `${el.width}%`,
                          height: `${el.height}%`,
                        }}
                        className="absolute p-2 hover:ring-1 hover:ring-emerald-500/40 rounded transition"
                      >
                        {el.type === 'text' ? (
                          <textarea
                            value={el.content}
                            onChange={(e) => handleUpdateElement(el.id, { content: e.target.value })}
                            style={{
                              color: el.style?.color || '#f8fafc',
                              fontSize: `${el.style?.fontSize || 16}px`,
                            }}
                            className="w-full h-full bg-transparent resize-none outline-none leading-relaxed text-xs border border-transparent hover:border-slate-800/40 p-1"
                          />
                        ) : (
                          <div
                            style={{
                              backgroundColor: el.style?.backgroundColor,
                              borderRadius: el.style?.borderRadius,
                            }}
                            className="w-full h-full flex items-center justify-center font-bold text-[10px]"
                          >
                            Shape
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Fixed branding footer */}
                <span className="text-[9px] font-mono text-slate-500 text-center select-none uppercase tracking-widest mt-auto">
                  Math & Science Care Presentation System
                </span>
              </div>
            </div>

            {/* Speaker notes section */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Speaker Notes</span>
              <textarea
                value={activeSlide.notes}
                onChange={(e) => handleUpdateNotes(e.target.value)}
                placeholder="Write triggers, study hints, or formulas to remind yourself of during the presentation..."
                className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-emerald-500/35 rounded-xl p-3 text-xs text-slate-300 outline-none resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="p-12 bg-slate-900/10 border border-slate-800 border-dashed rounded-2xl text-center text-slate-500 text-sm">
            Please select a presentation to begin slide crafting.
          </div>
        )}
      </div>

      {/* PowerPoint Properties Panel Sidebar (1 col) */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider">Slide Properties</h3>

        {activeSlide ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4 text-xs select-none">
            {/* Insert controls */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Add Content layer</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddElement('text')}
                  className="flex items-center justify-center gap-1.5 p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl"
                >
                  <Type className="w-3.5 h-3.5" /> Textbox
                </button>
                <button
                  onClick={() => handleAddElement('shape')}
                  className="flex items-center justify-center gap-1.5 p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl"
                >
                  <Square className="w-3.5 h-3.5" /> Shape Layer
                </button>
              </div>
            </div>

            {/* Slide themes/background selector */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Slide Wallpaper</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { name: 'Pitch Dark', class: 'bg-slate-950' },
                  { name: 'Slate Gray', class: 'bg-slate-900' },
                  { name: 'Emerald', class: 'bg-emerald-950' },
                  { name: 'Sunset Red', class: 'bg-rose-950' },
                  { name: 'Ocean Blue', class: 'bg-sky-950' },
                  { name: 'Light Slate', class: 'bg-slate-100 text-slate-900' },
                ].map((bg) => (
                  <button
                    key={bg.name}
                    onClick={() => handleUpdateBackground(bg.class)}
                    className="flex flex-col items-center p-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-lg text-[9px] text-slate-400"
                  >
                    <div className={`w-full h-5 rounded-md ${bg.class} mb-1 border border-slate-800`} />
                    {bg.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-slate-900/10 border border-slate-800 border-dashed rounded-2xl text-center text-slate-500 text-xs">
            Open a slide deck first to access properties.
          </div>
        )}
      </div>

      {/* PowerPoint Fullscreen Presentation Mode Overlay */}
      {isPresenting && activePres && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col justify-between text-slate-100 font-sans">
          {/* Top navigation header */}
          <div className="px-6 py-4 bg-slate-950/80 backdrop-blur border-b border-slate-900 flex items-center justify-between">
            <span className="text-xs font-bold tracking-tight text-slate-300">
              Presentation: {activePres.title}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">
                Slide {presentingSlideIdx + 1} of {activePres.slides.length}
              </span>
              <button
                onClick={() => setIsPresenting(false)}
                className="p-1 bg-slate-900 hover:bg-slate-800 hover:text-slate-100 border border-slate-800 rounded-lg text-slate-400 cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Large active presentation slide view (16:9 aspect scaled) */}
          <div className="flex-1 flex items-center justify-center p-8 bg-slate-950 relative">
            <div className={`w-full max-w-5xl aspect-[16/9] rounded-2xl overflow-hidden relative shadow-2xl p-8 flex flex-col justify-between ${
              activePres.slides[presentingSlideIdx].background
            }`}>
              <h2 className="text-2xl font-bold font-display tracking-tight text-slate-100">
                {activePres.slides[presentingSlideIdx].title}
              </h2>

              <div className="flex-1 mt-8 relative">
                {activePres.slides[presentingSlideIdx].elements.map((el) => {
                  return (
                    <div
                      key={el.id}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: `${el.width}%`,
                        height: `${el.height}%`,
                      }}
                      className="absolute p-2"
                    >
                      <MathRenderer text={el.content} />
                    </div>
                  );
                })}
              </div>

              {/* presentation footer */}
              <span className="text-[9px] font-mono text-slate-500 text-center uppercase tracking-widest mt-auto select-none">
                Cared by: Nion Hassan Nirjon
              </span>
            </div>
          </div>

          {/* Bottom actions panel */}
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-900 flex items-center justify-between select-none">
            {/* Nav Arrows */}
            <div className="flex gap-2">
              <button
                disabled={presentingSlideIdx === 0}
                onClick={() => setPresentingSlideIdx((p) => Math.max(0, p - 1))}
                className="p-2 bg-slate-900 border border-slate-800 disabled:opacity-40 rounded-xl text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={presentingSlideIdx === activePres.slides.length - 1}
                onClick={() => setPresentingSlideIdx((p) => Math.min(activePres.slides.length - 1, p + 1))}
                className="p-2 bg-slate-900 border border-slate-800 disabled:opacity-40 rounded-xl text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Keyboard tips */}
            <span className="text-[10px] font-mono text-slate-500">
              Tips: Use [Space] or [→] to advance slides • [←] to go back • [Esc] to exit presentation mode
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
