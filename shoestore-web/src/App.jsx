import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ImageSearch from './pages/ImageSearch';
import Cart from './pages/Cart';
import Details from './pages/Details';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import OrderHistory from './pages/OrderHistory';
import ChangePassword from './pages/ChangePassword';
import Login from './pages/Login';
import Register from './pages/Register';
import Favourites from './pages/Favourites';
import Membership from './pages/Membership';
import FlashSale from './pages/FlashSale';
import NewArrivals from './pages/NewArrivals';
import Vouchers from './pages/Vouchers';
import OrderDetail from './pages/OrderDetail';
import ShipperDashboard from './pages/shipper/ShipperDashboard';
import ShipperWaitingOrders from './pages/shipper/ShipperWaitingOrders';
import ShipperShippingOrders from './pages/shipper/ShipperShippingOrders';
import ShipperCompletedOrders from './pages/shipper/ShipperCompletedOrders';
import ShipperEarnings from './pages/shipper/ShipperEarnings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPOS from './pages/admin/AdminPOS';
import AdminVouchers from './pages/admin/AdminVouchers';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminBrands from './pages/admin/AdminBrands';
import AdminChat from './pages/admin/AdminChat';
import AdminProductDetail from './pages/admin/AdminProductDetail';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminBanners from './pages/admin/AdminBanners';
import AdminBannerForm from './pages/admin/AdminBannerForm';
import AdminRanks from './pages/admin/AdminRanks';
import AdminRankForm from './pages/admin/AdminRankForm';
import AdminFlashSales from './pages/admin/AdminFlashSales';
import AdminFlashSaleForm from './pages/admin/AdminFlashSaleForm';
import AdminSettings from './pages/admin/AdminSettings';
import AdminCustomerDetail from './pages/admin/AdminCustomerDetail';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';
import OAuth2Redirect from './pages/OAuth2Redirect';

import Chatbox from './components/Chatbox';

import './index.css';

function ScrollAndModalReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    // Clean up stuck bootstrap backdrops and body locks
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(el => el.remove());
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollAndModalReset />
      <Chatbox />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/image-search" element={<ImageSearch />} />
        <Route path="/details" element={<Details />} />
        <Route path="/new-arrivals" element={<NewArrivals />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/flash-sale" element={<FlashSale />} />
        <Route path="/vouchers" element={<Vouchers />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout-success" element={<CheckoutSuccess />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/orders/detail/:id" element={<OrderDetail />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/favourites" element={<Favourites />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/oauth2/redirect" element={<OAuth2Redirect />} />

        {/* Shipper Routes */}
        <Route path="/shipper/dashboard" element={<ShipperDashboard />} />
        <Route path="/shipper/waiting-orders" element={<ShipperWaitingOrders />} />
        <Route path="/shipper/shipping-orders" element={<ShipperShippingOrders />} />
        <Route path="/shipper/completed-orders" element={<ShipperCompletedOrders />} />
        <Route path="/shipper/earnings" element={<ShipperEarnings />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/sale" element={<AdminPOS />} />
        <Route path="/admin/vouchers" element={<AdminVouchers />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/products/create" element={<AdminProductForm />} />
        <Route path="/admin/products/edit/:id" element={<AdminProductForm />} />
        <Route path="/admin/products/detail/:id" element={<AdminProductDetail />} />

        <Route path="/admin/customers" element={<AdminCustomers />} />
        <Route path="/admin/customers/detail/:id" element={<AdminCustomerDetail />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/brands" element={<AdminBrands />} />
        <Route path="/admin/banners" element={<AdminBanners />} />
        <Route path="/admin/banners/add" element={<AdminBannerForm />} />
        <Route path="/admin/banners/edit/:id" element={<AdminBannerForm />} />
        <Route path="/admin/ranks" element={<AdminRanks />} />
        <Route path="/admin/ranks/add" element={<AdminRankForm />} />
        <Route path="/admin/ranks/edit/:id" element={<AdminRankForm />} />
        <Route path="/admin/flashsales" element={<AdminFlashSales />} />
        <Route path="/admin/flashsales/create" element={<AdminFlashSaleForm />} />
        <Route path="/admin/flashsales/edit/:id" element={<AdminFlashSaleForm />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/chat" element={<AdminChat />} />
      </Routes>
    </Router>
  );
}

export default App;
