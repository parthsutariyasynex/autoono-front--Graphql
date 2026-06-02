import * as Types from '../constants/actionTypes';
import { axiosGet } from '../axiosHelper';

// Module-level inflight promise so concurrent dispatchers share one HTTP
// call. Prevents double-fetch from (a) Navbar + page both dispatching on
// mount and (b) React StrictMode (dev) running effects twice. Reducer now
// also tracks `loading: true` between REQUEST and SUCCESS/FAILURE.
let _fetchCustomerInflight: Promise<void> | null = null;

export const fetchCustomerInfo = (cb?: (err: any, data?: any) => void) => async (dispatch: any) => {
    // If a fetch is already in flight, attach the callback to it and exit —
    // no duplicate network call.
    if (_fetchCustomerInflight) {
        if (cb) {
            _fetchCustomerInflight
                .then(() => cb(null))
                .catch((err) => cb(err));
        }
        return;
    }

    dispatch({ type: Types.FETCH_CUSTOMER_REQUEST });

    _fetchCustomerInflight = new Promise<void>((resolve, reject) => {
        axiosGet({ url: '/my-account' }, (response) => {
            if (response.status === 200) {
                dispatch({ type: Types.FETCH_CUSTOMER_SUCCESS, payload: response.data });
                if (cb) cb(null, response.data);
                resolve();
            } else {
                const message = response.data?.message || 'Failed to load customer';
                dispatch({ type: Types.FETCH_CUSTOMER_FAILURE, payload: message });
                if (cb) cb(message);
                reject(message);
            }
        });
    }).finally(() => {
        _fetchCustomerInflight = null;
    });

    // Swallow rejection so dispatchers never see unhandled promise rejections;
    // the reducer/callback path already handles the failure.
    _fetchCustomerInflight.catch(() => { });
};

export const clearCustomer = () => (dispatch: any) => {
    dispatch({ type: Types.CLEAR_CUSTOMER });
};
