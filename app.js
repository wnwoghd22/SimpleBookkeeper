// 거래 데이터 저장소
let transactions = [];
let editingId = null;

// 추적 가능한 항목들 (UUID가 부여된 자산/부채)
let trackedItems = [];

// Animation state
let currentSelectedButton = null;
let currentTransactionType = null;

// 계정 분류
const accountTypes = {
    '현금': 'asset',
    '은행예금': 'asset',
    '상각자산': 'asset',
    '재고': 'asset',
    '투자자산': 'asset',
    '식비': 'expense',
    '교통비': 'expense',
    '주거비': 'expense',
    '공과금': 'expense',
    '통신비': 'expense',
    '의료비': 'expense',
    '문화생활비': 'expense',
    '기타비용': 'expense',
    '잡손실': 'expense',
    '급여': 'income',
    '사업소득': 'income',
    '이자수입': 'income',
    '기타수입': 'income',
    '잡이익': 'income',
    '부채': 'liability'
};

// UUID 생성 함수
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 로컬 스토리지에서 데이터 로드
function loadFromLocalStorage() {
    const stored = localStorage.getItem('doubleEntryTransactions');
    if (stored) {
        transactions = JSON.parse(stored);
    }
    const storedItems = localStorage.getItem('trackedItems');
    if (storedItems) {
        trackedItems = JSON.parse(storedItems);
    }
}

// 로컬 스토리지에 데이터 저장
function saveToLocalStorage() {
    localStorage.setItem('doubleEntryTransactions', JSON.stringify(transactions));
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
}

// 초기화
document.addEventListener('DOMContentLoaded', function () {
    // 로컬 스토리지 데이터 삭제 (초기화)
    localStorage.removeItem('doubleEntryTransactions');
    localStorage.removeItem('trackedItems');
    transactions = [];
    trackedItems = [];

    renderTransactions();
    updateSummary();
    setupEventListeners();

    // 오늘 날짜를 기본값으로 설정
    document.getElementById('date').valueAsDate = new Date();
});

// 선택된 항목 저장 변수
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

// 이벤트 리스너 설정
function setupEventListeners() {
    // 거래 유형 버튼 클릭 이벤트
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const type = this.getAttribute('data-type');
            handleTypeSelectionWithAnimation(this, type);
        });
    });

    // 자산 버튼 클릭 이벤트
    document.querySelectorAll('.asset-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            // 모든 버튼의 선택 상태 해제
            document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('selected'));
            // 현재 버튼 선택
            this.classList.add('selected');
            selectedAsset = this.getAttribute('data-account');
        });
    });

    // 수입 저장 버튼
    document.getElementById('incomeSubmitBtn').addEventListener('click', handleIncomeSubmit);

    // 수입 취소 버튼
    document.getElementById('incomeCancelBtn').addEventListener('click', function () {
        resetIncomeForm();
        hideFormAndShowTypeSelector();
    });

    // 지출 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');

            // 탭 버튼 활성화
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 탭 콘텐츠 표시
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab).classList.add('active');

            // 선택 초기화
            selectedExpenseAccount = null;
            selectedLiabilityId = null;
            document.querySelectorAll('.account-btn').forEach(b => b.classList.remove('selected'));
            document.querySelectorAll('.liability-item').forEach(b => b.classList.remove('selected'));
        });
    });

    // 비용 계정 버튼 클릭
    document.querySelectorAll('.account-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.account-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedExpenseAccount = this.getAttribute('data-account');
            selectedLiabilityId = null;
        });
    });

    // 지불 수단 버튼 클릭
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedPaymentMethod = this.getAttribute('data-account');
        });
    });

    // 부채 추가 버튼
    document.getElementById('addLiabilityBtn').addEventListener('click', addLiability);

    // 지출 저장 버튼
    document.getElementById('expenseSubmitBtn').addEventListener('click', handleExpenseSubmit);

    // 지출 취소 버튼
    document.getElementById('expenseCancelBtn').addEventListener('click', function () {
        resetExpenseForm();
        hideFormAndShowTypeSelector();
    });

    // 구입 탭 전환
    document.querySelectorAll('.purchase-form .tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');

            // 탭 버튼 활성화
            this.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 탭 콘텐츠 표시
            document.querySelectorAll('.purchase-form .tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab).classList.add('active');

            selectedPurchaseType = tab;
        });
    });

    // 지불 방식 모드 전환
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const mode = this.getAttribute('data-mode');

            // 모드 버튼 활성화
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 모드 콘텐츠 표시
            document.querySelectorAll('.payment-mode-content').forEach(c => c.classList.remove('active'));
            document.getElementById(mode + '-payment').classList.add('active');

            selectedPaymentMode = mode;
            selectedSinglePaymentMethod = null;
            document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
        });
    });

    // 단일 지불 수단 버튼
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedSinglePaymentMethod = this.getAttribute('data-method');
        });
    });

    // 복합 지불 금액 계산
    document.getElementById('splitCashAmount').addEventListener('input', updateSplitTotal);
    document.getElementById('splitInstallmentAmount').addEventListener('input', updateSplitTotal);

    // 구입 저장 버튼
    document.getElementById('purchaseSubmitBtn').addEventListener('click', handlePurchaseSubmit);

    // 구입 취소 버튼
    document.getElementById('purchaseCancelBtn').addEventListener('click', function () {
        resetPurchaseForm();
        hideFormAndShowTypeSelector();
    });

    // 판매 탭 전환
    document.querySelectorAll('.sale-form .tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');

            // 탭 버튼 활성화
            this.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 탭 콘텐츠 표시
            document.querySelectorAll('.sale-form .tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab).classList.add('active');

            selectedSaleType = tab;
            selectedSaleItemId = null;
        });
    });

    // 수입 방법 버튼
    document.querySelectorAll('.receive-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.receive-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedReceiveMethod = this.getAttribute('data-method');
        });
    });

    // 판매 저장 버튼
    document.getElementById('saleSubmitBtn').addEventListener('click', handleSaleSubmit);

    // 판매 취소 버튼
    document.getElementById('saleCancelBtn').addEventListener('click', function () {
        resetSaleForm();
        hideFormAndShowTypeSelector();
    });

    // 투자 탭 전환
    document.querySelectorAll('.investment-form .tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');
            this.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.investment-form .tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
            selectedInvestmentType = tab;
        });
    });

    // 투자 지불 수단 버튼
    document.querySelectorAll('.invest-payment-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.invest-payment-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedInvestPaymentMethod = this.getAttribute('data-method');
        });
    });

    // 투자 저장 버튼
    document.getElementById('investmentSubmitBtn').addEventListener('click', handleInvestmentSubmit);

    // 투자 취소 버튼
    document.getElementById('investmentCancelBtn').addEventListener('click', function () {
        resetInvestmentForm();
        hideFormAndShowTypeSelector();
    });

    // 회수 받을 방법 버튼
    document.querySelectorAll('.collect-receive-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.collect-receive-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedCollectReceiveMethod = this.getAttribute('data-method');

            // 부채 상환 선택 시 부채 목록 표시
            if (selectedCollectReceiveMethod === '부채상환') {
                document.getElementById('liabilityCollectionSection').style.display = 'block';
                renderLiabilityCollectionList();
            } else {
                document.getElementById('liabilityCollectionSection').style.display = 'none';
                selectedCollectionLiabilityId = null;
            }
        });
    });

    // 회수 저장 버튼
    document.getElementById('collectionSubmitBtn').addEventListener('click', handleCollectionSubmit);

    // 회수 취소 버튼
    document.getElementById('collectionCancelBtn').addEventListener('click', function () {
        resetCollectionForm();
        hideFormAndShowTypeSelector();
    });

    // 폼 제출
    document.getElementById('transactionForm').addEventListener('submit', handleSubmit);

    // 취소 버튼
    document.getElementById('cancelBtn').addEventListener('click', resetForm);

    // 엑셀 내보내기
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);

    // 엑셀 불러오기
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', importFromExcel);

    // 필터 적용
    document.getElementById('applyFilter').addEventListener('click', applyFilter);
    document.getElementById('clearFilter').addEventListener('click', clearFilter);

    // 금액 자동 동기화 (차변 입력 시 대변도 동일하게)
    document.getElementById('debitAmount').addEventListener('input', function (e) {
        document.getElementById('creditAmount').value = e.target.value;
    });

    // 메인 탭 전환
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            switchMainTab(this, tabId);
        });
    });
}

// 메인 탭 전환 함수
function switchMainTab(clickedBtn, tabId) {
    // 버튼 활성화 상태 업데이트
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    clickedBtn.classList.add('active');

    // 탭 콘텐츠 표시 전환
    document.querySelectorAll('.main-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// 거래 유형 선택 처리
function handleTypeSelectionWithAnimation(clickedButton, type) {
    const typeSelector = document.querySelector('.transaction-type-selector');

    // 1. Selector Fade Out
    typeSelector.classList.add('fade-out');

    currentSelectedButton = clickedButton;
    currentTransactionType = type;

    // 2. Wait for fade out, then hide selector and show form
    setTimeout(() => {
        typeSelector.style.display = 'none';
        showFormWithAnimation(type);
    }, 400); // 0.4s matches CSS transition
}

function showFormWithAnimation(type) {
    let formElement;

    if (type === 'income') {
        formElement = document.querySelector('.income-form');
    } else if (type === 'expense') {
        formElement = document.querySelector('.expense-form');
        renderLiabilityList();
    } else if (type === 'purchase') {
        formElement = document.querySelector('.purchase-form');
    } else if (type === 'sale') {
        formElement = document.querySelector('.sale-form');
        renderSaleAssetList();
        renderSaleInventoryList();
    } else if (type === 'investment') {
        formElement = document.querySelector('.investment-form');
    } else if (type === 'collection') {
        formElement = document.querySelector('.collection-form');
        renderInvestmentCollectionList();
    }

    if (formElement) {
        formElement.style.display = 'block';
        // Need a slight delay to allow display:block to apply before opacity transition
        requestAnimationFrame(() => {
            formElement.classList.add('show');
        });
    }
}

function hideFormAndShowTypeSelector() {
    const allForms = [
        '.income-form', '.expense-form', '.purchase-form',
        '.sale-form', '.investment-form', '.collection-form'
    ];

    let currentForm = null;
    allForms.forEach(selector => {
        const form = document.querySelector(selector);
        if (form.style.display === 'block') {
            currentForm = form;
        }
    });

    if (currentForm) {
        // 1. Form Fade Out
        currentForm.classList.remove('show');
        currentForm.classList.add('hide'); // Optional, mainly for specific transforms if any

        setTimeout(() => {
            currentForm.style.display = 'none';
            currentForm.classList.remove('hide');
            showTypeSelectorWithAnimation();
        }, 400);
    } else {
        showTypeSelectorWithAnimation();
    }
}

function showTypeSelectorWithAnimation() {
    const typeSelector = document.querySelector('.transaction-type-selector');

    typeSelector.style.display = 'block';

    // Force reflow or tiny delay ensuring display:block is registered
    requestAnimationFrame(() => {
        typeSelector.classList.remove('fade-out');
    });

    currentSelectedButton = null;
    currentTransactionType = null;
}

function handleTypeSelection(type) {
    hideAllForms();

    if (type === 'income') {
        document.querySelector('.income-form').style.display = 'block';
    } else if (type === 'expense') {
        document.querySelector('.expense-form').style.display = 'block';
        renderLiabilityList();
    } else if (type === 'purchase') {
        document.querySelector('.purchase-form').style.display = 'block';
    } else if (type === 'sale') {
        document.querySelector('.sale-form').style.display = 'block';
        renderSaleAssetList();
        renderSaleInventoryList();
    } else if (type === 'investment') {
        document.querySelector('.investment-form').style.display = 'block';
    } else if (type === 'collection') {
        document.querySelector('.collection-form').style.display = 'block';
        renderInvestmentCollectionList();
    }
}

// 모든 폼 숨기기
function hideAllForms() {
    const typeSelector = document.querySelector('.transaction-type-selector');
    const allForms = [
        document.querySelector('.income-form'),
        document.querySelector('.expense-form'),
        document.querySelector('.purchase-form'),
        document.querySelector('.sale-form'),
        document.querySelector('.investment-form'),
        document.querySelector('.collection-form'),
        document.querySelector('.transaction-form')
    ];

    typeSelector.style.display = 'none';

    allForms.forEach(form => {
        form.style.display = 'none';
        form.classList.remove('show', 'hide');
    });
}
// 타입 선택 버튼 표시
function showTypeSelector() {
    showTypeSelectorWithAnimation();
}
// 수입 폼 초기화
function resetIncomeForm() {
    selectedAsset = null;
    document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('incomeAmount').value = '';
}

// 수입 입력 처리
function handleIncomeSubmit() {
    const amount = parseFloat(document.getElementById('incomeAmount').value);

    if (!selectedAsset) {
        alert('자산을 선택해주세요.');
        return;
    }

    if (!amount || amount <= 0) {
        alert('금액을 입력해주세요.');
        return;
    }

    // 복식부기 거래 생성
    // 차변: 자산 (현금/은행예금) 증가
    // 대변: 수입 (기타수입) 증가
    const transaction = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        description: '수입',
        debitAccount: selectedAsset,
        debitAmount: amount,
        creditAccount: '기타수입',
        creditAmount: amount
    };

    transactions.push(transaction);
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveToLocalStorage();
    renderTransactions();
    updateSummary();

    // 폼 초기화 및 타입 선택 화면으로
    resetIncomeForm();

    hideFormAndShowTypeSelector();

    alert('수입이 등록되었습니다.');
}

// 지출 폼 초기화
function resetExpenseForm() {
    selectedExpenseAccount = null;
    selectedPaymentMethod = null;
    selectedLiabilityId = null;
    document.querySelectorAll('.account-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.liability-item').forEach(b => b.classList.remove('selected'));
    document.getElementById('expenseAmount').value = '';

    // 첫 번째 탭으로 리셋
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('expense-accounts').classList.add('active');
}

// 부채 추가
function addLiability() {
    const name = prompt('부채 이름을 입력하세요 (예: 신용카드 대금, 대출금):');
    if (!name) return;

    const amount = parseFloat(prompt('부채 금액을 입력하세요:'));
    if (!amount || amount <= 0) {
        alert('올바른 금액을 입력해주세요.');
        return;
    }

    const liability = {
        id: generateUUID(),
        name: name,
        originalAmount: amount,
        currentAmount: amount,
        createdAt: new Date().toISOString()
    };

    trackedItems.push(liability);
    saveToLocalStorage();
    renderLiabilityList();

    alert('부채가 추가되었습니다.');
}

// 부채 목록 렌더링
function renderLiabilityList() {
    const listDiv = document.getElementById('liabilityList');

    const liabilities = trackedItems.filter(item => item.currentAmount > 0);

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

    // 부채 항목 클릭 이벤트
    document.querySelectorAll('.liability-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.liability-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedLiabilityId = this.getAttribute('data-id');
            selectedExpenseAccount = null;
            document.querySelectorAll('.account-btn').forEach(b => b.classList.remove('selected'));
        });
    });
}

// 지출 입력 처리
function handleExpenseSubmit() {
    const amount = parseFloat(document.getElementById('expenseAmount').value);

    if (!selectedPaymentMethod) {
        alert('지불 수단을 선택해주세요.');
        return;
    }

    if (!amount || amount <= 0) {
        alert('금액을 입력해주세요.');
        return;
    }

    let transaction;

    if (selectedExpenseAccount) {
        // 비용 계정 지출
        // 차변: 비용 계정 증가
        // 대변: 자산 (현금/은행예금) 감소
        transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            description: selectedExpenseAccount,
            debitAccount: selectedExpenseAccount,
            debitAmount: amount,
            creditAccount: selectedPaymentMethod,
            creditAmount: amount
        };
    } else if (selectedLiabilityId) {
        // 부채 상환
        const liability = trackedItems.find(item => item.id === selectedLiabilityId);

        if (!liability) {
            alert('부채를 찾을 수 없습니다.');
            return;
        }

        if (amount > liability.currentAmount) {
            alert(`상환 금액이 부채 잔액(${formatCurrency(liability.currentAmount)})보다 큽니다.`);
            return;
        }

        // 차변: 부채 감소
        // 대변: 자산 (현금/은행예금) 감소
        transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            description: `${liability.name} 상환`,
            debitAccount: '부채',
            debitAmount: amount,
            creditAccount: selectedPaymentMethod,
            creditAmount: amount,
            trackedItemId: liability.id
        };

        // 부채 잔액 업데이트
        liability.currentAmount -= amount;
    } else {
        alert('지출 항목을 선택해주세요.');
        return;
    }

    transactions.push(transaction);
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveToLocalStorage();
    renderTransactions();
    updateSummary();

    // 폼 초기화 및 타입 선택 화면으로
    resetExpenseForm();

    hideFormAndShowTypeSelector();

    alert('지출이 등록되었습니다.');
}

// 구입 폼 초기화
function resetPurchaseForm() {
    selectedPurchaseType = 'immediate-expense';
    selectedPaymentMode = 'single';
    selectedSinglePaymentMethod = null;

    // 입력 필드 초기화
    document.getElementById('immediateExpenseName').value = '';
    document.getElementById('immediateExpenseAmount').value = '';
    document.getElementById('assetName').value = '';
    document.getElementById('assetAmount').value = '';
    document.getElementById('inventoryName').value = '';
    document.getElementById('inventoryQuantity').value = '1';
    document.getElementById('inventoryPrice').value = '';
    document.getElementById('splitCashAmount').value = '';
    document.getElementById('splitInstallmentAmount').value = '';

    // 버튼 선택 초기화
    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));

    // 첫 번째 탭으로 리셋
    document.querySelectorAll('.purchase-form .tab-btn').forEach((b, i) => {
        if (i === 0) b.classList.add('active');
        else b.classList.remove('active');
    });
    document.querySelectorAll('.purchase-form .tab-content').forEach((c, i) => {
        if (i === 0) c.classList.add('active');
        else c.classList.remove('active');
    });

    // 첫 번째 모드로 리셋
    document.querySelectorAll('.mode-btn').forEach((b, i) => {
        if (i === 0) b.classList.add('active');
        else b.classList.remove('active');
    });
    document.querySelectorAll('.payment-mode-content').forEach((c, i) => {
        if (i === 0) c.classList.add('active');
        else c.classList.remove('active');
    });

    updateSplitTotal();
}

// 복합 지불 총액 업데이트
function updateSplitTotal() {
    const cashAmount = parseFloat(document.getElementById('splitCashAmount').value) || 0;
    const installmentAmount = parseFloat(document.getElementById('splitInstallmentAmount').value) || 0;
    const total = cashAmount + installmentAmount;

    document.getElementById('splitTotalAmount').textContent = formatCurrency(total);
}

// 구입 입력 처리
function handlePurchaseSubmit() {
    let itemName, itemAmount, itemType, trackedItemId = null;

    // 구입 항목 정보 가져오기
    if (selectedPurchaseType === 'immediate-expense') {
        itemName = document.getElementById('immediateExpenseName').value;
        itemAmount = parseFloat(document.getElementById('immediateExpenseAmount').value);
        itemType = 'expense';

        if (!itemName) {
            alert('항목명을 입력해주세요.');
            return;
        }
        if (!itemAmount || itemAmount <= 0) {
            alert('금액을 입력해주세요.');
            return;
        }
    } else if (selectedPurchaseType === 'depreciable-asset') {
        itemName = document.getElementById('assetName').value;
        itemAmount = parseFloat(document.getElementById('assetAmount').value);
        itemType = 'asset';

        if (!itemName) {
            alert('자산명을 입력해주세요.');
            return;
        }
        if (!itemAmount || itemAmount <= 0) {
            alert('금액을 입력해주세요.');
            return;
        }

        // 상각 자산 추적 항목 생성
        const asset = {
            id: generateUUID(),
            name: itemName,
            type: 'depreciable-asset',
            originalAmount: itemAmount,
            currentAmount: itemAmount,
            createdAt: new Date().toISOString()
        };
        trackedItems.push(asset);
        trackedItemId = asset.id;
    } else if (selectedPurchaseType === 'inventory') {
        itemName = document.getElementById('inventoryName').value;
        const quantity = parseInt(document.getElementById('inventoryQuantity').value);
        const price = parseFloat(document.getElementById('inventoryPrice').value);
        itemAmount = quantity * price;
        itemType = 'inventory';

        if (!itemName) {
            alert('재고명을 입력해주세요.');
            return;
        }
        if (!quantity || quantity <= 0) {
            alert('수량을 입력해주세요.');
            return;
        }
        if (!price || price <= 0) {
            alert('단가를 입력해주세요.');
            return;
        }

        // 재고 추적 항목 생성
        const inventory = {
            id: generateUUID(),
            name: itemName,
            type: 'inventory',
            quantity: quantity,
            unitPrice: price,
            totalAmount: itemAmount,
            createdAt: new Date().toISOString()
        };
        trackedItems.push(inventory);
        trackedItemId = inventory.id;
    }

    // 지불 방식에 따라 거래 생성
    if (selectedPaymentMode === 'single') {
        if (!selectedSinglePaymentMethod) {
            alert('지불 수단을 선택해주세요.');
            return;
        }

        if (selectedSinglePaymentMethod === '할부') {
            // 할부: 새 부채 생성
            const liabilityName = `${itemName} 할부`;
            const liability = {
                id: generateUUID(),
                name: liabilityName,
                originalAmount: itemAmount,
                currentAmount: itemAmount,
                createdAt: new Date().toISOString()
            };
            trackedItems.push(liability);

            // 차변: 자산/비용 증가
            // 대변: 부채 증가
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
            transactions.push(transaction);
        } else {
            // 현금 또는 은행예금
            // 차변: 자산/비용 증가
            // 대변: 현금/은행예금 감소
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
            transactions.push(transaction);
        }
    } else if (selectedPaymentMode === 'split') {
        const cashMethod = document.getElementById('splitCashMethod').value;
        const cashAmount = parseFloat(document.getElementById('splitCashAmount').value) || 0;
        const installmentAmount = parseFloat(document.getElementById('splitInstallmentAmount').value) || 0;

        if (cashAmount <= 0 && installmentAmount <= 0) {
            alert('지불 금액을 입력해주세요.');
            return;
        }

        const totalPayment = cashAmount + installmentAmount;
        if (Math.abs(totalPayment - itemAmount) > 0.01) {
            alert(`지불 총액(${formatCurrency(totalPayment)})이 구입 금액(${formatCurrency(itemAmount)})과 일치하지 않습니다.`);
            return;
        }

        // 현금/예금 지불 거래
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
            transactions.push(transaction1);
        }

        // 할부 거래
        if (installmentAmount > 0) {
            const liabilityName = `${itemName} 할부`;
            const liability = {
                id: generateUUID(),
                name: liabilityName,
                originalAmount: installmentAmount,
                currentAmount: installmentAmount,
                createdAt: new Date().toISOString()
            };
            trackedItems.push(liability);

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
            transactions.push(transaction2);
        }
    }

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveToLocalStorage();
    renderTransactions();
    updateSummary();

    resetPurchaseForm();


    hideFormAndShowTypeSelector();

    alert('구입이 등록되었습니다.');
}

// 판매 폼 초기화
function resetSaleForm() {
    selectedReceiveMethod = null;
    selectedSaleType = 'sell-asset';
    selectedSaleItemId = null;

    document.querySelectorAll('.receive-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('saleAmount').value = '';
    document.getElementById('otherSaleItemName').value = '';
    document.querySelectorAll('.sale-item').forEach(b => b.classList.remove('selected'));

    // 첫 번째 탭으로 리셋
    document.querySelectorAll('.sale-form .tab-btn').forEach((b, i) => {
        if (i === 0) b.classList.add('active');
        else b.classList.remove('active');
    });
    document.querySelectorAll('.sale-form .tab-content').forEach((c, i) => {
        if (i === 0) c.classList.add('active');
        else c.classList.remove('active');
    });
}

// 판매용 상각 자산 목록 렌더링
function renderSaleAssetList() {
    const listDiv = document.getElementById('assetSaleList');
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

    // 판매 항목 클릭 이벤트
    document.querySelectorAll('#assetSaleList .sale-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('#assetSaleList .sale-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedSaleItemId = this.getAttribute('data-id');
        });
    });
}

// 판매용 재고 목록 렌더링
function renderSaleInventoryList() {
    const listDiv = document.getElementById('inventorySaleList');
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

    // 판매 항목 클릭 이벤트
    document.querySelectorAll('#inventorySaleList .sale-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('#inventorySaleList .sale-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedSaleItemId = this.getAttribute('data-id');
        });
    });
}

// 판매 입력 처리
function handleSaleSubmit() {
    const saleAmount = parseFloat(document.getElementById('saleAmount').value);

    if (!selectedReceiveMethod) {
        alert('받을 방법을 선택해주세요.');
        return;
    }

    if (!saleAmount || saleAmount <= 0) {
        alert('판매 금액을 입력해주세요.');
        return;
    }

    let transaction;
    let description = '';

    if (selectedSaleType === 'sell-asset') {
        // 상각 자산 판매
        if (!selectedSaleItemId) {
            alert('판매할 자산을 선택해주세요.');
            return;
        }

        const asset = trackedItems.find(item => item.id === selectedSaleItemId);
        if (!asset) {
            alert('자산을 찾을 수 없습니다.');
            return;
        }

        description = `${asset.name} 판매`;

        // 차변: 현금/은행예금 증가
        // 대변: 상각자산 감소 + 잡이익
        if (saleAmount >= asset.currentAmount) {
            // 판매가 >= 장부가: 이익 발생
            const profit = saleAmount - asset.currentAmount;

            // 거래 1: 자산 제거
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
            transactions.push(transaction1);

            // 거래 2: 이익 인식
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
                transactions.push(transaction2);
            }
        } else {
            // 판매가 < 장부가: 손실 발생 (일단 단순화하여 잡이익으로 처리)
            transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                description: description,
                debitAccount: selectedReceiveMethod,
                debitAmount: saleAmount,
                creditAccount: '잡이익',
                creditAmount: saleAmount,
                trackedItemId: asset.id
            };
            transactions.push(transaction);
        }

        // 자산 제거
        asset.currentAmount = 0;

    } else if (selectedSaleType === 'sell-inventory') {
        // 재고 판매
        if (!selectedSaleItemId) {
            alert('판매할 재고를 선택해주세요.');
            return;
        }

        const inventory = trackedItems.find(item => item.id === selectedSaleItemId);
        if (!inventory) {
            alert('재고를 찾을 수 없습니다.');
            return;
        }

        const quantity = parseInt(prompt(`판매 수량을 입력하세요 (최대 ${inventory.quantity}개):`));
        if (!quantity || quantity <= 0) {
            alert('올바른 수량을 입력해주세요.');
            return;
        }

        if (quantity > inventory.quantity) {
            alert(`재고 수량(${inventory.quantity}개)보다 많이 판매할 수 없습니다.`);
            return;
        }

        const costOfGoods = inventory.unitPrice * quantity;
        description = `${inventory.name} 판매 (${quantity}개)`;

        // 차변: 현금/은행예금 증가
        // 대변: 재고 감소 + 잡이익
        if (saleAmount >= costOfGoods) {
            // 판매가 >= 원가: 이익 발생
            const profit = saleAmount - costOfGoods;

            // 거래 1: 재고 제거
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
            transactions.push(transaction1);

            // 거래 2: 이익 인식
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
                transactions.push(transaction2);
            }
        } else {
            // 판매가 < 원가: 손실 발생 (잡이익으로 처리)
            transaction = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                description: description,
                debitAccount: selectedReceiveMethod,
                debitAmount: saleAmount,
                creditAccount: '잡이익',
                creditAmount: saleAmount,
                trackedItemId: inventory.id
            };
            transactions.push(transaction);
        }

        // 재고 수량 감소
        inventory.quantity -= quantity;
        inventory.totalAmount = inventory.quantity * inventory.unitPrice;

    } else if (selectedSaleType === 'sell-other') {
        // 기타 중고거래
        const itemName = document.getElementById('otherSaleItemName').value;

        if (!itemName) {
            alert('품목명을 입력해주세요.');
            return;
        }

        description = `${itemName} 중고거래`;

        // 차변: 현금/은행예금 증가
        // 대변: 잡이익
        transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            description: description,
            debitAccount: selectedReceiveMethod,
            debitAmount: saleAmount,
            creditAccount: '잡이익',
            creditAmount: saleAmount
        };
        transactions.push(transaction);
    }

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveToLocalStorage();
    renderTransactions();
    updateSummary();

    resetSaleForm();


    hideFormAndShowTypeSelector();

    alert('판매가 등록되었습니다.');
}

// 투자 폼 초기화
function resetInvestmentForm() {
    selectedInvestmentType = 'financial-product';
    selectedInvestPaymentMethod = null;

    document.querySelectorAll('.invest-payment-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('financialProductName').value = '';
    document.getElementById('financialProductAmount').value = '';
    document.getElementById('longDepositName').value = '';
    document.getElementById('longDepositAmount').value = '';
    document.getElementById('depositName').value = '';
    document.getElementById('depositAmount').value = '';

    // 첫 번째 탭으로 리셋
    document.querySelectorAll('.investment-form .tab-btn').forEach((b, i) => {
        if (i === 0) b.classList.add('active');
        else b.classList.remove('active');
    });
    document.querySelectorAll('.investment-form .tab-content').forEach((c, i) => {
        if (i === 0) c.classList.add('active');
        else c.classList.remove('active');
    });
}

// 투자 입력 처리
function handleInvestmentSubmit() {
    let itemName, itemAmount, investmentCategory;

    // 투자 항목 정보 가져오기
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

    if (!itemName) {
        alert('항목명을 입력해주세요.');
        return;
    }

    if (!itemAmount || itemAmount <= 0) {
        alert('금액을 입력해주세요.');
        return;
    }

    if (!selectedInvestPaymentMethod) {
        alert('지불 수단을 선택해주세요.');
        return;
    }

    // 투자 자산 추적 항목 생성
    const investmentAsset = {
        id: generateUUID(),
        name: itemName,
        type: 'investment',
        category: investmentCategory,
        originalAmount: itemAmount,
        currentAmount: itemAmount,
        createdAt: new Date().toISOString()
    };
    trackedItems.push(investmentAsset);

    let transaction;

    if (selectedInvestPaymentMethod === '부채') {
        // 부채로 투자 (대출)
        const liabilityName = `${itemName} 대출`;
        const liability = {
            id: generateUUID(),
            name: liabilityName,
            originalAmount: itemAmount,
            currentAmount: itemAmount,
            createdAt: new Date().toISOString()
        };
        trackedItems.push(liability);

        // 차변: 투자자산 증가
        // 대변: 부채 증가
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
        // 현금 또는 은행예금으로 투자
        // 차변: 투자자산 증가
        // 대변: 현금/은행예금 감소
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

    transactions.push(transaction);
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveToLocalStorage();
    renderTransactions();
    updateSummary();

    resetInvestmentForm();


    hideFormAndShowTypeSelector();

    alert('투자가 등록되었습니다.');
}

// 회수 폼 초기화
function resetCollectionForm() {
    selectedCollectReceiveMethod = null;
    selectedCollectionItemId = null;
    selectedCollectionLiabilityId = null;

    document.querySelectorAll('.collect-receive-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('collectionAmount').value = '';
    document.querySelectorAll('.sale-item').forEach(b => b.classList.remove('selected'));
    document.getElementById('liabilityCollectionSection').style.display = 'none';
}

// 회수용 투자 목록 렌더링
function renderInvestmentCollectionList() {
    const listDiv = document.getElementById('investmentCollectionList');
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

    // 회수 항목 클릭 이벤트
    document.querySelectorAll('#investmentCollectionList .sale-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('#investmentCollectionList .sale-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedCollectionItemId = this.getAttribute('data-id');
        });
    });
}

// 회수용 부채 목록 렌더링
function renderLiabilityCollectionList() {
    const listDiv = document.getElementById('liabilityCollectionList');
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

    // 부채 항목 클릭 이벤트
    document.querySelectorAll('#liabilityCollectionList .liability-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('#liabilityCollectionList .liability-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedCollectionLiabilityId = this.getAttribute('data-id');
        });
    });
}

// 회수 입력 처리
function handleCollectionSubmit() {
    const collectionAmount = parseFloat(document.getElementById('collectionAmount').value);

    if (!selectedCollectionItemId) {
        alert('회수할 투자 항목을 선택해주세요.');
        return;
    }

    if (!collectionAmount || collectionAmount <= 0) {
        alert('회수 금액을 입력해주세요.');
        return;
    }

    const investment = trackedItems.find(item => item.id === selectedCollectionItemId);
    if (!investment) {
        alert('투자 항목을 찾을 수 없습니다.');
        return;
    }

    if (collectionAmount > investment.currentAmount) {
        alert(`회수 금액이 투자 잔액(${formatCurrency(investment.currentAmount)})보다 큽니다.`);
        return;
    }

    const originalAmount = investment.originalAmount;
    const description = `${investment.name} 회수`;

    if (selectedCollectReceiveMethod === '부채상환') {
        // 부채 상환으로 회수
        if (!selectedCollectionLiabilityId) {
            alert('상환할 부채를 선택해주세요.');
            return;
        }

        const liability = trackedItems.find(item => item.id === selectedCollectionLiabilityId);
        if (!liability) {
            alert('부채를 찾을 수 없습니다.');
            return;
        }

        if (collectionAmount > liability.currentAmount) {
            alert(`회수 금액이 부채 잔액(${formatCurrency(liability.currentAmount)})보다 큽니다.`);
            return;
        }

        // 차변: 부채 감소
        // 대변: 투자자산 감소
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
        transactions.push(transaction);

        // 부채 잔액 감소
        liability.currentAmount -= collectionAmount;

    } else {
        // 현금 또는 은행예금으로 회수
        if (!selectedCollectReceiveMethod) {
            alert('받을 방법을 선택해주세요.');
            return;
        }

        // 수익/손실 계산
        const profitOrLoss = collectionAmount - originalAmount;

        if (profitOrLoss >= 0) {
            // 수익 발생
            // 거래 1: 원금 회수
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
            transactions.push(transaction1);

            // 거래 2: 수익 인식
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
                transactions.push(transaction2);
            }
        } else {
            // 손실 발생
            const loss = Math.abs(profitOrLoss);

            // 거래 1: 회수 금액
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
            transactions.push(transaction1);

            // 거래 2: 손실 인식
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
            transactions.push(transaction2);
        }
    }

    // 투자 자산 잔액 감소
    investment.currentAmount -= collectionAmount;

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveToLocalStorage();
    renderTransactions();
    updateSummary();

    resetCollectionForm();


    hideFormAndShowTypeSelector();

    alert('회수가 등록되었습니다.');
}

// 거래 제출 처리
function handleSubmit(e) {
    e.preventDefault();

    const transaction = {
        id: editingId || Date.now().toString(),
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        debitAccount: document.getElementById('debitAccount').value,
        debitAmount: parseFloat(document.getElementById('debitAmount').value),
        creditAccount: document.getElementById('creditAccount').value,
        creditAmount: parseFloat(document.getElementById('creditAmount').value)
    };

    // 차변과 대변 금액이 일치하는지 확인
    if (transaction.debitAmount !== transaction.creditAmount) {
        alert('차변과 대변의 금액이 일치해야 합니다.');
        return;
    }

    if (editingId) {
        // 수정
        const index = transactions.findIndex(t => t.id === editingId);
        transactions[index] = transaction;
        editingId = null;
    } else {
        // 추가
        transactions.push(transaction);
    }

    // 날짜순 정렬
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveToLocalStorage();
    renderTransactions();
    updateSummary();
    resetForm();
}

// 거래 목록 렌더링
function renderTransactions(filteredTransactions = null) {
    const tbody = document.getElementById('transactionBody');
    const dataToRender = filteredTransactions || transactions;

    if (dataToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">등록된 거래가 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = dataToRender.map(transaction => `
        <tr>
            <td>${transaction.date}</td>
            <td>${transaction.description}</td>
            <td>${transaction.debitAccount}</td>
            <td class="amount-debit">${formatCurrency(transaction.debitAmount)}</td>
            <td>${transaction.creditAccount}</td>
            <td class="amount-credit">${formatCurrency(transaction.creditAmount)}</td>
            <td>
                <button class="btn btn-edit" onclick="editTransaction('${transaction.id}')">수정</button>
                <button class="btn btn-danger" onclick="deleteTransaction('${transaction.id}')">삭제</button>
            </td>
        </tr>
    `).join('');
}

// 거래 수정
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    editingId = id;
    document.getElementById('date').value = transaction.date;
    document.getElementById('description').value = transaction.description;
    document.getElementById('debitAccount').value = transaction.debitAccount;
    document.getElementById('debitAmount').value = transaction.debitAmount;
    document.getElementById('creditAccount').value = transaction.creditAccount;
    document.getElementById('creditAmount').value = transaction.creditAmount;

    // 폼으로 스크롤
    document.querySelector('.transaction-form').scrollIntoView({ behavior: 'smooth' });
}

// 거래 삭제
function deleteTransaction(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    renderTransactions();
    updateSummary();
}

// 폼 초기화
function resetForm() {
    editingId = null;
    document.getElementById('transactionForm').reset();
    document.getElementById('date').valueAsDate = new Date();
}

// 계정별 잔액 계산 및 표시
function updateSummary() {
    const balances = {};

    transactions.forEach(transaction => {
        // 차변 (증가)
        if (!balances[transaction.debitAccount]) {
            balances[transaction.debitAccount] = 0;
        }
        balances[transaction.debitAccount] += transaction.debitAmount;

        // 대변 (감소)
        if (!balances[transaction.creditAccount]) {
            balances[transaction.creditAccount] = 0;
        }
        balances[transaction.creditAccount] -= transaction.creditAmount;
    });

    const summaryDiv = document.getElementById('accountSummary');

    if (Object.keys(balances).length === 0) {
        summaryDiv.innerHTML = '<p style="color: #999; grid-column: 1/-1;">거래를 추가하면 계정별 잔액이 표시됩니다.</p>';
        return;
    }

    summaryDiv.innerHTML = Object.entries(balances)
        .map(([account, balance]) => {
            const type = accountTypes[account] || 'asset';
            return `
                <div class="account-card ${type}">
                    <h3>${account}</h3>
                    <div class="balance">${formatCurrency(Math.abs(balance))}</div>
                </div>
            `;
        })
        .join('');
}

// 필터 적용
function applyFilter() {
    const month = document.getElementById('filterMonth').value;
    const account = document.getElementById('filterAccount').value;

    let filtered = transactions;

    if (month) {
        filtered = filtered.filter(t => t.date.startsWith(month));
    }

    if (account) {
        filtered = filtered.filter(t =>
            t.debitAccount === account || t.creditAccount === account
        );
    }

    renderTransactions(filtered);
}

// 필터 초기화
function clearFilter() {
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterAccount').value = '';
    renderTransactions();
}

// 통화 포맷
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

// 엑셀로 내보내기
function exportToExcel() {
    if (transactions.length === 0) {
        alert('내보낼 거래 내역이 없습니다.');
        return;
    }

    // 워크북 생성
    const wb = XLSX.utils.book_new();

    // 거래 내역 시트
    const transactionData = transactions.map(t => ({
        '날짜': t.date,
        '적요': t.description,
        '차변계정': t.debitAccount,
        '차변금액': t.debitAmount,
        '대변계정': t.creditAccount,
        '대변금액': t.creditAmount
    }));

    const ws1 = XLSX.utils.json_to_sheet(transactionData);

    // 열 너비 설정
    ws1['!cols'] = [
        { wch: 12 },  // 날짜
        { wch: 30 },  // 적요
        { wch: 15 },  // 차변계정
        { wch: 15 },  // 차변금액
        { wch: 15 },  // 대변계정
        { wch: 15 }   // 대변금액
    ];

    XLSX.utils.book_append_sheet(wb, ws1, '거래내역');

    // 계정별 잔액 시트
    const balances = {};
    transactions.forEach(transaction => {
        if (!balances[transaction.debitAccount]) balances[transaction.debitAccount] = 0;
        if (!balances[transaction.creditAccount]) balances[transaction.creditAccount] = 0;

        balances[transaction.debitAccount] += transaction.debitAmount;
        balances[transaction.creditAccount] -= transaction.creditAmount;
    });

    const balanceData = Object.entries(balances).map(([account, balance]) => ({
        '계정': account,
        '분류': accountTypes[account] === 'asset' ? '자산' :
            accountTypes[account] === 'expense' ? '비용' : '수익',
        '잔액': Math.abs(balance)
    }));

    const ws2 = XLSX.utils.json_to_sheet(balanceData);
    ws2['!cols'] = [
        { wch: 15 },  // 계정
        { wch: 10 },  // 분류
        { wch: 15 }   // 잔액
    ];

    XLSX.utils.book_append_sheet(wb, ws2, '계정별잔액');

    // 파일 저장
    const fileName = `가계부_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// 엑셀에서 불러오기
function importFromExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 첫 번째 시트 읽기
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            // 데이터 변환
            const importedTransactions = jsonData.map((row, index) => ({
                id: Date.now().toString() + index,
                date: row['날짜'] || row['date'] || '',
                description: row['적요'] || row['description'] || '',
                debitAccount: row['차변계정'] || row['debitAccount'] || '',
                debitAmount: parseFloat(row['차변금액'] || row['debitAmount'] || 0),
                creditAccount: row['대변계정'] || row['creditAccount'] || '',
                creditAmount: parseFloat(row['대변금액'] || row['creditAmount'] || 0)
            }));

            // 유효성 검사
            const valid = importedTransactions.every(t =>
                t.date && t.description && t.debitAccount && t.creditAccount &&
                t.debitAmount > 0 && t.creditAmount > 0
            );

            if (!valid) {
                alert('엑셀 파일의 형식이 올바르지 않습니다. 필수 항목을 확인해주세요.');
                return;
            }

            // 기존 데이터와 병합할지 확인
            if (transactions.length > 0) {
                if (confirm('기존 데이터에 추가하시겠습니까? (취소하면 기존 데이터가 삭제됩니다)')) {
                    transactions = [...transactions, ...importedTransactions];
                } else {
                    transactions = importedTransactions;
                }
            } else {
                transactions = importedTransactions;
            }

            // 날짜순 정렬
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            saveToLocalStorage();
            renderTransactions();
            updateSummary();

            alert(`${importedTransactions.length}개의 거래를 불러왔습니다.`);
        } catch (error) {
            console.error('Import error:', error);
            alert('파일을 불러오는 중 오류가 발생했습니다.');
        }

        // 파일 입력 초기화
        e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
}
