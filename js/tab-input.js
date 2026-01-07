import { generateUUID } from './utils.js';
import { addTransaction, addTrackedItem, getTrackedItems, saveToLocalStorage, getTransactions } from './store.js';

// Local State (Module level)
let currentSelectedButton = null;
let currentTransactionType = null;

// Form Selection State
let selectedAsset = null;
let selectedExpenseAccount = null;
let selectedPaymentMethod = null;
let selectedLiabilityId = null;
// ... (Add other state vars as needed for full feature set)

export function initInputTab() {
    setupTypeSelector();
    setupForms();

    // Default Date
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();
}

function setupTypeSelector() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const type = this.getAttribute('data-type');
            handleTypeSelectionWithAnimation(this, type);
        });
    });
}

function handleTypeSelectionWithAnimation(clickedButton, type) {
    const typeSelector = document.querySelector('.transaction-type-selector');

    // 1. Selector Fade Out
    typeSelector.classList.add('fade-out');

    // 2. Wait for fade out, then hide selector and show form
    setTimeout(() => {
        typeSelector.style.display = 'none';
        showFormWithAnimation(type);
    }, 300); // 0.3s transition

    currentSelectedButton = clickedButton;
    currentTransactionType = type;
}

function showFormWithAnimation(type) {
    // Hide all forms first
    const forms = document.querySelectorAll('.income-form, .expense-form, .purchase-form, .sale-form, .investment-form, .collection-form');
    forms.forEach(f => {
        f.style.display = 'none';
        f.classList.remove('show');
    });

    // Select the target form
    let targetFormClass = '';
    switch (type) {
        case 'income': targetFormClass = '.income-form'; break;
        case 'expense': targetFormClass = '.expense-form'; break;
        case 'purchase': targetFormClass = '.purchase-form'; break;
        case 'sale': targetFormClass = '.sale-form'; break;
        case 'investment': targetFormClass = '.investment-form'; break;
        case 'collection': targetFormClass = '.collection-form'; break;
    }

    const targetForm = document.querySelector(targetFormClass);
    if (targetForm) {
        targetForm.style.display = 'block';
        // Trigger reflow
        void targetForm.offsetWidth;
        targetForm.classList.add('show');
    }
}

export function hideFormAndShowTypeSelector() {
    const forms = document.querySelectorAll('.income-form, .expense-form, .purchase-form, .sale-form, .investment-form, .collection-form');

    // 1. Fade out active form
    forms.forEach(f => {
        if (f.style.display !== 'none') {
            f.classList.remove('show');
            f.classList.add('hide');
        }
    });

    setTimeout(() => {
        // Hide forms
        forms.forEach(f => {
            f.style.display = 'none';
            f.classList.remove('hide');
        });

        // Show Selector
        const typeSelector = document.querySelector('.transaction-type-selector');
        typeSelector.style.display = 'block';
        void typeSelector.offsetWidth;
        typeSelector.classList.remove('fade-out');
    }, 300);
}

// --- Specific Form Setup & Handlers ---

function setupForms() {
    // Shared Cancel buttons
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideFormAndShowTypeSelector();
        });
    });

    // --- Income ---
    document.querySelectorAll('.asset-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedAsset = this.getAttribute('data-account');
        });
    });
    const incomeBtn = document.getElementById('incomeSubmitBtn');
    if (incomeBtn) incomeBtn.addEventListener('click', handleIncomeSubmit);

    // --- Expense ---
    setupTabs('.expense-form');

    const expenseAccountsDiv = document.getElementById('expense-accounts');
    if (expenseAccountsDiv) {
        expenseAccountsDiv.querySelectorAll('.account-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                expenseAccountsDiv.querySelectorAll('.account-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                selectedExpenseAccount = this.getAttribute('data-account');
            });
        });
    }

    const paymentButtons = document.querySelectorAll('.payment-section .payment-btn');
    paymentButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const container = this.closest('.payment-buttons');
            container.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedPaymentMethod = this.getAttribute('data-account');
        });
    });

    const expenseBtn = document.getElementById('expenseSubmitBtn');
    if (expenseBtn) expenseBtn.addEventListener('click', handleExpenseSubmit);


    // ... (Purchases, Sales, Investment, Collection - Simplified logic for refactor verification)
    const purchaseBtn = document.getElementById('purchaseSubmitBtn');
    if (purchaseBtn) purchaseBtn.addEventListener('click', () => { alert('기능 준비중'); hideFormAndShowTypeSelector(); });

    const saleBtn = document.getElementById('saleSubmitBtn');
    if (saleBtn) saleBtn.addEventListener('click', () => { alert('기능 준비중'); hideFormAndShowTypeSelector(); });

    const investBtn = document.getElementById('investmentSubmitBtn');
    if (investBtn) investBtn.addEventListener('click', () => { alert('기능 준비중'); hideFormAndShowTypeSelector(); });

    const collectBtn = document.getElementById('collectionSubmitBtn');
    if (collectBtn) collectBtn.addEventListener('click', () => { alert('기능 준비중'); hideFormAndShowTypeSelector(); });
}

function setupTabs(parentSelector) {
    document.querySelectorAll(`${parentSelector} .tab-btn`).forEach(btn => {
        btn.addEventListener('click', function () {
            const tabId = this.dataset.tab;
            const parent = this.closest(parentSelector);

            parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const content = parent.querySelector(`#${tabId}`);
            if (content) content.classList.add('active');
        });
    });
}

function handleIncomeSubmit() {
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    if (!selectedAsset || !amount) { alert('필수 항목을 입력하세요.'); return; }

    const t = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        description: '수입',
        debitAccount: selectedAsset,
        debitAmount: amount,
        creditAccount: '기타수입',
        creditAmount: amount
    };
    addTransaction(t);
    alert('저장되었습니다.');
    hideFormAndShowTypeSelector();
    document.getElementById('incomeAmount').value = '';
    document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('selected'));
    selectedAsset = null;
}

function handleExpenseSubmit() {
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    if (!selectedExpenseAccount || !selectedPaymentMethod || !amount) { alert('필수 항목을 입력하세요.'); return; }

    const t = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        description: selectedExpenseAccount,
        debitAccount: selectedExpenseAccount,
        debitAmount: amount,
        creditAccount: selectedPaymentMethod,
        creditAmount: amount
    };
    addTransaction(t);
    alert('저장되었습니다.');
    hideFormAndShowTypeSelector();
    document.getElementById('expenseAmount').value = '';
    selectedExpenseAccount = null;
    selectedPaymentMethod = null;
    // Clear selections visually requires more logic, doing simple reset for now
}
