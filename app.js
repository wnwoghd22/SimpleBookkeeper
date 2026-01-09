import { loadFromLocalStorage, getTransactions, setTransactions, accountTypes, getAccountTypes, getDefaultAccounts, getCustomAccounts, isDefaultAccount, removeCustomAccount } from './js/store.js';
import { initInputTab, renderExpenseAccountButtons } from './js/tab-input.js';
import { initHistoryTab, initHistoryTab as refreshHistoryTab } from './js/tab-history.js'; // Hacky alias for now
import { initBalanceTab, updateSummary } from './js/tab-balance.js';
import { initStatisticsTab } from './js/tab-statistics.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Data
    loadFromLocalStorage();

    // 2. Load Templates
    await loadTemplates();

    // 3. Initialize Tabs
    initInputTab();
    initHistoryTab();
    initBalanceTab();
    initStatisticsTab();

    // 4. Setup Main Tab Switching
    setupMainNavigation();

    // 5. Setup Excel Export/Import
    setupExcelFeatures();

    // 6. Setup Account Management
    setupAccountManagement();
});

async function loadTemplates() {
    const load = async (id, file) => {
        const response = await fetch(file);
        const text = await response.text();
        document.getElementById(id).innerHTML = text;
    };

    await Promise.all([
        load('tab-input', 'templates/input.html'),
        load('tab-history', 'templates/history.html'),
        load('tab-balance', 'templates/balance.html'),
        load('tab-statistics', 'templates/statistics.html')
    ]);
}

function setupMainNavigation() {
    const tabBtns = document.querySelectorAll('.main-tab-btn');
    const tabContents = document.querySelectorAll('.main-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });

            // Activate clicked
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const content = document.getElementById(tabId);
            content.style.display = 'block';

            // Small delay for fade-in effect if CSS transition exists
            setTimeout(() => content.classList.add('active'), 10);

            // Logic to refresh data when entering tabs
            if (tabId === 'tab-balance') {
                updateSummary();
            } else if (tabId === 'tab-history') {
                // Re-init or generic refresh for history to pick up new transactions
                // Ideally export a specific refresh function.
                // For now, re-calling init is safe enough as it re-binds (careful of dupe listeners)
                // Actually, initHistoryTab adds listeners. We should separate init vs update.
                // BUT, for this rapid refactor, let's assume simple reload or standard render.
                // Implemented render() in initHistoryTab, so...
                // Better approach: Dispatch a custom event?
                document.getElementById('applyDateFilter').click(); // trigger render
            } else if (tabId === 'tab-statistics') {
                // Refresh statistics tab
                const btn = document.getElementById('applyStatsFilter');
                if (btn) btn.click();
            }
        });
    });
}

function setupExcelFeatures() {
    // 엑셀 내보내기
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);

    // 엑셀 불러오기
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', importFromExcel);
}

function exportToExcel() {
    const transactions = getTransactions();

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

    const balanceData = Object.entries(balances)
        .filter(([account, balance]) => balance !== 0)
        .map(([account, balance]) => ({
            '계정': account,
            '분류': accountTypes[account] === 'asset' ? '자산' :
                    accountTypes[account] === 'liability' ? '부채' :
                    accountTypes[account] === 'expense' ? '비용' : '수익',
            '잔액': balance
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

    alert(`${fileName} 파일이 다운로드되었습니다.`);
}

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
            const currentTransactions = getTransactions();
            let newTransactions;

            if (currentTransactions.length > 0) {
                if (confirm('기존 데이터에 추가하시겠습니까? (취소하면 기존 데이터가 삭제됩니다)')) {
                    newTransactions = [...currentTransactions, ...importedTransactions];
                } else {
                    newTransactions = importedTransactions;
                }
            } else {
                newTransactions = importedTransactions;
            }

            // 날짜순 정렬
            newTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            setTransactions(newTransactions);
            localStorage.setItem('doubleEntryTransactions', JSON.stringify(newTransactions));

            // 모든 탭 새로고침
            const currentTab = document.querySelector('.main-tab-btn.active')?.getAttribute('data-tab');
            if (currentTab === 'tab-history') {
                document.getElementById('applyDateFilter')?.click();
            } else if (currentTab === 'tab-balance') {
                updateSummary();
            } else if (currentTab === 'tab-statistics') {
                document.getElementById('applyStatsFilter')?.click();
            }

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

// ===== Account Management =====

function setupAccountManagement() {
    const manageBtn = document.getElementById('manageAccountsBtn');
    const modal = document.getElementById('manageAccountsModal');

    if (!manageBtn || !modal) return;

    manageBtn.addEventListener('click', () => {
        renderAccountManageList();
        modal.classList.add('show');
    });

    // Close button
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // Close button in footer
    document.getElementById('closeManageAccounts').addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
}

function renderAccountManageList() {
    const listDiv = document.getElementById('accountManageList');
    const allAccounts = getAccountTypes();

    // Group by type
    const expenseAccounts = Object.entries(allAccounts).filter(([_, type]) => type === 'expense');
    const incomeAccounts = Object.entries(allAccounts).filter(([_, type]) => type === 'income');

    let html = '';

    // Expense accounts
    html += `
        <div class="account-manage-section">
            <h4>비용 계정</h4>
            ${expenseAccounts.map(([name]) => renderAccountItem(name, 'expense')).join('')}
        </div>
    `;

    // Income accounts
    html += `
        <div class="account-manage-section">
            <h4>수입 계정</h4>
            ${incomeAccounts.map(([name]) => renderAccountItem(name, 'income')).join('')}
        </div>
    `;

    listDiv.innerHTML = html;

    // Add delete event listeners
    listDiv.querySelectorAll('.btn-delete-account').forEach(btn => {
        btn.addEventListener('click', function() {
            const accountName = this.dataset.account;
            if (confirm(`'${accountName}' 계정을 삭제하시겠습니까?`)) {
                const result = removeCustomAccount(accountName);
                if (result.success) {
                    renderAccountManageList();
                    renderExpenseAccountButtons();
                    alert(`'${accountName}' 계정이 삭제되었습니다.`);
                } else {
                    alert(result.message);
                }
            }
        });
    });
}

function renderAccountItem(name, type) {
    const isDefault = isDefaultAccount(name);
    const typeLabel = type === 'expense' ? '비용' : '수입';

    if (isDefault) {
        return `
            <div class="account-manage-item default">
                <span>
                    <span class="account-name">${name}</span>
                </span>
                <span class="default-badge">기본 계정</span>
            </div>
        `;
    } else {
        return `
            <div class="account-manage-item">
                <span>
                    <span class="account-name">${name}</span>
                </span>
                <button class="btn-delete-account" data-account="${name}">삭제</button>
            </div>
        `;
    }
}
