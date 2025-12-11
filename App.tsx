import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import ControlPanel from './components/ControlPanel';
import ResultsView from './components/ResultsView';
import { processImages, ImageInput } from './services/geminiService';
import { ExtractedData, ProcessingOptions, OcrState } from './types';

const App: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [options, setOptions] = useState<ProcessingOptions>({
    multiplier: 1,
    decimalPlaces: 2,
    customInstruction: '',
    forceNegative: false,
    titleCase: false,
  });

  const [ocrState, setOcrState] = useState<OcrState>({
    isLoading: false,
    data: null,
    error: null,
  });

  const handleImagesSelected = useCallback((files: File[]) => {
    // Append new files to existing ones
    setSelectedImages(prev => [...prev, ...files]);
    // Reset data when new image is added if desired, or keep it until processed again
    // For clarity, we'll reset if results are showing to avoid stale data mismatch
    if (ocrState.data) {
       setOcrState(prev => ({ ...prev, data: null, error: null }));
    }
  }, [ocrState.data]);

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setOcrState(prev => ({ ...prev, data: null, error: null }));
  };

  const handleClearAll = () => {
    setSelectedImages([]);
    setOcrState(prev => ({ ...prev, data: null, error: null }));
  };

  const handleProcess = async () => {
    // Allow processing if images exist OR if there is text in custom instructions
    if (selectedImages.length === 0 && !options.customInstruction.trim()) return;

    setOcrState({ isLoading: true, data: null, error: null });

    try {
      const imageInputs: ImageInput[] = [];

      // Read all files if any
      for (const file of selectedImages) {
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = () => {
             const base64String = reader.result as string;
             const base64Content = base64String.split(',')[1];
             imageInputs.push({
               base64: base64Content,
               mimeType: file.type
             });
             resolve();
          };
          reader.onerror = reject;
        });
      }

      const result: ExtractedData = await processImages(imageInputs, options.customInstruction);
      setOcrState({
        isLoading: false,
        data: result,
        error: null,
      });

    } catch (e: any) {
      console.error(e);
      setOcrState({
        isLoading: false,
        data: null,
        error: e.message || "An unexpected error occurred while processing.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="bg-accent h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-lg">R</div>
             <h1 className="text-xl font-bold text-slate-900 tracking-tight">ReportOCR Pro</h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">
            AI-Powered Financial Data Extraction
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload & Controls */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-sm uppercase tracking-wide text-gray-500 font-semibold">1. Upload Screenshots</h2>
                 <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{selectedImages.length} files</span>
              </div>
              <ImageUploader 
                onImagesSelected={handleImagesSelected} 
                selectedImages={selectedImages}
                onRemoveImage={handleRemoveImage}
                onClearAll={handleClearAll}
              />
            </section>

            <section>
               <h2 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-4 px-1">2. Settings & Process</h2>
               <ControlPanel 
                  options={options} 
                  setOptions={setOptions} 
                  ocrState={ocrState}
                  onProcess={handleProcess}
                  hasImage={selectedImages.length > 0}
               />
            </section>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            <section className="h-full flex flex-col">
               <h2 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-4 px-1">3. Extracted Data</h2>
               
               {ocrState.data ? (
                 <div className="flex-grow">
                   <ResultsView data={ocrState.data} options={options} />
                 </div>
               ) : (
                 <div className="flex-grow bg-white border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-12 text-center h-[500px]">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No data extracted yet</h3>
                    <p className="text-gray-500 mt-2 max-w-sm">
                      Upload screenshots of financial tables or paste numbers into the "Settings & Process" box to generate a table.
                    </p>
                 </div>
               )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;