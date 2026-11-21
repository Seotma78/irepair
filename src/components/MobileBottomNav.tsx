import React from 'react';
import { Home, Store, ShoppingCart, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';

interface MobileBottomNavProps {
  className?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ className = '' }) => {
  const { 
    currentPage, 
    setCurrentPage, 
    cartCount, 
    setIsCartDrawerOpen,
    setShopBrandFilter,
    setShopConditionFilter
  } = useApp();

  const { isAuthenticated, customer, openAuthModal } = useCustomerAuth();

  // Navigation targets & active route detection
  const isHomeActive = currentPage === 'home' || currentPage === '';
  const isShopActive = currentPage === 'shop' || currentPage === 'product-category' || currentPage === 'product-detail';
  const isCartActive = currentPage === 'cart';
  const isAccountActive = currentPage === 'account' || currentPage === 'my-account';

  const handleNav = (target: string) => {
    if (target === 'shop') {
      setShopBrandFilter('all');
      setShopConditionFilter('all');
    }
    setCurrentPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCartClick = () => {
    // Open the existing mini cart drawer with instant feedback
    setIsCartDrawerOpen(true);
  };

  const handleAccountClick = () => {
    if (isAuthenticated) {
      handleNav('account');
    } else {
      openAuthModal('login');
    }
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.07)] transition-transform duration-200 ${className}`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="grid grid-cols-4 items-center h-15 max-w-lg mx-auto px-2">
        
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          aria-label="Home page"
          aria-current={isHomeActive ? 'page' : undefined}
          className={`group flex flex-col items-center justify-center h-full min-h-[48px] py-1 px-1 transition-all active:scale-90 cursor-pointer relative ${
            isHomeActive ? 'text-[#DF0C88]' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isHomeActive && (
            <span className="absolute top-0 w-8 h-0.5 bg-[#DF0C88] rounded-full" />
          )}
          <Home 
            className={`w-5 h-5 transition-transform duration-150 ${isHomeActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} 
          />
          <span 
            className={`text-[10.5px] mt-1 tracking-tight leading-tight transition-colors ${
              isHomeActive ? 'font-bold text-[#DF0C88]' : 'font-medium text-slate-600'
            }`}
          >
            Home
          </span>
        </button>

        {/* 2. All Products */}
        <button
          type="button"
          onClick={() => handleNav('shop')}
          aria-label="All Products shop"
          aria-current={isShopActive ? 'page' : undefined}
          className={`group flex flex-col items-center justify-center h-full min-h-[48px] py-1 px-1 transition-all active:scale-90 cursor-pointer relative ${
            isShopActive ? 'text-[#DF0C88]' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isShopActive && (
            <span className="absolute top-0 w-8 h-0.5 bg-[#DF0C88] rounded-full" />
          )}
          <Store 
            className={`w-5 h-5 transition-transform duration-150 ${isShopActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} 
          />
          <span 
            className={`text-[10.5px] mt-1 tracking-tight leading-tight transition-colors ${
              isShopActive ? 'font-bold text-[#DF0C88]' : 'font-medium text-slate-600'
            }`}
          >
            All Products
          </span>
        </button>

        {/* 3. Cart */}
        <button
          type="button"
          onClick={handleCartClick}
          aria-label={`Shopping cart with ${cartCount} items`}
          aria-current={isCartActive ? 'page' : undefined}
          className={`group flex flex-col items-center justify-center h-full min-h-[48px] py-1 px-1 transition-all active:scale-90 cursor-pointer relative ${
            isCartActive ? 'text-[#DF0C88]' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isCartActive && (
            <span className="absolute top-0 w-8 h-0.5 bg-[#DF0C88] rounded-full" />
          )}
          <div className="relative">
            <ShoppingCart 
              className={`w-5 h-5 transition-transform duration-150 ${isCartActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} 
            />
            {/* Live item-count badge (matches reference image with pink circle) */}
            <span 
              className={`absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-xs tabular-nums transition-transform ${
                cartCount > 0 ? 'bg-[#DF0C88] scale-100' : 'bg-slate-400 scale-90'
              }`}
            >
              {cartCount}
            </span>
          </div>
          <span 
            className={`text-[10.5px] mt-1 tracking-tight leading-tight transition-colors ${
              isCartActive ? 'font-bold text-[#DF0C88]' : 'font-medium text-slate-600'
            }`}
          >
            Cart
          </span>
        </button>

        {/* 4. Account */}
        <button
          type="button"
          onClick={handleAccountClick}
          aria-label={isAuthenticated ? 'My customer account' : 'Log in or register'}
          aria-current={isAccountActive ? 'page' : undefined}
          className={`group flex flex-col items-center justify-center h-full min-h-[48px] py-1 px-1 transition-all active:scale-90 cursor-pointer relative ${
            isAccountActive ? 'text-[#DF0C88]' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isAccountActive && (
            <span className="absolute top-0 w-8 h-0.5 bg-[#DF0C88] rounded-full" />
          )}
          <div className="relative">
            <User 
              className={`w-5 h-5 transition-transform duration-150 ${isAccountActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} 
            />
            {isAuthenticated && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
            )}
          </div>
          <span 
            className={`text-[10.5px] mt-1 tracking-tight leading-tight transition-colors truncate max-w-[70px] ${
              isAccountActive ? 'font-bold text-[#DF0C88]' : 'font-medium text-slate-600'
            }`}
          >
            {isAuthenticated ? (customer?.firstName ? customer.firstName : 'Account') : 'Account'}
          </span>
        </button>

      </div>
    </nav>
  );
};
