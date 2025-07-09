import React, { useRef, useState } from 'react';

interface StepUploadProps {
  onUploadComplete: (files: File[]) => void;
}

const MAX_FILES = 5;

const StepUpload: React.FC<StepUploadProps> = ({ onUploadComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList).slice(0, MAX_FILES);
    setFiles(arr);
    onUploadComplete(arr);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Click to open file dialog
  const handleClick = () => {
    inputRef.current?.click();
  };

  // File input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Remove a file
  const removeFile = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    onUploadComplete(newFiles);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: dragActive ? '2px solid #647dee' : '2px dashed #b3b8c5',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          color: '#7f53ac',
          background: dragActive ? '#e0e7ef' : '#f8f9fc',
          marginBottom: 16,
          cursor: 'pointer',
          transition: 'border 0.2s, background 0.2s',
        }}
      >
        <i className="fa fa-cloud-upload-alt fa-2x" style={{ marginBottom: 8 }}></i>
        <div style={{ fontWeight: 500, marginTop: 8 }}>Drag & drop gambar di sini atau klik untuk memilih (max 5)</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
      {/* Image previews */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {files.map((file, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            <img
              src={URL.createObjectURL(file)}
              alt={`preview-${idx}`}
              style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', border: '2px solid #e3e8ee', boxShadow: '0 1px 4px rgba(100,125,222,0.08)' }}
            />
            <button
              onClick={() => removeFile(idx)}
              style={{ position: 'absolute', top: -8, right: -8, background: '#fff', border: '1px solid #ccc', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
              aria-label="Remove"
            >
              <i className="fa fa-times" style={{ color: '#d32f2f', fontSize: 14 }}></i>
            </button>
          </div>
        ))}
      </div>
      {/* Placeholder for OCR progress/status */}
      {/* <div style={{ marginTop: 12 }}><progress value={0} max={100} /></div> */}
    </div>
  );
};

export default StepUpload; 