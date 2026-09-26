import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import AlertModal from './AlertModal';
import TransactionModal from './TransactionModal';

export default function GlobalModal({ modalState, onClose }) {
    if (typeof document === 'undefined') return null;

    const { isOpen, modalType, config } = modalState || {};

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && modalType === 'transaction' && (
                <TransactionModal
                    key="modal-transaction"
                    isOpen={isOpen}
                    onClose={onClose}
                    {...config}
                />
            )}
            {isOpen && modalType !== 'transaction' && (
                <AlertModal
                    key="modal-alert"
                    isOpen={isOpen}
                    type={modalType}
                    onClose={onClose}
                    {...config}
                />
            )}
        </AnimatePresence>,
        document.body
    );
}
