/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  FolderOpen,
  Plus,
  Search,
  Trash2,
  ChevronRight,
  FolderPlus,
  Download,
  Eye,
  CheckCircle2,
  X,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File,
  Upload,
  ArrowLeft,
  Grid,
  List,
  HardDrive,
  Edit,
  Lock,
  DownloadCloud,
  UploadCloud,
  Folder as FolderIcon
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Simple KaTeX parser component to maintain compatibility with other modules importing it
export function MathRenderer({ text }: { text: string }) {
  if (!text) return null;

  try {
    const blocks = text.split(/(\$\$.*?\$\$)/gs);

    return (
      <div className="space-y-2 leading-relaxed text-sm">
        {blocks.map((block, bIdx) => {
          if (block.startsWith('$$') && block.endsWith('$$')) {
            const formula = block.slice(2, -2).trim();
            try {
              const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
              return (
                <div
                  key={bIdx}
                  className="overflow-x-auto my-3 p-2 bg-slate-950/40 border border-slate-800/40 rounded-xl"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch (err) {
              return <pre key={bIdx} className="text-rose-400 font-mono text-xs">{formula}</pre>;
            }
          }

          const inlines = block.split(/(\$.*?\$)/g);
          return (
            <p key={bIdx} className="inline-block w-full">
              {inlines.map((chunk, cIdx) => {
                if (chunk.startsWith('$') && chunk.endsWith('$')) {
                  const formula = chunk.slice(1, -1).trim();
                  try {
                    const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
                    return <span key={cIdx} className="inline-block mx-0.5" dangerouslySetInnerHTML={{ __html: html }} />;
                  } catch (err) {
                    return <code key={cIdx} className="text-rose-400 font-mono text-xs">{formula}</code>;
                  }
                }
                return <span key={cIdx}>{chunk}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  } catch (e) {
    return <span className="text-slate-300 whitespace-pre-wrap">{text}</span>;
  }
}

interface FMFolder {
  id: string;
  name: string;
  parentId: string | null;
  isSystem: boolean;
  createdAt: string;
}

interface FMFile {
  id: string;
  name: string;
  type: string;
  size: string;
  parentId: string | null;
  dataUrl?: string; // Stored for custom uploads
  createdAt: string;
  isSystem: boolean;
}

const SYSTEM_FOLDERS: FMFolder[] = [
  { id: 'class4', name: 'Class 4', parentId: null, isSystem: true, createdAt: '2026-07-11 10:00 AM' },
  { id: 'class5', name: 'Class 5', parentId: null, isSystem: true, createdAt: '2026-07-11 10:00 AM' },
  { id: 'class6', name: 'Class 6', parentId: null, isSystem: true, createdAt: '2026-07-11 10:00 AM' },
  { id: 'class7', name: 'Class 7', parentId: null, isSystem: true, createdAt: '2026-07-11 10:00 AM' },
  { id: 'class8', name: 'Class 8', parentId: null, isSystem: true, createdAt: '2026-07-11 10:00 AM' },
];

const SYSTEM_FILES: FMFile[] = [
  { id: 'sys_f4_1', name: 'Class_4_Mathematics_Chapter_1_Fraction.pdf', type: 'pdf', size: '1.2 MB', parentId: 'class4', createdAt: '2026-07-11 10:05 AM', isSystem: true },
  { id: 'sys_f4_2', name: 'Class_4_Science_Half_Yearly_Exam_2026.docx', type: 'docx', size: '850 KB', parentId: 'class4', createdAt: '2026-07-11 10:08 AM', isSystem: true },
  { id: 'sys_f5_1', name: 'Class_5_Math_Primary_Education_Completion_Model_Test.pdf', type: 'pdf', size: '2.1 MB', parentId: 'class5', createdAt: '2026-07-11 10:10 AM', isSystem: true },
  { id: 'sys_f6_1', name: 'Class_6_Science_New_Curriculum_Guide.pdf', type: 'pdf', size: '3.4 MB', parentId: 'class6', createdAt: '2026-07-11 10:15 AM', isSystem: true },
  { id: 'sys_f7_1', name: 'Class_7_Mathematics_Algebra_Formula_Sheet.docx', type: 'docx', size: '620 KB', parentId: 'class7', createdAt: '2026-07-11 10:20 AM', isSystem: true },
  { id: 'sys_f8_1', name: 'Class_8_Math_JSC_Board_Question_2025.pdf', type: 'pdf', size: '1.8 MB', parentId: 'class8', createdAt: '2026-07-11 10:25 AM', isSystem: true },
];

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function QuestionBankView() {
  const { showToast } = useApp();

  // Keep actual File objects in memory for downloading in the same session without localStorage size limits
  const [sessionFiles, setSessionFiles] = useState<Record<string, File>>({});

  // Load Folders & Files
  const [folders, setFolders] = useState<FMFolder[]>(() => {
    const saved = localStorage.getItem('math_science_care_fm_folders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure system folders are always present
        const merged = [...SYSTEM_FOLDERS];
        parsed.forEach((pf: FMFolder) => {
          if (!merged.some(sf => sf.id === pf.id)) {
            merged.push(pf);
          }
        });
        return merged;
      } catch (e) {
        return SYSTEM_FOLDERS;
      }
    }
    return SYSTEM_FOLDERS;
  });

  const [files, setFiles] = useState<FMFile[]>(() => {
    const saved = localStorage.getItem('math_science_care_fm_files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = [...SYSTEM_FILES];
        parsed.forEach((pf: FMFile) => {
          if (!merged.some(sf => sf.id === pf.id)) {
            merged.push(pf);
          }
        });
        return merged;
      } catch (e) {
        return SYSTEM_FILES;
      }
    }
    return SYSTEM_FILES;
  });

  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'system' | 'custom' | 'files'>('all');

  // Selected Item State (For inspector panel)
  const [selectedFolder, setSelectedFolder] = useState<FMFolder | null>(null);
  const [selectedFile, setSelectedFile] = useState<FMFile | null>(null);
  
  // Confirmation State for Delete Operations
  const [deleteConfirmType, setDeleteConfirmType] = useState<'folder' | 'file' | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Modals
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ type: 'folder' | 'file'; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('math_science_care_fm_folders', JSON.stringify(folders.filter(f => !f.isSystem)));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('math_science_care_fm_files', JSON.stringify(files.filter(f => !f.isSystem)));
  }, [files]);

  // Total space check (estimate)
  const totalCustomFilesSize = files
    .filter(f => !f.isSystem && f.dataUrl)
    .reduce((sum, f) => {
      return sum + (f.dataUrl ? f.dataUrl.length * 0.75 : 0); // Approx base64 decode bytes
    }, 0);

  const usedPercentage = Math.min(100, Math.round((totalCustomFilesSize / (10 * 1024 * 1024)) * 100)); // 10MB limit reference

  // Filter Items
  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentFiles = files.filter(f => f.parentId === currentFolderId);

  // Apply search query & sidebar filters
  const filteredFolders = currentFolders.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (sidebarFilter === 'system') return matchesSearch && f.isSystem;
    if (sidebarFilter === 'custom') return matchesSearch && !f.isSystem;
    if (sidebarFilter === 'files') return false; // Filter only files
    return matchesSearch;
  });

  const filteredFiles = currentFiles.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (sidebarFilter === 'system') return matchesSearch && f.isSystem;
    if (sidebarFilter === 'custom') return matchesSearch && !f.isSystem;
    return matchesSearch;
  });

  // Breadcrumbs Generator
  const getBreadcrumbs = () => {
    const crumbs = [];
    let tempId = currentFolderId;
    while (tempId !== null) {
      const folder = folders.find(f => f.id === tempId);
      if (folder) {
        crumbs.unshift(folder);
        tempId = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Create folder action
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    // Check duplicate name in current level
    const isDuplicate = currentFolders.some(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase());
    if (isDuplicate) {
      showToast('A folder with this name already exists in this directory.', 'error');
      return;
    }

    const newFolder: FMFolder = {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: newFolderName.trim(),
      parentId: currentFolderId,
      isSystem: false,
      createdAt: new Date().toLocaleString('en-US', { hour12: true, dateStyle: 'medium', timeStyle: 'short' }),
    };

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setShowAddFolderModal(false);
    showToast('Folder created successfully!');
  };

  // Upload File Action
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    processFiles(uploadedFiles);
  };

  const processFiles = (fileList: FileList) => {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Check duplicates
      if (currentFiles.some(f => f.name.toLowerCase() === file.name.toLowerCase())) {
        showToast(`A file named "${file.name}" already exists in this folder.`, 'warning');
        continue;
      }

      const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'generic';

      // Keep real file objects in-memory for session-based lossless downloads
      setSessionFiles(prev => ({ ...prev, [fileId]: file }));

      // If file is reasonably small (< 1.5MB), store it persistently in localStorage
      if (file.size <= 1.5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;

          const newFile: FMFile = {
            id: fileId,
            name: file.name,
            type: fileExtension,
            size: formatBytes(file.size), // Shows 100% accurate real file size
            parentId: currentFolderId,
            dataUrl: dataUrl,
            createdAt: new Date().toLocaleString('en-US', { hour12: true, dateStyle: 'medium', timeStyle: 'short' }),
            isSystem: false,
          };

          setFiles(prev => [...prev, newFile]);
          showToast(`Successfully uploaded "${file.name}" (${formatBytes(file.size)})!`);
        };
        
        reader.onerror = () => {
          showToast('Error reading file contents.', 'error');
        };

        reader.readAsDataURL(file);
      } else {
        // For larger files, save the metadata persistently with the real file size, and keep the raw File in memory
        const newFile: FMFile = {
          id: fileId,
          name: file.name,
          type: fileExtension,
          size: formatBytes(file.size), // Displays exact, real file size
          parentId: currentFolderId,
          createdAt: new Date().toLocaleString('en-US', { hour12: true, dateStyle: 'medium', timeStyle: 'short' }),
          isSystem: false,
        };

        setFiles(prev => [...prev, newFile]);
        showToast(`Successfully uploaded "${file.name}" (Real Size: ${formatBytes(file.size)})!`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Delete Item Action
  const handleDeleteItem = (type: 'folder' | 'file', id: string) => {
    if (type === 'folder') {
      const folder = folders.find(f => f.id === id);
      if (folder?.isSystem) {
        showToast('This core system folder is locked and cannot be deleted.', 'error');
        return;
      }

      // Recursive Delete helper
      const foldersToDelete = [id];
      const filesToDelete: string[] = [];

      const findChildren = (fid: string) => {
        // Add files in this folder
        files.filter(f => f.parentId === fid).forEach(f => filesToDelete.push(f.id));
        // Recurse for child folders
        folders.filter(fol => fol.parentId === fid).forEach(fol => {
          foldersToDelete.push(fol.id);
          findChildren(fol.id);
        });
      };

      findChildren(id);

      setFolders(prev => prev.filter(f => !foldersToDelete.includes(f.id)));
      setFiles(prev => prev.filter(f => !filesToDelete.includes(f.id)));
      setSelectedFolder(null);
      showToast('Folder deleted successfully!');
    } else {
      const file = files.find(f => f.id === id);
      if (file?.isSystem) {
        showToast('This system pre-seeded document is protected and cannot be deleted.', 'error');
        return;
      }

      setFiles(prev => prev.filter(f => f.id !== id));
      setSelectedFile(null);
      showToast('File deleted successfully!');
    }
  };

  // Rename Actions
  const openRenameModal = (type: 'folder' | 'file', id: string, name: string) => {
    if (type === 'folder' && SYSTEM_FOLDERS.some(sf => sf.id === id)) {
      showToast('Core system directories cannot be renamed.', 'error');
      return;
    }
    const targetFile = files.find(f => f.id === id);
    if (type === 'file' && targetFile?.isSystem) {
      showToast('Protected system files cannot be renamed.', 'error');
      return;
    }

    setRenameTarget({ type, id, name });
    setRenameValue(name);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || !renameTarget) return;

    if (renameTarget.type === 'folder') {
      setFolders(prev => prev.map(f => f.id === renameTarget.id ? { ...f, name: renameValue.trim() } : f));
      if (selectedFolder?.id === renameTarget.id) {
        setSelectedFolder(prev => prev ? { ...prev, name: renameValue.trim() } : null);
      }
      showToast('Folder renamed successfully!');
    } else {
      setFiles(prev => prev.map(f => f.id === renameTarget.id ? { ...f, name: renameValue.trim() } : f));
      if (selectedFile?.id === renameTarget.id) {
        setSelectedFile(prev => prev ? { ...prev, name: renameValue.trim() } : null);
      }
      showToast('File renamed successfully!');
    }

    setShowRenameModal(false);
    setRenameTarget(null);
  };

  // Download Trigger
  const triggerDownload = (file: FMFile) => {
    // If the file was uploaded in this session, download the exact raw File object losslessly
    const rawFileObj = sessionFiles[file.id];
    if (rawFileObj) {
      const url = URL.createObjectURL(rawFileObj);
      const link = document.createElement('a');
      link.href = url;
      link.download = rawFileObj.name;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Downloading original file: ${file.name}`);
      return;
    }

    if (file.dataUrl) {
      const link = document.createElement('a');
      link.href = file.dataUrl;
      link.download = file.name;
      link.click();
      showToast(`Downloading: ${file.name}`);
    } else {
      // Dynamic simulated content generation for pre-seeded files to be highly realistic and operational!
      const content = `==================================================\n` +
        `MSCARE CENTER - SECURE REPOSITORY\n` +
        `==================================================\n\n` +
        `File Name: ${file.name}\n` +
        `Document Type: Academic Question Bank & Syllabus\n` +
        `Standard: ${file.parentId ? file.parentId.replace('class', 'Class ') : 'General'}\n` +
        `Created on: ${file.createdAt}\n` +
        `File Size: ${file.size}\n\n` +
        `This is a secured academic document. All rights reserved.\n` +
        `Supervised and Managed by: Nion Hassan Nirjon\n` +
        `==================================================\n`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.endsWith('.pdf') || file.name.endsWith('.docx') ? file.name : `${file.name}.txt`;
      link.click();
      showToast(`Exporting academic file: ${file.name}`);
    }
  };

  // Render Icons
  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'pdf') return <FileText className="w-10 h-10 text-rose-500 shrink-0" />;
    if (['doc', 'docx'].includes(t)) return <File className="w-10 h-10 text-blue-400 shrink-0" />;
    if (['xls', 'xlsx', 'csv'].includes(t)) return <FileSpreadsheet className="w-10 h-10 text-emerald-400 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(t)) return <FileImage className="w-10 h-10 text-purple-400 shrink-0" />;
    if (['js', 'ts', 'tsx', 'html', 'css', 'json'].includes(t)) return <FileCode className="w-10 h-10 text-amber-400 shrink-0" />;
    return <File className="w-10 h-10 text-slate-400 shrink-0" />;
  };

  const getFileIconSmall = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'pdf') return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    if (['doc', 'docx'].includes(t)) return <File className="w-4 h-4 text-blue-400 shrink-0" />;
    if (['xls', 'xlsx', 'csv'].includes(t)) return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(t)) return <FileImage className="w-4 h-4 text-purple-400 shrink-0" />;
    if (['js', 'ts', 'tsx', 'html', 'css', 'json'].includes(t)) return <FileCode className="w-4 h-4 text-amber-400 shrink-0" />;
    return <File className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto pb-10 select-none font-sans">
      
      {/* 1. Left Sidebar Filter Rail (1 Column) */}
      <div className="space-y-4">
        {/* Storage Health */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-slate-300">
            <HardDrive className="w-4 h-4 text-emerald-450 shrink-0" />
            <span className="text-xs font-mono uppercase font-bold tracking-wider">Storage Status</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/60">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${usedPercentage + 3}%` }} 
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
            <span>Quota Used</span>
            <span>{Math.max(1, usedPercentage)}% of 10 MB</span>
          </div>
        </div>

        {/* Categories / Navigation Filters */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-2.5 space-y-1.5">
          <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-3.5 pt-2 pb-1">Quick Access Filters</h3>
          
          <button
            onClick={() => setSidebarFilter('all')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all ${
              sidebarFilter === 'all'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>Show All Items</span>
          </button>

          <button
            onClick={() => setSidebarFilter('system')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all ${
              sidebarFilter === 'system'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>Pre-seeded Only</span>
          </button>

          <button
            onClick={() => setSidebarFilter('custom')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all ${
              sidebarFilter === 'custom'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderIcon className="w-4 h-4 shrink-0" />
            <span>My Folders & Files</span>
          </button>
        </div>

        {/* Root Level Pre-seeded Shortcuts */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 space-y-2.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block px-1">Protected Classes</span>
          <div className="grid grid-cols-2 gap-1.5">
            {SYSTEM_FOLDERS.map(sf => (
              <button
                key={sf.id}
                onClick={() => {
                  setCurrentFolderId(sf.id);
                  setSelectedFolder(null);
                  setSelectedFile(null);
                }}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center transition-all flex items-center justify-center gap-1.5 truncate ${
                  currentFolderId === sf.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                    : 'bg-slate-950/40 hover:bg-slate-800/80 border-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{sf.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main File Explorer Area (2 Columns) */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Navigation Breadcrumbs & Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950/20 p-3 border border-slate-800/50 rounded-2xl">
          {/* Breadcrumb navigator */}
          <div className="flex items-center gap-1 flex-wrap text-xs text-slate-400">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setSelectedFolder(null);
                setSelectedFile(null);
              }}
              className="hover:text-emerald-400 transition font-bold"
            >
              Root
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <button
                  onClick={() => {
                    setCurrentFolderId(crumb.id);
                    setSelectedFolder(null);
                    setSelectedFile(null);
                  }}
                  className={`hover:text-emerald-400 transition font-bold truncate max-w-[120px] ${
                    idx === breadcrumbs.length - 1 ? 'text-emerald-400 font-extrabold' : ''
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowAddFolderModal(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-300 text-xs font-bold rounded-xl hover:text-slate-100 transition"
              title="Create new directory"
            >
              <FolderPlus className="w-4 h-4 text-slate-500" />
              <span>New Folder</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
          </div>
        </div>

        {/* Toolbar: Search & View Switcher */}
        <div className="flex justify-between items-center bg-slate-950/10 border border-slate-900 p-2.5 rounded-xl">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search current folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 focus:border-emerald-500/40 rounded-lg pl-8 pr-4 py-1 text-[11px] text-slate-200 outline-none placeholder-slate-500 transition"
            />
          </div>

          <div className="flex items-center gap-1 pl-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drag & Drop Overlay Zone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl transition-all duration-150 min-h-[45vh] p-4 flex flex-col ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-500/5' 
              : 'border-slate-850 bg-slate-950/10 hover:border-slate-800/80'
          }`}
        >
          {/* Main List / Grid Viewer */}
          {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto select-none">
              <UploadCloud className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-300 font-bold text-xs">This Folder is Empty</p>
              <p className="text-slate-500 text-[10px] max-w-xs mt-1 leading-relaxed">
                Drag and drop files directly here, or click "Upload File" to add files to this folder.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View Layout
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Folders */}
              {filteredFolders.map(folder => {
                const isSelected = selectedFolder?.id === folder.id;
                return (
                  <div
                    key={folder.id}
                    onDoubleClick={() => {
                      setCurrentFolderId(folder.id);
                      setSelectedFolder(null);
                      setSelectedFile(null);
                    }}
                    onClick={() => {
                      setSelectedFolder(folder);
                      setSelectedFile(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-500/5 shadow-md shadow-emerald-500/2'
                        : 'border-slate-850 bg-slate-950/40 hover:bg-slate-900/60 hover:border-slate-750'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <FolderOpen className={`w-8 h-8 ${folder.isSystem ? 'text-amber-500' : 'text-emerald-400'}`} />
                      {folder.isSystem && (
                        <span className="text-[9px] bg-slate-900/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-0.5 select-none font-semibold">
                          <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" /> Lock
                        </span>
                      )}
                    </div>
                    <div className="truncate font-bold text-xs text-slate-200 pr-1 mt-2">
                      {folder.name}
                    </div>
                  </div>
                );
              })}

              {/* Files */}
              {filteredFiles.map(file => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFile(file);
                      setSelectedFolder(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-500/5 shadow-md shadow-emerald-500/2'
                        : 'border-slate-850 bg-slate-950/40 hover:bg-slate-900/60 hover:border-slate-750'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      {getFileIcon(file.type)}
                      {file.isSystem && (
                        <span className="text-[9px] bg-slate-900/90 text-slate-400 px-1 py-0.5 rounded border border-slate-850 flex items-center gap-0.5 font-bold">
                          <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" /> Core
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-0.5 truncate">
                      <div className="truncate font-bold text-xs text-slate-200">{file.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{file.size}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List View Layout
            <div className="divide-y divide-slate-800/40 bg-slate-950/10 border border-slate-850 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 p-2 px-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider bg-slate-950/40">
                <span className="col-span-6">Name</span>
                <span className="col-span-3">Created At</span>
                <span className="col-span-2 text-right">Size</span>
                <span className="col-span-1"></span>
              </div>

              {/* Folders List */}
              {filteredFolders.map(folder => {
                const isSelected = selectedFolder?.id === folder.id;
                return (
                  <div
                    key={folder.id}
                    onDoubleClick={() => {
                      setCurrentFolderId(folder.id);
                      setSelectedFolder(null);
                      setSelectedFile(null);
                    }}
                    onClick={() => {
                      setSelectedFolder(folder);
                      setSelectedFile(null);
                    }}
                    className={`grid grid-cols-12 p-2.5 px-3 items-center text-xs transition-all cursor-pointer ${
                      isSelected ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'hover:bg-slate-900/30 text-slate-300'
                    }`}
                  >
                    <div className="col-span-6 flex items-center gap-2 truncate">
                      <FolderOpen className={`w-4 h-4 ${folder.isSystem ? 'text-amber-500' : 'text-emerald-400'} shrink-0`} />
                      <span className="truncate font-bold">{folder.name}</span>
                    </div>
                    <span className="col-span-3 text-[10px] text-slate-500 truncate font-mono">{folder.createdAt}</span>
                    <span className="col-span-2 text-right text-[10px] text-slate-500 font-mono">--</span>
                    <div className="col-span-1 text-right">
                      {folder.isSystem && <Lock className="w-3.5 h-3.5 text-amber-500 inline-block shrink-0 opacity-80" />}
                    </div>
                  </div>
                );
              })}

              {/* Files List */}
              {filteredFiles.map(file => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFile(file);
                      setSelectedFolder(null);
                    }}
                    className={`grid grid-cols-12 p-2.5 px-3 items-center text-xs transition-all cursor-pointer ${
                      isSelected ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'hover:bg-slate-900/30 text-slate-300'
                    }`}
                  >
                    <div className="col-span-6 flex items-center gap-2 truncate">
                      {getFileIconSmall(file.type)}
                      <span className="truncate font-bold">{file.name}</span>
                    </div>
                    <span className="col-span-3 text-[10px] text-slate-500 truncate font-mono">{file.createdAt}</span>
                    <span className="col-span-2 text-right text-[10px] text-slate-400 font-mono">{file.size}</span>
                    <div className="col-span-1 text-right">
                      {file.isSystem && <Lock className="w-3.5 h-3.5 text-amber-500 inline-block shrink-0 opacity-85" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Drag Overlay visualizer */}
          {isDragging && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none z-10 animate-fade-in pointer-events-none">
              <UploadCloud className="w-16 h-16 text-emerald-400 mb-2 animate-bounce" />
              <p className="text-emerald-400 font-extrabold text-sm uppercase tracking-wider">Drop files here</p>
              <p className="text-emerald-500/80 text-xs mt-1">Files will be uploaded directly to the current directory</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Detail Inspector Sidebar Drawer (1 Column) */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest px-1">File & Directory Details</h3>

        {selectedFolder ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-lg flex flex-col">
            <div className="flex flex-col items-center py-4 border-b border-slate-800/80 gap-2 text-center">
              <FolderOpen className={`w-14 h-14 ${selectedFolder.isSystem ? 'text-amber-500' : 'text-emerald-400'}`} />
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-100 text-xs truncate max-w-[200px]">{selectedFolder.name}</h4>
                <p className="text-[10px] text-slate-500 font-mono">Directory Folder</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-mono text-[10px]">Folder ID:</span>
                <span className="text-slate-300 font-mono text-[10px]">{selectedFolder.id}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-mono text-[10px]">Date Created:</span>
                <span className="text-slate-300 font-mono text-[10px]">{selectedFolder.createdAt}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-mono text-[10px]">Contains:</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  {folders.filter(f => f.parentId === selectedFolder.id).length} subfolders,{' '}
                  {files.filter(f => f.parentId === selectedFolder.id).length} files
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-mono text-[10px]">Access Lock:</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedFolder.isSystem ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {selectedFolder.isSystem ? 'Protected System' : 'User Writeable'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
              <button
                disabled={selectedFolder.isSystem}
                onClick={() => openRenameModal('folder', selectedFolder.id, selectedFolder.name)}
                className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl border transition ${
                  selectedFolder.isSystem
                    ? 'opacity-40 cursor-not-allowed border-slate-850 text-slate-600'
                    : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                }`}
                title="Rename Folder"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>

              {deleteConfirmId === selectedFolder.id && deleteConfirmType === 'folder' ? (
                <div className="flex gap-1.5 w-full">
                  <button
                    onClick={() => {
                      handleDeleteItem('folder', selectedFolder.id);
                      setDeleteConfirmId(null);
                      setDeleteConfirmType(null);
                    }}
                    className="flex-1 py-2 text-[11px] font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-slate-100 transition cursor-pointer"
                  >
                    Confirm?
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirmId(null);
                      setDeleteConfirmType(null);
                    }}
                    className="px-3 py-2 text-[11px] font-medium rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  disabled={selectedFolder.isSystem}
                  onClick={() => {
                    setDeleteConfirmId(selectedFolder.id);
                    setDeleteConfirmType('folder');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl border transition ${
                    selectedFolder.isSystem
                      ? 'opacity-40 cursor-not-allowed border-slate-850 text-slate-600'
                      : 'border-rose-500/20 hover:bg-rose-500/10 text-rose-400'
                  }`}
                  title="Delete Folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        ) : selectedFile ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-lg flex flex-col">
            <div className="flex flex-col items-center py-4 border-b border-slate-800/80 gap-2 text-center">
              {getFileIcon(selectedFile.type)}
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-100 text-xs truncate max-w-[200px]">{selectedFile.name}</h4>
                <p className="text-[10px] text-slate-500 font-mono">Format: .{selectedFile.type.toUpperCase()}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-mono text-[10px]">File ID:</span>
                <span className="text-slate-300 font-mono text-[10px]">{selectedFile.id}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-mono text-[10px]">Date Uploaded:</span>
                <span className="text-slate-300 font-mono text-[10px]">{selectedFile.createdAt}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-mono text-[10px]">File Size:</span>
                <span className="text-slate-300 font-mono text-[10px]">{selectedFile.size}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-mono text-[10px]">Source Lock:</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedFile.isSystem ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {selectedFile.isSystem ? 'Protected Document' : 'User Created'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => triggerDownload(selectedFile)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download Document</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={selectedFile.isSystem}
                  onClick={() => openRenameModal('file', selectedFile.id, selectedFile.name)}
                  className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl border transition ${
                    selectedFile.isSystem
                      ? 'opacity-40 cursor-not-allowed border-slate-850 text-slate-600'
                      : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                  title="Rename File"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Rename</span>
                </button>

                {deleteConfirmId === selectedFile.id && deleteConfirmType === 'file' ? (
                  <div className="flex gap-1.5 w-full">
                    <button
                      onClick={() => {
                        handleDeleteItem('file', selectedFile.id);
                        setDeleteConfirmId(null);
                        setDeleteConfirmType(null);
                      }}
                      className="flex-1 py-2 text-[11px] font-extrabold rounded-xl bg-rose-600 hover:bg-rose-700 text-slate-100 transition cursor-pointer"
                    >
                      Confirm?
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmId(null);
                        setDeleteConfirmType(null);
                      }}
                      className="px-3 py-2 text-[11px] font-medium rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={selectedFile.isSystem}
                    onClick={() => {
                      setDeleteConfirmId(selectedFile.id);
                      setDeleteConfirmType('file');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-xl border transition ${
                      selectedFile.isSystem
                        ? 'opacity-40 cursor-not-allowed border-slate-850 text-slate-600'
                        : 'border-rose-500/20 hover:bg-rose-500/10 text-rose-400'
                    }`}
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-slate-900/10 border border-slate-800 border-dashed rounded-2xl text-center text-slate-500 text-xs">
            Select any file or folder directory inside the browser to inspect metadata, verify system lock states, download, rename, or delete items.
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Add Folder Modal */}
      {showAddFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-slate-200 text-sm">Create Folder</h3>
              <button onClick={() => setShowAddFolderModal(false)} className="text-slate-400 hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolderSubmit} className="space-y-4 text-xs">
              <div className="flex flex-col space-y-1">
                <label className="text-slate-400 font-bold">Folder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 3 Trigonometry"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFolderModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && renameTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-slate-200 text-sm">Rename {renameTarget.type === 'folder' ? 'Folder' : 'File'}</h3>
              <button onClick={() => { setShowRenameModal(false); setRenameTarget(null); }} className="text-slate-400 hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4 text-xs">
              <div className="flex flex-col space-y-1">
                <label className="text-slate-400 font-bold">New Name *</label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded px-3 py-2 outline-none text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowRenameModal(false); setRenameTarget(null); }}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
