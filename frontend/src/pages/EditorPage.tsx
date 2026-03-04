// src/pages/EditorPage.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface Block {
  id: string;
  selector: string;
  tagName: string;
  className: string;
  textContent: string;
  type: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
  };
  styles: {
    backgroundColor: string;
    color: string;
    fontSize: string;
    display: string;
    position: string;
    zIndex: string;
  };
  visible: boolean;
  order: number;
}

interface EditorData {
  url: string;
  pageTitle: string;
  blocks: Block[];
  screenshot: string;
  metadata: {
    totalBlocks: number;
    blocksByType: Record<string, number>;
    timestamp: string;
  };
}

const EditorPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [history, setHistory] = useState<Block[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [exporting, setExporting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Load URL và detect blocks
  const handleLoadUrl = async () => {
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5001/api/editor/load-url', {
        url: url
      });

      console.log('Response data:', response.data);
      console.log('Blocks count:', response.data.blocks?.length);

      if (!response.data.blocks || response.data.blocks.length === 0) {
        alert('No blocks detected. Please check the URL or backend logs.');
        return;
      }

      setEditorData(response.data);
      setHistory([response.data.blocks]);
      setHistoryIndex(0);
      setPreviewImage(`data:image/jpeg;base64,${response.data.screenshot}`);
      console.log('✅ Loaded', response.data.blocks.length, 'blocks');
    } catch (error: any) {
      console.error('Error loading URL:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to load URL: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Update preview với blocks đã edit
  const updatePreview = async (blocks: Block[]) => {
    if (!editorData) return;

    setPreviewLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5001/api/editor/preview',
        {
          url: editorData.url,
          blocks: blocks
        },
        {
          responseType: 'blob'
        }
      );

      const imageUrl = URL.createObjectURL(response.data);
      setPreviewImage(imageUrl);
      console.log('✅ Preview updated');
    } catch (error: any) {
      console.error('Error updating preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    if (multiSelectMode) {
      setSelectedBlocks(new Set());
    }
  };

  // Toggle block selection (in multi-select mode)
  const toggleBlockSelection = (blockId: string) => {
    const newSelected = new Set(selectedBlocks);
    if (newSelected.has(blockId)) {
      newSelected.delete(blockId);
    } else {
      newSelected.add(blockId);
    }
    setSelectedBlocks(newSelected);
  };

  // Select all blocks
  const selectAllBlocks = () => {
    if (!editorData) return;
    const allBlockIds = new Set(editorData.blocks.map(b => b.id));
    setSelectedBlocks(allBlockIds);
  };

  // Deselect all blocks
  const deselectAllBlocks = () => {
    setSelectedBlocks(new Set());
  };

  // Hide selected blocks
  const hideSelectedBlocks = async () => {
    if (!editorData || selectedBlocks.size === 0) return;

    const newBlocks = editorData.blocks.map(block =>
      selectedBlocks.has(block.id) ? { ...block, visible: false } : block
    );

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBlocks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setEditorData({ ...editorData, blocks: newBlocks });
    setSelectedBlocks(new Set());

    await updatePreview(newBlocks);
  };

  // Show selected blocks
  const showSelectedBlocks = async () => {
    if (!editorData || selectedBlocks.size === 0) return;

    const newBlocks = editorData.blocks.map(block =>
      selectedBlocks.has(block.id) ? { ...block, visible: true } : block
    );

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBlocks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setEditorData({ ...editorData, blocks: newBlocks });
    setSelectedBlocks(new Set());

    await updatePreview(newBlocks);
  };

  // Delete selected blocks (hide them)
  const deleteSelectedBlocks = async () => {
    await hideSelectedBlocks();
  };

  // Toggle block visibility (single)
  const toggleBlock = async (blockId: string) => {
    if (!editorData) return;

    const newBlocks = editorData.blocks.map(block =>
      block.id === blockId ? { ...block, visible: !block.visible } : block
    );

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBlocks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setEditorData({ ...editorData, blocks: newBlocks });

    await updatePreview(newBlocks);
  };

  // Delete block (single)
  const deleteBlock = async (blockId: string) => {
    if (!editorData) return;
    await toggleBlock(blockId);
  };

  // Handle block click
  const handleBlockClick = (blockId: string) => {
    if (multiSelectMode) {
      toggleBlockSelection(blockId);
    } else {
      setSelectedBlock(blockId);
    }
  };

  // Undo
  const handleUndo = async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newBlocks = history[newIndex];
      setEditorData({ ...editorData!, blocks: newBlocks });
      await updatePreview(newBlocks);
    }
  };

  // Redo
  const handleRedo = async () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newBlocks = history[newIndex];
      setEditorData({ ...editorData!, blocks: newBlocks });
      await updatePreview(newBlocks);
    }
  };

  // Refresh preview manually
  const handleRefreshPreview = async () => {
    if (!editorData) return;
    await updatePreview(editorData.blocks);
  };

  // Export to PDF
  const handleExportPdf = async () => {
    if (!editorData) return;

    setExporting(true);
    try {
      const response = await axios.post(
        'http://localhost:5001/api/editor/export-pdf',
        {
          url: editorData.url,
          blocks: editorData.blocks,
          filename: 'edited-document.pdf',
          options: {
            format: 'A4',
            scale: 0.8
          }
        },
        {
          responseType: 'blob'
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'edited-document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log('✅ PDF exported successfully');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF: ' + (error.response?.data?.message || error.message));
    } finally {
      setExporting(false);
    }
  };

  const getBlockTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      header: 'bg-blue-100 text-blue-800',
      navigation: 'bg-green-100 text-green-800',
      footer: 'bg-gray-100 text-gray-800',
      sidebar: 'bg-yellow-100 text-yellow-800',
      advertisement: 'bg-red-100 text-red-800',
      modal: 'bg-purple-100 text-purple-800',
      'main-content': 'bg-indigo-100 text-indigo-800',
      section: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-600'
    };
    return colors[type] || colors.other;
  };

  const visibleBlocksCount = editorData?.blocks?.filter(b => b.visible).length || 0;
  const totalBlocksCount = editorData?.blocks?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* URL Input Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Enter URL to Edit</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleLoadUrl()}
            />
            <button
              onClick={handleLoadUrl}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : (
                '🔍 Load & Analyze'
              )}
            </button>
          </div>
        </div>

        {/* Editor Interface */}
        {editorData && editorData.blocks && editorData.blocks.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Blocks List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm">
                {/* Toolbar */}
                <div className="border-b p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Blocks ({totalBlocksCount})</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0 || previewLoading}
                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg"
                        title="Undo"
                      >
                        ↶
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1 || previewLoading}
                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg"
                        title="Redo"
                      >
                        ↷
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {visibleBlocksCount} / {totalBlocksCount} blocks visible
                  </div>

                  {/* Multi-select controls */}
                  <div className="space-y-2">
                    <button
                      onClick={toggleMultiSelectMode}
                      className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                        multiSelectMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {multiSelectMode ? '✅ Multi-Select Mode' : '☑️ Enable Multi-Select'}
                    </button>

                    {multiSelectMode && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllBlocks}
                            className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                          >
                            Select All
                          </button>
                          <button
                            onClick={deselectAllBlocks}
                            className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                          >
                            Clear
                          </button>
                        </div>

                        {selectedBlocks.size > 0 && (
                          <div className="flex gap-2">
                            <button
                              onClick={hideSelectedBlocks}
                              disabled={previewLoading}
                              className="flex-1 px-3 py-2 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200 disabled:opacity-50"
                            >
                              👁️‍🗨️ Hide ({selectedBlocks.size})
                            </button>
                            <button
                              onClick={showSelectedBlocks}
                              disabled={previewLoading}
                              className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50"
                            >
                              👁️ Show ({selectedBlocks.size})
                            </button>
                            <button
                              onClick={deleteSelectedBlocks}
                              disabled={previewLoading}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:opacity-50"
                            >
                              🗑️
                            </button>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 text-center">
                          {selectedBlocks.size} block{selectedBlocks.size !== 1 ? 's' : ''} selected
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Blocks List */}
                <div className="overflow-y-auto max-h-[600px]">
                  {editorData.blocks.map((block) => (
                    <div
                      key={block.id}
                      className={`border-b p-3 cursor-pointer transition-colors ${
                        !block.visible ? 'opacity-40' : ''
                      } ${
                        multiSelectMode && selectedBlocks.has(block.id)
                          ? 'bg-blue-100 border-l-4 border-l-blue-500'
                          : selectedBlock === block.id && !multiSelectMode
                          ? 'bg-blue-50 border-l-4 border-l-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleBlockClick(block.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {multiSelectMode && (
                            <div className="mb-2">
                              <input
                                type="checkbox"
                                checked={selectedBlocks.has(block.id)}
                                onChange={() => toggleBlockSelection(block.id)}
                                className="w-4 h-4 text-blue-600 rounded"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${getBlockTypeColor(block.type)}`}>
                              {block.type}
                            </span>
                            <span className="text-xs text-gray-500">{block.tagName}</span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {block.selector}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {block.textContent || 'No text content'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {block.bounds.width}×{block.bounds.height}px
                          </div>
                        </div>

                        {!multiSelectMode && (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBlock(block.id);
                              }}
                              disabled={previewLoading}
                              className={`p-1.5 rounded text-sm ${
                                block.visible
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={block.visible ? 'Hide' : 'Show'}
                            >
                              {block.visible ? '👁️' : '👁️‍🗨️'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBlock(block.id);
                              }}
                              disabled={previewLoading}
                              className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Export Button */}
                <div className="border-t p-4">
                  <button
                    onClick={handleExportPdf}
                    disabled={exporting}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {exporting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Exporting...
                      </div>
                    ) : (
                      '📄 Export to PDF'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">Live Preview</h3>
                    {previewLoading && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRefreshPreview}
                      disabled={previewLoading}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh preview"
                    >
                      🔄 Refresh
                    </button>
                    <div className="text-sm text-gray-600">{editorData.pageTitle}</div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden bg-gray-100 relative">
                  {previewImage && (
                    <img
                      src={previewImage}
                      alt="Page preview"
                      className={`w-full h-auto transition-opacity duration-300 ${
                        previewLoading ? 'opacity-50' : 'opacity-100'
                      }`}
                    />
                  )}
                  {previewLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-sm text-gray-700 font-medium">Updating preview...</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Block Info */}
                {selectedBlock && !multiSelectMode && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2">Selected Block Info</h4>
                    {(() => {
                      const block = editorData.blocks.find(b => b.id === selectedBlock);
                      if (!block) return null;
                      return (
                        <div className="text-sm space-y-1">
                          <div><span className="font-medium">Type:</span> {block.type}</div>
                          <div><span className="font-medium">Tag:</span> {block.tagName}</div>
                          <div><span className="font-medium">Selector:</span> {block.selector}</div>
                          <div><span className="font-medium">Size:</span> {block.bounds.width}×{block.bounds.height}px</div>
                          <div><span className="font-medium">Position:</span> ({block.bounds.x}, {block.bounds.y})</div>
                          <div><span className="font-medium">Visible:</span> {block.visible ? '✅' : '❌'}</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!editorData && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Welcome to PDF Block Editor
            </h3>
            <p className="text-gray-600">
              Enter a URL above to start editing blocks and export to PDF
            </p>
          </div>
        )}

        {/* No Blocks Found */}
        {editorData && (!editorData.blocks || editorData.blocks.length === 0) && (
          <div className="text-center py-20 bg-white rounded-lg">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Blocks Detected
            </h3>
            <p className="text-gray-600 mb-4">
              The page loaded but no editable blocks were found.
            </p>
            <button
              onClick={() => {
                setEditorData(null);
                setUrl('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Another URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPage;