import React from 'react';
import { ProcessingOptions, OcrState } from '../types';
import { Spinner } from './Icons';

interface ControlPanelProps {
  options: ProcessingOptions;
  setOptions: React.Dispatch<React.SetStateAction<ProcessingOptions>>;
  ocrState: OcrState;
  onProcess: () => void;
  hasImage: boolean;
}

const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: (val: boolean) => void; label: string; description?: string }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex flex-col pr-4">
       <span className="text-sm font-medium text-gray-700">{label}</span>
       {description && <span className="text-xs text-gray-500">{description}</span>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${
        checked ? 'bg-accent' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);

const ControlPanel: React.FC<ControlPanelProps> = ({
  options,
  setOptions,
  ocrState,
  onProcess,
  hasImage,
}) => {
  const handleChange = (key: keyof ProcessingOptions, value: any) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const hasContent = hasImage || options.customInstruction.trim().length > 0;
  const isKeepAllDecimals = options.decimalPlaces === -1;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
        
        {/* Custom Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Extraction Instructions / Raw Data
          </label>
          <textarea
            value={options.customInstruction}
            onChange={(e) => handleChange('customInstruction', e.target.value)}
            placeholder="e.g. Only extract the 'Balance Sheet'... OR paste a list of numbers (e.g. 41,811,598.99, 134,832...) to convert them into a table directly."
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm text-gray-700 resize-none h-32"
          />
          <p className="text-xs text-gray-500 mt-2">
            Specify what to extract from images, or paste raw data here to format it.
          </p>
        </div>

        {/* Unit Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit Conversion
          </label>
          <select
            value={options.multiplier}
            onChange={(e) => handleChange('multiplier', parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm text-gray-700"
          >
            <option value={1}>No Conversion (Original)</option>
            <optgroup label="Scale Down (Display large numbers as small units)">
              <option value={0.001}>Convert to Thousands (x 0.001)</option>
              <option value={0.000001}>Convert to Millions (x 10⁻⁶)</option>
              <option value={0.000000001}>Convert to Billions (x 10⁻⁹)</option>
            </optgroup>
            <optgroup label="Scale Up (Restore full numbers)">
              <option value={1000}>From Thousands to Ones (x 1,000)</option>
              <option value={1000000}>From Millions to Ones (x 1,000,000)</option>
              <option value={1000000000}>From Billions to Ones (x 10⁹)</option>
            </optgroup>
          </select>
        </div>

        {/* Formatting Switches */}
        <div className="space-y-1 border-t border-gray-100 pt-4">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Formatting Options
          </label>

          <Toggle 
            label="Force Negative Numbers"
            description="Convert all numerical values to negative."
            checked={options.forceNegative}
            onChange={(val) => handleChange('forceNegative', val)}
          />

          <Toggle 
            label="Title Case Text"
            description="Capitalize words (except 'of', 'and', etc)."
            checked={options.titleCase}
            onChange={(val) => handleChange('titleCase', val)}
          />

          <Toggle 
            label="Keep All Decimal Places"
            description="Show full precision without rounding."
            checked={isKeepAllDecimals}
            onChange={(val) => handleChange('decimalPlaces', val ? -1 : 2)}
          />

          {/* Conditional Decimal Selector */}
          <div className={`transition-all duration-300 overflow-hidden ${isKeepAllDecimals ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'}`}>
            <div className="flex items-center justify-between py-2 pl-2">
              <span className="text-sm text-gray-600">Decimal Places</span>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleChange('decimalPlaces', Math.max(0, options.decimalPlaces - 1))}
                  className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 border border-gray-300 text-gray-600 font-bold w-10"
                >-</button>
                <span className="w-12 text-center font-medium bg-gray-50 py-1 rounded border border-gray-200">
                  {options.decimalPlaces === -1 ? '-' : options.decimalPlaces}
                </span>
                <button 
                  onClick={() => handleChange('decimalPlaces', options.decimalPlaces + 1)}
                  className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 border border-gray-300 text-gray-600 font-bold w-10"
                >+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onProcess}
        disabled={!hasContent || ocrState.isLoading}
        className={`w-full py-3 px-4 rounded-xl shadow-md text-white font-semibold transition-all flex items-center justify-center
          ${
            !hasContent || ocrState.isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-accent hover:bg-blue-600 hover:shadow-lg active:scale-[0.98]'
          }`}
      >
        {ocrState.isLoading ? (
          <>
            <Spinner />
            Processing...
          </>
        ) : (
          hasImage ? 'Identify & Extract from Images' : 'Format Raw Data'
        )}
      </button>

      {ocrState.error && (
        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 break-words">
          <strong>Error:</strong> {ocrState.error}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;