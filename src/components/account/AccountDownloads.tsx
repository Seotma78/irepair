import React, { useState, useEffect } from 'react';
import { customerAccountApi } from '../../services/customerAccountApi';
import { 
  Download, 
  FileText, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  ShoppingBag
} from 'lucide-react';

export const AccountDownloads: React.FC = () => {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerAccountApi.getDownloads()
      .then((data) => {
        setDownloads(data.downloads || []);
      })
      .catch(() => {
        setDownloads([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-8 h-8 border-2 border-[#DF0C88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Checking for digital downloads...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-heading">
            Digital Downloads
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Access purchased digital guides, diagnostic reports, and software utilities.
          </p>
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Download className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No downloads available</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You do not currently have any active digital downloads or guides associated with your account.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {downloads.map((item) => (
            <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-900">{item.product_name}</h5>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                    <span>Downloads remaining: <strong>{item.downloads_remaining || 'Unlimited'}</strong></span>
                    <span>•</span>
                    <span>Expires: {item.access_expires || 'Never'}</span>
                  </div>
                </div>
              </div>

              <a
                href={item.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
