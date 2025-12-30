
import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  label: string;
  fileName?: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading, label, fileName }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[0.98]' 
            : fileName 
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-500'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept=".xlsx, .xls, .csv"
        />

        {isLoading ? (
          <div className="flex flex-col items-center py-2">
            <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Leyendo...</p>
          </div>
        ) : (
          <>
            {fileName ? (
               <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 py-1">
                  <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1.5 rounded-lg">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">{label}</span>
                    <span className="font-bold text-xs truncate max-w-[140px] leading-none">{fileName}</span>
                  </div>
               </div>
            ) : (
              <div className="text-center py-1">
                <p className="font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Arrastrar archivo</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
