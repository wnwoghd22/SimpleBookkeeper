// 거래 데이터 저장소
let transactions = [];
let editingId = null;

// 추적 가능한 항목들 (UUID가 부여된 자산/부채)
let trackedItems = [];

// 계정 분류
const accountTypes = {
    '현금': 'asset',
    '은행예금': 'asset',
    '식비': 'expense',
    '교통비': 'expense',
    '주거비': 'expense',
    '공과금': 'expense',
    '통신비': 'expense',
    '의료비': 'expense',
    '문화생활비': 'expense',
    '기타비용': 'expense',
    '급여': 'income',
    '사업소득': 'income',
    '이자수입': 'income',
    '기타수입': 'income',
    '부채': 'liability'
};

// UUID 생성 함수
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
document.addEventListener('DOMContentLoaded', function() {
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

// 이벤트 리스너 설정
function setupEventListeners() {
    // 거래 유형 버튼 클릭 이벤트
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            handleTypeSelection(type);
        });
    });

    // 자산 버튼 클릭 이벤트
    document.querySelectorAll('.asset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
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
    document.getElementById('incomeCancelBtn').addEventListener('click', function() {
        hideAllForms();
        showTypeSelector();
        resetIncomeForm();
    });

    // 지출 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
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
        btn.addEventListener('click', function() {
            document.querySelectorAll('.account-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedExpenseAccount = this.getAttribute('data-account');
            selectedLiabilityId = null;
        });
    });

    // 지불 수단 버튼 클릭
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
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
    document.getElementById('expenseCancelBtn').addEventListener('click', function() {
        hideAllForms();
        showTypeSelector();
        resetExpenseForm();
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
    document.getElementById('debitAmount').addEventListener('input', function(e) {
        document.getElementById('creditAmount').value = e.target.value;
    });
}

// 거래 유형 선택 처리
function handleTypeSelection(type) {
    hideAllForms();

    if (type === 'income') {
        document.querySelector('.income-form').style.display = 'block';
    } else if (type === 'expense') {
        document.querySelector('.expense-form').style.display = 'block';
        renderLiabilityList();
    }
    // 다른 타입들은 나중에 구현
}

// 모든 폼 숨기기
function hideAllForms() {
    document.querySelector('.transaction-type-selector').style.display = 'none';
    document.querySelector('.income-form').style.display = 'none';
    document.querySelector('.expense-form').style.display = 'none';
    document.querySelector('.transaction-form').style.display = 'none';
}

// 타입 선택 버튼 표시
function showTypeSelector() {
    document.querySelector('.transaction-type-selector').style.display = 'block';
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
    hideAllForms();
    showTypeSelector();
    resetIncomeForm();

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
        item.addEventListener('click', function() {
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
    hideAllForms();
    showTypeSelector();
    resetExpenseForm();

    alert('지출이 등록되었습니다.');
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
    
    reader.onload = function(e) {
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
