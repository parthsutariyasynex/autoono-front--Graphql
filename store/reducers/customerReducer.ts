import * as Types from "../constants/actionTypes";

const initialState = {
    data: null,
    loading: false,
    error: null,
};

export default (state = initialState, action: any) => {
    switch (action.type) {
        case Types.FETCH_CUSTOMER_REQUEST:
            return {
                ...state,
                loading: true,
                error: null,
            };

        case Types.FETCH_CUSTOMER_SUCCESS:
            return {
                ...state,
                data: action.payload,
                loading: false,
                error: null,
            };

        case Types.FETCH_CUSTOMER_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload || null,
            };

        case Types.CLEAR_CUSTOMER:
            return {
                ...state,
                data: null,
                loading: false,
                error: null,
            };

        default:
            return state;
    }
};
