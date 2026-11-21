import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink,
  Edit2
} from 'lucide-react';

export const MediaLibraryView: React.FC = () => {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } catch (e) {
      console.error('Failed to load media:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [search]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('altText', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
        body: formData,
      });

      if (res.ok) {
        await fetchMedia();
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setDeleteConfirmOpen(false);
        if (selectedItem?.id === id) setSelectedItem(null);
        fetchMedia();
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Media & Asset Library</h1>
          <p className="text-xs text-slate-500 mt-1">Upload, search, and manage high-resolution images for pages and widgets</p>
        </div>

        <label className="px-4 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer self-start transition-all">
          <Upload className="w-4 h-4" />
          <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images by name or alt text..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Files: <span className="font-bold text-slate-900">{media.length}</span>
        </div>
      </div>

      {/* Main Grid + Sidebar Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`space-y-4 ${selectedItem ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {loading ? (
            <div className="text-center py-24 text-slate-400 text-xs">Loading media library...</div>
          ) : media.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No media assets found</p>
              <p className="text-xs text-slate-400">Upload images to reuse them in hero sliders, banners, and store cards.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {media.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all bg-slate-100 shadow-xs ${
                      isSelected
                        ? 'border-[#DF0C88] ring-4 ring-[#DF0C88]/15'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.alt_text}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-2 text-white">
                      <p className="text-[11px] font-bold truncate drop-shadow-sm">{item.original_name}</p>
                      <span className="text-[9px] text-slate-300">
                        {(item.size / 1024).toFixed(0)} KB • {item.mime_type.split('/')[1]?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Media Details Inspector */}
        {selectedItem && (
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 self-start">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Asset Details</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={selectedItem.url} alt={selectedItem.alt_text} className="w-full h-full object-contain" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">Filename</span>
                <span className="font-mono text-slate-800 break-all">{selectedItem.filename}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-bold">Public URL</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={selectedItem.url}
                    className="flex-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                  />
                  <button
                    onClick={() => copyUrl(selectedItem.url, selectedItem.id)}
                    className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-[#DF0C88] cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedId === selectedItem.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-bold">Alt Text</span>
                <span className="text-slate-800">{selectedItem.alt_text || 'None'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                <span>Size: {(selectedItem.size / 1024).toFixed(1)} KB</span>
                <span>Type: {selectedItem.mime_type}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Media Asset</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900 text-center mb-1">Delete Media?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Are you sure you want to permanently delete <span className="font-bold text-slate-800">{selectedItem.original_name || selectedItem.filename}</span>?
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selectedItem.id)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
