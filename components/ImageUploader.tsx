import React, { useRef, useState, useEffect } from 'react';
import { UploadIcon, TrashIcon } from './Icons';

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  selectedImages: File[];
  onRemoveImage: (index: number) => void;
  onClearAll: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, selectedImages, onRemoveImage, onClearAll }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files);
        const validImages = files.filter(file => file.type.startsWith('image/'));
        
        if (validImages.length > 0) {
          e.preventDefault();
          onImagesSelected(validImages);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onImagesSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      // Clear value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const processFiles = (files: File[]) => {
    const validImages = files.filter(file => file.type.startsWith('image/'));
    if (validImages.length !== files.length) {
      alert("Some files were skipped because they are not images.");
    }
    if (validImages.length > 0) {
      onImagesSelected(validImages);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full h-40 flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all cursor-pointer group
          ${isDragging ? 'border-accent bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          multiple
        />
        <UploadIcon />
        <p className="text-sm text-gray-600 font-medium text-center">
          Click to upload, drag & drop,<br/> or <span className="text-accent">Paste (Ctrl+V)</span>
        </p>
        <p className="text-xs text-gray-400 mt-2">Support for multiple screenshots</p>
      </div>

      {/* Previews */}
      {selectedImages.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {selectedImages.map((file, idx) => (
              <div key={idx} className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${idx}`}
                  className="w-full h-full object-cover"
                  onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => onRemoveImage(idx)}
                    className="bg-white text-red-600 p-2 rounded-full shadow-lg hover:bg-red-50 transition-colors"
                    title="Remove image"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white truncate">
                  {file.name}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onClearAll}
            className="w-full py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <TrashIcon />
            Clear All Images
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;