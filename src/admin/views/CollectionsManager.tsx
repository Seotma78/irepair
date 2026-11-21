import React, { useState, useEffect } from 'react';
import { 
  Database, 
  HelpCircle, 
  Star, 
  MapPin, 
  Wrench, 
  CheckCircle2, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  X,
  Check,
  RotateCcw,
  Navigation,
  Crosshair,
  ExternalLink,
  Zap,
  Sparkles
} from 'lucide-react';
import { StoreMap } from '../../components/StoreMap';
import { useApp } from '../../context/AppContext';

type CollectionTab = 'faqs' | 'reviews' | 'stores' | 'repair_items' | 'steps';

export const CollectionsManager: React.FC = () => {
  const { refreshStores } = useApp();
  const [activeTab, setActiveTab] = useState<CollectionTab>('faqs');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Edit / Add modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [detectingCoords, setDetectingCoords] = useState(false);
  const [coordError, setCoordError] = useState('');

  // Confirmation Modals (in-app, avoids iframe window.confirm blocking)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name?: string } | null>(null);
  const [clearStoresModalOpen, setClearStoresModalOpen] = useState(false);
  const [resetStoresModalOpen, setResetStoresModalOpen] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cms/collections/${activeTab}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error('Failed to fetch collections:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cms/collections/${activeTab}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setItemToDelete(null);
        fetchItems();
        if (activeTab === 'stores') refreshStores();
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleClearAllStores = async () => {
    try {
      const res = await fetch('/api/admin/cms/collections/stores/clear-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setClearStoresModalOpen(false);
        fetchItems();
        refreshStores();
      }
    } catch (e) {
      console.error('Clear failed:', e);
    }
  };

  const handleResetDefaultStores = async () => {
    try {
      const res = await fetch('/api/admin/cms/collections/stores/reset-defaults', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setResetStoresModalOpen(false);
        fetchItems();
        refreshStores();
      }
    } catch (e) {
      console.error('Reset failed:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingItem?.id || editingItem.id.startsWith('new_');
    const url = isNew
      ? `/api/admin/cms/collections/${activeTab}`
      : `/api/admin/cms/collections/${activeTab}/${editingItem.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const payload = { ...editingItem };
    if (activeTab === 'stores') {
      payload.latitude = parseFloat(payload.latitude) || 0;
      payload.longitude = parseFloat(payload.longitude) || 0;
      payload.is_express_hub = payload.is_express_hub ? 1 : 0;
      if (!payload.map_link && payload.address) {
        payload.map_link = `https://maps.google.com/?q=${encodeURIComponent(payload.address + ' ' + (payload.postcode || ''))}`;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        setEditingItem(null);
        fetchItems();
        if (activeTab === 'stores') refreshStores();
      }
    } catch (err) {
      console.error('Failed to save collection item:', err);
    }
  };

  const openNewItem = () => {
    setCoordError('');
    if (activeTab === 'faqs') {
      setEditingItem({ id: 'new_' + Date.now(), question: '', answer: '', category: 'repairs', is_active: 1, sort_order: items.length });
    } else if (activeTab === 'reviews') {
      setEditingItem({ id: 'new_' + Date.now(), author: '', rating: 5, review_text: '', location: 'Reading Store', date: 'Just now', device_repaired: 'Screen Repair', verified: 1, source: 'Google', approved: 1, sort_order: items.length });
    } else if (activeTab === 'stores') {
      setEditingItem({ 
        id: 'new_' + Date.now(), 
        city: '', 
        name: '', 
        address: '', 
        postcode: '', 
        phone: '+44 771 7103 365', 
        email: 'info@irepair-mobiles.co.uk', 
        is_express_hub: 1, 
        latitude: 51.4552, 
        longitude: -0.9734,
        map_link: '',
        openingHours: { weekdays: '09:00 - 18:00', saturday: '09:00 - 18:00', sunday: '10:30 - 16:30' }, 
        features: ['30-Min Express Repair', 'Walk-in Welcome', 'Screen & Battery Stocked'], 
        sort_order: items.length 
      });
    } else if (activeTab === 'repair_items') {
      setEditingItem({ id: 'new_' + Date.now(), name: '', description: '', base_price: 49, duration_minutes: 30, icon_name: 'Wrench', popular: 0, sort_order: items.length });
    } else if (activeTab === 'steps') {
      setEditingItem({ id: 'new_' + Date.now(), step_number: items.length + 1, title: '', description: '', icon_name: 'CheckCircle2', sort_order: items.length });
    }
    setModalOpen(true);
  };

  const openEditItem = (item: any) => {
    setCoordError('');
    const copy = JSON.parse(JSON.stringify(item));
    if (activeTab === 'stores') {
      if (typeof copy.opening_hours_json === 'string') {
        try { copy.openingHours = JSON.parse(copy.opening_hours_json); } catch (_) {}
      }
      if (!copy.openingHours) {
        copy.openingHours = { weekdays: '09:00 - 18:00', saturday: '09:00 - 18:00', sunday: '10:30 - 16:30' };
      }
      if (typeof copy.features_json === 'string') {
        try { copy.features = JSON.parse(copy.features_json); } catch (_) {}
      }
      if (!Array.isArray(copy.features)) {
        copy.features = ['Express Repair', 'Walk-in Welcome'];
      }
      copy.latitude = Number(copy.latitude) || 51.4552;
      copy.longitude = Number(copy.longitude) || -0.9734;
      copy.is_express_hub = copy.is_express_hub === 1 || copy.isExpressHub ? 1 : 0;
    }
    setEditingItem(copy);
    setModalOpen(true);
  };

  // Auto-detect coordinates via OpenStreetMap Nominatim
  const detectCoordinates = async () => {
    if (!editingItem) return;
    const queryStr = `${editingItem.address || ''} ${editingItem.postcode || ''} ${editingItem.city || ''}, United Kingdom`.trim();
    if (!queryStr || queryStr === ', United Kingdom') {
      setCoordError('Please fill in Address, Postcode, or City first.');
      return;
    }

    setDetectingCoords(true);
    setCoordError('');

    try {
      const url = `/api/maps/geocode?q=${encodeURIComponent(queryStr)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        const { lat, lng } = data.results[0];
        setEditingItem({
          ...editingItem,
          latitude: Number(lat.toFixed(5)),
          longitude: Number(lng.toFixed(5)),
          map_link: editingItem.map_link || `https://maps.google.com/?q=${lat},${lng}`,
        });
      } else {
        setCoordError('Could not pinpoint address automatically. You can click on the map below.');
      }
    } catch (err) {
      setCoordError('Geocoding service unavailable. You can click on the map to set coordinates.');
    } finally {
      setDetectingCoords(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const term = search.toLowerCase();
    return (
      (item.question && item.question.toLowerCase().includes(term)) ||
      (item.author && item.author.toLowerCase().includes(term)) ||
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.city && item.city.toLowerCase().includes(term)) ||
      (item.postcode && item.postcode.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
            Reusable Collections Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage Store Locations & Coordinates, Customer Reviews, FAQs, Repair Issues, and Process Steps
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'stores' && (
            <>
              <button
                onClick={() => setResetStoresModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restore official UK flagships with coordinates"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                onClick={() => setClearStoresModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Delete all existing stores"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Stores</span>
              </button>
            </>
          )}

          <button
            onClick={openNewItem}
            className="px-4 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'stores' ? 'Add New Store' : 'Add New Entry'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'faqs' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>FAQs ({activeTab === 'faqs' ? items.length : '...'})</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'reviews' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Reviews ({activeTab === 'reviews' ? items.length : '...'})</span>
        </button>

        <button
          onClick={() => setActiveTab('stores')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'stores' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Store Branches & Map ({activeTab === 'stores' ? items.length : '...'})</span>
        </button>

        <button
          onClick={() => setActiveTab('repair_items')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'repair_items' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Repair Items ({activeTab === 'repair_items' ? items.length : '...'})</span>
        </button>

        <button
          onClick={() => setActiveTab('steps')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'steps' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Process Steps ({activeTab === 'steps' ? items.length : '...'})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${activeTab.replace('_', ' ')}...`}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
        />
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading collection...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-3">
          <p>No {activeTab.replace('_', ' ')} found.</p>
          {activeTab === 'stores' && (
            <div className="flex justify-center gap-2">
              <button
                onClick={openNewItem}
                className="px-3 py-1.5 bg-[#DF0C88] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add First Store
              </button>
              <button
                onClick={handleResetDefaultStores}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Load Default Stores
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div>
                {activeTab === 'faqs' && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF0C88] px-2 py-0.5 rounded-full bg-pink-50">
                      {item.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{item.question}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.answer }} />
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900">{item.author}</h3>
                      <span className="text-xs text-amber-500 font-bold">★ {item.rating}</span>
                      <span className="text-[11px] text-slate-400">• {item.location}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">"{item.review_text}"</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">Device: {item.device_repaired}</span>
                  </div>
                )}

                {activeTab === 'stores' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{item.name}</h3>
                      <span className="text-[10px] font-bold text-[#DF0C88] uppercase bg-pink-50 px-2 py-0.5 rounded">
                        {item.city}
                      </span>
                      {(item.is_express_hub === 1 || item.isExpressHub) && (
                        <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded">
                          Express Hub
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.address}, <strong>{item.postcode}</strong></span>
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5 flex-wrap">
                      <span>Phone: <strong className="text-slate-600">{item.phone}</strong></span>
                      <span>Email: <strong className="text-slate-600">{item.email}</strong></span>
                      {item.latitude && item.longitude ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          📍 {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-amber-600 text-[11px]">⚠️ No GPS coordinates</span>
                      )}
                      {item.map_link && (
                        <a 
                          href={item.map_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[#DF0C88] hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Directions</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'repair_items' && (
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{item.name}</h3>
                      <span className="text-xs font-black text-slate-900">£{item.base_price}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Estimated duration: {item.duration_minutes} mins</span>
                  </div>
                )}

                {activeTab === 'steps' && (
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Step {item.step_number}: {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openEditItem(item)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                  title="Edit entry & location"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setItemToDelete({ id: item.id, name: item.name || item.question || item.author || 'this entry' })}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Edit or Create item */}
      {modalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-base text-slate-900 font-heading flex items-center gap-2">
                <span>{editingItem.id?.startsWith('new_') ? 'Create New Store / Entry' : 'Edit Store / Entry'}</span>
                {activeTab === 'stores' && (
                  <span className="text-[10px] font-bold text-[#DF0C88] bg-pink-50 px-2 py-0.5 rounded-full">
                    Location & Map Pin Management
                  </span>
                )}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-4">
              {activeTab === 'faqs' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Question</label>
                    <input
                      type="text"
                      required
                      value={editingItem.question || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, question: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={editingItem.category || 'repairs'}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    >
                      <option value="repairs">Repairs</option>
                      <option value="trade-in">Trade-In / Buyback</option>
                      <option value="warranty">Warranty</option>
                      <option value="parts">Parts & Quality</option>
                      <option value="security">Data & Security</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Answer (HTML allowed)</label>
                    <textarea
                      rows={5}
                      required
                      value={editingItem.answer || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, answer: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                    />
                  </div>
                </>
              )}

              {activeTab === 'reviews' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Author Name</label>
                      <input
                        type="text"
                        required
                        value={editingItem.author || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, author: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Rating (1 to 5)</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        value={editingItem.rating || 5}
                        onChange={(e) => setEditingItem({ ...editingItem, rating: parseFloat(e.target.value) })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Review Text</label>
                    <textarea
                      rows={4}
                      required
                      value={editingItem.review_text || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, review_text: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Store / Location</label>
                      <input
                        type="text"
                        value={editingItem.location || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Device Repaired</label>
                      <input
                        type="text"
                        value={editingItem.device_repaired || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, device_repaired: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* STORES LOCATION EDITING */}
              {activeTab === 'stores' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Store Name *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="e.g. iRepair Mobiles - Reading Flagship"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.city || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, city: e.target.value })}
                        placeholder="e.g. Reading"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.address || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                        placeholder="e.g. 49 Broad Street"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">UK Postcode *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.postcode || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, postcode: e.target.value.toUpperCase() })}
                        placeholder="e.g. RG1 2AA"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 uppercase font-mono"
                      />
                    </div>
                  </div>

                  {/* LOCATION MANAGEMENT & INTERACTIVE MINI-MAP */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#DF0C88]" />
                          <span>Map Location & Pin Coordinates</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Click or drag the marker below to set exact coordinates, or click auto-detect.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={detectCoordinates}
                        disabled={detectingCoords}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#DF0C88] text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center shrink-0"
                      >
                        <Crosshair className="w-3 h-3 text-[#DF0C88]" />
                        <span>{detectingCoords ? 'Locating...' : 'Auto-Detect Pin'}</span>
                      </button>
                    </div>

                    {coordError && (
                      <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                        {coordError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={editingItem.latitude !== undefined ? editingItem.latitude : 51.4552}
                          onChange={(e) => setEditingItem({ ...editingItem, latitude: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={editingItem.longitude !== undefined ? editingItem.longitude : -0.9734}
                          onChange={(e) => setEditingItem({ ...editingItem, longitude: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-1.5"
                        />
                      </div>
                    </div>

                    {/* Interactive Leaflet Picker Map */}
                    <div className="pt-1">
                      <StoreMap
                        interactivePicker={true}
                        currentCoords={{
                          lat: editingItem.latitude || 51.4552,
                          lng: editingItem.longitude || -0.9734,
                        }}
                        onCoordsChange={({ lat, lng }) => {
                          setEditingItem((prev: any) => ({
                            ...prev,
                            latitude: lat,
                            longitude: lng,
                            map_link: prev?.map_link || `https://maps.google.com/?q=${lat},${lng}`,
                          }));
                        }}
                        height="200px"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Google Maps / Navigation Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={editingItem.map_link || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, map_link: e.target.value })}
                        placeholder="https://maps.google.com/?q=..."
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Branch Phone</label>
                      <input
                        type="text"
                        value={editingItem.phone || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                        placeholder="+44 7922 446999"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Branch Email</label>
                      <input
                        type="email"
                        value={editingItem.email || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                        placeholder="branch@irepair-mobiles.co.uk"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                  </div>

                  {/* Opening Hours Schedule */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Opening Hours</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold mb-0.5">Mon - Fri:</span>
                        <input
                          type="text"
                          value={editingItem.openingHours?.weekdays || '09:00 - 18:00'}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            openingHours: { ...(editingItem.openingHours || {}), weekdays: e.target.value }
                          })}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold mb-0.5">Saturday:</span>
                        <input
                          type="text"
                          value={editingItem.openingHours?.saturday || '09:00 - 18:00'}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            openingHours: { ...(editingItem.openingHours || {}), saturday: e.target.value }
                          })}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold mb-0.5">Sunday:</span>
                        <input
                          type="text"
                          value={editingItem.openingHours?.sunday || '10:30 - 16:30'}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            openingHours: { ...(editingItem.openingHours || {}), sunday: e.target.value }
                          })}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Express Hub badge & features */}
                  <div className="flex items-center gap-3 pt-1">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingItem.is_express_hub)}
                        onChange={(e) => setEditingItem({ ...editingItem, is_express_hub: e.target.checked ? 1 : 0 })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DF0C88]" />
                      <span className="ml-2.5 text-xs font-bold text-slate-700">
                        Mark as Express Hub (Fast 30-Min Bench)
                      </span>
                    </label>
                  </div>
                </>
              )}

              {activeTab === 'repair_items' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Repair Name</label>
                    <input
                      type="text"
                      required
                      value={editingItem.name || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (£)</label>
                      <input
                        type="number"
                        step={1}
                        value={editingItem.base_price || 49}
                        onChange={(e) => setEditingItem({ ...editingItem, base_price: parseFloat(e.target.value) })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                      <input
                        type="number"
                        value={editingItem.duration_minutes || 30}
                        onChange={(e) => setEditingItem({ ...editingItem, duration_minutes: parseInt(e.target.value, 10) })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'steps' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Step Number</label>
                    <input
                      type="number"
                      value={editingItem.step_number || 1}
                      onChange={(e) => setEditingItem({ ...editingItem, step_number: parseInt(e.target.value, 10) })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Step Title</label>
                    <input
                      type="text"
                      required
                      value={editingItem.title || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Item Confirmation */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900 text-center mb-1">Delete Entry?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Are you sure you want to delete <span className="font-bold text-slate-800">{itemToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(itemToDelete.id)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clear All Stores Confirmation */}
      {clearStoresModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900 text-center mb-1">Clear All Stores?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Are you sure you want to remove ALL store branches? You can add your own stores or click "Reset Defaults" afterwards.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setClearStoresModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllStores}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Default Stores Confirmation */}
      {resetStoresModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-[#DF0C88] flex items-center justify-center mb-4 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900 text-center mb-1">Reset Default Stores?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Reset all store locations to the 8 official UK flagships with full coordinates and store details?
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setResetStoresModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDefaultStores}
                className="flex-1 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
