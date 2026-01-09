import { generateUUID, formatCurrency } from './utils.js';
import { addTransaction, addTrackedItem, getTrackedItems, updateTrackedItem, setTransactions, getTransactions, getAccountTypes, addCustomAccount } from './store.js';

// Local State (Module level)
let currentSelectedButton = null;
let currentTransactionType = null;

// Form Selection State
let selectedAsset = null;
let selectedExpenseAccount = null;
let selectedPaymentMethod = null;
let selectedLiabilityId = null;
let selectedPurchaseType = 'immediate-expense';
let selectedPaymentMode = 'single';
let selectedSinglePaymentMethod = null;
let selectedReceiveMethod = null;
let selectedSaleType = 'sell-asset';
let selectedSaleItemId = null;
let selectedInvestmentType = 'financial-product';
let selectedInvestPaymentMethod = null;
let selectedCollectReceiveMethod = null;
let selectedCollectionItemId = null;
let selectedCollectionLiabilityId = null;

export function initInputTab() {
    setupTypeSelector();
    setupForms();
    renderExpenseAccountButtons();
    setupAddAccountButton();

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
        case 'purchase':
            targetFormClass = '.purchase-form';
            break;
        case 'sale':
            targetFormClass = '.sale-form';
            renderSaleAssetList();
            renderSaleInventoryList();
            break;
        case 'investment': targetFormClass = '.investment-form'; break;
        case 'collection':
            targetFormClass = '.collection-form';
            renderInvestmentCollectionList();
            break;
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
    // Note: expense account buttons are now rendered dynamically by renderExpenseAccountButtons()

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

    // --- Purchase ---
    setupTabs('.purchase-form');
    setupPurchaseModes();
    const purchaseBtn = document.getElementById('purchaseSubmitBtn');
    if (purchaseBtn) purchaseBtn.addEventListener('click', handlePurchaseSubmit);

    // --- Sale ---
    setupTabs('.sale-form');
    const saleReceiveButtons = document.querySelectorAll('.receive-buttons .receive-btn');
    saleReceiveButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const container = this.closest('.receive-buttons');
            container.querySelectorAll('.receive-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedReceiveMethod = this.getAttribute('data-account');
        });
    });
    const saleBtn = document.getElementById('saleSubmitBtn');
    if (saleBtn) saleBtn.addEventListener('click', handleSaleSubmit);

    // --- Investment ---
    setupTabs('.investment-form');
    const investPaymentButtons = document.querySelectorAll('.invest-payment-btn');
    investPaymentButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.invest-payment-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedInvestPaymentMethod = this.getAttribute('data-account');
        });
    });
    const investBtn = document.getElementById('investmentSubmitBtn');
    if (investBtn) investBtn.addEventListener('click', handleInvestmentSubmit);

    // --- Collection ---
    const collectReceiveButtons = document.querySelectorAll('.collect-receive-btn');
    collectReceiveButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.collect-receive-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedCollectReceiveMethod = this.getAttribute('data-account');

            // Show/hide liability section
            const liabilitySection = document.getElementById('liabilityCollectionSection');
            if (this.getAttribute('data-account') === '부채상환') {
                liabilitySection.style.display = 'block';
                renderLiabilityCollectionList();
            } else {
                liabilitySection.style.display = 'none';
            }
        });
    });
    const collectBtn = document.getElementById('collectionSubmitBtn');
    if (collectBtn) collectBtn.addEventListener('click', handleCollectionSubmit);
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

            // Update selected type
            if (parentSelector === '.purchase-form') {
                selectedPurchaseType = tabId.replace('purchase-', '');
            } else if (parentSelector === '.sale-form') {
                selectedSaleType = tabId.replace('sale-', '');
                selectedSaleItemId = null;
                document.querySelectorAll('.sale-item').forEach(item => item.classList.remove('selected'));
            } else if (parentSelector === '.investment-form') {
                selectedInvestmentType = tabId.replace('investment-', '');
            }
        });
    });
}

function setupPurchaseModes() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const mode = this.dataset.mode;
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.payment-mode-content').forEach(c => c.classList.remove('active'));
            const content = document.querySelector(`#${mode}-payment`);
            if (content) content.classList.add('active');

            selectedPaymentMode = mode;
        });
    });

    // Payment method buttons
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const container = this.closest('#single-payment');
            container.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedSinglePaymentMethod = this.getAttribute('data-account');
        });
    });

    // Split payment amount inputs
    const cashAmountInput = document.getElementById('splitCashAmount');
    const installmentAmountInput = document.getElementById('splitInstallmentAmount');
    if (cashAmountInput) cashAmountInput.addEventListener('input', updateSplitTotal);
    if (installmentAmountInput) installmentAmountInput.addEventListener('input', updateSplitTotal);
}

function updateSplitTotal() {
    const cashAmount = parseFloat(document.getElementById('splitCashAmount').value) || 0;
    const installmentAmount = parseFloat(document.getElementById('splitInstallmentAmount').value) || 0;
    const total = cashAmount + installmentAmount;

    const totalDisplay = document.getElementById('splitTotalAmount');
    if (totalDisplay) {
        totalDisplay.textContent = formatCurrency(total);
    }
}

// ===== SUBMIT HANDLERS =====

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
}

function handlePurchaseSubmit() {
    const trackedItems = getTrackedItems();
    let itemName, itemAmount, itemType, trackedItemId = null;

    // Get purchase item info
    if (selectedPurchaseType === 'immediate-expense') {
        itemName = document.getElementById('immediateExpenseName').value;
        itemAmount = parseFloat(document.getElementById('immediateExpenseAmount').value);
        itemType = 'expense';

        if (!itemName) { alert('항목명을 입력해주세요.'); return; }
        if (!itemAmount || itemAmount <= 0) { alert('금액을 입력해주세요.'); return; }
    } else if (selectedPurchaseType === 'depreciable-asset') {
        itemName = document.getElementById('assetName').value;
        itemAmount = parseFloat(document.getElementById('assetAmount').value);
        itemType = 'asset';

        if (!itemName) { alert('자산명을 입력해주세요.'); return; }
        if (!itemAmount || itemAmount <= 0) { alert('금액을 입력해주세요.'); return; }

        // Create tracked asset
        const asset = {
            id: generateUUID(),
            name: itemName,
            type: 'depreciable-asset',
            originalAmount: itemAmount,
            currentAmount: itemAmount,
            createdAt: new Date().toISOString()
        };
        addTrackedItem(asset);
        trackedItemId = asset.id;
    } else if (selectedPurchaseType === 'inventory') {
        itemName = document.getElementById('inventoryName').value;
        const quantity = parseInt(document.getElementById('inventoryQuantity').value);
        const price = parseFloat(document.getElementById('inventoryPrice').value);
        itemAmount = quantity * price;
        itemType = 'inventory';

        if (!itemName) { alert('재고명을 입력해주세요.'); return; }
        if (!quantity || quantity <= 0) { alert('수량을 입력해주세요.'); return; }
        if (!price || price <= 0) { alert('단가를 입력해주세요.'); return; }

        // Create tracked inventory
        const inventory = {
            id: generateUUID(),
            name: itemName,
            type: 'inventory',
            quantity: quantity,
            unitPrice: price,
            totalAmount: itemAmount,
            createdAt: new Date().toISOString()
        };
        addTrackedItem(inventory);
        trackedItemId = inventory.id;
    }

    // Create transaction based on payment mode
    if (selectedPaymentMode === 'single') {
        if (!selectedSinglePaymentMethod) { alert('지불 수단을 선택해주세요.'); return; }

        if (selectedSinglePaymentMethod === '할부') {
            // Installment: create new liability
            const liabilityName = `${itemName} 할부`;
            const liability = {
                id: generateUUID(),
                name: liabilityName,
                originalAmount: itemAmount,
                currentAmount: itemAmount,
                createdAt: new Date().toISOString()
            };
            addTrackedItem(liability);

            const transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                description: `${itemName} 구입 (할부)`,
                debitAccount: itemType === 'expense' ? '기타비용' : (itemType === 'asset' ? '상각자산' : '재고'),
                debitAmount: itemAmount,
                creditAccount: '부채',
                creditAmount: itemAmount,
                trackedItemId: trackedItemId,
                liabilityId: liability.id
            };
            addTransaction(transaction);
        } else {
            // Cash or bank deposit
            const transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                description: `${itemName} 구입`,
                debitAccount: itemType === 'expense' ? '기타비용' : (itemType === 'asset' ? '상각자산' : '재고'),
                debitAmount: itemAmount,
                creditAccount: selectedSinglePaymentMethod,
                creditAmount: itemAmount,
                trackedItemId: trackedItemId
            };
            addTransaction(transaction);
        }
    } else if (selectedPaymentMode === 'split') {
        const cashMethod = document.getElementById('splitCashMethod').value;
        const cashAmount = parseFloat(document.getElementById('splitCashAmount').value) || 0;
        const installmentAmount = parseFloat(document.getElementById('splitInstallmentAmount').value) || 0;

        if (cashAmount <= 0 && installmentAmount <= 0) { alert('지불 금액을 입력해주세요.'); return; }

        const totalPayment = cashAmount + installmentAmount;
        if (Math.abs(totalPayment - itemAmount) > 0.01) {
            alert(`지불 총액(${formatCurrency(totalPayment)})이 구입 금액(${formatCurrency(itemAmount)})과 일치하지 않습니다.`);
            return;
        }

        // Cash payment transaction
        if (cashAmount > 0) {
            const transaction1 = {
                id: Date.now().toString() + '-1',
                date: new Date().toISOString().split('T')[0],
                description: `${itemName} 구입 (현금 지불)`,
                debitAccount: itemType === 'expense' ? '기타비용' : (itemType === 'asset' ? '상각자산' : '재고'),
                debitAmount: cashAmount,
                creditAccount: cashMethod,
                creditAmount: cashAmount,
                trackedItemId: trackedItemId,
                linkedTransactionId: Date.now().toString()
            };
            addTransaction(transaction1);
        }

        // Installment transaction
        if (installmentAmount > 0) {
            const liabilityName = `${itemName} 할부`;
            const liability = {
                id: generateUUID(),
                name: liabilityName,
                originalAmount: installmentAmount,
                currentAmount: installmentAmount,
                createdAt: new Date().toISOString()
            };
            addTrackedItem(liability);

            const transaction2 = {
                id: Date.now().toString() + '-2',
                date: new Date().toISOString().split('T')[0],
                description: `${itemName} 구입 (할부)`,
                debitAccount: itemType === 'expense' ? '기타비용' : (itemType === 'asset' ? '상각자산' : '재고'),
                debitAmount: installmentAmount,
                creditAccount: '부채',
                creditAmount: installmentAmount,
                trackedItemId: trackedItemId,
                liabilityId: liability.id,
                linkedTransactionId: Date.now().toString()
            };
            addTransaction(transaction2);
        }
    }

    alert('구입이 등록되었습니다.');
    resetPurchaseForm();
    hideFormAndShowTypeSelector();
}

function handleSaleSubmit() {
    const trackedItems = getTrackedItems();
    const saleAmount = parseFloat(document.getElementById('saleAmount').value);

    if (!selectedReceiveMethod) { alert('받을 방법을 선택해주세요.'); return; }
    if (!saleAmount || saleAmount <= 0) { alert('판매 금액을 입력해주세요.'); return; }

    let description = '';

    if (selectedSaleType === 'sell-asset') {
        if (!selectedSaleItemId) { alert('판매할 자산을 선택해주세요.'); return; }

        const asset = trackedItems.find(item => item.id === selectedSaleItemId);
        if (!asset) { alert('자산을 찾을 수 없습니다.'); return; }

        description = `${asset.name} 판매`;

        if (saleAmount >= asset.currentAmount) {
            const profit = saleAmount - asset.currentAmount;

            const transaction1 = {
                id: Date.now().toString() + '-1',
                date: new Date().toISOString().split('T')[0],
                description: description,
                debitAccount: selectedReceiveMethod,
                debitAmount: asset.currentAmount,
                creditAccount: '상각자산',
                creditAmount: asset.currentAmount,
                trackedItemId: asset.id,
                linkedTransactionId: Date.now().toString()
            };
            addTransaction(transaction1);

            if (profit > 0) {
                const transaction2 = {
                    id: Date.now().toString() + '-2',
                    date: new Date().toISOString().split('T')[0],
                    description: `${description} (이익)`,
                    debitAccount: selectedReceiveMethod,
                    debitAmount: profit,
                    creditAccount: '잡이익',
                    creditAmount: profit,
                    linkedTransactionId: Date.now().toString()
                };
                addTransaction(transaction2);
            }
        } else {
            const transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                description: description,
                debitAccount: selectedReceiveMethod,
                debitAmount: saleAmount,
                creditAccount: '잡이익',
                creditAmount: saleAmount,
                trackedItemId: asset.id
            };
            addTransaction(transaction);
        }

        updateTrackedItem(asset.id, { currentAmount: 0 });

    } else if (selectedSaleType === 'sell-inventory') {
        if (!selectedSaleItemId) { alert('판매할 재고를 선택해주세요.'); return; }

        const inventory = trackedItems.find(item => item.id === selectedSaleItemId);
        if (!inventory) { alert('재고를 찾을 수 없습니다.'); return; }

        const quantity = parseInt(prompt(`판매 수량을 입력하세요 (최대 ${inventory.quantity}개):`));
        if (!quantity || quantity <= 0) { alert('올바른 수량을 입력해주세요.'); return; }
        if (quantity > inventory.quantity) {
            alert(`재고 수량(${inventory.quantity}개)보다 많이 판매할 수 없습니다.`);
            return;
        }

        const costOfGoods = inventory.unitPrice * quantity;
        description = `${inventory.name} 판매 (${quantity}개)`;

        if (saleAmount >= costOfGoods) {
            const profit = saleAmount - costOfGoods;

            const transaction1 = {
                id: Date.now().toString() + '-1',
                date: new Date().toISOString().split('T')[0],
                description: description,
                debitAccount: selectedReceiveMethod,
                debitAmount: costOfGoods,
                creditAccount: '재고',
                creditAmount: costOfGoods,
                trackedItemId: inventory.id,
                linkedTransactionId: Date.now().toString()
            };
            addTransaction(transaction1);

            if (profit > 0) {
                const transaction2 = {
                    id: Date.now().toString() + '-2',
                    date: new Date().toISOString().split('T')[0],
                    description: `${description} (이익)`,
                    debitAccount: selectedReceiveMethod,
                    debitAmount: profit,
                    creditAccount: '잡이익',
                    creditAmount: profit,
                    linkedTransactionId: Date.now().toString()
                };
                addTransaction(transaction2);
            }
        } else {
            const transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                description: description,
                debitAccount: selectedReceiveMethod,
                debitAmount: saleAmount,
                creditAccount: '잡이익',
                creditAmount: saleAmount,
                trackedItemId: inventory.id
            };
            addTransaction(transaction);
        }

        const newQuantity = inventory.quantity - quantity;
        updateTrackedItem(inventory.id, {
            quantity: newQuantity,
            totalAmount: newQuantity * inventory.unitPrice
        });

    } else if (selectedSaleType === 'sell-other') {
        const itemName = document.getElementById('otherSaleItemName').value;
        if (!itemName) { alert('품목명을 입력해주세요.'); return; }

        description = `${itemName} 중고거래`;

        const transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            description: description,
            debitAccount: selectedReceiveMethod,
            debitAmount: saleAmount,
            creditAccount: '잡이익',
            creditAmount: saleAmount
        };
        addTransaction(transaction);
    }

    alert('판매가 등록되었습니다.');
    resetSaleForm();
    hideFormAndShowTypeSelector();
}

function handleInvestmentSubmit() {
    let itemName, itemAmount, investmentCategory;

    if (selectedInvestmentType === 'financial-product') {
        itemName = document.getElementById('financialProductName').value;
        itemAmount = parseFloat(document.getElementById('financialProductAmount').value);
        investmentCategory = '금융상품';
    } else if (selectedInvestmentType === 'long-deposit') {
        itemName = document.getElementById('longDepositName').value;
        itemAmount = parseFloat(document.getElementById('longDepositAmount').value);
        investmentCategory = '장기예적금';
    } else if (selectedInvestmentType === 'deposit') {
        itemName = document.getElementById('depositName').value;
        itemAmount = parseFloat(document.getElementById('depositAmount').value);
        investmentCategory = '전월세보증금';
    }

    if (!itemName) { alert('항목명을 입력해주세요.'); return; }
    if (!itemAmount || itemAmount <= 0) { alert('금액을 입력해주세요.'); return; }
    if (!selectedInvestPaymentMethod) { alert('지불 수단을 선택해주세요.'); return; }

    const investmentAsset = {
        id: generateUUID(),
        name: itemName,
        type: 'investment',
        category: investmentCategory,
        originalAmount: itemAmount,
        currentAmount: itemAmount,
        createdAt: new Date().toISOString()
    };
    addTrackedItem(investmentAsset);

    let transaction;

    if (selectedInvestPaymentMethod === '부채') {
        const liabilityName = `${itemName} 대출`;
        const liability = {
            id: generateUUID(),
            name: liabilityName,
            originalAmount: itemAmount,
            currentAmount: itemAmount,
            createdAt: new Date().toISOString()
        };
        addTrackedItem(liability);

        transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            description: `${itemName} 투자 (대출)`,
            debitAccount: '투자자산',
            debitAmount: itemAmount,
            creditAccount: '부채',
            creditAmount: itemAmount,
            trackedItemId: investmentAsset.id,
            liabilityId: liability.id
        };
    } else {
        transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            description: `${itemName} 투자`,
            debitAccount: '투자자산',
            debitAmount: itemAmount,
            creditAccount: selectedInvestPaymentMethod,
            creditAmount: itemAmount,
            trackedItemId: investmentAsset.id
        };
    }

    addTransaction(transaction);
    alert('투자가 등록되었습니다.');
    resetInvestmentForm();
    hideFormAndShowTypeSelector();
}

function handleCollectionSubmit() {
    const trackedItems = getTrackedItems();
    const collectionAmount = parseFloat(document.getElementById('collectionAmount').value);

    if (!selectedCollectionItemId) { alert('회수할 투자 항목을 선택해주세요.'); return; }
    if (!collectionAmount || collectionAmount <= 0) { alert('회수 금액을 입력해주세요.'); return; }

    const investment = trackedItems.find(item => item.id === selectedCollectionItemId);
    if (!investment) { alert('투자 항목을 찾을 수 없습니다.'); return; }
    if (collectionAmount > investment.currentAmount) {
        alert(`회수 금액이 투자 잔액(${formatCurrency(investment.currentAmount)})보다 큽니다.`);
        return;
    }

    const originalAmount = investment.originalAmount;
    const description = `${investment.name} 회수`;

    if (selectedCollectReceiveMethod === '부채상환') {
        if (!selectedCollectionLiabilityId) { alert('상환할 부채를 선택해주세요.'); return; }

        const liability = trackedItems.find(item => item.id === selectedCollectionLiabilityId);
        if (!liability) { alert('부채를 찾을 수 없습니다.'); return; }
        if (collectionAmount > liability.currentAmount) {
            alert(`회수 금액이 부채 잔액(${formatCurrency(liability.currentAmount)})보다 큽니다.`);
            return;
        }

        const transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            description: `${description} (부채 상환)`,
            debitAccount: '부채',
            debitAmount: collectionAmount,
            creditAccount: '투자자산',
            creditAmount: collectionAmount,
            trackedItemId: investment.id,
            liabilityId: liability.id
        };
        addTransaction(transaction);

        updateTrackedItem(liability.id, { currentAmount: liability.currentAmount - collectionAmount });

    } else {
        if (!selectedCollectReceiveMethod) { alert('받을 방법을 선택해주세요.'); return; }

        const profitOrLoss = collectionAmount - originalAmount;

        if (profitOrLoss >= 0) {
            const transaction1 = {
                id: Date.now().toString() + '-1',
                date: new Date().toISOString().split('T')[0],
                description: description,
                debitAccount: selectedCollectReceiveMethod,
                debitAmount: originalAmount,
                creditAccount: '투자자산',
                creditAmount: originalAmount,
                trackedItemId: investment.id,
                linkedTransactionId: Date.now().toString()
            };
            addTransaction(transaction1);

            if (profitOrLoss > 0) {
                const transaction2 = {
                    id: Date.now().toString() + '-2',
                    date: new Date().toISOString().split('T')[0],
                    description: `${description} (투자수익)`,
                    debitAccount: selectedCollectReceiveMethod,
                    debitAmount: profitOrLoss,
                    creditAccount: '잡이익',
                    creditAmount: profitOrLoss,
                    linkedTransactionId: Date.now().toString()
                };
                addTransaction(transaction2);
            }
        } else {
            const loss = Math.abs(profitOrLoss);

            const transaction1 = {
                id: Date.now().toString() + '-1',
                date: new Date().toISOString().split('T')[0],
                description: description,
                debitAccount: selectedCollectReceiveMethod,
                debitAmount: collectionAmount,
                creditAccount: '투자자산',
                creditAmount: collectionAmount,
                trackedItemId: investment.id,
                linkedTransactionId: Date.now().toString()
            };
            addTransaction(transaction1);

            const transaction2 = {
                id: Date.now().toString() + '-2',
                date: new Date().toISOString().split('T')[0],
                description: `${description} (투자손실)`,
                debitAccount: '잡손실',
                debitAmount: loss,
                creditAccount: '투자자산',
                creditAmount: loss,
                trackedItemId: investment.id,
                linkedTransactionId: Date.now().toString()
            };
            addTransaction(transaction2);
        }
    }

    updateTrackedItem(investment.id, { currentAmount: investment.currentAmount - collectionAmount });

    alert('회수가 등록되었습니다.');
    resetCollectionForm();
    hideFormAndShowTypeSelector();
}

// ===== RENDER FUNCTIONS =====

function renderSaleAssetList() {
    const listDiv = document.getElementById('assetSaleList');
    const trackedItems = getTrackedItems();
    const assets = trackedItems.filter(item => item.type === 'depreciable-asset' && item.currentAmount > 0);

    if (assets.length === 0) {
        listDiv.innerHTML = '<p class="empty-message">등록된 상각 자산이 없습니다.</p>';
        return;
    }

    listDiv.innerHTML = assets.map(asset => `
        <div class="sale-item" data-id="${asset.id}">
            <div class="sale-item-name">${asset.name}</div>
            <div class="sale-item-info">장부가: ${formatCurrency(asset.currentAmount)}</div>
        </div>
    `).join('');

    document.querySelectorAll('#assetSaleList .sale-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('#assetSaleList .sale-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedSaleItemId = this.getAttribute('data-id');
        });
    });
}

function renderSaleInventoryList() {
    const listDiv = document.getElementById('inventorySaleList');
    const trackedItems = getTrackedItems();
    const inventories = trackedItems.filter(item => item.type === 'inventory' && item.quantity > 0);

    if (inventories.length === 0) {
        listDiv.innerHTML = '<p class="empty-message">등록된 재고가 없습니다.</p>';
        return;
    }

    listDiv.innerHTML = inventories.map(inventory => `
        <div class="sale-item" data-id="${inventory.id}">
            <div class="sale-item-name">${inventory.name}</div>
            <div class="sale-item-info">수량: ${inventory.quantity}개, 단가: ${formatCurrency(inventory.unitPrice)}</div>
        </div>
    `).join('');

    document.querySelectorAll('#inventorySaleList .sale-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('#inventorySaleList .sale-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedSaleItemId = this.getAttribute('data-id');
        });
    });
}

function renderInvestmentCollectionList() {
    const listDiv = document.getElementById('investmentCollectionList');
    const trackedItems = getTrackedItems();
    const investments = trackedItems.filter(item => item.type === 'investment' && item.currentAmount > 0);

    if (investments.length === 0) {
        listDiv.innerHTML = '<p class="empty-message">등록된 투자 항목이 없습니다.</p>';
        return;
    }

    listDiv.innerHTML = investments.map(investment => `
        <div class="sale-item" data-id="${investment.id}">
            <div class="sale-item-name">${investment.name} (${investment.category})</div>
            <div class="sale-item-info">투자원금: ${formatCurrency(investment.originalAmount)}</div>
        </div>
    `).join('');

    document.querySelectorAll('#investmentCollectionList .sale-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('#investmentCollectionList .sale-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedCollectionItemId = this.getAttribute('data-id');
        });
    });
}

function renderLiabilityCollectionList() {
    const listDiv = document.getElementById('liabilityCollectionList');
    const trackedItems = getTrackedItems();
    const liabilities = trackedItems.filter(item => item.currentAmount > 0 && !item.type);

    if (liabilities.length === 0) {
        listDiv.innerHTML = '<p class="empty-message">등록된 부채가 없습니다.</p>';
        return;
    }

    listDiv.innerHTML = liabilities.map(liability => `
        <div class="liability-item" data-id="${liability.id}">
            <div class="liability-item-name">${liability.name}</div>
            <div class="liability-item-amount">잔액: ${formatCurrency(liability.currentAmount)}</div>
        </div>
    `).join('');

    document.querySelectorAll('#liabilityCollectionList .liability-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('#liabilityCollectionList .liability-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedCollectionLiabilityId = this.getAttribute('data-id');
        });
    });
}

// ===== RESET FUNCTIONS =====

function resetPurchaseForm() {
    selectedPurchaseType = 'immediate-expense';
    selectedPaymentMode = 'single';
    selectedSinglePaymentMethod = null;

    document.getElementById('immediateExpenseName').value = '';
    document.getElementById('immediateExpenseAmount').value = '';
    const assetName = document.getElementById('assetName');
    const assetAmount = document.getElementById('assetAmount');
    if (assetName) assetName.value = '';
    if (assetAmount) assetAmount.value = '';

    const invName = document.getElementById('inventoryName');
    const invQty = document.getElementById('inventoryQuantity');
    const invPrice = document.getElementById('inventoryPrice');
    if (invName) invName.value = '';
    if (invQty) invQty.value = '1';
    if (invPrice) invPrice.value = '';

    const splitCash = document.getElementById('splitCashAmount');
    const splitInstall = document.getElementById('splitInstallmentAmount');
    if (splitCash) splitCash.value = '';
    if (splitInstall) splitInstall.value = '';

    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
    updateSplitTotal();
}

function resetSaleForm() {
    selectedReceiveMethod = null;
    selectedSaleType = 'sell-asset';
    selectedSaleItemId = null;

    document.querySelectorAll('.receive-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('saleAmount').value = '';
    const otherName = document.getElementById('otherSaleItemName');
    if (otherName) otherName.value = '';
    document.querySelectorAll('.sale-item').forEach(b => b.classList.remove('selected'));
}

function resetInvestmentForm() {
    selectedInvestmentType = 'financial-product';
    selectedInvestPaymentMethod = null;

    document.querySelectorAll('.invest-payment-btn').forEach(b => b.classList.remove('selected'));
    const fpName = document.getElementById('financialProductName');
    const fpAmount = document.getElementById('financialProductAmount');
    if (fpName) fpName.value = '';
    if (fpAmount) fpAmount.value = '';

    const ldName = document.getElementById('longDepositName');
    const ldAmount = document.getElementById('longDepositAmount');
    if (ldName) ldName.value = '';
    if (ldAmount) ldAmount.value = '';

    const dName = document.getElementById('depositName');
    const dAmount = document.getElementById('depositAmount');
    if (dName) dName.value = '';
    if (dAmount) dAmount.value = '';
}

function resetCollectionForm() {
    selectedCollectReceiveMethod = null;
    selectedCollectionItemId = null;
    selectedCollectionLiabilityId = null;

    document.querySelectorAll('.collect-receive-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('collectionAmount').value = '';
    document.querySelectorAll('.sale-item').forEach(b => b.classList.remove('selected'));
    const liabilitySection = document.getElementById('liabilityCollectionSection');
    if (liabilitySection) liabilitySection.style.display = 'none';
}

// ===== DYNAMIC ACCOUNT RENDERING =====

export function renderExpenseAccountButtons() {
    const container = document.getElementById('expenseAccountButtons');
    if (!container) return;

    const accountTypes = getAccountTypes();
    const expenseAccounts = Object.entries(accountTypes)
        .filter(([name, type]) => type === 'expense')
        .map(([name]) => name);

    container.innerHTML = expenseAccounts.map(account => `
        <button class="account-btn" data-account="${account}" data-tracked="false">${account}</button>
    `).join('');

    // Add click event listeners
    container.querySelectorAll('.account-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            container.querySelectorAll('.account-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedExpenseAccount = this.getAttribute('data-account');
        });
    });
}

function setupAddAccountButton() {
    const addBtn = document.querySelector('.add-account-btn[data-type="expense"]');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        showAddAccountModal('expense');
    });
}

function showAddAccountModal(accountType) {
    const modal = document.getElementById('addAccountModal');
    const typeInput = document.getElementById('newAccountType');
    const nameInput = document.getElementById('newAccountName');
    const modalTitle = modal.querySelector('.modal-header h3');

    typeInput.value = accountType;
    nameInput.value = '';
    modalTitle.textContent = accountType === 'expense' ? '비용 계정 추가' : '수입 계정 추가';

    modal.classList.add('show');
    nameInput.focus();

    // Setup event handlers (only once)
    if (!modal.dataset.initialized) {
        modal.dataset.initialized = 'true';

        // Close button
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('show');
        });

        // Cancel button
        document.getElementById('cancelAddAccount').addEventListener('click', () => {
            modal.classList.remove('show');
        });

        // Confirm button
        document.getElementById('confirmAddAccount').addEventListener('click', () => {
            const name = nameInput.value.trim();
            const type = typeInput.value;

            if (!name) {
                alert('계정명을 입력해주세요.');
                return;
            }

            const result = addCustomAccount(name, type);
            if (result.success) {
                modal.classList.remove('show');
                renderExpenseAccountButtons();
                alert(`'${name}' 계정이 추가되었습니다.`);
            } else {
                alert(result.message);
            }
        });

        // Enter key
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirmAddAccount').click();
            }
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
}
