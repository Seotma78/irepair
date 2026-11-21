import React from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useApp } from '../../context/AppContext';
import { buildProductHierarchicalUrl } from '../../utils/categoryUtils';
import { 
  Heart, 
  Trash2, 
  ShoppingBag, 
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export const AccountWishlist: React.FC = () => {
  const { wishlist, toggleWishlist } = useCustomerAuth();
  const { products, categories, addToCart, viewProductDetail, setCurrentPage } = useApp();

  const wishlistProducts = products.filter((p) => 
    wishlist.some((id) => String(id) === String(p.id) || String(id) === String(p.wpId))
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-heading">
            My Wishlist ({wishlistProducts.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Devices and accessories you have saved for later.
          </p>
        </div>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-pink-50 text-[#DF0C88] flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Your wishlist is empty</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click the heart icon on any device in our shop to save it to your personal wishlist.
          </p>
          <button
            onClick={() => setCurrentPage('shop')}
            className="mt-4 px-5 py-2.5 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Explore Refurbished Tech
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlistProducts.map((product) => (
            <div
              key={product.id}
              className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-[#DF0C88]/50 hover:shadow-md transition-all group"
            >
              <div>
                <div className="relative">
                  <a
                    href={buildProductHierarchicalUrl(product, categories)}
                    onClick={(e) => {
                      e.preventDefault();
                      viewProductDetail(product);
                    }}
                    className="w-full aspect-square bg-white rounded-xl overflow-hidden flex items-center justify-center p-3 block mb-3 cursor-pointer border border-slate-100"
                  >
                    <img
                      src={product.image}
                      alt={product.title}
                      loading="lazy"
                      width={600}
                      height={600}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform"
                    />
                  </a>
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-rose-500 shadow-xs cursor-pointer z-10"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF0C88]">
                  {product.category}
                </span>
                <a
                  href={buildProductHierarchicalUrl(product, categories)}
                  onClick={(e) => {
                    e.preventDefault();
                    viewProductDetail(product);
                  }}
                  className="block cursor-pointer"
                >
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 hover:text-[#DF0C88] transition-colors mt-0.5">
                    {product.title}
                  </h4>
                </a>

                <div className="text-sm font-extrabold text-slate-900 mt-1">
                  £{product.price.toFixed(2)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => addToCart(product, 1)}
                  className="flex-1 py-2 bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={() => viewProductDetail(product)}
                  className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors"
                  title="View specs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
