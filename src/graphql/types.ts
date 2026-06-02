export type GraphQLVariables = Record<string, unknown>;

export interface GraphQLErrorItem {
  message: string;
  debugMessage?: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLErrorItem[];
}

export interface CategoryProductsVariables {
  filter: {
    category_id?: { eq: string };
    sku?: { in: string[] };
  };
  pageSize: number;
  currentPage: number;
  [key: string]: unknown;
}

export interface CategoryProductImage {
  url: string;
  label: string | null;
}

export interface Money {
  value: number;
  currency: string;
}

export interface CategoryProductItem {
  uid: string;
  id: number;
  sku: string;
  name: string;
  url_key: string | null;
  stock_status: string;
  mgs_brand: number | string | null;
  small_image: CategoryProductImage | null;
  price_range: {
    minimum_price: {
      regular_price: Money;
      final_price: Money;
    };
  };
}

export interface KleverSearchPoolItem {
  sku: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  product_url: string | null;
  item_code: string | null;
  final_price: number | string | null;
  stock_qty: number | string | null;
  stock_label: string | null;
  stock_color: string | null;
  action: string | null;
  is_action: string | null;
  is_in_stock: boolean | null;
}

export interface KleverSearchPoolData {
  kleverCategoryProducts: {
    total_count: number;
    products: KleverSearchPoolItem[];
  };
}

export interface MgsBrandOptionsData {
  customAttributeMetadata: {
    items: Array<{
      attribute_code: string;
      attribute_options: Array<{ value: string; label: string }>;
    }>;
  } | null;
}

export interface CategoryProductsData {
  products: {
    total_count: number;
    page_info: {
      current_page: number;
      page_size: number;
      total_pages: number;
    };
    items: CategoryProductItem[];
  };
}

export interface GenerateCustomerTokenData {
  generateCustomerToken: { token: string };
}

export interface RevokeCustomerTokenData {
  revokeCustomerToken: { result: boolean };
}

export interface RequestPasswordResetEmailData {
  requestPasswordResetEmail: boolean | string | null;
}

export interface ResetPasswordData {
  resetPassword: boolean | string | null;
}

export interface ChangeCustomerPasswordData {
  changeCustomerPassword: { id: string | number; email: string };
}

export interface SendOtpToCustomerData {
  sendOtpToCustomer: { message: string | null };
}

export interface CreateCustomerTokenWithOtpData {
  createCustomerTokenWithOtp: { message: string | null; token: string };
}

export interface InitiatePasswordResetWithOtpData {
  initiatePasswordResetWithOTP: { message: string | null };
}

export interface ContactUsData {
  contactUs: { status: boolean };
}

export interface CmsPageItem {
  title: string;
  content: string;
  content_heading: string | null;
  meta_title: string | null;
  meta_keywords: string | null;
  meta_description: string | null;
  page_layout: string | null;
  url_key: string | null;
}

export interface CmsPageData {
  cmsPage: CmsPageItem | null;
}

export interface CustomerAddressSummary {
  id: number | string;
  firstname: string | null;
  lastname: string | null;
  street: string[] | null;
  city: string | null;
  region: { region: string | null; region_id: number | null } | null;
  postcode: string | null;
  country_code: string | null;
  telephone: string | null;
  default_billing: boolean | null;
  default_shipping: boolean | null;
}

export interface CustomerProfile {
  id: number | string;
  email: string;
  firstname: string;
  lastname: string;
  middlename: string | null;
  prefix: string | null;
  suffix: string | null;
  gender: number | string | null;
  dob: string | null;
  taxvat: string | null;
  created_at: string | null;
  default_billing: string | null;
  default_shipping: string | null;
  addresses: CustomerAddressSummary[];
}

export interface CustomerData {
  customer: CustomerProfile | null;
}

export interface KleverSidebarItem {
  code: string;
  label: string;
  url: string;
  is_visible: boolean | null;
  sort_order: number | null;
}

export interface KleverAccountSidebarData {
  kleverAccountSidebar: {
    user_type: string | null;
    items: KleverSidebarItem[];
  } | null;
}

export interface KleverDashboardAddress {
  city: string | null;
  company: string | null;
  country_id: string | null;
  customer_id: number | null;
  firstname: string | null;
  id: number;
  is_default_billing: boolean | null;
  is_default_shipping: boolean | null;
  lastname: string | null;
  postcode: string | null;
  region: string | null;
  region_id: number | null;
  street: string[] | null;
  telephone: string | null;
  vat_id: string | null;
}

export interface KleverDashboardCustomAttribute {
  attribute_code: string;
  value: string | null;
}

export interface KleverDashboardCustomer {
  addresses: KleverDashboardAddress[] | null;
  created_at: string | null;
  custom_attributes: KleverDashboardCustomAttribute[] | null;
  default_billing: number | null;
  default_shipping: number | null;
  dob: string | null;
  email: string;
  firstname: string;
  gender: number | null;
  group_id: number | null;
  id: number | string;
  lastname: string;
  middlename: string | null;
  prefix: string | null;
  suffix: string | null;
  taxvat: string | null;
  updated_at: string | null;
}

export interface KleverDashboardData {
  kleverDashboard: {
    customer: KleverDashboardCustomer;
    favorite_products_count: number | null;
    pending_orders_count: number | null;
    recent_orders_count: number | null;
  } | null;
}

export interface KleverCustomerTargetDashboardData {
  kleverCustomerTargetDashboard: {
    customer_name: string | null;
    current_year: number | null;
    available_years: number[] | null;
    yearly_summary: Array<{ year: number | null; period: string | null; qty: number | null; amount: number | null }>;
    product_groups: Array<{ product_group: string | null; qty: number | null }>;
    tyre_sizes: Array<{ size_pattern: string | null; qty: number | null }>;
  } | null;
}

export interface KleverBusinessOverviewData {
  kleverBusinessOverview: {
    total_employees: string | null;
    trucks: string | null;
    annual_revenue: string | null;
    business_model: string | null;
    products_offered: string | null;
    success: boolean | null;
    message: string | null;
  } | null;
}

export interface KleverCreditAccountData {
  kleverCreditAccount: {
    total_credit_limit: number | null;
    used_credit_limit: number | null;
    available_credit_limit: number | null;
    currency: string | null;
    has_permission: boolean | null;
    is_visible: boolean | null;
    success: boolean | null;
    message: string | null;
  } | null;
}

export interface KleverMyStatementData {
  kleverMyStatement: { pdf_url: string | null } | null;
}

export interface KleverStatementTypeOption {
  code: string;
  label: string;
}

export interface KleverStatementTypesData {
  kleverStatementTypes: KleverStatementTypeOption[];
}

export interface KleverSubaccountSummary {
  id: number | string;
  customer_id: number | string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  is_active: number | boolean | null;
  permissions: number[] | string[] | null;
  status: string | null;
  taxvat: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface KleverSubaccountsData {
  kleverSubaccounts: {
    items: KleverSubaccountSummary[];
    total_count: number;
    parent_token: string | null;
  } | null;
}

export interface KleverSubaccountDetail {
  id: number | string;
  customer_id: number | string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  is_active: number | boolean | null;
  permissions: number[] | string[] | null;
  status: string | null;
  taxvat: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface KleverSubaccountByIdData {
  kleverSubaccountById: KleverSubaccountDetail | null;
}

export interface KleverSubaccountPermissionOption {
  code: string;
  label: string;
  value: number;
}

export interface KleverSubaccountPermissionsData {
  kleverSubaccountPermissions: KleverSubaccountPermissionOption[];
}

export interface CreateCustomerAddressData {
  createCustomerAddress: CustomerAddressSummary | null;
}

export interface UpdateCustomerAddressData {
  updateCustomerAddress: CustomerAddressSummary | null;
}

export interface DeleteCustomerAddressData {
  deleteCustomerAddress: boolean | null;
}

export interface KleverCreateSubaccountData {
  kleverCreateSubaccount: KleverSubaccountDetail | null;
}

export interface KleverUpdateSubaccountData {
  kleverUpdateSubaccount: KleverSubaccountDetail | null;
}

export interface KleverDeleteSubaccountData {
  kleverDeleteSubaccount: { success: boolean; message: string | null };
}

export interface KleverLoginAsSubaccountData {
  kleverLoginAsSubaccount: {
    token: string;
    customer: KleverDashboardCustomer;
  } | null;
}

export interface KleverUpdateBusinessOverviewData {
  kleverUpdateBusinessOverview: { success: boolean | null; message: string | null };
}

export interface MoneyValue {
  value: number;
  currency: string;
}

export interface CustomerCartItem {
  id: string | number;
  quantity: number;
  product: {
    sku: string;
    name: string;
    url_key: string | null;
    small_image: { url: string | null; label: string | null } | null;
    price_range: {
      minimum_price: {
        final_price: MoneyValue;
        regular_price: MoneyValue;
      };
    } | null;
  };
  prices: {
    price: MoneyValue;
    row_total: MoneyValue;
    total_item_discount: MoneyValue | null;
  } | null;
}

export interface CustomerCart {
  id: string;
  total_quantity: number;
  items: CustomerCartItem[];
  prices: {
    grand_total: MoneyValue;
    subtotal_excluding_tax: MoneyValue | null;
    subtotal_including_tax: MoneyValue | null;
    applied_taxes: Array<{ amount: MoneyValue; label: string }> | null;
    discounts: Array<{ amount: MoneyValue; label: string }> | null;
  } | null;
  applied_coupons: Array<{ code: string }> | null;
}

export interface CustomerCartData {
  customerCart: CustomerCart | null;
}

export interface CustomerCartIdData {
  customerCart: {
    id: string;
    items: Array<{ id: string | number }>;
  } | null;
}

export interface UpdateCartItemsData {
  updateCartItems: {
    cart: { id: string; items: Array<{ id: string | number; quantity: number }> };
  };
}

export interface RemoveItemFromCartData {
  removeItemFromCart: {
    cart: { id: string; items: Array<{ id: string | number; quantity: number }> };
  };
}

export interface ApplyCouponToCartData {
  applyCouponToCart: {
    cart: CustomerCart;
  };
}

export interface RemoveCouponFromCartData {
  removeCouponFromCart: {
    cart: CustomerCart;
  };
}

export interface KleverDiscountPopupData {
  kleverDiscountPopup: {
    applied_coupons: Array<{ code: string; discount_amount: number | null; rule_name: string | null }> | null;
    promo_rules: Array<{
      rule_id: number;
      rule_type: string | null;
      max_qty: number | null;
      discount_amount: number | null;
      items: Array<{
        sku: string;
        name: string | null;
        product_id: number | null;
        image_url: string | null;
        original_price: number | null;
        promo_price: number | null;
        available_qty: number | null;
      }>;
    }> | null;
    common_qty: number | null;
    selection_method: string | null;
    gifts_counter_enabled: boolean | null;
    auto_open_popup: boolean | null;
    total_discount: number | null;
    subtotal: number | null;
    grand_total: number | null;
    currency_code: string | null;
  } | null;
}

export interface KleverPaymentHistoryItem {
  id: number | string;
  receipt_no: string | null;
  payment_date: string | null;
  order_increment_id: string | null;
  invoice_amount: number | null;
  paid_payment: number | null;
  due_payment: number | null;
  payment_status: string | null;
}

export interface KleverPaymentHistoryData {
  kleverPaymentHistory: {
    items: KleverPaymentHistoryItem[];
    total_count: number;
  } | null;
}

export interface KleverPaymentHistoryDetail {
  id: number | string;
  receipt_no: string | null;
  payment_date: string | null;
  order_id: number | string | null;
  order_increment_id: string | null;
  paid_payment: number | null;
  payment_method: string | null;
  payment_status: string | null;
  remarks: string | null;
}

export interface KleverPaymentHistoryByIdData {
  kleverPaymentHistoryById: KleverPaymentHistoryDetail | null;
}

export interface KleverPaymentHistoryReceiptData {
  kleverPaymentHistoryReceipt: KleverFilePayload | null;
}

export interface KleverPaymentHistorySaveData {
  kleverPaymentHistorySave: {
    success: boolean;
    message: string | null;
    payment_id: number | string | null;
    receipt_no: string | null;
  };
}

export interface KleverPaymentHistoryEditData {
  kleverPaymentHistoryEdit: {
    success: boolean;
    message: string | null;
    payment_id: number | string | null;
    receipt_no: string | null;
  };
}

export interface KleverStoreSummary {
  store_id: number | string;
  store_code: string;
  store_name: string | null;
  store_url: string | null;
  website_name: string | null;
  group_name?: string | null;
  is_active: boolean | number | null;
}

export interface KleverSourcePermissionsData {
  kleverSourcePermissions: {
    has_restrictions: boolean | null;
    total_count: number | null;
    permitted_store_ids: number[] | string[] | null;
    permitted_stores: KleverStoreSummary[];
  } | null;
}

export interface KleverSourcePermissionCheckData {
  kleverSourcePermissionCheck: {
    allowed: boolean;
    store_id: number | string | null;
    store_code: string | null;
    redirect_store_code: string | null;
    redirect_url: string | null;
    message: string | null;
  } | null;
}

export interface KleverSourceAvailableStoresData {
  kleverSourceAvailableStores: KleverStoreSummary[];
}

export interface KleverForecastItem {
  forecast_id: number | string;
  file_name: string;
  file_url: string | null;
  uploaded_date: string | null;
}

export interface KleverForecastListData {
  kleverForecastList: {
    items: KleverForecastItem[];
    total_count: number;
    page_size: number | null;
    current_page: number | null;
    total_pages: number | null;
    message: string | null;
  } | null;
}

export interface KleverUploadForecastData {
  kleverUploadForecast: {
    items: KleverForecastItem[];
    total_count: number;
    message: string | null;
  } | null;
}

export interface KleverSubmitEnquiryData {
  kleverSubmitEnquiry: boolean | string | null;
}

export interface KleverQuickOrderSearchItem {
  product_id: number | string;
  sku: string;
  name: string;
  price: number | null;
  image_url: string | null;
  is_in_stock: boolean | null;
}

export interface KleverQuickOrderSearchData {
  kleverQuickOrderSearch: {
    items: KleverQuickOrderSearchItem[];
    total_count: number;
  } | null;
}

export interface KleverQuickOrderValidateItem {
  sku: string;
  name: string | null;
  qty: number;
  price: number | null;
  row_total: number | null;
  is_valid: boolean | null;
  error_message: string | null;
}

export interface KleverQuickOrderValidateData {
  kleverQuickOrderValidate: {
    grand_total: number | null;
    items: KleverQuickOrderValidateItem[];
  };
}

export interface KleverQuickOrderResultBase {
  success: boolean;
  message: string | null;
  items_count: number;
  grand_total: number | null;
}

export interface KleverQuickOrderAddToCartData {
  kleverQuickOrderAddToCart: KleverQuickOrderResultBase & { redirect_url: string | null };
}

export interface KleverQuickOrderCheckoutData {
  kleverQuickOrderCheckout: KleverQuickOrderResultBase & { redirect_url: string | null };
}

export interface KleverQuickOrderClearAllData {
  kleverQuickOrderClearAll: KleverQuickOrderResultBase;
}

export interface KleverQuickOrderRemoveItemData {
  kleverQuickOrderRemoveItem: { success: boolean; items_count: number; grand_total: number | null };
}

export interface KleverQuickOrderUpdateItemQtyData {
  kleverQuickOrderUpdateItemQty: { success: boolean; items_count: number; grand_total: number | null };
}

export interface KleverQuickOrderDownloadCsvData {
  kleverQuickOrderDownloadCsv: {
    file_name: string;
    file_content: string;
    content_type: string;
    total_products: number | null;
  } | null;
}

export interface KleverQuickOrderUploadCsvData {
  kleverQuickOrderUploadCsv: {
    grand_total: number | null;
    items: Array<{
      sku: string;
      name: string | null;
      qty: number;
      price: number | null;
      is_valid: boolean | null;
      error_message: string | null;
    }>;
  };
}

export interface KleverNotificationItem {
  id: number | string;
  severity: string | null;
  title: string | null;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  url: string | null;
  is_read: boolean | number | null;
  date_added: string | null;
  date_added_formatted: string | null;
  product_item_code: string | null;
}

export interface KleverNotificationsData {
  kleverNotifications: {
    items: KleverNotificationItem[];
    total_count: number;
    unread_count: number;
  } | null;
}

export interface KleverMarkNotificationAsReadData {
  kleverMarkNotificationAsRead: { success: boolean; message: string | null };
}

export interface KleverRemoveNotificationData {
  kleverRemoveNotification: { success: boolean; message: string | null };
}

export interface KleverFavoriteProductItem {
  product_id: number | string;
  sku: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  final_price: number | null;
  stock_status: string | null;
  product_url: string | null;
}

export interface KleverFavoriteProductsData {
  kleverFavoriteProducts: {
    products: KleverFavoriteProductItem[];
    total_count: number;
  } | null;
}

export interface KleverAddFavoriteProductData {
  kleverAddFavoriteProduct: boolean | string | null;
}

export interface KleverRemoveFavoriteProductData {
  kleverRemoveFavoriteProduct: boolean | string | null;
}

export interface CustomerOrdersData {
  customer: {
    orders: {
      total_count: number;
      items: Array<{
        id: string;
        number: string;
        order_date: string;
        status: string;
        total: { grand_total: MoneyValue };
        items: Array<{ product_name: string; product_sku: string; quantity_ordered: number }>;
      }>;
      page_info: { current_page: number; page_size: number; total_pages: number };
    } | null;
  } | null;
}

export interface KleverMyOrderItem {
  order_id: number | string;
  increment_id: string;
  status: string;
  status_label: string | null;
  created_at: string;
  grand_total: number;
  currency_code: string;
  total_item_count: number;
  company_code: string | null;
  company_name: string | null;
  ordered_by: string | null;
  payment_method: string | null;
  sap_order_number: string | null;
  shipping_description: string | null;
}

export interface KleverMyOrdersData {
  kleverMyOrders: {
    orders: KleverMyOrderItem[];
    total_count: number;
  } | null;
}

export interface KleverOrderFilterOptionsData {
  kleverOrderFilterOptions: {
    status_options: Array<{ label: string; value: string }>;
    company_options: Array<{ label: string; value: string }>;
  } | null;
}

export interface KleverOrderDetails {
  entity_id: number | string;
  increment_id: string;
  status: string;
  grand_total: number | null;
  subtotal: number | null;
  items: Array<{
    sku: string;
    name: string;
    qty_ordered: number;
    price: number | null;
    row_total: number | null;
  }>;
  billing_address: { firstname: string | null; city: string | null; country_id: string | null } | null;
  shipping_address: { firstname: string | null; city: string | null; country_id: string | null } | null;
  payment_method: string | null;
}

export interface KleverOrderDetailsData {
  kleverOrderDetails: KleverOrderDetails | null;
}

export interface KleverOrderAttachmentItem {
  attachment_id: number | string;
  file_name: string;
  file_url: string | null;
  upload_date: string | null;
  document_type: string | null;
  payment_status: string | null;
  invoice_due: string | null;
}

export interface KleverOrderAttachmentsData {
  kleverOrderAttachments: { attachments: KleverOrderAttachmentItem[] } | null;
}

export interface KleverPrintOrderAddress {
  name: string | null;
  company: string | null;
  street: string[] | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country_id: string | null;
  telephone: string | null;
}

export interface KleverPrintOrderItem {
  name: string;
  sku: string;
  price: number | null;
  qty_ordered: number;
  qty_canceled: number | null;
  qty_refunded: number | null;
  qty_shipped: number | null;
  subtotal: number | null;
}

export interface KleverPrintOrderTotals {
  currency_code: string | null;
  subtotal: number;
  discount: number | null;
  shipping: number;
  tax: number;
  tax_label: string | null;
  grand_total: number;
}

export interface KleverPrintOrderData {
  kleverPrintOrder: {
    order_number: string;
    order_date: string | null;
    order_status: string | null;
    billing_address: KleverPrintOrderAddress | null;
    shipping_address: KleverPrintOrderAddress | null;
    items: KleverPrintOrderItem[];
    totals: KleverPrintOrderTotals | null;
    shipping_method: string | null;
    payment_method: string | null;
  } | null;
}

export interface KleverFilePayload {
  success: boolean;
  filename: string;
  base64: string;
  mime_type: string;
}

export interface KleverOrderPdfData {
  kleverOrderPdf: KleverFilePayload | null;
}

export interface KleverExportOrdersData {
  kleverExportOrders: (KleverFilePayload & { total_orders: number | null; total_rows: number | null }) | null;
}

export interface KleverOrderUploadSearchData {
  kleverOrderUploadSearch: {
    items: Array<{
      id: number | string;
      order_id: number | string;
      customer_id: number | string | null;
      file_name: string;
      comment: string | null;
      upload_for: string | null;
      created_at: string | null;
      updated_at: string | null;
      payment_status: string | null;
    }>;
    total_count: number;
    page_size: number;
    current_page: number;
    total_pages: number;
  } | null;
}

export interface KleverOrderUploadFilterOptionsData {
  kleverOrderUploadFilterOptions: {
    document_types: Array<{ label: string; value: string }>;
    invoice_due_options: Array<{ label: string; value: string }>;
    company_options: Array<{ label: string; value: string }>;
  } | null;
}

export interface KleverCancelOrderData {
  kleverCancelOrder: {
    success: boolean;
    message: string | null;
    order_id: number | string;
    order_increment_id: string;
  };
}

export interface KleverConfirmOrderData {
  kleverConfirmOrder: {
    success: boolean;
    message: string | null;
    order_id: number | string;
    order_increment_id: string;
    attachments: KleverOrderAttachmentItem[];
  };
}

export interface ReorderItemsData {
  reorderItems: {
    cart: {
      id: string;
      total_quantity: number;
      items: Array<{ quantity: number; product: { sku: string } }>;
    };
    userInputErrors: Array<{ code: string; message: string }>;
  };
}

export interface ShippingMethodOption {
  carrier_code: string;
  method_code: string;
  carrier_title: string | null;
  method_title: string | null;
  amount: MoneyValue;
  available: boolean | null;
}

export interface CartShippingMethodsData {
  cart: {
    shipping_addresses: Array<{
      available_shipping_methods: ShippingMethodOption[] | null;
    }> | null;
  } | null;
}

export interface CartPaymentMethodsData {
  cart: {
    available_payment_methods: Array<{ code: string; title: string }> | null;
    selected_payment_method: { code: string; title: string } | null;
  } | null;
}

export interface SetShippingAddressesOnCartData {
  setShippingAddressesOnCart: {
    cart: {
      shipping_addresses: Array<{
        firstname: string | null;
        lastname: string | null;
        street: string[] | null;
        city: string | null;
        postcode: string | null;
        telephone: string | null;
        country: { code: string; label: string } | null;
        available_shipping_methods: ShippingMethodOption[] | null;
      }>;
    };
  };
}

export interface SetShippingMethodsOnCartData {
  setShippingMethodsOnCart: {
    cart: {
      shipping_addresses: Array<{
        selected_shipping_method: {
          carrier_code: string;
          method_code: string;
          amount: MoneyValue;
        } | null;
      }>;
    };
  };
}

export interface SetPaymentMethodOnCartData {
  setPaymentMethodOnCart: {
    cart: {
      selected_payment_method: { code: string; title: string };
    };
  };
}

export interface PlaceOrderData {
  placeOrder: { order: { order_number: string } };
}

export interface PickupLocationsData {
  pickupLocations: {
    items: Array<{
      pickup_location_code: string;
      name: string;
      street: string | null;
      city: string | null;
      country_id: string | null;
      postcode: string | null;
      latitude: number | null;
      longitude: number | null;
    }>;
    total_count: number;
    page_info: { current_page: number; page_size: number; total_pages: number };
  };
}

export interface KleverCheckoutAddress {
  id: number | string | null;
  firstname: string | null;
  lastname: string | null;
  company: string | null;
  street: string[] | null;
  city: string | null;
  region: string | null;
  region_id: number | null;
  postcode: string | null;
  country_id: string | null;
  telephone: string | null;
  email: string | null;
}

export interface KleverCheckoutTotalsItem {
  item_id: number | string;
  product_id: number | string | null;
  sku: string;
  name: string;
  qty: number;
  price: number | null;
  row_total: number | null;
  image_url: string | null;
  product_url: string | null;
  size_display: string | null;
  pattern_display: string | null;
}

export interface KleverCheckoutTotalsData {
  kleverCheckoutTotals: {
    cart_id: string | null;
    subtotal: number | null;
    shipping_amount: number | null;
    tax_amount: number | null;
    discount_amount: number | null;
    grand_total: number | null;
    currency_code: string | null;
    shipping_method: string | null;
    billing_address: KleverCheckoutAddress | null;
    shipping_address: KleverCheckoutAddress | null;
    items: KleverCheckoutTotalsItem[] | null;
  } | null;
}

export interface KleverCheckoutPoNumberData {
  kleverCheckoutPoNumber: string | null;
}

export interface KleverCheckoutOrderCommentData {
  kleverCheckoutOrderComment: string | null;
}

export interface KleverCheckoutPoFilesData {
  kleverCheckoutPoFiles: string | string[] | null;
}

export interface KleverCheckoutShippingExtras {
  delivery_date: string | null;
  delivery_comment: string | null;
  pickup_store: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  pickup_person_name: string | null;
  pickup_mobile_number: string | null;
  fee: number | null;
}

export interface KleverCheckoutShippingExtrasData {
  kleverCheckoutShippingExtras: KleverCheckoutShippingExtras | null;
}

export interface KleverCheckoutSetPoNumberData {
  kleverCheckoutSetPoNumber: boolean | string | null;
}

export interface KleverCheckoutSetOrderCommentData {
  kleverCheckoutSetOrderComment: boolean | string | null;
}

export interface KleverCheckoutPoUploadData {
  kleverCheckoutPoUpload: boolean | string | null;
}

export interface KleverCheckoutPoRemoveFileData {
  kleverCheckoutPoRemoveFile: boolean | string | null;
}

export interface KleverCheckoutSetShippingExtrasData {
  kleverCheckoutSetShippingExtras: boolean | string | null;
}

export interface KleverCheckoutPickupTimeSlotsData {
  kleverCheckoutPickupTimeSlots: Array<{
    time: string;
    label: string | null;
    enabled: boolean | null;
  }>;
}

export interface KleverCheckoutSuccessData {
  kleverCheckoutSuccess: {
    order_id: number | string;
    order_increment_id: string;
    message: string | null;
    continue_shopping_url: string | null;
    order_view_url: string | null;
  } | null;
}

export interface KleverAddPromoItemsData {
  kleverAddPromoItems: {
    success: boolean;
    message: string | null;
    total_discount: number | null;
    grand_total: number | null;
    applied_coupons: Array<{ code: string; rule_name: string | null }> | null;
  };
}

export interface KleverFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface KleverFilterGroup {
  code: string;
  label: string;
  record_count: number;
  options: KleverFilterOption[];
}

export interface KleverCategoryProductItem {
  product_id: number | string;
  sku: string;
  name: string;
  final_price: number | string | null;
  image_url: string | null;
  brand: string | null;
  tyre_size: string | null;
  is_in_stock: boolean | null;
  stock_label: string | null;
  /** Derived server-side from stock_label — not selected from GraphQL */
  stock_color?: string;
}

export interface KleverCategoryProductsResult {
  total_count: number;
  page_size: number;
  current_page: number;
  total_pages: number;
  products: KleverCategoryProductItem[];
  filters: KleverFilterGroup[];
}

export interface KleverCategoryProductsData {
  kleverCategoryProducts: KleverCategoryProductsResult;
}

export interface KleverCategoryFilterOptionsData {
  kleverCategoryFilterOptions: {
    filters: KleverFilterGroup[];
  };
}

export interface KleverTyreSizeOption {
  value: string;
  label: string;
}

export interface KleverTyreSizeResult {
  status: boolean | string | null;
  options: KleverTyreSizeOption[];
}

export interface KleverTyreSizeWidthData {
  kleverTyreSizeWidth: KleverTyreSizeResult;
}

export interface KleverTyreSizeHeightData {
  kleverTyreSizeHeight: KleverTyreSizeResult;
}

export interface KleverTyreSizeRimData {
  kleverTyreSizeRim: KleverTyreSizeResult;
}

export interface ProductsSearchItem {
  id: number | string;
  sku: string;
  name: string;
  url_key: string | null;
  small_image: { url: string | null } | null;
}

export interface ProductsSearchData {
  products: {
    total_count: number;
    page_info: {
      current_page: number;
      page_size: number;
      total_pages: number;
    };
    items: ProductsSearchItem[];
  };
}

export interface KleverMenuItem {
  code: string | null;
  label: string;
  url: string | null;
  is_visible: boolean | number | null;
  sort_order: number | null;
  category_id: number | string | null;
}

export interface KleverMenuItemsData {
  kleverMenuItems: KleverMenuItem[];
}
