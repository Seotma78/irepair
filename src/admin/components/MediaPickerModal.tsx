import React, { useState, useEffect } from 'react';
import { X, Search, Upload, Check, Image as ImageIcon } from 'lucide-react';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, altText?: string) => void;
  multiple?: boolean;
  onSelectMultiple?: (items: Array<{ url: string; altText?: string }>) => void;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  onSelectMultiple,
}) => {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?search=${encodeURIComponent(search)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMediaList(data);
      }
    } catch (e) {
      console.error('Failed to fetch media:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen, search]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('altText', file.name);

    try {
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await fetchMedia();
        if (data.media?.url) {
          onSelect(data.media.url, data.media.alt_text);
          onClose();
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const selectedItem = mediaList.find((m) => m.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Select Image from Media Library</h3>
            <p className="text-xs text-slate-500">Choose an existing asset or upload a new image</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images by name or alt..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
            />
          </div>

          <label className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload New Image'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">Loading media...</div>
          ) : mediaList.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No media files found</p>
              <p className="text-xs text-slate-400">Upload your first image to populate the library.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mediaList.map((item) => {
                const isSelected = multiple
                  ? selectedIds.includes(item.id)
                  : selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (multiple) {
                        setSelectedIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        );
                      } else {
                        setSelectedId(item.id);
                      }
                    }}
                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#DF0C88] ring-2 ring-[#DF0C88]/20'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.alt_text}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#DF0C88] text-white flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-1.5 text-white text-[10px] truncate">
                      {item.original_name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {multiple ? (
              <span>{selectedIds.length} image(s) selected</span>
            ) : selectedItem ? (
              `Selected: ${selectedItem.original_name}`
            ) : (
              'Click an image to select'
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            {multiple ? (
              <button
                disabled={selectedIds.length === 0}
                onClick={() => {
                  const selectedItems = mediaList
                    .filter((m) => selectedIds.includes(m.id))
                    .map((m) => ({ url: m.url, altText: m.alt_text || m.original_name }));
                  if (onSelectMultiple) {
                    onSelectMultiple(selectedItems);
                  }
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Add {selectedIds.length} Selected Images
              </button>
            ) : (
              <button
                disabled={!selectedItem}
                onClick={() => {
                  if (selectedItem) {
                    onSelect(selectedItem.url, selectedItem.alt_text);
                    onClose();
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Choose Image
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
