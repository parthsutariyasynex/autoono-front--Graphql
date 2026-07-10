export const ADD_PRODUCTS_TO_CART_MUTATION = /* GraphQL */ `
  mutation AddProductsToCart($cartId: String!, $cartItems: [CartItemInput!]!) {
    addProductsToCart(cartId: $cartId, cartItems: $cartItems) {
      cart {
        id
        total_quantity
      }
      user_errors {
        code
        message
      }
    }
  }
`;

export const GENERATE_CUSTOMER_TOKEN_MUTATION = /* GraphQL */ `
  mutation GenerateCustomerToken($email: String!, $password: String!) {
    generateCustomerToken(email: $email, password: $password) {
      token
    }
  }
`;


export const REVOKE_CUSTOMER_TOKEN_MUTATION = /* GraphQL */ `
  mutation RevokeCustomerToken {
    revokeCustomerToken {
      result
    }
  }
`;

export const REQUEST_PASSWORD_RESET_EMAIL_MUTATION = /* GraphQL */ `
  mutation RequestPasswordResetEmail($email: String!) {
    requestPasswordResetEmail(email: $email)
  }
`;

export const RESET_PASSWORD_MUTATION = /* GraphQL */ `
  mutation ResetPassword($email: String!, $resetPasswordToken: String!, $newPassword: String!) {
    resetPassword(
      email: $email
      resetPasswordToken: $resetPasswordToken
      newPassword: $newPassword
    )
  }
`;

export const CHANGE_CUSTOMER_PASSWORD_MUTATION = /* GraphQL */ `
  mutation ChangeCustomerPassword($currentPassword: String!, $newPassword: String!) {
    changeCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      id
      email
    }
  }
`;

export const SEND_OTP_TO_CUSTOMER_MUTATION = /* GraphQL */ `
  mutation SendOtpToCustomer($resend: Int!, $storeId: Int!, $mobile: String!, $eventType: String!) {
    sendOtpToCustomer(resend: $resend, storeId: $storeId, mobile: $mobile, eventType: $eventType) {
      message
    }
  }
`;

export const CREATE_CUSTOMER_TOKEN_WITH_OTP_MUTATION = /* GraphQL */ `
  mutation CreateCustomerTokenWithOtp($mobile: String!, $otp: String!, $websiteId: Int!) {
    createCustomerTokenWithOtp(mobile: $mobile, otp: $otp, websiteId: $websiteId) {
      message
      token
    }
  }
`;

export const INITIATE_PASSWORD_RESET_WITH_OTP_MUTATION = /* GraphQL */ `
  mutation InitiatePasswordResetWithOtp($mobile: String!, $otp: String!, $template: String!, $websiteId: Int!) {
    initiatePasswordResetWithOTP(
      mobile: $mobile
      otp: $otp
      template: $template
      websiteId: $websiteId
    ) {
      message
    }
  }
`;

export const CONTACT_US_MUTATION = /* GraphQL */ `
  mutation ContactUs($input: ContactUsInput!) {
    contactUs(input: $input) {
      status
    }
  }
`;

export const CREATE_CUSTOMER_ADDRESS_MUTATION = /* GraphQL */ `
  mutation CreateCustomerAddress($input: CustomerAddressInput!) {
    createCustomerAddress(input: $input) {
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
`;

export const UPDATE_CUSTOMER_ADDRESS_MUTATION = /* GraphQL */ `
  mutation UpdateCustomerAddress($id: Int!, $input: CustomerAddressInput!) {
    updateCustomerAddress(id: $id, input: $input) {
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
`;

export const DELETE_CUSTOMER_ADDRESS_MUTATION = /* GraphQL */ `
  mutation DeleteCustomerAddress($id: Int!) {
    deleteCustomerAddress(id: $id)
  }
`;

export const KLEVER_CREATE_SUBACCOUNT_MUTATION = /* GraphQL */ `
  mutation KleverCreateSubaccount(
    $firstname: String!
    $lastname: String!
    $email: String!
    $password: String!
    $isActive: Int
    $permissions: [Int]
    $taxvat: String
  ) {
    kleverCreateSubaccount(
      firstname: $firstname
      lastname: $lastname
      email: $email
      password: $password
      isActive: $isActive
      permissions: $permissions
      taxvat: $taxvat
    ) {
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

export const KLEVER_UPDATE_SUBACCOUNT_MUTATION = /* GraphQL */ `
  mutation KleverUpdateSubaccount(
    $subaccountId: Int!
    $firstname: String
    $lastname: String
    $email: String
    $password: String
    $isActive: Int
    $permissions: [Int]
    $taxvat: String
  ) {
    kleverUpdateSubaccount(
      subaccountId: $subaccountId
      firstname: $firstname
      lastname: $lastname
      email: $email
      password: $password
      isActive: $isActive
      permissions: $permissions
      taxvat: $taxvat
    ) {
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

export const KLEVER_DELETE_SUBACCOUNT_MUTATION = /* GraphQL */ `
  mutation KleverDeleteSubaccount($subaccountId: Int!) {
    kleverDeleteSubaccount(subaccountId: $subaccountId) {
      success
      message
    }
  }
`;

export const KLEVER_LOGIN_AS_SUBACCOUNT_MUTATION = /* GraphQL */ `
  mutation KleverLoginAsSubaccount($subaccountId: Int!) {
    kleverLoginAsSubaccount(subaccountId: $subaccountId) {
      token
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
    }
  }
`;

export const UPDATE_CART_ITEMS_MUTATION = /* GraphQL */ `
  mutation UpdateCartItems($cartId: String!, $items: [CartItemUpdateInput!]!) {
    updateCartItems(input: { cart_id: $cartId, cart_items: $items }) {
      cart {
        id
        items {
          id
          quantity
        }
      }
    }
  }
`;

export const REMOVE_ITEM_FROM_CART_MUTATION = /* GraphQL */ `
  mutation RemoveItemFromCart($cartId: String!, $cartItemId: Int!) {
    removeItemFromCart(input: { cart_id: $cartId, cart_item_id: $cartItemId }) {
      cart {
        id
        items {
          id
          quantity
        }
      }
    }
  }
`;

export const APPLY_COUPON_TO_CART_MUTATION = /* GraphQL */ `
  mutation ApplyCouponToCart($cartId: String!, $couponCode: String!) {
    applyCouponToCart(input: { cart_id: $cartId, coupon_code: $couponCode }) {
      cart {
        applied_coupons {
          code
        }
        prices {
          grand_total { value currency }
          discounts {
            amount { value currency }
            label
          }
        }
      }
    }
  }
`;

export const REMOVE_COUPON_FROM_CART_MUTATION = /* GraphQL */ `
  mutation RemoveCouponFromCart($cartId: String!) {
    removeCouponFromCart(input: { cart_id: $cartId }) {
      cart {
        applied_coupons {
          code
        }
        prices {
          grand_total { value currency }
        }
      }
    }
  }
`;

export const KLEVER_PAYMENT_HISTORY_SAVE_MUTATION = /* GraphQL */ `
  mutation KleverPaymentHistorySave(
    $orderId: Int!
    $paidPayment: Float!
    $paymentDate: String
    $paymentMethod: String
    $sapInvoiceNo: String
    $remarks: String
    $comment1: String
    $comment2: String
    $signedDocBase64: String
    $signedDocName: String
  ) {
    kleverPaymentHistorySave(
      orderId: $orderId
      paidPayment: $paidPayment
      paymentDate: $paymentDate
      paymentMethod: $paymentMethod
      sapInvoiceNo: $sapInvoiceNo
      remarks: $remarks
      comment1: $comment1
      comment2: $comment2
      signedDocBase64: $signedDocBase64
      signedDocName: $signedDocName
    ) {
      success
      message
      payment_id
      receipt_no
    }
  }
`;

// Account-level payment (My Payment page header "Make Payment").
// Uses paymentFor: "account" — backend ignores orderId, records against the
// account, and computes due_payment = receivablePayment - paidPayment.
// companyName defaults to the customer's company_name attribute if omitted.
// Separate doc so the shared order-save mutation (orderId: Int!) stays untouched.
export const KLEVER_ACCOUNT_PAYMENT_SAVE_MUTATION = /* GraphQL */ `
  mutation KleverAccountPaymentSave(
    $paidPayment: Float!
    $paymentDate: String
    $paymentMethod: String
    $remarks: String
    $companyName: String
    $receivablePayment: Float
  ) {
    kleverPaymentHistorySave(
      paymentFor: "account"
      paidPayment: $paidPayment
      paymentDate: $paymentDate
      paymentMethod: $paymentMethod
      remarks: $remarks
      companyName: $companyName
      receivablePayment: $receivablePayment
    ) {
      success
      message
      payment_id
      receipt_no
    }
  }
`;

export const KLEVER_PAYMENT_HISTORY_EDIT_MUTATION = /* GraphQL */ `
  mutation KleverPaymentHistoryEdit($paymentId: Int!, $paidPayment: Float, $remarks: String) {
    kleverPaymentHistoryEdit(paymentId: $paymentId, paidPayment: $paidPayment, remarks: $remarks) {
      success
      message
      payment_id
      receipt_no
    }
  }
`;

export const KLEVER_UPLOAD_FORECAST_MUTATION = /* GraphQL */ `
  mutation KleverUploadForecast($fileName: String!, $fileContent: String!) {
    kleverUploadForecast(fileName: $fileName, fileContent: $fileContent) {
      items {
        forecast_id
        file_name
        file_url
      }
      total_count
      message
    }
  }
`;

export const KLEVER_SUBMIT_ENQUIRY_MUTATION = /* GraphQL */ `
  mutation KleverSubmitEnquiry(
    $productSku: String!
    $productName: String!
    $qty: Int!
    $comment: String
    $phone: String
    $notifyStock: Boolean
  ) {
    kleverSubmitEnquiry(
      productSku: $productSku
      productName: $productName
      qty: $qty
      comment: $comment
      phone: $phone
      notifyStock: $notifyStock
    )
  }
`;

export const KLEVER_QUICK_ORDER_VALIDATE_MUTATION = /* GraphQL */ `
  mutation KleverQuickOrderValidate($items: [KleverQuickOrderItemRequestInput]!) {
    kleverQuickOrderValidate(items: $items) {
      grand_total
      items {
        sku
        name
        qty
        price
        row_total
        is_valid
        error_message
      }
    }
  }
`;

export const KLEVER_QUICK_ORDER_ADD_TO_CART_MUTATION = /* GraphQL */ `
  mutation KleverQuickOrderAddToCart($items: [KleverQuickOrderItemRequestInput]!) {
    kleverQuickOrderAddToCart(items: $items) {
      success
      message
      items_count
      grand_total
      redirect_url
    }
  }
`;

export const KLEVER_QUICK_ORDER_CHECKOUT_MUTATION = /* GraphQL */ `
  mutation KleverQuickOrderCheckout($items: [KleverQuickOrderItemRequestInput]!) {
    kleverQuickOrderCheckout(items: $items) {
      success
      message
      redirect_url
      items_count
      grand_total
    }
  }
`;

export const KLEVER_QUICK_ORDER_CLEAR_ALL_MUTATION = /* GraphQL */ `
  mutation KleverQuickOrderClearAll {
    kleverQuickOrderClearAll {
      success
      message
      items_count
      grand_total
    }
  }
`;

export const KLEVER_QUICK_ORDER_REMOVE_ITEM_MUTATION = /* GraphQL */ `
  mutation KleverQuickOrderRemoveItem($sku: String!) {
    kleverQuickOrderRemoveItem(sku: $sku) {
      success
      items_count
      grand_total
    }
  }
`;

export const KLEVER_QUICK_ORDER_UPDATE_ITEM_QTY_MUTATION = /* GraphQL */ `
  mutation KleverQuickOrderUpdateItemQty($sku: String!, $qty: Float!) {
    kleverQuickOrderUpdateItemQty(sku: $sku, qty: $qty) {
      success
      items_count
      grand_total
    }
  }
`;

export const KLEVER_QUICK_ORDER_UPLOAD_CSV_MUTATION = /* GraphQL */ `
  mutation KleverQuickOrderUploadCsv($fileContent: String!) {
    kleverQuickOrderUploadCsv(fileContent: $fileContent) {
      grand_total
      items {
        sku
        name
        qty
        price
        is_valid
        error_message
      }
    }
  }
`;

export const KLEVER_MARK_NOTIFICATION_AS_READ_MUTATION = /* GraphQL */ `
  mutation KleverMarkNotificationAsRead($notificationId: Int!) {
    kleverMarkNotificationAsRead(notificationId: $notificationId) {
      success
      message
    }
  }
`;

export const KLEVER_REMOVE_NOTIFICATION_MUTATION = /* GraphQL */ `
  mutation KleverRemoveNotification($notificationId: Int!) {
    kleverRemoveNotification(notificationId: $notificationId) {
      success
      message
    }
  }
`;

export const KLEVER_ADD_FAVORITE_PRODUCT_MUTATION = /* GraphQL */ `
  mutation KleverAddFavoriteProduct($productId: Int!) {
    kleverAddFavoriteProduct(productId: $productId)
  }
`;

export const KLEVER_REMOVE_FAVORITE_PRODUCT_MUTATION = /* GraphQL */ `
  mutation KleverRemoveFavoriteProduct($productId: Int!) {
    kleverRemoveFavoriteProduct(productId: $productId)
  }
`;

export const KLEVER_CANCEL_ORDER_MUTATION = /* GraphQL */ `
  mutation KleverCancelOrder($orderId: Int!) {
    kleverCancelOrder(orderId: $orderId) {
      success
      message
      order_id
      order_increment_id
    }
  }
`;

export const KLEVER_CONFIRM_ORDER_MUTATION = /* GraphQL */ `
  mutation KleverConfirmOrder($orderId: Int!, $request: KleverConfirmOrderRequestInput!) {
    kleverConfirmOrder(orderId: $orderId, request: $request) {
      success
      message
      order_id
      order_increment_id
      attachments { attachment_id file_name file_url }
    }
  }
`;

export const REORDER_ITEMS_MUTATION = /* GraphQL */ `
  mutation ReorderItems($orderNumber: String!) {
    reorderItems(orderNumber: $orderNumber) {
      cart {
        id
        total_quantity
        items {
          quantity
          product { sku }
        }
      }
      userInputErrors { code message }
    }
  }
`;

export const SET_SHIPPING_ADDRESSES_ON_CART_MUTATION = /* GraphQL */ `
  mutation SetShippingAddressesOnCart($cartId: String!, $addressId: Int!) {
    setShippingAddressesOnCart(
      input: { cart_id: $cartId, shipping_addresses: [{ customer_address_id: $addressId }] }
    ) {
      cart {
        shipping_addresses {
          firstname
          lastname
          street
          city
          postcode
          telephone
          country { code label }
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
  }
`;

export const SET_SHIPPING_METHODS_ON_CART_MUTATION = /* GraphQL */ `
  mutation SetShippingMethodsOnCart($cartId: String!, $carrierCode: String!, $methodCode: String!) {
    setShippingMethodsOnCart(
      input: {
        cart_id: $cartId
        shipping_methods: [{ carrier_code: $carrierCode, method_code: $methodCode }]
      }
    ) {
      cart {
        shipping_addresses {
          selected_shipping_method {
            carrier_code
            method_code
            amount { value currency }
          }
        }
      }
    }
  }
`;

export const SET_PAYMENT_METHOD_ON_CART_MUTATION = /* GraphQL */ `
  mutation SetPaymentMethodOnCart($cartId: String!, $code: String!) {
    setPaymentMethodOnCart(input: { cart_id: $cartId, payment_method: { code: $code } }) {
      cart {
        selected_payment_method {
          code
          title
        }
      }
        
    }
  }
`;

export const PLACE_ORDER_MUTATION = /* GraphQL */ `
  mutation PlaceOrder($cartId: String!) {
    placeOrder(input: { cart_id: $cartId }) {
      order {
        order_number
      }
    }
  }
`;

export const KLEVER_CHECKOUT_SET_PO_NUMBER_MUTATION = /* GraphQL */ `
  mutation KleverCheckoutSetPoNumber($poNumber: String!) {
    kleverCheckoutSetPoNumber(poNumber: $poNumber)
  }
`;

export const KLEVER_CHECKOUT_SET_ORDER_COMMENT_MUTATION = /* GraphQL */ `
  mutation KleverCheckoutSetOrderComment($comment: String!) {
    kleverCheckoutSetOrderComment(comment: $comment)
  }
`;

export const KLEVER_CHECKOUT_PO_UPLOAD_MUTATION = /* GraphQL */ `
  mutation KleverCheckoutPoUpload($fileName: String!, $fileContent: String!, $type: String) {
    kleverCheckoutPoUpload(fileName: $fileName, fileContent: $fileContent, type: $type)
  }
`;

export const KLEVER_CHECKOUT_PO_REMOVE_FILE_MUTATION = /* GraphQL */ `
  mutation KleverCheckoutPoRemoveFile($fileName: String!) {
    kleverCheckoutPoRemoveFile(fileName: $fileName)
  }
`;

export const KLEVER_CHECKOUT_SET_SHIPPING_EXTRAS_MUTATION = /* GraphQL */ `
  mutation KleverCheckoutSetShippingExtras(
    $deliveryDate: String
    $deliveryComment: String
    $pickupStore: String
    $pickupDate: String
    $pickupTime: String
    $pickupPersonName: String
    $pickupMobileNumber: String
    $fee: Int
  ) {
    kleverCheckoutSetShippingExtras(
      deliveryDate: $deliveryDate
      deliveryComment: $deliveryComment
      pickupStore: $pickupStore
      pickupDate: $pickupDate
      pickupTime: $pickupTime
      pickupPersonName: $pickupPersonName
      pickupMobileNumber: $pickupMobileNumber
      fee: $fee
    )
  }
`;

export const KLEVER_ADD_PROMO_ITEMS_MUTATION = /* GraphQL */ `
  mutation KleverAddPromoItems($items: [KleverPromoItemRequestInput]!) {
    kleverAddPromoItems(items: $items) {
      success
      message
      total_discount
      grand_total
      applied_coupons {
        code
        rule_name
      }
    }
  }
`;

export const KLEVER_UPDATE_BUSINESS_OVERVIEW_MUTATION = /* GraphQL */ `
  mutation KleverUpdateBusinessOverview(
    $totalEmployees: String
    $trucks: String
    $annualRevenue: String
    $businessModel: String
    $productsOffered: String
  ) {
    kleverUpdateBusinessOverview(
      totalEmployees: $totalEmployees
      trucks: $trucks
      annualRevenue: $annualRevenue
      businessModel: $businessModel
      productsOffered: $productsOffered
    ) {
      success
      message
    }
  }
`;
