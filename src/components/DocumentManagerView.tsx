/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { UploadedFile } from '../types';
import {
  UploadCloud,
  FileText,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Plus,
  X,
  File,
  CheckCircle,
  Clock,
  Download,
  Database,
  Users,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function DocumentManagerView() {
  const {
    uploadedFiles,
    addUploadedFile,
    deleteUploadedFile,
    uploadFileToServer,
    settings,
    showToast,
  } = useApp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [groupFilter, setGroupFilter] = useState('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Upload modal/form state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  
  // Metadata form state
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [linkedClass, setLinkedClass] = useState('All');
  const [linkedGroup, setLinkedGroup] = useState('All');

  // Drag over state
  const [isDragActive, setIsDragActive] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme support
  const getAccentColorClass = () => {
    switch (settings.themeAccent) {
      case 'emerald': return 'emerald';
      case 'indigo': return 'indigo';
      case 'violet': return 'violet';
      case 'amber': return 'amber';
      default: return 'emerald';
    }
  };

  const accent = getAccentColorClass();

  // Utility to format bytes beautifully
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Convert File to Base64
  const processFile = (file: File) => {
    setSelectedFile(file);
    setDocTitle(file.name.replace(/\.[^/.]+$/, "")); // Strip extension for display title
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFileBase64(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Trigger server file upload & database registration
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileBase64) return;

    setIsUploading(true);
    setUploadProgress(20);

    try {
      setUploadProgress(50);
      const res = await uploadFileToServer(selectedFile.name, fileBase64);
      setUploadProgress(85);

      if (res.success && res.url) {
        // Map file extension to standard simple categories
        const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'other';
        let fileType = 'other';
        if (['pdf'].includes(ext)) fileType = 'pdf';
        else if (['doc', 'docx'].includes(ext)) fileType = 'docx';
        else if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext)) fileType = 'image';

        // Register in database
        addUploadedFile({
          name: docTitle || selectedFile.name,
          url: res.url,
          size: res.size || selectedFile.size,
          type: fileType,
          linkedClass,
          linkedGroup,
          description: docDescription,
        });

        // Reset state
        setSelectedFile(null);
        setFileBase64('');
        setDocTitle('');
        setDocDescription('');
        setLinkedClass('All');
        setLinkedGroup('All');
        setUploadProgress(100);
        showToast('File uploaded and synced successfully!', 'success');
      } else {
        showToast(res.error || 'Server failed to save file.', 'error');
      }
    } catch (err: any) {
      console.error('File Upload error:', err);
      showToast(err.message || 'File upload failed.', 'error');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  const handleCopyLink = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    showToast('Document link copied to clipboard!', 'success');
  };

  // Filtered files calculation
  const filteredFiles = uploadedFiles.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesClass = classFilter === 'All' || file.linkedClass === 'All' || file.linkedClass === classFilter;
    const matchesGroup = groupFilter === 'All' || file.linkedGroup === 'All' || file.linkedGroup === groupFilter;
    return matchesSearch && matchesClass && matchesGroup;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20"><FileText className="w-6 h-6" /></div>;
      case 'docx':
        return <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20"><FileText className="w-6 h-6" /></div>;
      case 'image':
        return <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><File className="w-6 h-6" /></div>;
      default:
        return <div className="p-3 bg-slate-500/10 text-slate-400 rounded-xl border border-slate-500/20"><File className="w-6 h-6" /></div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100 flex items-center gap-2">
            <Database className={`w-5 h-5 text-${accent}-400`} />
            Document Manager & Cloud Storage
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload PDFs, lecture sheets, and documents with instant multi-device syncing.
          </p>
        </div>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upload Form (Left Column on large screen) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <h3 className="font-semibold text-slate-200 text-sm mb-4 flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <UploadCloud className={`w-4 h-4 text-${accent}-400`} />
              Upload New Document
            </h3>

            {/* Drop Zone */}
            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? `border-${accent}-500 bg-${accent}-500/5`
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  className="hidden"
                />
                <UploadCloud className={`w-10 h-10 mx-auto text-slate-500 mb-3 group-hover:text-${accent}-400 transition-colors`} />
                <p className="text-xs font-medium text-slate-300">Drag & drop your file here, or click to browse</p>
                <p className="text-[10px] text-slate-500 mt-1.5">Supports PDF, DOCX, XLSX, Images up to 25MB</p>
              </div>
            ) : (
              /* Selected File Details & Meta Form */
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className={`w-8 h-8 text-${accent}-400 shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500">{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileBase64('');
                    }}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Document Title</label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Enter elegant file title"
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Short Description</label>
                  <textarea
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    placeholder="Describe content, topics or syllabus covered..."
                    rows={2}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all resize-none"
                  />
                </div>

                {/* Two Column Linked Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-500" /> Linked Class
                    </label>
                    <select
                      value={linkedClass}
                      onChange={(e) => setLinkedClass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none transition-all"
                    >
                      <option value="All">All Classes</option>
                      <option value="Class 5">Class 5</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="HSC 1st Year">HSC 1st Year</option>
                      <option value="HSC 2nd Year">HSC 2nd Year</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" /> Student Group
                    </label>
                    <select
                      value={linkedGroup}
                      onChange={(e) => setLinkedGroup(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none transition-all"
                    >
                      <option value="All">All Groups</option>
                      <option value="Science">Science</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Arts">Arts</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                {/* Action Submit */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`w-full py-2.5 rounded-lg bg-${accent}-500 hover:bg-${accent}-600 disabled:opacity-40 text-slate-950 text-xs font-semibold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving to Storage ({uploadProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Upload & Link Document</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Files Browser (Right Column on large screen) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            {/* Search and Filters Header */}
            <div className="flex flex-col gap-3 pb-4 border-b border-slate-800/60 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file name, description..."
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 outline-none transition-all"
                />
              </div>

              {/* Filtering Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-widest mr-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
                </div>
                
                {/* Class select */}
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none cursor-pointer"
                >
                  <option value="All">All Classes</option>
                  <option value="Class 5">Class 5</option>
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="HSC 1st Year">HSC 1st Year</option>
                  <option value="HSC 2nd Year">HSC 2nd Year</option>
                </select>

                {/* Group select */}
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none cursor-pointer"
                >
                  <option value="All">All Groups</option>
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Arts">Arts</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* List/Grid of Uploaded Files */}
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                <File className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-xs font-semibold text-slate-400">No documents found</p>
                <p className="text-[10px] text-slate-500 mt-1">Upload files on the left to start syncing documents.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 bg-slate-950/40 border border-slate-800 hover:border-slate-700/60 rounded-xl transition-all flex items-start md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start md:items-center gap-3.5 min-w-0">
                      {getFileIcon(file.type)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-slate-100 transition-colors">
                            {file.name}
                          </h4>
                          <span className="text-[9px] font-mono shrink-0 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                        {file.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {file.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                          <span className="flex items-center gap-1 bg-slate-900/60 py-0.5 px-1.5 rounded">
                            <Clock className="w-3 h-3 text-slate-600" />
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                          {file.linkedClass !== 'All' && (
                            <span className="text-emerald-400 shrink-0 bg-emerald-500/5 px-1 py-0.5 rounded border border-emerald-500/10">
                              {file.linkedClass}
                            </span>
                          )}
                          {file.linkedGroup !== 'All' && (
                            <span className="text-indigo-400 shrink-0 bg-indigo-500/5 px-1 py-0.5 rounded border border-indigo-500/10">
                              {file.linkedGroup}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCopyLink(file.url)}
                        title="Copy Public Link"
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        title="View / Download File"
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {deleteConfirmId === file.id ? (
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-rose-500/30 animate-pulse">
                          <button
                            onClick={() => {
                              deleteUploadedFile(file.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-slate-100 text-[10px] font-bold rounded-md transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-md transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(file.id)}
                          title="Delete Document"
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
