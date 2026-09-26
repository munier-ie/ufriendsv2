import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import GlobalModal from '../components/common/GlobalModal';

const ModalContext = createContext(null);

// Global singleton dispatcher for imperative calls outside React trees
let globalDispatcher = null;

export const enrichModalConfig = (messageOrOptions, defaultType = 'info', extraOptions = {}) => {
    const raw = typeof messageOrOptions === 'string'
        ? { message: messageOrOptions, type: defaultType, ...extraOptions }
        : { type: defaultType, ...messageOrOptions, ...extraOptions };

    const type = raw.type || defaultType;
    let message = (raw.message || '').toString().trim();
    let title = raw.title;
    let actionText = raw.actionText;
    let cancelText = raw.cancelText;
    let onAction = raw.onAction;
    let onCancel = raw.onCancel;
    let autoClose = raw.autoClose ?? (type === 'success' ? true : false);
    let balanceInfo = raw.balanceInfo || null;

    const lowerMsg = message.toLowerCase();

    // 1. INSUFFICIENT WALLET / BALANCE
    if (
        lowerMsg.includes('insufficient') ||
        lowerMsg.includes('wallet balance') ||
        lowerMsg.includes('low balance') ||
        lowerMsg.includes('fund your wallet') ||
        lowerMsg.includes('insufficient funds')
    ) {
        if (!title) title = 'Insufficient Balance';

        // Extract Required & Available amounts if present in the message
        // e.g. "Insufficient wallet balance. Required: ₦500.00, Available: ₦120.00"
        const reqMatch = message.match(/Required:\s*([₦#]?[0-9,.]+(?:\.\d{2})?)/i);
        const availMatch = message.match(/Available:\s*([₦#]?[0-9,.]+(?:\.\d{2})?)/i);
        const needMatch = message.match(/You need\s*([₦#]?[0-9,.]+(?:\.\d{2})?)/i);

        const cleanAmount = (str) => str ? str.replace(/[,\s.;]+$/, '').trim() : null;

        if (reqMatch || availMatch || needMatch) {
            balanceInfo = {
                required: cleanAmount(reqMatch ? reqMatch[1] : (needMatch ? needMatch[1] : null)),
                available: cleanAmount(availMatch ? availMatch[1] : null)
            };
        }

        // Expand bare message with clear explanation & guidance
        if (
            lowerMsg === 'insufficient wallet balance' ||
            lowerMsg === 'insufficient balance' ||
            lowerMsg === 'insufficient funds' ||
            lowerMsg.startsWith('insufficient wallet balance.')
        ) {
            message = 'Your wallet balance is too low to complete this transaction. Please fund your wallet to proceed.';
        } else if (!lowerMsg.includes('fund') && !lowerMsg.includes('top up') && !lowerMsg.includes('add money')) {
            message = `${message.replace(/\.\s*$/, '')}. Please fund your wallet to proceed.`;
        }

        if (!actionText) actionText = 'Fund Wallet';
        if (!cancelText) cancelText = 'Cancel';
        if (!onAction) {
            onAction = () => {
                window.location.href = '/dashboard/virtual-accounts';
            };
        }
    }
    // 2. SESSION EXPIRED / UNAUTHORIZED
    else if (
        lowerMsg.includes('unauthorized') ||
        lowerMsg.includes('jwt expired') ||
        lowerMsg.includes('token expired') ||
        lowerMsg.includes('session expired') ||
        lowerMsg.includes('invalid token') ||
        lowerMsg.includes('not logged in')
    ) {
        if (!title) title = 'Session Expired';
        if (lowerMsg === 'unauthorized' || lowerMsg === 'jwt expired' || lowerMsg === 'invalid token') {
            message = 'Your login session has expired for security reasons. Please log in again to continue.';
        }
        if (!actionText) actionText = 'Log In Again';
        if (!cancelText) cancelText = 'Dismiss';
        if (!onAction) {
            onAction = () => {
                window.location.href = '/login';
            };
        }
    }
    // 3. NETWORK / CONNECTION ERROR
    else if (
        lowerMsg.includes('network error') ||
        lowerMsg.includes('failed to fetch') ||
        lowerMsg.includes('econnrefused') ||
        lowerMsg.includes('err_connection') ||
        lowerMsg.includes('check your connection') ||
        lowerMsg.includes('no internet')
    ) {
        if (!title) title = 'Connection Problem';
        if (lowerMsg === 'network error' || lowerMsg === 'failed to fetch' || lowerMsg.includes('no internet')) {
            message = 'Unable to reach the Ufriends server. Please check your internet connection and try again.';
        }
        if (!actionText) actionText = 'Retry';
        if (!cancelText) cancelText = 'Dismiss';
    }
    // 4. TRANSACTION PIN / SECURITY
    else if (
        lowerMsg.includes('incorrect pin') ||
        lowerMsg.includes('wrong pin') ||
        lowerMsg.includes('invalid pin') ||
        lowerMsg.includes('pin entered')
    ) {
        if (!title) title = 'Incorrect Transaction PIN';
        if (lowerMsg.includes('incorrect pin')) {
            message = 'The 4-digit transaction PIN you entered is incorrect. Please verify your PIN and try again.';
        }
        if (!actionText) actionText = 'Try Again';
        if (!cancelText) cancelText = 'Cancel';
    }
    // 5. SERVICE / PROVIDER DOWNTIME
    else if (
        lowerMsg.includes('temporarily unavailable') ||
        lowerMsg.includes('provider down') ||
        lowerMsg.includes('undergoing maintenance') ||
        lowerMsg.includes('service down') ||
        lowerMsg.includes('server error')
    ) {
        if (!title) title = 'Service Temporarily Unavailable';
        if (!actionText) actionText = 'Understood';
    }
    // 6. VALIDATION & INPUT REQUIREMENTS
    else if (
        lowerMsg.includes('must be') ||
        lowerMsg.includes('please enter') ||
        lowerMsg.includes('please upload') ||
        lowerMsg.includes('required') ||
        lowerMsg.includes('invalid email') ||
        lowerMsg.includes('invalid phone') ||
        lowerMsg.includes('11 digits') ||
        lowerMsg.includes('agree to the terms')
    ) {
        if (!title) title = 'Information Required';
        if (!actionText) actionText = 'Check Details';
    }
    // 7. TIMEOUT / PENDING VERIFICATION
    else if (
        lowerMsg.includes('timed out') ||
        lowerMsg.includes('timeout') ||
        lowerMsg.includes('verification timed')
    ) {
        if (!title) title = 'Verification Pending';
        if (!actionText) actionText = 'View History';
        if (!cancelText) cancelText = 'Close';
        if (!onAction) {
            onAction = () => {
                window.location.href = '/dashboard/transactions';
            };
        }
    }
    // 8. SUCCESS TYPES
    else if (type === 'success') {
        if (!title) {
            if (lowerMsg.includes('copied')) title = 'Copied to Clipboard';
            else if (lowerMsg.includes('saved') || lowerMsg.includes('updated')) title = 'Changes Saved';
            else if (lowerMsg.includes('funded') || lowerMsg.includes('credit')) title = 'Wallet Funded';
            else if (lowerMsg.includes('retrieved') || lowerMsg.includes('generated')) title = 'Successfully Retrieved';
            else title = 'Operation Successful';
        }
        if (!actionText) actionText = 'Done';
    }
    // 9. WARNING TYPES
    else if (type === 'warning') {
        if (!title) title = 'Attention Required';
        if (!actionText) actionText = 'Understood';
    }
    // 10. ERROR FALLBACK
    else if (type === 'error') {
        if (!title) title = 'Action Could Not Be Completed';
        if (!actionText) actionText = 'Okay';
    }

    return {
        ...raw,
        type,
        title,
        message,
        actionText: actionText || 'Okay',
        cancelText,
        onAction,
        onCancel,
        autoClose,
        balanceInfo
    };
};

export const modal = {
    show: (options) => globalDispatcher?.show(enrichModalConfig(options, options?.type || 'info')),
    success: (messageOrOptions, options) => globalDispatcher?.success(enrichModalConfig(messageOrOptions, 'success', options)),
    error: (messageOrOptions, options) => globalDispatcher?.error(enrichModalConfig(messageOrOptions, 'error', options)),
    warning: (messageOrOptions, options) => globalDispatcher?.warning(enrichModalConfig(messageOrOptions, 'warning', options)),
    info: (messageOrOptions, options) => globalDispatcher?.info(enrichModalConfig(messageOrOptions, 'info', options)),
    loading: (messageOrOptions, options) => globalDispatcher?.loading(enrichModalConfig(messageOrOptions, 'loading', options)),
    transaction: (options) => globalDispatcher?.transaction(options),
    close: () => globalDispatcher?.close(),
    dismiss: () => globalDispatcher?.close()
};

// Seamless drop-in toast alias
export const toast = modal;

export function ModalProvider({ children }) {
    const [modalState, setModalState] = useState({
        isOpen: false,
        modalType: 'info',
        config: {}
    });

    const closeModal = useCallback(() => {
        setModalState(prev => ({
            ...prev,
            isOpen: false
        }));
    }, []);

    const openModal = useCallback((type, config = {}) => {
        setModalState({
            isOpen: true,
            modalType: type,
            config: {
                ...config,
                onClose: closeModal
            }
        });
    }, [closeModal]);

    const openTransactionModal = useCallback((transactionData) => {
        setModalState({
            isOpen: true,
            modalType: 'transaction',
            config: {
                ...transactionData,
                onClose: closeModal
            }
        });
    }, [closeModal]);

    // Connect global dispatcher
    useEffect(() => {
        globalDispatcher = {
            show: (cfg) => openModal(cfg.type || 'info', cfg),
            success: (cfg) => openModal('success', cfg),
            error: (cfg) => openModal('error', cfg),
            warning: (cfg) => openModal('warning', cfg),
            info: (cfg) => openModal('info', cfg),
            loading: (cfg) => openModal('loading', cfg),
            transaction: (txData) => openTransactionModal(txData),
            close: closeModal
        };

        return () => {
            globalDispatcher = null;
        };
    }, [openModal, openTransactionModal, closeModal]);

    const contextValue = {
        modalState,
        modal,
        showModal: openModal,
        showTransactionModal: openTransactionModal,
        closeModal
    };

    return (
        <ModalContext.Provider value={contextValue}>
            {children}
            <GlobalModal modalState={modalState} onClose={closeModal} />
        </ModalContext.Provider>
    );
}

export function useModal() {
    const ctx = useContext(ModalContext);
    if (!ctx) {
        // Return fallback proxy using the global dispatcher
        return {
            modal,
            showModal: (type, cfg) => modal.show({ ...cfg, type }),
            showTransactionModal: (txData) => modal.transaction(txData),
            closeModal: modal.close
        };
    }
    return ctx;
}

export default ModalContext;
