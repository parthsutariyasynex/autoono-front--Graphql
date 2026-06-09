export const CATEGORY_PRODUCTS_QUERY = /* GraphQL */ `
  

`;

export const CATEGORIES_QUERY = /* GraphQL */ `
  query Categories(
    $filters: CategoryFilterInput
    $pageSize: Int!
    $currentPage: Int!
  ) {
    categories(
      filters: $filters
      pageSize: $pageSize
      currentPage: $currentPage
    ) {
      total_count
      page_info {
        current_page
        page_size
        total_pages
      }
      items {
        uid
        id
        name
        url_key
        url_path
        level
        children_count
      }
    }
  }
`;

export const CUSTOMER_QUERY = /* GraphQL */ `
  query Customer {
    customer {
      id
      email
      firstname
      lastname
      middlename
      prefix
      suffix
      gender
      dob
      taxvat
      created_at
      default_billing
      default_shipping
      addresses {
        id
        firstname
        lastname
        street
        city
        region {
          region
          region_id
        }
        postcode
        country_code
        telephone
        default_billing
        default_shipping
      }
    }
  }
`;

export const KLEVER_ACCOUNT_SIDEBAR_QUERY = /* GraphQL */ `
  query KleverAccountSidebar {
    kleverAccountSidebar {
      user_type
      items {
        code
        label
        url
        is_visible
        sort_order
      }
    }
  }
`;

export const KLEVER_DASHBOARD_QUERY = /* GraphQL */ `
  query KleverDashboard {
    kleverDashboard {
      customer {
        addresses {
          city
          company
          country_id
          customer_id
          firstname
          id
          is_default_billing
          is_default_shipping
          lastname
          postcode
          region
          region_id
          street
          telephone
          vat_id
        }
        created_at
        custom_attributes {
          attribute_code
          value
        }
        default_billing
        default_shipping
        dob
        email
        firstname
        gender
        group_id
        id
        lastname
        middlename
        prefix
        suffix
        taxvat
        updated_at
      }
      favorite_products_count
      pending_orders_count
      recent_orders_count
    }
  }
`;

export const KLEVER_CUSTOMER_TARGET_DASHBOARD_QUERY = /* GraphQL */ `
  query KleverCustomerTargetDashboard($searchYear: Int, $compareYear: Int) {
    kleverCustomerTargetDashboard(searchYear: $searchYear, compareYear: $compareYear) {
      customer_name
      current_year
      available_years
      yearly_summary {
        year
        period
        qty
        amount
      }
      product_groups {
        product_group
        qty
      }
      tyre_sizes {
        size_pattern
        qty
      }
    }
  }
`;

export const KLEVER_BUSINESS_OVERVIEW_QUERY = /* GraphQL */ `
  query KleverBusinessOverview {
    kleverBusinessOverview {
      total_employees
      trucks
      annual_revenue
      business_model
      products_offered
      success
      message
    }
  }
`;

export const KLEVER_CREDIT_ACCOUNT_QUERY = /* GraphQL */ `
  query KleverCreditAccount {
    kleverCreditAccount {
      total_credit_limit
      used_credit_limit
      available_credit_limit
      currency
      has_permission
      is_visible
      success
      message
    }
  }
`;

export const KLEVER_MY_STATEMENT_QUERY = /* GraphQL */ `
  query KleverMyStatement($fromDate: String, $toDate: String, $statementType: String) {
    kleverMyStatement(fromDate: $fromDate, toDate: $toDate, statementType: $statementType) {
      pdf_url
    }
  }
`;

export const KLEVER_STATEMENT_TYPES_QUERY = /* GraphQL */ `
  query KleverStatementTypes {
    kleverStatementTypes {
      code
      label
    }
  }
`;

export const KLEVER_SUBACCOUNTS_QUERY = /* GraphQL */ `
  query KleverSubaccounts {
    kleverSubaccounts {
      items {
        id
        customer_id
        firstname
        lastname
        email
        is_active
        permissions
        status
        taxvat
        created_at
        updated_at
      }
      total_count
      parent_token
    }
  }
`;

export const KLEVER_SUBACCOUNT_PERMISSIONS_QUERY = /* GraphQL */ `
  query KleverSubaccountPermissions {
    kleverSubaccountPermissions {
      code
      label
      value
    }
  }
`;

export const KLEVER_SUBACCOUNT_BY_ID_QUERY = /* GraphQL */ `
  query KleverSubaccountById($subaccountId: Int!) {
    kleverSubaccountById(subaccountId: $subaccountId) {
      id
      customer_id
      firstname
      lastname
      email
      is_active
      permissions
      status
      taxvat
      created_at
      updated_at
    }
  }
`;

export const CMS_PAGE_QUERY = /* GraphQL */ `
  query CmsPage($identifier: String!) {
    cmsPage(identifier: $identifier) {
      title
      content
      content_heading
      meta_title
      meta_keywords
      meta_description
      page_layout
      url_key
    }
  }
`;

export const KLEVER_CATEGORY_PRODUCTS_QUERY = /* GraphQL */ `
  query KleverCategoryProducts(
    $categoryId: Int!
    $pageSize: Int
    $currentPage: Int
    $minPrice: Float
    $maxPrice: Float
    $searchQuery: String
    $sortBy: String
    $sortOrder: String
    $partsCategory: String
    $itemCode: String
    $brand: String
    $productGroup: String
    $tyreSize: String
    $color: String
    $width: String
    $height: String
    $rim: String
    $pattern: String
    $warrantyPeriod: String
    $offers: String
    $year: String
    $origin: String
    $manufacturer: String
    $types: String
    $runflat: String
    $oemMarking: String
    $newArrivals: Boolean
    $mgsBrand: String
    $oilType: String
    $oilGrade: String
    $liters: String
  ) {
    kleverCategoryProducts(
      categoryId: $categoryId
      pageSize: $pageSize
      currentPage: $currentPage
      minPrice: $minPrice
      maxPrice: $maxPrice
      searchQuery: $searchQuery
      sortBy: $sortBy
      sortOrder: $sortOrder
      partsCategory: $partsCategory
      itemCode: $itemCode
      brand: $brand
      productGroup: $productGroup
      tyreSize: $tyreSize
      color: $color
      width: $width
      height: $height
      rim: $rim
      pattern: $pattern
      warrantyPeriod: $warrantyPeriod
      offers: $offers
      year: $year
      origin: $origin
      manufacturer: $manufacturer
      types: $types
      runflat: $runflat
      oemMarking: $oemMarking
      newArrivals: $newArrivals
      mgsBrand: $mgsBrand
      oilType: $oilType
      oilGrade: $oilGrade
      liters: $liters
    ) {
      total_count
      page_size
      current_page
      total_pages
      products {
        product_id
        sku
        name
        final_price
        image_url
        brand
        tyre_size
        is_in_stock
        stock_label
      }
      filters {
        code
        label
        record_count
        options {
          value
          label
          count
        }
      }
    }
  }
`;

export const KLEVER_CATEGORY_FILTER_OPTIONS_QUERY = /* GraphQL */ `
  query KleverCategoryFilterOptions($categoryId: Int!) {
    kleverCategoryFilterOptions(categoryId: $categoryId) {
      filters {
        code
        label
        record_count
        options {
          value
          label
          count
        }
      }
    }
  }
`;

export const KLEVER_TYRE_SIZE_WIDTH_QUERY = /* GraphQL */ `
  query KleverTyreSizeWidth {
    kleverTyreSizeWidth {
      status
      options {
        value
        label
      }
    }
  }
`;

export const KLEVER_TYRE_SIZE_HEIGHT_QUERY = /* GraphQL */ `
  query KleverTyreSizeHeight($width: String) {
    kleverTyreSizeHeight(width: $width) {
      status
      options {
        value
        label
      }
    }
  }
`;

export const KLEVER_TYRE_SIZE_RIM_QUERY = /* GraphQL */ `
  query KleverTyreSizeRim($width: String, $height: String) {
    kleverTyreSizeRim(width: $width, height: $height) {
      status
      options {
        value
        label
      }
    }
  }
`;

export const KLEVER_SEARCH_POOL_QUERY = /* GraphQL */ `
  query KleverSearchPool($categoryId: Int!, $pageSize: Int!, $currentPage: Int!) {
    kleverCategoryProducts(
      categoryId: $categoryId
      pageSize: $pageSize
      currentPage: $currentPage
    ) {
      total_count
      products {
        sku
        name
        brand
        image_url
        product_url
        item_code
        final_price
        stock_qty
        stock_label
        stock_color
        action
        is_action
        is_in_stock
      }
    }
  }
`;

export const MGS_BRAND_OPTIONS_QUERY = /* GraphQL */ `
  query MgsBrandOptions {
    customAttributeMetadata(
      attributes: [{ attribute_code: "mgs_brand", entity_type: "catalog_product" }]
    ) {
      items {
        attribute_code
        attribute_options {
          value
          label
        }
      }
    }
  }
`;

// Lightweight typeahead — only the fields the search popup consumes (name +
// sku, plus url_key/image for future use). Deliberately omits `price_range`
// because stock `products(search:)` returns the base catalog price for B2B
// customer groups, not the customer's actual price. Prices belong on the
// product listing/detail pages which fetch via `kleverCategoryProducts`.
export const PRODUCTS_SEARCH_QUERY = /* GraphQL */ `
  query ProductsSearch($search: String!, $pageSize: Int!, $currentPage: Int!) {
    products(search: $search, pageSize: $pageSize, currentPage: $currentPage) {
      total_count
      page_info {
        current_page
        page_size
        total_pages
      }
      items {
        id
        sku
        name
        url_key
        small_image {
          url
        }
      }
    }
  }
`;

export const CUSTOMER_CART_QUERY = /* GraphQL */ `
  query CustomerCart {
    customerCart {
      id
      total_quantity
      items {
        id
        quantity
        product {
          sku
          name
          url_key
          small_image {
            url
            label
          }
          price_range {
            minimum_price {
              final_price { value currency }
              regular_price { value currency }
            }
          }
        }
        prices {
          price { value currency }
          row_total { value currency }
          total_item_discount { value currency }
        }
      }
      prices {
        grand_total { value currency }
        subtotal_excluding_tax { value currency }
        subtotal_including_tax { value currency }
        applied_taxes {
          amount { value currency }
          label
        }
        discounts {
          amount { value currency }
          label
        }
      }
      applied_coupons {
        code
      }
    }
  }
`;

export const CUSTOMER_CART_ID_QUERY = /* GraphQL */ `
  query CustomerCartId {
    customerCart {
      id
      items {
        id
      }
    }
  }
`;

export const CART_SHIPPING_METHODS_QUERY = /* GraphQL */ `
  query CartShippingMethods($cartId: String!) {
    cart(cart_id: $cartId) {
      shipping_addresses {
        available_shipping_methods {
          carrier_code
          method_code
          carrier_title
          method_title
          amount { value currency }
          available
        }
      }
    }
  }
`;

export const CART_PAYMENT_METHODS_QUERY = /* GraphQL */ `
  query CartPaymentMethods($cartId: String!) {
    cart(cart_id: $cartId) {
      available_payment_methods {
        code
        title
      }
      selected_payment_method {
        code
        title
      }
    }
  }
`;

export const PICKUP_LOCATIONS_QUERY = /* GraphQL */ `
  query PickupLocations(
    $countryCode: String
    $pageSize: Int
    $currentPage: Int
  ) {
    pickupLocations(
      filters: { country_id: { eq: $countryCode } }
      pageSize: $pageSize
      currentPage: $currentPage
    ) {
      items {
        pickup_location_code
        name
        street
        city
        country_id
        postcode
        latitude
        longitude
      }
      total_count
      page_info {
        current_page
        page_size
        total_pages
      }
    }
  }
`;

export const CUSTOMER_ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($pageSize: Int!, $currentPage: Int!) {
    customer {
      orders(pageSize: $pageSize, currentPage: $currentPage) {
        total_count
        items {
          id
          number
          order_date
          status
          total {
            grand_total { value currency }
          }
          items {
            product_name
            product_sku
            quantity_ordered
          }
        }
        page_info {
          current_page
          page_size
          total_pages
        }
      }
    }
  }
`;

export const KLEVER_MY_ORDERS_QUERY = /* GraphQL */ `
  query KleverMyOrders(
    $orderStatus: String
    $orderNumber: String
    $companyCode: String
    $customerId: Int
    $pageSize: Int
    $currentPage: Int
  ) {
    kleverMyOrders(
      orderStatus: $orderStatus
      orderNumber: $orderNumber
      companyCode: $companyCode
      customerId: $customerId
      pageSize: $pageSize
      currentPage: $currentPage
    ) {
      orders {
        order_id
        increment_id
        status
        status_label
        created_at
        grand_total
        currency_code
        total_item_count
        company_code
        company_name
        ordered_by
        payment_method
        sap_order_number
        shipping_description
      }
      total_count
    }
  }
`;

export const KLEVER_ORDER_FILTER_OPTIONS_QUERY = /* GraphQL */ `
  query KleverOrderFilterOptions {
    kleverOrderFilterOptions {
      status_options { label value }
      company_options { label value }
    }
  }
`;

export const KLEVER_ORDER_DETAILS_QUERY = /* GraphQL */ `
  query KleverOrderDetails($orderId: Int!) {
    kleverOrderDetails(orderId: $orderId) {
      entity_id
      increment_id
      status
      grand_total
      subtotal
      items {
        sku
        name
        qty_ordered
        price
        row_total
      }
      billing_address { firstname city country_id }
      shipping_address { firstname city country_id }
      payment_method
    }
  }
`;

export const KLEVER_ORDER_ATTACHMENTS_QUERY = /* GraphQL */ `
  query KleverOrderAttachments($orderId: Int!) {
    kleverOrderAttachments(orderId: $orderId) {
      attachments {
        attachment_id
        file_name
        file_url
        upload_date
        document_type
        payment_status
        invoice_due
      }
    }
  }
`;

export const KLEVER_PRINT_ORDER_QUERY = /* GraphQL */ `
  query KleverPrintOrder($orderId: Int!) {
    kleverPrintOrder(orderId: $orderId) {
      order_number
      order_date
      order_status
      billing_address {
        name
        company
        street
        city
        region
        postcode
        country_id
        telephone
      }
      shipping_address {
        name
        company
        street
        city
        region
        postcode
        country_id
        telephone
      }
      items {
        name
        sku
        price
        qty_ordered
        qty_canceled
        qty_refunded
        qty_shipped
        subtotal
      }
      totals {
        currency_code
        subtotal
        discount
        shipping
        tax
        tax_label
        grand_total
      }
      shipping_method
      payment_method
    }
  }
`;

export const KLEVER_ORDER_PDF_QUERY = /* GraphQL */ `
  query KleverOrderPdf($orderId: Int!) {
    kleverOrderPdf(orderId: $orderId) {
      success
      filename
      base64
      mime_type
    }
  }
`;

export const KLEVER_EXPORT_ORDERS_QUERY = /* GraphQL */ `
  query KleverExportOrders {
    kleverExportOrders {
      success
      filename
      base64
      mime_type
      total_orders
      total_rows
      
    }
  }
`;

export const KLEVER_ORDER_UPLOAD_SEARCH_QUERY = /* GraphQL */ `
  query KleverOrderUploadSearch($pageSize: Int, $currentPage: Int) {
    kleverOrderUploadSearch(pageSize: $pageSize, currentPage: $currentPage) {
      items {
        id
        order_id
        file_name
        comment
        upload_for
        created_at
        payment_status
      }
      total_count
      page_size
      current_page
      total_pages
    }
  }
`;

export const KLEVER_ORDER_UPLOAD_FILTER_OPTIONS_QUERY = /* GraphQL */ `
  query KleverOrderUploadFilterOptions {
    kleverOrderUploadFilterOptions {
      document_types { label value }
      invoice_due_options { label value }
      company_options { label value }
    }
  }
`;

export const KLEVER_PAYMENT_HISTORY_QUERY = /* GraphQL */ `
  query KleverPaymentHistory(
    $orderId: Int
    $paymentStatus: String
    $paymentMethod: String
    $pageSize: Int
    $currentPage: Int
  ) {
    kleverPaymentHistory(
      orderId: $orderId
      paymentStatus: $paymentStatus
      paymentMethod: $paymentMethod
      pageSize: $pageSize
      currentPage: $currentPage
    ) {
      items {
        id
        receipt_no
        payment_date
        order_increment_id
        invoice_amount
        paid_payment
        due_payment
        payment_status
      }
      total_count
    }
  }
`;

export const KLEVER_PAYMENT_HISTORY_BY_ID_QUERY = /* GraphQL */ `
  query KleverPaymentHistoryById($paymentId: Int!) {
    kleverPaymentHistoryById(paymentId: $paymentId) {
      id
      receipt_no
      payment_date
      order_id
      order_increment_id
      paid_payment
      payment_method
      payment_status
      remarks
    }
  }
`;

export const KLEVER_PAYMENT_HISTORY_RECEIPT_QUERY = /* GraphQL */ `
  query KleverPaymentHistoryReceipt($paymentId: Int!) {
    kleverPaymentHistoryReceipt(paymentId: $paymentId) {
      success
      filename
      base64
      mime_type
    }
  }
`;

export const KLEVER_SOURCE_PERMISSIONS_QUERY = /* GraphQL */ `
  query KleverSourcePermissions {
    kleverSourcePermissions {
      has_restrictions
      total_count
      permitted_store_ids
      permitted_stores {
        store_id
        store_code
        store_name
        store_url
        website_name
        group_name
        is_active
      }
    }
  }
`;

export const KLEVER_SOURCE_PERMISSION_CHECK_QUERY = /* GraphQL */ `
  query KleverSourcePermissionCheck($storeId: Int!) {
    kleverSourcePermissionCheck(storeId: $storeId) {
      allowed
      store_id
      store_code
      redirect_store_code
      redirect_url
      message
    }
  }
`;

export const KLEVER_SOURCE_AVAILABLE_STORES_QUERY = /* GraphQL */ `
  query KleverSourceAvailableStores {
    kleverSourceAvailableStores {
      store_id
      store_code
      store_name
      store_url
      website_name
      group_name
      is_active
    }
  }
`;

export const KLEVER_FORECAST_LIST_QUERY = /* GraphQL */ `
  query KleverForecastList($pageSize: Int, $currentPage: Int) {
    kleverForecastList(pageSize: $pageSize, currentPage: $currentPage) {
      items {
        forecast_id
        file_name
        file_url
        uploaded_date
      }
      total_count
      page_size
      current_page
      total_pages
      message
    }
  }
`;

export const KLEVER_QUICK_ORDER_SEARCH_QUERY = /* GraphQL */ `
  query KleverQuickOrderSearch($query: String!, $pageSize: Int) {
    kleverQuickOrderSearch(query: $query, pageSize: $pageSize) {
      items {
        product_id
        sku
        name
        price
        image_url
        is_in_stock
      }
      total_count
    }
  }
`;

export const KLEVER_QUICK_ORDER_DOWNLOAD_CSV_QUERY = /* GraphQL */ `
  query KleverQuickOrderDownloadCsv($categoryId: Int) {
    kleverQuickOrderDownloadCsv(categoryId: $categoryId) {
      file_name
      file_content
      content_type
      total_products
    }
  }
`;

export const KLEVER_NOTIFICATIONS_QUERY = /* GraphQL */ `
  query KleverNotifications($pageSize: Int, $currentPage: Int) {
    kleverNotifications(pageSize: $pageSize, currentPage: $currentPage) {
      items {
        id
        severity
        title
        description
        url
        is_read
        date_added
      }
      total_count
      unread_count
    }
  }
`;

export const KLEVER_FAVORITE_PRODUCTS_QUERY = /* GraphQL */ `
  query KleverFavoriteProducts($pageSize: Int, $currentPage: Int) {
    kleverFavoriteProducts(pageSize: $pageSize, currentPage: $currentPage) {
      products {
        product_id
        sku
        name
        brand
        image_url
        final_price
        stock_status
        product_url
      }
      total_count
    }
  }
`;

export const KLEVER_CHECKOUT_TOTALS_QUERY = /* GraphQL */ `
  query KleverCheckoutTotals {
    kleverCheckoutTotals {
      cart_id
      subtotal
      shipping_amount
      tax_amount
      discount_amount
      grand_total
      currency_code
      shipping_method
      billing_address {
        id
        firstname
        lastname
        company
        street
        city
        region
        region_id
        postcode
        country_id
        telephone
        email
      }
      shipping_address {
        id
        firstname
        lastname
        company
        street
        city
        region
        region_id
        postcode
        country_id
        telephone
        email
      }
      items {
        item_id
        product_id
        sku
        name
        qty
        price
        row_total
        image_url
        product_url
        size_display
        pattern_display
      }
    }
  }
`;

export const KLEVER_CHECKOUT_PO_NUMBER_QUERY = /* GraphQL */ `
  query KleverCheckoutPoNumber {
    kleverCheckoutPoNumber
  }
`;

export const KLEVER_CHECKOUT_ORDER_COMMENT_QUERY = /* GraphQL */ `
  query KleverCheckoutOrderComment {
    kleverCheckoutOrderComment
  }
`;

export const KLEVER_CHECKOUT_PO_FILES_QUERY = /* GraphQL */ `
  query KleverCheckoutPoFiles {
    kleverCheckoutPoFiles
  }
`;

export const KLEVER_CHECKOUT_SHIPPING_EXTRAS_QUERY = /* GraphQL */ `
  query KleverCheckoutShippingExtras {
    kleverCheckoutShippingExtras {
      delivery_date
      delivery_comment
      pickup_store
      pickup_date
      pickup_time
      pickup_person_name
      pickup_mobile_number
      fee
    }
  }
`;

export const KLEVER_CHECKOUT_PICKUP_TIME_SLOTS_QUERY = /* GraphQL */ `
  query KleverCheckoutPickupTimeSlots($storeId: Int!, $date: String!) {
    kleverCheckoutPickupTimeSlots(storeId: $storeId, date: $date) {
      time
      label
      enabled
    }
  }
`;

export const KLEVER_CHECKOUT_SUCCESS_QUERY = /* GraphQL */ `
  query KleverCheckoutSuccess($orderId: Int!) {
    kleverCheckoutSuccess(orderId: $orderId) {
      order_id
      order_increment_id
      message
      continue_shopping_url
      order_view_url
    }
  }
`;

export const KLEVER_DISCOUNT_POPUP_QUERY = /* GraphQL */ `
  query KleverDiscountPopup {
    kleverDiscountPopup {
      applied_coupons {
        code
        discount_amount
        rule_name
      }
      promo_rules {
        rule_id
        rule_type
        max_qty
        discount_amount
        items {
          sku
          name
          product_id
          image_url
          original_price
          promo_price
          available_qty
        }
      }
      common_qty
      selection_method
      gifts_counter_enabled
      auto_open_popup
      total_discount
      subtotal
      grand_total
      currency_code
    }
  }
`;

export const KLEVER_MENU_ITEMS_QUERY = /* GraphQL */ `
  query KleverMenuItems {
    kleverMenuItems {
      code
      label
      url
      is_visible
      sort_order
      category_id
    }
  }
`;
