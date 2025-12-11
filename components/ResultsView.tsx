import React, { useState, useEffect } from 'react';
import { ExtractedData, ProcessingOptions, ViewMode, TableData } from '../types';
import { TableIcon, ListIcon, CopyIcon, CheckIcon } from './Icons';

interface ResultsViewProps {
  data: ExtractedData;
  options: ProcessingOptions;
}

// Helper for Title Casing
const toTitleCase = (str: string) => {
  // Common function words to keep lowercase unless they are the first word
  const minorWords = new Set(['of', 'and', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'a', 'an', 'the', 'or', 'nor']);
  
  return str.split(' ').map((word, index) => {
    const lower = word.toLowerCase();
    // If it's a minor word and not the first word, keep it lower
    if (index > 0 && minorWords.has(lower)) {
        return lower;
    }
    // Otherwise capitalize first letter, lower the rest (normalizes ALL CAPS headers)
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

const ResultsView: React.FC<ResultsViewProps> = ({ data, options }) => {
  const [activeTableIndex, setActiveTableIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.TABLE);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);

  // Reset selection and active table when data changes
  useEffect(() => {
    setActiveTableIndex(0);
    setSelectedCells(new Set());
  }, [data]);

  // Reset selection when switching tables
  useEffect(() => {
    setSelectedCells(new Set());
  }, [activeTableIndex]);

  const activeTable: TableData | undefined = data.tables[activeTableIndex];

  // Helper to fix floating point errors (e.g., 0.8456260999999999 -> 0.8456261)
  const cleanFloat = (num: number): number => {
    // Round to 10 decimal places to eliminate tiny epsilon errors from float math
    return Math.round(num * 10000000000) / 10000000000;
  };

  const getFormattedValue = (val: string | number, returnNumber: boolean = false): string | number => {
    let numVal: number;
    let isNum = false;

    // Try to parse input
    if (typeof val === 'number') {
      numVal = val;
      isNum = true;
    } else {
      // Convert to string and trim
      let cleaned = String(val).trim();
      let isNegative = false;

      // Check for accounting format: (123,456.78)
      if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        isNegative = true;
        cleaned = cleaned.slice(1, -1).trim();
      }

      // Remove commas
      cleaned = cleaned.replace(/,/g, '');

      // Check if valid number
      if (cleaned === '' || isNaN(Number(cleaned))) {
        // Not a number, check if we need to apply Title Case
        if (options.titleCase && typeof val === 'string') {
           return toTitleCase(val);
        }
        return val; // Return original string if not a number and no title case
      }
      
      numVal = Number(cleaned);
      if (isNegative) {
        numVal = -numVal;
      }
      isNum = true;
    }

    if (!isNum) return val;

    // Apply multiplier
    let converted = cleanFloat(numVal * options.multiplier);

    // Apply Force Negative
    if (options.forceNegative && converted !== 0) {
      converted = -Math.abs(converted);
    }

    if (returnNumber) return converted;

    // Formatting Logic
    if (options.decimalPlaces === -1) {
      // Keep all decimals, but add thousands separators
      return converted.toLocaleString(undefined, { maximumFractionDigits: 20 });
    } else {
      // Specific decimal places
      return converted.toLocaleString(undefined, {
        minimumFractionDigits: options.decimalPlaces,
        maximumFractionDigits: options.decimalPlaces,
      });
    }
  };

  const formatValue = (val: string | number) => getFormattedValue(val) as string;

  const formatHeader = (header: string) => {
    if (options.titleCase) {
      return toTitleCase(header);
    }
    return header;
  };

  const handleCopy = (text: string, id?: string) => {
    const cleanText = text.replace(/,/g, '');
    navigator.clipboard.writeText(cleanText).then(() => {
      if (id) {
        setCopiedCellId(id);
        setTimeout(() => setCopiedCellId(null), 1500);
      } else {
        alert("Copied to clipboard!");
      }
    });
  };

  const toggleCellSelection = (rowIdx: number, colIdx: number, val: string) => {
    const id = `${rowIdx}-${colIdx}`;
    const newSet = new Set(selectedCells);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCells(newSet);
  };

  const handleCopySelected = () => {
    if (!activeTable) return;
    
    // Sort selected cells by row then column to maintain order
    const sortedIds = Array.from(selectedCells).sort((a: string, b: string) => {
      const [rA, cA] = a.split('-').map(Number);
      const [rB, cB] = b.split('-').map(Number);
      if (rA !== rB) return rA - rB;
      return cA - cB;
    });

    const values = sortedIds.map((id: string) => {
      const [r, c] = id.split('-').map(Number);
      const header = activeTable.headers[c];
      const rawVal = activeTable.rows[r][header];
      return String(getFormattedValue(rawVal)).replace(/,/g, '');
    });

    navigator.clipboard.writeText(values.join('\n')).then(() => {
        alert(`Copied ${values.length} values to clipboard.`);
        setSelectedCells(new Set()); // Optional: clear selection after copy
    });
  };

  const handleCopyTable = () => {
    if (!activeTable) return;

    // Create TSV string
    const headersToExport = activeTable.headers.map(h => formatHeader(h));
    const headerRow = headersToExport.join('\t');
    const bodyRows = activeTable.rows.map(row => 
      activeTable.headers.map(header => {
         // We use the raw header key to lookup data, but formatting is applied in getFormattedValue
         const val = String(getFormattedValue(row[header])).replace(/,/g, '');
         return val;
      }).join('\t')
    ).join('\n');
    
    navigator.clipboard.writeText(`${headerRow}\n${bodyRows}`).then(() => {
      alert("Full table copied to clipboard!");
    });
  };

  if (!activeTable) {
    return <div className="p-4 text-center text-gray-500">No tables found.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Table Tabs if multiple */}
      {data.tables.length > 1 && (
        <div className="flex overflow-x-auto border-b border-gray-200 bg-slate-100 px-2 pt-2 gap-2 hide-scrollbar">
          {data.tables.map((table, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTableIndex(idx)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r whitespace-nowrap transition-colors relative top-[1px]
                ${activeTableIndex === idx 
                  ? 'bg-white text-blue-600 border-gray-200 border-b-white z-10' 
                  : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200 hover:text-gray-700'}`}
            >
              <div className="flex items-center space-x-2">
                 <span>{table.title || `Table ${idx + 1}`}</span>
                 <span className={`text-[10px] px-1.5 rounded-full ${activeTableIndex === idx ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                   {idx + 1}
                 </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Header / Toolbar */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
        <div>
           {/* Main Title Area */}
           <div className="flex items-center gap-2">
             <h2 className="text-lg font-bold text-gray-800 leading-tight">
               {activeTable.title || (data.tables.length > 1 ? `Table ${activeTableIndex + 1}` : 'Extracted Data')}
             </h2>
             {data.tables.length > 1 && (
               <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                  {activeTableIndex + 1}/{data.tables.length}
               </span>
             )}
           </div>
           
           {activeTable.summary && <p className="text-sm text-gray-500 mt-1">{activeTable.summary}</p>}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
          {selectedCells.size > 0 && (
             <button
                onClick={handleCopySelected}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
             >
               <CopyIcon />
               <span>Copy Selected ({selectedCells.size})</span>
             </button>
          )}

          <button
             onClick={handleCopyTable}
             className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
             <CopyIcon />
             <span>Copy Table</span>
          </button>

          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => setViewMode(ViewMode.TABLE)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === ViewMode.TABLE
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TableIcon />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode(ViewMode.LIST)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === ViewMode.LIST
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListIcon />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="overflow-auto flex-grow p-4 min-h-[300px]">
        {viewMode === ViewMode.TABLE ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {activeTable.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="p-3 border-b-2 border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {formatHeader(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeTable.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                    {activeTable.headers.map((header, colIdx) => {
                      const cellId = `${rowIdx}-${colIdx}`;
                      const formattedVal = formatValue(row[header]);
                      const isSelected = selectedCells.has(cellId);
                      
                      return (
                        <td 
                          key={cellId} 
                          onClick={() => toggleCellSelection(rowIdx, colIdx, formattedVal)}
                          className={`p-3 text-sm whitespace-nowrap relative group cursor-pointer select-none transition-colors border border-transparent
                            ${isSelected ? 'bg-blue-100 text-blue-900 border-blue-200' : 'text-gray-700 hover:border-gray-200'}
                          `}
                        >
                          <div className="flex items-center justify-between gap-4">
                             <span>{formattedVal}</span>
                             
                             {/* Hover Copy Button */}
                             <button
                               onClick={(e) => {
                                 e.stopPropagation(); // Prevent selection toggle
                                 handleCopy(formattedVal, cellId);
                               }}
                               className={`p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100
                                 ${copiedCellId === cellId ? 'bg-green-100 text-green-600 opacity-100' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}
                               `}
                               title="Copy value"
                             >
                               {copiedCellId === cellId ? <CheckIcon /> : <CopyIcon />}
                             </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {activeTable.rows.map((row, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase">Row {idx + 1}</span>
                </div>
                <div className="space-y-2">
                  {activeTable.headers.map((header) => {
                    const val = formatValue(row[header]);
                    return (
                        <div key={header} className="flex justify-between items-center text-sm group">
                          <span className="font-medium text-gray-500">{formatHeader(header)}:</span>
                          <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-800">{val}</span>
                              <button
                                 onClick={() => handleCopy(val)}
                                 className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                 title="Copy"
                              >
                                <CopyIcon />
                              </button>
                          </div>
                        </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer / Stats */}
      <div className="bg-gray-50 p-2 text-center text-xs text-gray-400 border-t border-gray-100 flex justify-between px-4">
         <span>Extracted {activeTable.rows.length} rows with {activeTable.headers.length} columns</span>
         {selectedCells.size > 0 && <span className="text-blue-600 font-medium">{selectedCells.size} cells selected</span>}
      </div>
    </div>
  );
};

export default ResultsView;