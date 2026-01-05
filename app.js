// 거래 데이터 저장소
let transactions = [];
let editingId = null;

// 계정 분류
const accountTypes = {
    '현금': 'asset',
    '은행예금': 'asset',
    '식비': 'expense',
    '교통비': 'expense',
    '주거비': 'expense',
    '통신비': 'expense',
    '의료비': 'expense',
    '문화생활비': 'expense',
    '기타비용': 'expense',
    '급여': 'income',
    '사업소득': 'income',
    '이자수입': 'income',
    '기타수입': 'income'
};

// 로컬 스토리지에서 데이터 로드
function loadFromLocalStorage() {
    const stored = localStorage.getItem('doubleEntryTransactions');
    if (stored) {
        transactions = JSON.parse(stored);
    }
}

// 로컬 스토리지에 데이터 저장
function saveToLocalStorage() {
    localStorage.setItem('doubleEntryTransactions', JSON.stringify(transactions));
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    renderTransactions();
    updateSummary();
    setupEventListeners();
    
    // 오늘 날짜를 기본값으로 설정
    document.getElementById('date').valueAsDate = new Date();
});

// 이벤트 리스너 설정
function setupEventListeners() {
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
